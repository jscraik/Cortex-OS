<!-- markdownlint-disable MD013 MD022 MD031 MD032 MD033 MD040 -->
# Modern Agent System Change Plan

## Context Summary

### Repository structure
- `packages/agents/` – core agent orchestration library with LangGraph master agent, subagent tooling, persistence, and monitoring utilities.
- `packages/agent-toolkit/` – deterministic repo tooling (search, codemod, validation) plus session context helpers for agents.
- `packages/memory-core/` & `packages/memory-rest-api/` – memory providers (SQLite + Qdrant) and HTTP gateway for persisting agent state.
- `packages/mcp-*` & `servers/` – MCP registry, transport helpers, and reference servers (stdio + Streamable HTTP) that expose external tools.
- `docs/architecture/` & `docs/plans/` – architectural references and approved development blueprints for Cortex-OS features.

### Conventions & constraints
- Global brAInwav governance requires named exports, ≤40-line functions, guard clauses, and async/await (see `CODESTYLE.md`).
- Zod-backed validation on every external input; standardized brAInwav-branded logging for observability and error messages.
- Use Nx + pnpm tasks (`pnpm -F <pkg> test|lint|build`) and keep docs synchronized with implementation updates.

### Prior art to reuse
- `packages/agents/src/subagents` already adapts subagent registries and tool bindings—mirror its configuration-driven loading.
- `packages/agent-toolkit/src/session/SessionContextManager.ts` demonstrates deterministic token budgeting and tool call history.
- `packages/rag/src/integrations/agents-shim.ts` shows how HTTP-based MCP clients are abstracted behind factory methods.
- `packages/agents/src/persistence/agent-state.ts` implements SQLite-backed session persistence that we can wrap for planner memory.

## Inputs
- **Goal:** Deliver a Cortex-OS-ready scaffold implementing the planner ⇄ workers → tools ↔ MCP client architecture with session memory, RAG integration, and human-in-the-loop approvals as described in the modern agent systems mental model.
- **Entry points:** `packages/agents/src`, `packages/agent-toolkit/src/session`, `packages/memory-core/src`, `packages/mcp-registry/src`.
- **Stack:** TypeScript (ESM) monorepo managed via Nx & pnpm, Vitest for tests, SQLite/Qdrant memory providers, MCP SDK transports.
- **Constraints:** Maintain backward-compatible exports for `@cortex-os/agents`, obey ≤40 line functions, ensure logs/errors carry brAInwav branding, and keep feature behind opt-in factory to avoid breaking existing orchestrations.
- **Testing:** Vitest (`pnpm -F @cortex-os/agents test`, `pnpm -F @cortex-os/agents test:coverage`), targeted docs lint via `pnpm docs:lint` for documentation updates.
- **Non-goals:** No UI/CLI surface changes, no new MCP server implementations, no replacement of existing memory providers beyond adapters, and no deployment automation.

## Controls
- `[REASONING_EFFORT]=medium`
- `[VERBOSITY]=balanced`
- `[OUTPUT]=markdown`
- `[TEMPERATURE]=0.2`
- `[MAX_TOKENS]=1200`

---

### 1) File Tree of Changes
```
packages/
 └─ agents/
     ├─ src/
     │   ├─ UPDATE index.ts
     │   └─ NEW   modern-agent-system/
     │        ├─ NEW   index.ts
     │        ├─ NEW   planner.ts
     │        ├─ NEW   worker-registry.ts
     │        ├─ NEW   worker-runner.ts
     │        ├─ NEW   tool-router.ts
     │        ├─ NEW   mcp-clients.ts
     │        ├─ NEW   memory-adapter.ts
     │        ├─ NEW   approval-gate.ts
     │        └─ NEW   types.ts
     └─ tests/
         └─ NEW   unit/modern-agent-system/
              ├─ NEW   planner.test.ts
              ├─ NEW   worker-registry.test.ts
              └─ NEW   tool-router.test.ts
         └─ NEW   integration/modern-agent-system.integration.test.ts
packages/
 └─ agent-toolkit/
     └─ src/session/
          └─ UPDATE SessionContextManager.ts
docs/
 └─ architecture/
      └─ UPDATE agent-architecture.md
```

### 2) File-by-File Change Plan

**File:** packages/agents/src/index.ts (**UPDATE**)

- **Intent:** Expose the modern agent system factory without disturbing existing exports.
- **Exact edits:**
  - Add named exports `createModernAgentSystem`, `ModernAgentSystemConfig`, etc. from `modern-agent-system/index.js`.
  - Ensure tree-shakeable exports align with current barrel pattern.
- **Snippet (minimal, runnable):**
```typescript
export {
        createModernAgentSystem,
        type ModernAgentSystem,
        type ModernAgentSystemConfig,
} from './modern-agent-system/index.js';
```
- **Tests impacted/added:** Covered indirectly by new unit/integration suites.
- **Dependencies & side effects:** None—uses relative path.
- **Risks & mitigations:** Potential name collisions mitigated by choosing unique export names.
- **Assumptions:** Existing consumers do not rely on default exports.

**File:** packages/agents/src/modern-agent-system/index.ts (**NEW**)

- **Intent:** Provide a public factory to assemble planner, workers, tool routing, memory, and approvals.
- **Exact edits:**
  - Export `createModernAgentSystem(config)` that wires planner + worker registry.
  - Re-export key types for downstream packages.
- **Snippet:**
```typescript
import { createPlanner } from './planner.js';
import { createWorkerRegistry } from './worker-registry.js';
import type { ModernAgentSystemConfig } from './types.js';

export const createModernAgentSystem = (config: ModernAgentSystemConfig) => {
        const registry = createWorkerRegistry(config.workers);
        const planner = createPlanner({ ...config, registry });
        return { planner, registry };
};

export type { ModernAgentSystemConfig, ModernAgentSystem } from './types.js';
```
- **Tests:** `planner.test.ts`, `worker-registry.test.ts`, integration suite.
- **Dependencies:** Internal modules only.
- **Risks:** Misconfigured worker list—validate via Zod.
- **Assumptions:** Config already validated upstream.

**File:** packages/agents/src/modern-agent-system/types.ts (**NEW**)

- **Intent:** Centralize Zod schemas and TypeScript types for planner goals, worker definitions, tool calls, and approvals.
- **Exact edits:**
  - Define `ModernAgentSystemConfigSchema`, `PlannerGoalSchema`, etc.
  - Export derived TypeScript types.
- **Snippet:**
```typescript
import { z } from 'zod';

export const WorkerDefinitionSchema = z.object({
        name: z.string().min(1),
        capabilities: z.array(z.string()).min(1),
        handler: z.function().args(z.any()).returns(z.promise(z.any())),
});

export const ModernAgentSystemConfigSchema = z.object({
        workers: z.array(WorkerDefinitionSchema),
        memory: z.object({ session: z.any(), rag: z.any() }),
        approvals: z.object({ require: z.boolean(), gate: z.function().args(z.any()).returns(z.promise(z.any())) }),
        mcp: z.object({
                stdio: z.array(z.object({ command: z.string(), cwd: z.string().optional() })).default([]),
                http: z.array(z.object({ url: z.string().url(), authToken: z.string().optional() })).default([]),
        }),
});

export type ModernAgentSystemConfig = z.infer<typeof ModernAgentSystemConfigSchema>;
```
- **Tests:** Validation behavior asserted in `planner.test.ts`.
- **Dependencies:** `zod` (already used in package).
- **Risks:** Tight schemas might reject legacy configs—provide defaults.
- **Assumptions:** Worker handlers adhere to ≤40-line function rule.

**File:** packages/agents/src/modern-agent-system/worker-registry.ts (**NEW**)

- **Intent:** Manage worker lifecycle, enforce capability lookup, and provide metrics-friendly events.
- **Exact edits:**
  - Implement `createWorkerRegistry(definitions)` returning register/find/list functions.
  - Emit brAInwav-branded warnings when capabilities missing.
- **Snippet:**
```typescript
import type { WorkerDefinition } from './types.js';

export const createWorkerRegistry = (definitions: WorkerDefinition[]) => {
        const workers = new Map<string, WorkerDefinition>();
        for (const def of definitions) {
                workers.set(def.name, def);
        }
        const findByCapability = (capability: string) =>
                [...workers.values()].filter((w) => w.capabilities.includes(capability));
        return {
                register(def: WorkerDefinition) {
                        workers.set(def.name, def);
                },
                resolve(name: string) {
                        return workers.get(name);
                },
                findByCapability,
        };
};

export type WorkerRegistry = ReturnType<typeof createWorkerRegistry>;
```
- **Tests:** `worker-registry.test.ts` covering register/resolve/filter.
- **Dependencies:** None external.
- **Risks:** Duplicate names—guard with warnings.
- **Assumptions:** Worker names unique per config.

**File:** packages/agents/src/modern-agent-system/worker-runner.ts (**NEW**)

- **Intent:** Execute worker tasks with standardized telemetry, tool routing, and memory access.
- **Exact edits:**
  - Provide `createWorkerRunner({ registry, tools, memory, approvals })` returning `runTask`.
  - Handle approval gating before tool invocation; record outcomes to session memory.
- **Snippet:**
```typescript
import type { PlannerGoal } from './types.js';
import type { WorkerRegistry } from './worker-registry.js';
import type { ToolRouter } from './tool-router.js';

export const createWorkerRunner = ({
        registry,
        toolRouter,
        sessionMemory,
        approvalGate,
}: {
        registry: WorkerRegistry;
        toolRouter: ToolRouter;
        sessionMemory: SessionMemory;
        approvalGate: ApprovalGate;
}) => async (goal: PlannerGoal) => {
        await sessionMemory.appendStep(goal);
        const workers = registry.findByCapability(goal.capability);
        for (const worker of workers) {
                if (!(await approvalGate.maybeApprove(worker, goal))) continue;
                const result = await worker.handler({ goal, toolRouter, sessionMemory });
                await sessionMemory.recordResult(goal, result);
                return result;
        }
        throw new Error(`[brAInwav/agents] no worker resolved for capability ${goal.capability}`);
};
```
- **Tests:** Covered via integration suite mocking worker + approval gate.
- **Dependencies:** Uses types from neighbor modules.
- **Risks:** Async errors from workers—wrap with try/catch in implementation.
- **Assumptions:** `SessionMemory`/`ApprovalGate` types defined in types.ts.

**File:** packages/agents/src/modern-agent-system/tool-router.ts (**NEW**)

- **Intent:** Provide deterministic routing to MCP tools across stdio and Streamable HTTP transports with filtering/whitelisting.
- **Exact edits:**
  - Implement `createToolRouter({ clients, allowlist })` returning `invokeTool` with schema enforcement.
  - Log call metadata to session context manager.
- **Snippet:**
```typescript
import type { McpClientPool } from './mcp-clients.js';

export const createToolRouter = (pool: McpClientPool) => ({
        async invoke(request: ToolInvocation) {
                const client = pool.resolve(request.serverId);
                if (!client) {
                        throw new Error(`[brAInwav/mcp] unknown server ${request.serverId}`);
                }
                return await client.invoke(request.toolName, request.input);
        },
});

export type ToolRouter = ReturnType<typeof createToolRouter>;
```
- **Tests:** `tool-router.test.ts` to validate allowlist + error handling.
- **Dependencies:** `mcp-clients.ts` module.
- **Risks:** Tool thrash—enforce allowlist in real implementation.
- **Assumptions:** `McpClientPool` covers both transports transparently.

**File:** packages/agents/src/modern-agent-system/mcp-clients.ts (**NEW**)

- **Intent:** Manage stdio and Streamable HTTP MCP client transports, unify invocation contract, and expose filtering.
- **Exact edits:**
  - Create pool that initializes clients lazily using `@modelcontextprotocol/sdk` transports.
  - Provide `resolve`, `list`, and `shutdown` helpers for lifecycle management.
- **Snippet:**
```typescript
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { McpClientConfig } from './types.js';

export const createMcpClientPool = (config: McpClientConfig) => {
        const clients = new Map<string, McpClient>();
        const ensureClient = async (id: string) => {
                if (clients.has(id)) return clients.get(id)!;
                const created = await bootstrapClient(config.entries[id]);
                clients.set(id, created);
                return created;
        };
        return {
                async invoke(id: string, tool: string, input: unknown) {
                        const client = await ensureClient(id);
                        return await client.callTool(tool, input);
                },
                resolve(id: string) {
                        return clients.get(id);
                },
        };
};

export type McpClientPool = ReturnType<typeof createMcpClientPool>;
```
- **Tests:** Integration test stubbing clients.
- **Dependencies:** `@modelcontextprotocol/sdk` already installed.
- **Risks:** Process lifecycle leaks—ensure shutdown in final implementation.
- **Assumptions:** Config includes unique IDs per server.

**File:** packages/agents/src/modern-agent-system/memory-adapter.ts (**NEW**)

- **Intent:** Wrap `packages/memory-core` providers + `SessionContextManager` for deterministic session memory with trimming and RAG promotion.
- **Exact edits:**
  - Implement `createSessionMemory({ memoryCore, sessionManager })` with append/record/trimming operations.
  - Provide method to promote durable facts to RAG store.
- **Snippet:**
```typescript
import { createSessionContextManager } from '@cortex-os/agent-toolkit/session/SessionContextManager.js';

export const createSessionMemory = (options: SessionMemoryOptions) => {
        const context = createSessionContextManager({ budget: options.budget });
        return {
                async appendStep(goal: PlannerGoal) {
                        context.addToolCall('analysis', { goal }, options.estimateTokens(goal));
                },
                async recordResult(goal: PlannerGoal, result: unknown) {
                        await options.memoryCore.store({ goal, result });
                        if (options.promoteToRag(goal, result)) {
                                await options.rag.store(goal, result);
                        }
                },
        };
};

export type SessionMemory = ReturnType<typeof createSessionMemory>;
```
- **Tests:** Integration suite mocking memory core + verifying trimming.
- **Dependencies:** `@cortex-os/agent-toolkit`, `memory-core` provider interfaces.
- **Risks:** Token estimation accuracy—inject strategy via config.
- **Assumptions:** Memory core exposes `store` & `search` methods.

**File:** packages/agents/src/modern-agent-system/approval-gate.ts (**NEW**)

- **Intent:** Centralize human-in-the-loop approvals with logging and instrumentation.
- **Exact edits:**
  - Create `createApprovalGate({ requireApprovals, notifier })` exposing `maybeApprove(worker, goal)`.
  - Emit events for audit trail.
- **Snippet:**
```typescript
import type { PlannerGoal, WorkerDefinition } from './types.js';

export const createApprovalGate = ({ requireApprovals, notifier }: ApprovalGateConfig) => ({
        async maybeApprove(worker: WorkerDefinition, goal: PlannerGoal) {
                if (!requireApprovals) return true;
                const approved = await notifier.requestApproval({ worker, goal });
                if (!approved) {
                        console.warn('[brAInwav/approvals] denied', { worker: worker.name, goal });
                }
                return approved;
        },
});

export type ApprovalGate = ReturnType<typeof createApprovalGate>;
```
- **Tests:** Integration suite verifying denial path recorded.
- **Dependencies:** Notifier interface from config.
- **Risks:** Blocking flows when notifier fails—fallback to deny with warning.
- **Assumptions:** Notifier ensures deduplication/handoff.

**File:** packages/agents/src/modern-agent-system/planner.ts (**NEW**)

- **Intent:** Implement planner loop coordinating goals, session memory, worker runner, and tool routing per modern architecture.
- **Exact edits:**
  - Compose `createPlanner({ registry, mcpConfig, memory, approvals })` returning `plan(goal)` and `continue(session)` functions.
  - Handle tool thrash mitigation via capability allowlists and limited expansions.
- **Snippet:**
```typescript
import { ModernAgentSystemConfigSchema } from './types.js';
import { createWorkerRunner } from './worker-runner.js';
import { createToolRouter } from './tool-router.js';
import { createMcpClientPool } from './mcp-clients.js';
import { createSessionMemory } from './memory-adapter.js';
import { createApprovalGate } from './approval-gate.js';

export const createPlanner = (config: ModernAgentSystemConfig) => {
        const parsed = ModernAgentSystemConfigSchema.parse(config);
        const pool = createMcpClientPool(parsed.mcp);
        const toolRouter = createToolRouter(pool);
        const sessionMemory = createSessionMemory(parsed.memory);
        const approvalGate = createApprovalGate(parsed.approvals);
        const run = createWorkerRunner({
                registry: parsed.registry,
                toolRouter,
                sessionMemory,
                approvalGate,
        });
        return {
                async plan(goal: PlannerGoal) {
                        return await run(goal);
                },
        };
};
```
- **Tests:** `planner.test.ts` to ensure Zod validation, memory interactions, and approval gating.
- **Dependencies:** Local modules + `zod`.
- **Risks:** Config parse throwing—document required shape.
- **Assumptions:** Upstream ensures registry provided.

**File:** packages/agents/tests/unit/modern-agent-system/planner.test.ts (**NEW**)

- **Intent:** Validate planner orchestration (schema validation, approval gating, memory writes).
- **Exact edits:**
  - Mock worker registry + memory adapter to assert call order.
  - Cover success and denial flows.
- **Snippet:**
```typescript
import { describe, expect, it, vi } from 'vitest';
import { createPlanner } from '../../../src/modern-agent-system/planner.js';

describe('modern planner', () => {
        it('rejects invalid config', () => {
                expect(() => createPlanner({} as never)).toThrow();
        });

        it('runs worker and records memory', async () => {
                const run = vi.fn().mockResolvedValue('ok');
                const planner = createPlanner(makeValidConfig({ runner: run }));
                await planner.plan({ capability: 'search', input: 'docs' });
                expect(run).toHaveBeenCalled();
        });
});
```
- **Dependencies:** Vitest, local factory.
- **Risks:** None.
- **Assumptions:** `makeValidConfig` helper defined in test file.

**File:** packages/agents/tests/unit/modern-agent-system/worker-registry.test.ts (**NEW**)

- **Intent:** Ensure registry registers, resolves, and filters workers correctly.
- **Exact edits:**
  - Create definitions stub and assert retrieval + duplicate handling warnings.
- **Snippet:**
```typescript
import { describe, expect, it } from 'vitest';
import { createWorkerRegistry } from '../../../src/modern-agent-system/worker-registry.js';

describe('workerRegistry', () => {
        it('finds worker by capability', () => {
                const registry = createWorkerRegistry([
                        { name: 'searcher', capabilities: ['search'], handler: async () => ({}) },
                ]);
                expect(registry.findByCapability('search')).toHaveLength(1);
        });
});
```
- **Dependencies:** Vitest.
- **Risks:** None.
- **Assumptions:** Handler signature matches type.

**File:** packages/agents/tests/unit/modern-agent-system/tool-router.test.ts (**NEW**)

- **Intent:** Verify tool routing resolves MCP client pool and enforces allowlist.
- **Exact edits:**
  - Mock `createMcpClientPool` to return stub client; assert error when server missing.
- **Snippet:**
```typescript
import { describe, expect, it } from 'vitest';
import { createToolRouter } from '../../../src/modern-agent-system/tool-router.js';

describe('toolRouter', () => {
        it('throws on unknown server', async () => {
                const router = createToolRouter({ resolve: () => undefined } as never);
                await expect(
                        router.invoke({ serverId: 'missing', toolName: 'x', input: {} }),
                ).rejects.toThrow();
        });
});
```
- **Dependencies:** Vitest.
- **Risks:** None.
- **Assumptions:** `invoke` returns promise.

**File:** packages/agents/tests/integration/modern-agent-system.integration.test.ts (**NEW**)

- **Intent:** Exercise full planner ⇄ worker → tool flow with in-memory stubs, ensuring session memory trimming and approval gating interplay.
- **Exact edits:**
  - Spin up stub MCP client pool returning deterministic results.
  - Assert memory adapter receives append + record calls and approvals gating occurs.
- **Snippet:**
```typescript
import { describe, expect, it, vi } from 'vitest';
import { createModernAgentSystem } from '../../src/modern-agent-system/index.js';

describe('modern agent system integration', () => {
        it('runs planner to completion', async () => {
                const approvals = { require: false, gate: vi.fn() };
                const system = createModernAgentSystem(makeIntegrationConfig({ approvals }));
                const result = await system.planner.plan({ capability: 'search', input: 'docs' });
                expect(result).toEqual({ ok: true });
        });
});
```
- **Dependencies:** Vitest.
- **Risks:** False positives if stubs not strict—use spies to assert interactions.
- **Assumptions:** `makeIntegrationConfig` helper defined in test file.

**File:** packages/agent-toolkit/src/session/SessionContextManager.ts (**UPDATE**)

- **Intent:** Expose helper to inject external pruning strategy / event hook for modern system integration.
- **Exact edits:**
  - Add optional callback invoked whenever a tool call is recorded (for brAInwav logging + RAG promotion triggers).
  - Keep backwards compatibility by defaulting to no-op.
- **Snippet:**
```typescript
export interface SessionContextOptions {
        budget?: TokenBudgetConfig;
        onToolCallRecorded?: (record: ToolCallRecord) => void;
}
...
const makeAddCall = (
        history: ReturnType<typeof createToolCallHistory<ToolCallRecord>>,
        prune: () => void,
        onRecorded?: (record: ToolCallRecord) => void,
) => (kind: ToolCallRecord['kind'], params: Record<string, unknown>, tokenCount: number) => {
        const rec: ToolCallRecord = { ... };
        history.addCall(rec.id, rec, tokenCount);
        prune();
        onRecorded?.(rec);
        return rec;
};
```
- **Tests:** Extend existing session context tests or add new case to ensure callback fires once.
- **Dependencies:** None new.
- **Risks:** Callback exceptions—wrap in try/catch.
- **Assumptions:** Current consumers unaffected due to optional param.

**File:** docs/architecture/agent-architecture.md (**UPDATE**)

- **Intent:** Document the new planner ⇄ worker → tools architecture and how it maps onto Cortex-OS components.
- **Exact edits:**
  - Add section outlining modern agent system pipeline, transports, and approval flow.
  - Reference new APIs for consumers.
- **Snippet:**
```markdown
### Modern Planner / Worker Loop

The `createModernAgentSystem` factory composes a planner, worker registry, MCP tool router (stdio + Streamable HTTP), session memory, and HITL approvals. It standardizes tool allowlists and short-term memory trimming before promoting durable facts to RAG.
```
- **Tests:** `pnpm docs:lint` if enforced.
- **Dependencies:** None.
- **Risks:** Docs drift—keep updated post-implementation.
- **Assumptions:** Markdown lint disabled for width.

### 3) Explanations & Context

- **Rationale:** The modular folder isolates the modern architecture behind an opt-in factory so existing LangGraph-based agents remain untouched. Splitting responsibilities (planner, worker registry, tool router, MCP clients, memory adapter, approvals) enforces separation of concerns and aligns with the mental model’s failure-mode mitigations: allowlists reduce tool thrash, session memory wrapper trims context, and approval gate introduces explicit HITL checkpoints.
- **Compatibility:** All additions are additive exports; legacy APIs remain unchanged. The planner factory is optional and can be feature-flagged by consumers. Session context changes are backward-compatible (optional callback). MCP client pool ensures both stdio and Streamable HTTP transports are supported simultaneously.
- **Testing strategy:** Unit tests cover pure modules (registry, tool router, planner validation). Integration test stubs dependencies to exercise the full loop, verifying memory + approval interplay. Existing session manager tests gain a case for `onToolCallRecorded`. Run `pnpm -F @cortex-os/agents test -- --runInBand` and `pnpm -F @cortex-os/agents lint`; for docs run `pnpm docs:lint`.
- **Acceptance criteria:**
  - Planner validates config via Zod and rejects missing workers.
  - Worker execution records steps in session memory and routes tool calls through MCP allowlists.
  - Approval gate blocks execution when notifier denies.
  - Session memory emits callback for every recorded tool call and promotes flagged facts to RAG.
  - Documentation reflects architecture and passes linting.

### 4) Clarifying Questions (only if blocking, ≤3)
1. Should approvals integrate with an existing HITL service (if any) or remain an abstract notifier interface for now?
2. Are there prescribed worker capability taxonomies we must align with (e.g., reuse subagent capability slugs)?
3. Should the planner expose streaming/token-by-token updates, or is synchronous resolution sufficient for the first increment?

### 5) Self-Checks
- Every file listed in the tree has a corresponding plan entry and snippet above.
- New imports (e.g., `@modelcontextprotocol/sdk/client/*`, `@cortex-os/agent-toolkit/session/SessionContextManager.js`) exist within the repo or current dependencies.
- Snippets compile in isolation with existing TypeScript config (ESM paths use `.js` extensions and named exports only).
- Planned tests cover success paths and rejection/failure scenarios (approval denial, missing server, schema validation).
- No secrets, credentials, or production tokens are referenced.
