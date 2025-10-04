# Cortex-OS Agent Architecture Map

cortex-os-clean/
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ ASBR Runtime (apps/cortex-os) │
│ ┌───────────────────────────────────────────────────────────────────────────────┐ │
│ │ Agent Template (packages/agents/_) │ │
│ │ - Router: plan → gather(∥ READ) → critic → synthesize(single writer) → verify│ │
│ │ - Context: memories API + traces + evidence │ │
│ │ - MCP Client: tools + integrations (files, git, web, model servers) │ │
│ └───────────────────────────────────────────────────────────────────────────────┘ │
│ │
│ A2A Bus (packages/a2a/_) ←→ Agents exchange CloudEvents over NATS │
│ │
│ Model Gateway (packages/model-gateway/_) │
│ ├─ MLX Service → Qwen3-Embedding-{8B,4B,0.6B}, Qwen3-Reranker-4B, │
│ │ Qwen3-Coder-30B-4bit, Phi-3-4bit, Qwen2.5-VL-3B-6bit │
│ └─ Ollama Fallback → qwen3-coder:30b, phi4-mini-reasoning, gemma3n, deepseek-coder│
│ │
│ RAG (packages/rag/_): │
│ embed(MLX→Ollama) → retrieve(FAISS/Qdrant) → rerank(MLX cross-encoder→fusion) │
│ │
│ Governance (.cortex/\*): policies, schemas, gates, audits, PR templates │
│ Observability: OTEL spans + CloudEvents audit log │
│ HITL UI: apps/cortex-os/src/ui/approvals (A11y-first) │
└─────────────────────────────────────────────────────────────────────────────────────┘
External: Environment & Data (docs, repos, web) via MCP tools and RAG

## Interfaces

MCP registry (client→servers)
• mlx-local (embeddings, reranker, chat.invoke).
• ollama (embeddings, chat.invoke).

packages/mcp/mcp-registry/servers/models.json

[
{ "name": "mlx-local", "transport": "http", "url": "http://127.0.0.1:8081" },
{ "name": "ollama", "transport": "http", "url": "http://127.0.0.1:11434" }
]

A2A (AsyncAPI subjects)
• agent.plan.request, agent.plan.result
• agent.gather.result
• agent.synth.proposal, agent.synth.commit
• agent.verify.result
All messages are CloudEvents with runId, traceId, evidence[].

## Agent Roles and Architecture

Cortex-OS defines several agent roles, each with a specific focus. These roles are
implemented using the common architectural pattern of `plan → gather → critic →
synthesize → verify` described in the agent template.

- **MCP Agents**: These agents primarily interact with external tools and services
  via the Model Context Protocol (MCP). Their `gather` step is focused on collecting
  information from these external sources.
- **A2A Agents**: These agents are responsible for coordinating workflows between
  other agents. Their `plan` and `synthesize` steps often involve creating and
  sending tasks to other agents via the A2A event bus.
- **RAG Agents**: These agents specialize in knowledge retrieval. Their `gather`
  step heavily utilizes the Retrieval-Augmented Generation (RAG) packages to find
  relevant information from documents and data sources.
- **Simlab Agents**: These agents operate within the simulation environment
  (`simlab`). Their actions are typically constrained to the simulated world, and
  they are used for testing and evaluating the behavior of other agents.

## Modern planner ⇄ worker architecture

- **Planner**: A deterministic orchestrator that validates goals with Zod schemas,
  loads short-term session state, and fans out capability-specific work packages.
- **Worker registry**: A brAInwav-governed index that enforces unique worker names
  and capability ownership for planner lookups.
- **Tool router**: Normalizes local utilities with MCP transports (stdio +
  Streamable HTTP) and records brAInwav telemetry in the shared session context
  manager.
- **Memory coordinator**: Bridges bounded session memory and optional RAG
  retrievers to supply deterministic context while persisting completed steps.
- **Approval gate**: Wraps the HITL approval loop, surfacing
  `RunToolApprovalItem` requests before executing risky capabilities.
- **Worker runner**: Applies approvals, executes handlers, and updates session
  state with structured evidence for observability.

Model Gateway APIs
• POST /embeddings {model,texts[]} → vectors
• POST /rerank {model,query,docs[]} → [idx,score]
• POST /chat {model,msgs,tools?} → response (MLX first; fallback if policy allows)

## Config and routing

packages/rag/src/config/models.json

{
"hf_cache": "/Volumes/ExternalSSD/huggingface_cache",
"embeddings": { "primary": ["Qwen3-Embedding-8B","Qwen3-Embedding-4B","Qwen3-Embedding-0.6B"],
"fallback_ollama": "nomic-embed-text" },
"reranker": { "primary": "Qwen3-Reranker-4B", "fallback": "fusion" },
"chat": { "code": "mlx-community/Qwen3-Coder-30B-A3B-Instruct-4bit",
"reason": "mlx-community/Phi-3-mini-4k-instruct-4bit",
"fallback_ollama": ["qwen3-coder:30b","phi4-mini-reasoning:latest"] },
"safety": { "primary": "llamas-community/LlamaGuard-7b", "enabled": true }
}

packages/orchestration/src/lib/model-router.ts

export type Node = "plan"|"gather"|"critic"|"synthesize"|"verify";
export function pickModel(n: Node){
if (n==="critic" || n==="synthesize") return {provider:"mlx", model:"mlx-community/Qwen3-Coder-30B-A3B-Instruct-4bit"};
if (n==="verify") return {provider:"mlx", model:"llamas-community/LlamaGuard-7b"};
return {provider:"mlx", model:"mlx-community/Phi-3-mini-4k-instruct-4bit"};
}

Fallback: if MLX load fails → mapped Ollama model.

## Policy and audits

.cortex/schemas/policy.schema.json (as defined earlier).
.cortex/policy/tools/model-gateway.json

{
"$schema": "../schemas/policy.schema.json",
"tool": "model-gateway",
"actions": ["embeddings","rerank","chat"],
"dataClass": "internal",
"rate": { "perMinute": 60 },
"fsScope": [],
"rules": {
"default_provider": "mlx"
}
}

## Code stubs

packages/model-gateway/src/server.ts

import Fastify from "fastify";
import { enforce } from "@cortex-os/policy";
import { record } from "../../orchestration/src/lib/audit";

const app = Fastify({ logger: false });

app.post("/embeddings", async (req:any) => {
enforce(await loadGrant("model-gateway"), "embeddings", req.body);
record(audit("model-gateway","embeddings",req.body));
return mlxOrOllamaEmbeddings(req.body); // MLX first, Ollama fallback
});
app.post("/rerank", async (req:any) => {
enforce(await loadGrant("model-gateway"), "rerank", req.body);
record(audit("model-gateway","rerank",req.body));
return mlxRerankOrFusion(req.body);
});
app.post("/chat", async (req:any) => {
enforce(await loadGrant("model-gateway"), "chat", req.body);
record(audit("model-gateway","chat",req.body));
return mlxChatOrOllama(req.body);
});

app.listen({ port: 8081 }); // MLX + gateway service

packages/mcp/mcp-server-models/src/index.ts
Expose the above as MCP tools embeddings.embed, reranker.score, chat.invoke.

## Ordered steps

1. Create model-gateway package + server above.
2. Register MCP servers in mcp-registry/servers/models.json.
3. Implement embed MLX→Ollama adapters and MLX reranker→fusion; point RAG pipeline to gateway.
4. Wire model-router into orchestrator nodes; keep single-writer gate in synthesize().
5. Enforce policies and audit every model call; store trace IDs.
6. Add policy tests in contracts/tests/.
7. Add simlab scenarios: precision@k vs latency for 8B/4B/0.6B embeds and reranker variants.
8. Ship infra compose for NATS, Qdrant, OTEL; start gateway on 8081.

## Analysis Block

Pros
• Clear separation: agent logic, tools (MCP), models (gateway), transport (A2A).
• MLX end-to-end with audited fallbacks.

Cons / risks
• MLX glue needs tokenizer/model wiring.
• Gateway adds a hop; mitigate with local sockets and batching.

Improvements
• Add disk cache for embeddings keyed by SHA-256.
• Batch rerank/embedding calls; OTEL histogram for p50/p95.
• Add per-agent budgets in policy (max tokens, max calls).

Missed opportunities
• Add "replay CLI" for any run ID and node (already designed) and link to OTEL trace.
• Include A11y smoke tests for the approvals UI in CI.

Moving forward
• Land gateway + policies first.
• Swap RAG to gateway; run simlab KPIs.

## Standards Check

• A11y: WCAG 2.2 AA; keyboard shortcuts (?, Enter, Esc, g/G); visible focus; SR labels; no color-only cues.
• Security: OWASP LLM Top-10 mapped in policy (prompt injection limits, output validation, excessive agency).
• Eng: SemVer, Conventional Commits, EditorConfig, ESLint/Prettier, Vitest.
• Data/APIs: CloudEvents + AsyncAPI; MCP for tools; OTEL traces; JSONL audit.
