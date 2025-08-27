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
│ ├─ Ollama Fallback → qwen3-coder:30b, phi4-mini-reasoning, gemma3n, deepseek-coder│
│ └─ Frontier API (optional) → OpenAI/Anthropic/etc via outbound MCP or direct HTTP │
│ (disabled by policy unless HITL approved) │
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
• frontier-gateway (chat.embedding, chat.completions) off by default; enabled case-by-case via policy + HITL.

packages/mcp/mcp-registry/servers/models.json

[
{ "name": "mlx-local", "transport": "http", "url": "http://127.0.0.1:8081" },
{ "name": "ollama", "transport": "http", "url": "http://127.0.0.1:11434" },
{ "name": "frontier-gateway", "transport": "http", "url": "http://127.0.0.1:8082" }
]

A2A (AsyncAPI subjects)
• agent.plan.request, agent.plan.result
• agent.gather.result
• agent.synth.proposal, agent.synth.commit
• agent.verify.result
All messages are CloudEvents with runId, traceId, evidence[].

Model Gateway APIs
• POST /embeddings {model,texts[]} → vectors
• POST /rerank {model,query,docs[]} → [idx,score]
• POST /chat {model,msgs,tools?} → response (MLX first; fallback if policy allows)
• POST /frontier/... proxied only when policy grants + HITL pass

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

Fallback: if MLX load fails → mapped Ollama model; if both fail and policy grants frontier, route via frontier-gateway.

## Policy and audits

.cortex/schemas/policy.schema.json (as defined earlier).
.cortex/policy/tools/model-gateway.json

{
"$schema": "../schemas/policy.schema.json",
"tool": "model-gateway",
"actions": ["embeddings","rerank","chat","frontier"],
"dataClass": "internal",
"rate": { "perMinute": 60 },
"fsScope": [],
"rules": {
"default_provider": "mlx",
"allow_frontier": false,
"require_hitl_for_frontier": true,
"allowed_frontier_vendors": ["openai","anthropic"]
}
}

contracts/tests/policy.spec.ts (CI fail on unsafe grants)

test("frontier is disabled unless HITL", () => {
const g = load(".cortex/policy/tools/model-gateway.json");
expect(g.rules.allow_frontier).toBe(false);
expect(g.rules.require_hitl_for_frontier).toBe(true);
});

.github/PULL_REQUEST_TEMPLATE.md (policy diff block kept; include any change to allow_frontier)

## Code stubs

packages/model-gateway/src/server.ts

import Fastify from "fastify";
import { enforce } from "../../orchestration/src/lib/policy-engine";
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
app.post("/frontier", async (req:any) => {
const g = await loadGrant("model-gateway");
if (!g.rules?.allow_frontier) throw new Error("frontier disabled");
// require HITL approval flag on ctx before proxying
return proxyToFrontier(req.body); // MCP or direct HTTP
});

app.listen({ port: 8081 }); // MLX + gateway service

packages/mcp/mcp-server-models/src/index.ts
Expose the above as MCP tools embeddings.embed, reranker.score, chat.invoke, frontier.invoke.

## Ordered steps

1. Create model-gateway package + server above.
2. Register MCP servers in mcp-registry/servers/models.json.
3. Implement embed MLX→Ollama adapters and MLX reranker→fusion; point RAG pipeline to gateway.
4. Wire model-router into orchestrator nodes; keep single-writer gate in synthesize().
5. Enforce policies and audit every model call; store trace IDs.
6. Add HITL UI approval before any frontier route; keyboard shortcuts: ? help, Enter approve, Esc reject, g/G next/prev. Screen-reader labels on all controls.
7. Add policy tests in contracts/tests/ and PR template with policy diff.
8. Add simlab scenarios: precision@k vs latency for 8B/4B/0.6B embeds and reranker variants.
9. Ship infra compose for NATS, Qdrant, OTEL; start gateway on 8081.

## Analysis Block

Pros
• Clear separation: agent logic, tools (MCP), models (gateway), transport (A2A).
• MLX end-to-end with audited fallbacks.
• Frontier access exists but is off and supervised.

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
• Enable frontier only on specific flows with HITL.

## Standards Check

• A11y: WCAG 2.2 AA; keyboard shortcuts (?, Enter, Esc, g/G); visible focus; SR labels; no color-only cues.
• Security: OWASP LLM Top-10 mapped in policy (prompt injection limits, output validation, excessive agency). Frontier routes require HITL + audit.
• Eng: SemVer, Conventional Commits, EditorConfig, ESLint/Prettier, Vitest.
• Data/APIs: CloudEvents + AsyncAPI; MCP for tools; OTEL traces; JSONL audit.
