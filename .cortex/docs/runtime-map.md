# Cortex-OS Runtime Map (ASBR-hosted)

> **⚠️ HISTORICAL DOCUMENT**: This document references `apps/api` which has been removed from the codebase. Content preserved for historical reference and runtime architecture context.

                 ┌───────────────────────────────┐
                 │        ASBR Runtime           │
                 │         apps/cortex-os        │
                 └──────────────┬────────────────┘
                                │
     ┌───────────────┬──────────┼───────────┬───────────────┬───────────────┐
     │               │          │           │               │               │

┌───────────┐ ┌────────────┐ ┌───────┐ ┌───────────┐ ┌────────────┐ ┌────────────┐
│ memories │ │ orchestration│ │ a2a │ │ mcp │ │ rag │ │ simlab │
│ packages/ │ │ packages/ │ │ pkgs/│ │ packages/ │ │ packages/ │ │ packages/ │
│ memories │ │ orchestration │ │ a2a │ │ mcp │ │ rag │ │ simlab │
└───────────┘ └─────────────┘ └───────┘ └───────────┘ └────────────┘ └────────────┘
│ │ │ │ │ │
└───────────────┴───────────┴────────────┴─────────────┴───────────────┘
│
┌────────────┐
│ agents │ ← feature-level agents/neurons
│ packages/ │ packages/agents
│ agents │
└────────────┘
│
┌────────────┐
│ mvp │ ← core foundations/utilities
│ packages/ │ packages/mvp
│ mvp │
└────────────┘

Other examples: mvp-core, model-gateway mount similarly.

Note: apps/cortex-os currently mounts feature bundles under apps/cortex-os/packages (evidence, ingest, planner, rag). Core shared features live under top-level packages/ as shown above.

---

## Layered Runtime View

┌──────────────────────────────────────────────────────────────────────────┐
│ Interface Layer (Entrypoints) │
│ • ASBR runtime (apps/cortex-os): CLI, HTTP, UI adapters │
│ • apps/api: public REST/Webhooks │
│ • packages/model-gateway: ML models HTTP (embeddings/rerank/chat) │
└───────────────▲──────────────────────────────────────────────────────────┘
│ mounts
┌───────────────┼──────────────────────────────────────────────────────────┐
│ Feature Layer (Packages = features) │
│ • packages/agents • packages/memories • packages/rag │
│ • packages/orchestration • packages/a2a • packages/a2a-services │
│ • packages/mcp • packages/mvp • packages/model-gateway │
│ • packages/simlab (if present) │
└───────────────▲──────────────────────────────────────────────────────────┘
│ depends on
┌───────────────┼──────────────────────────────────────────────────────────┐
│ Core Layer (Shared foundations) │
│ • types, schemas, config, logging, error, telemetry (often in mvp/\*) │
└───────────────▲──────────────────────────────────────────────────────────┘
│ uses
┌───────────────┼──────────────────────────────────────────────────────────┐
│ Infra Layer (External) │
│ • DBs (Postgres), queues, object stores, IdP, MCP transports, OTEL, etc. │
└──────────────────────────────────────────────────────────────────────────┘

- mvp is a package at: packages/mvp
- agents lives at: packages/agents and is a feature package mounted by ASBR

Use the existing ASBR/MCP/A2A layout. Vendor-neutral.

Deliverables: External integration diagram, connection points, config examples, steps, tests.

---

## Connection points

- HTTP in/out
  - apps/api exposes REST endpoints and receives webhooks
  - packages/model-gateway exposes ML endpoints on `http://127.0.0.1:8081`: `/embeddings`, `/rerank`, `/chat`
- MCP in/out
  - packages/mcp hosts MCP client adapters and registers outbound MCP servers
- A2A bus
  - packages/a2a is the internal event bus; packages/a2a-services provides shared middleware (e.g., rateLimiter) and schema-registry
  - Webhooks produce events → features consume
- Agents
  - packages/agents call MCP tools and publish results to A2A

Guardrails

- No cross-feature imports (`@cortex-os/*/src/*` banned by lint + CI)
- Only A2A events, DI services, or MCP tools for inter-package comms
- Filesystem writes restricted to `/var/cortex/tmp` and `./.cortex/tmp`
- Event catalog centralized in `packages/a2a` with Zod schemas
- Review-neuron gate blocks merges on blockers > 0

---

## External Integration Map

         External Clients / Tools                            Cortex-OS (ASBR-hosted)

┌─────────────────────────────────────┐ ┌───────────────────────────────┐
│ IDEs/CLIs/UIs │ │ ASBR Runtime │
│ • Cortex-CLI / Web UI / iOS │ HTTP │ apps/cortex-os │
│ • IDE chat (Cursor, VS Code) ───────────────▶ │ apps/api (REST/Webhooks) │
│ • Other apps/webhooks │ Webhook └──────────────┬────────────────┘
└─────────────────────────────────────┘ │
│ mounts
┌─────────────────────────────────────┐ │
│ MCP clients │ MCP (stdio|sse|http) │
│ • Claude Code / Cursor MCP client ────────────────┐ │
│ • Cortex-CLI MCP client │ │ │
└─────────────────────────────────────┘ │ │
▼ ▼
┌───────────────┐ ┌───────────────┐
│ packages/ │ │ packages/ │
│ mcp │ │ a2a │ ◀─ Webhooks in
└──────┬────────┘ └───────────────┘
│ tools() ▲
Outbound via MCP servers │ │ events
┌─────────────────────────────────────────┼───────────────────┘
│ │
┌───────▼────────┐ ┌──────────────┐ ┌──────────▼───┐ ┌────────────▼───┐
│ GitHub MCP │ │ Jira MCP │ │ Files/DB MCP │ │ Search/Emb MCP │
│ servers │ │ servers │ │ servers │ │ servers │
└────────────────┘ └──────────────┘ └──────────────┘ └────────────────┘

Feature packages consume events and tools:
• memories, rag, orchestration, agents, simlab, mvp, etc.

---

## Package-to-Package Communication

Packages do not call each other directly. ASBR coordinates. Communication occurs via three sanctioned paths:

1. A2A event bus (pub/sub, async, fan-out)
2. Service interfaces mounted by ASBR (request/response via DI)
3. Externalized tools via MCP servers (side-effectful ops)

Direct imports between feature packages are forbidden.

---

## Mechanisms

### 1) A2A Event Bus (default)

- What: Typed events across features. Async. At-least-once.
- Why: Decouple features. Avoid cycles. Scale consumers.
- Where: packages/a2a (see also packages/a2a-services)
- How (illustrative)

  // packages/a2a/src/bus.ts
  export type Event = "github.push"|"rag.ingest"|"memories.ttl.expired";
  export interface Bus { publish<T>(type:Event,payload:T):Promise<void>; on<T>(type:Event,fn:(p:T)=>Promise<void>):void; }
  export const bus: Bus = null as any; // impl with queue + backpressure
  export const publish = bus.publish.bind(bus);
  export const on = bus.on.bind(bus);

  // packages/rag/src/handlers/onGithubPush.ts
  import { on } from "@cortex-os/a2a"; // or local import depending on package name
  on<{repo:string;commit:string}>("github.push", async (e) => {
  // schedule ingest pipeline
  });

Result: RAG reacts to GitHub without knowing GitHub or agents.

### 2) Service Interfaces via ASBR (sync request/response)

- What: Narrow contracts between features.
- Why: When you need a return value or transactional boundary.
- Where: Interfaces live in packages/mvp (types). Implementations live inside each feature package. ASBR wires them at boot.
- How (illustrative)

  // packages/mvp/src/contracts/memories.ts
  export interface Memories {
  put(k:string,v:unknown,ttl?:number):Promise<void>;
  get<T=unknown>(k:string):Promise<T|null>;
  }
  export const TOKENS = { Memories: Symbol("Memories") };

  // packages/memories/src/service.ts
  import { Memories } from "@cortex-os/mvp/contracts/memories";
  export class MemoriesService implements Memories { // impl omitted }
  export const provideMemories = () => new MemoriesService();

  // apps/cortex-os/src/boot.ts (ASBR)
  import { TOKENS, Memories } from "@cortex-os/mvp/contracts/memories";
  import { provideMemories } from "@cortex-os/memories/service";
  import { container } from "./di";
  container.bind<Memories>(TOKENS.Memories).toConstantValue(provideMemories());

  // packages/orchestration/src/plan.ts
  import { inject } from "@cortex-os/mvp/di";
  import { TOKENS, Memories } from "@cortex-os/mvp/contracts/memories";
  const memories = inject<Memories>(TOKENS.Memories);
  export async function planTask(id:string){ await memories.put(`plan:${id}`, {status:"queued"}); }

Result: Orchestration uses Memories through an interface, not a concrete package.

### 3) MCP Tools (side-effects and integrations)

- What: Feature asks MCP to execute external tool.
- Why: IO isolation, capability bounding, audit trail.
- Where: packages/mcp
- How (illustrative)

  // packages/agents/src/tools/searchPRs.ts
  import { useTool } from "@cortex-os/mcp";
  export async function searchPRs(repo:string, q:string){
  return useTool("github","search.code").invoke({repo,q});
  }

Result: Agents interact with GitHub via MCP, not other packages.

---

## Rules of Engagement

- Only A2A, Service Interfaces, or MCP
- No deep imports (@cortex-os/x/src/\* is blocked)
- Types/contracts live in packages/mvp to avoid cycles
- ASBR is the only place that wires concrete implementations
- Feature packages never import from apps/\*

---

## Ordered steps to enforce

1. Add DI container to ASBR. Register each feature’s service against a token.
2. Move public contracts to packages/mvp/contracts/\*. Export from package root.
3. Add A2A event catalog with strict typing and lint rule for allowed events.
4. Block deep imports via ESLint rule and CI script.
5. Route all external IO through MCP. Cap capabilities in policy.

---

## TDD plan (key tests)

- a2a.events.spec.ts: publish→consume, backpressure, retries, idempotency
- di.wiring.spec.ts: tokens resolved, no fallback to concrete classes
- imports.guard.spec.ts: fail on @cortex-os/_/src/_ or cross-feature imports
- mcp.capabilities.spec.ts: tool calls denied outside allowlist
- cycles.spec.ts: madge reports zero circular deps across packages

---

## Analysis Block

- Pros: Low coupling. Replaceable services. Testable units.
- Cons: DI adds indirection. Eventual consistency if overused.
- Improvements: Add request/response pattern on A2A with correlation IDs.
- Missed opportunities: Circuit breakers and SLOs per service.
- Moving forward: Ship DI + contracts in mvp, enable bus, then migrate features off direct imports.

---

## Standards Check

- Security: OWASP ASVS input validation on MCP boundaries and HTTP ingress
- Eng: SemVer for contract changes. Conventional Commits enforce API bumps
- Data/APIs: Zod schemas on event payloads and service inputs/outputs

---

## Config examples (reference paths)

- Model Gateway models config: `config/mlx-models.json`
- Model Gateway server: `packages/model-gateway/src/server.ts` (HTTP on 127.0.0.1:8081)
- MCP registry/config: `packages/mcp/` (see README and configs)
- A2A services (rate limiting, schema registry): `packages/a2a-services/*`
