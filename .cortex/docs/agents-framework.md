# Cortex‑OS Agents Framework

This document describes the architecture, runtime workflow, providers, and eventing model of the `@cortex-os/agents` package, including Security Guard integration, Model Gateway interactions (MLX → Ollama → MCP), and two‑stage retrieval for memories.

## High‑Level Architecture

```mermaid
graph TD
  subgraph Entry["Entry Points"]
    CLI["CLI / API / IDE / MCP client"]
  end

  subgraph Orchestrator["@cortex-os/agents Orchestrator"]
    WF["Workflow Builder<br/>seq/parallel + dependsOn<br/>timeouts, retries"]
    OA["Agent Adapter Layer"]
  end

  subgraph Agents["Agents"]
    CA["Code Analysis"]
    TG["Test Generation"]
    DOC["Documentation"]
    SEC["Security (LlamaGuard + Dependabot)"]
  end

  subgraph Providers["Providers (Local-first)"]
    MLX["MLX Provider<br/>(chat/text-gen)"]
    FBC["Fallback Chain<br/>(circuit breaker + retries)"]
    MCP["MCP Provider<br/>(text-generation, tools)"]
  end

  subgraph ModelGateway["Model Gateway"]
    EMB["/embeddings<br/>MLX → Ollama → MCP"]
    RER["/rerank<br/>Qwen3-MLX → Ollama → MCP"]
  end

  subgraph Events["A2A / Outbox"]
    A2A["CloudEvents (agent.*, provider.*, workflow.*, security.*)"]
    OUT["JSONL Outbox + DLQ"]
  end

  CLI --> WF
  WF --> OA
  OA --> CA
  OA --> TG
  OA --> DOC
  OA --> SEC

  CA --> MLX
  TG --> MLX
  DOC --> MLX
  SEC --> MLX

  MLX --> FBC
  FBC --> MCP

  CA -.optional RAG.-> EMB
  DOC -.optional RAG.-> EMB

  EMB --> RER

  SEC -->|Dependabot load/assess| A2A
  WF -->|workflow.started/completed| A2A
  Agents -->|agent.started/completed/failed| A2A
  A2A --> OUT
```

## Workflow Execution (Sequential/Parallel)

```mermaid
sequenceDiagram
  participant U as User/CLI/API
  participant ORCH as Orchestrator
  participant AG1 as Agent: Code Analysis
  participant AG2 as Agent: Test Generation
  participant AG3 as Agent: Documentation
  participant BUS as A2A Event Bus

  U->>ORCH: submit workflow (tasks + deps)
  ORCH->>BUS: workflow.started
  ORCH->>AG1: execute(input, timeout)
  AG1-->>BUS: agent.started
  AG1->>AG1: call provider (MLX → Fallback)
  AG1-->>BUS: agent.completed
  ORCH->>AG2: execute(dependsOn: AG1)
  AG2-->>BUS: agent.started
  AG2->>AG2: call provider (MLX → Fallback)
  AG2-->>BUS: agent.completed
  par optional
    ORCH->>AG3: execute(parallel)
    AG3-->>BUS: agent.started
    AG3->>AG3: provider call
    AG3-->>BUS: agent.completed
  end
  ORCH->>BUS: workflow.completed (metrics)
```

## Security Guard (LlamaGuard + Dependabot)

```mermaid
sequenceDiagram
  participant ORCH as Orchestrator
  participant SEC as Security Agent
  participant LG as MLX LlamaGuard
  participant DEP as Dependabot Loader
  participant BUS as A2A Bus

  ORCH->>SEC: execute({content, phase, context})
  SEC-->>BUS: agent.started
  SEC->>DEP: load .github/dependabot.yml
  DEP-->>SEC: { projects[] }
  SEC-->>BUS: security.dependabot_config_loaded
  SEC->>LG: policy JSON eval (system+prompt)
  LG-->>SEC: { decision, risk, labels, findings }
  SEC->>SEC: assess dependabot (weak schedules, score)
  SEC-->>BUS: security.dependabot_assessed
  SEC-->>BUS: agent.completed (metrics)
```

## Memories: Two‑Stage Retrieval with Rerank

```mermaid
flowchart TD
  Q["Query text / vector"] -->|embed (if text)| EMB[/Model Gateway /embeddings/]
  subgraph Store["SQLite Store (memories)"]
    ANN["Initial Candidate Fetch (vector/recency)"]
    R1["TopN candidates"]
  end
  EMB --> ANN
  Q --> ANN
  ANN --> R1
  R1 -->|/rerank (Qwen3 MLX primary)| RER[/Model Gateway /rerank/]
  RER --> TOPK["TopK reranked"]
  TOPK --> OUT["Emit rerank.completed (JSONL Outbox / A2A)"]
```

## Provider Selection & Fallbacks

```mermaid
flowchart LR
  subgraph TextGen["Text Generation (Agents)"]
    A1["MLX (local)"]
    A2["Fallback Chain"]
    A3["MCP Provider"]
  end
  A1 --> A2 --> A3

  subgraph Embeddings["/embeddings (Gateway)"]
    E1["MLX primary"]
    E2["Ollama fallback"]
    E3["MCP fallback"]
  end
  E1 --> E2 --> E3

  subgraph Rerank["/rerank (Gateway)"]
    R1["Qwen3 Reranker (MLX)"]
    R2["Ollama fallback"]
    R3["MCP fallback"]
  end
  R1 --> R2 --> R3
```

## Event Types (selected)

- workflow.started | workflow.completed | workflow.cancelled
- agent.started | agent.completed | agent.failed
- provider.success | provider.fallback
- security.dependabot_config_loaded | security.dependabot_assessed

Events are CloudEvents 1.0 compatible and published to the A2A bus and/or JSONL outbox for durability.

## CLI & Examples

- Security run (LlamaGuard): `pnpm -C packages/agents security:run`
- Audit workflow (code-analysis + security): `pnpm -C packages/agents security:audit`

## Configuration (quick)

- Model Gateway MCP fallback:
  - `MCP_TRANSPORT=stdio|sse|streamableHttp`
  - `MCP_COMMAND`/`MCP_ARGS` or `MCP_ENDPOINT`
- Memories:
  - `MODEL_GATEWAY_URL=http://localhost:8081`
  - `MEMORIES_RERANK_ENABLED=true`
  - `MEMORIES_OUTBOX_FILE=logs/memories-outbox.jsonl`

---

This architecture is local‑first (MLX), with graceful fallbacks to Ollama and MCP, and aligns with OWASP LLM‑10 and PRD governance (CloudEvents, provenance, deterministic tests).
