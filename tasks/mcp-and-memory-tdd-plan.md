# MCP and Memory Refactor - Strict TDD Plan

## Unified Architecture with Agent-Toolkit Integration & Tools Path Resolution

### Quick Reference Checklist

- [x] **Phase 0**: Baseline & Safety Nets (Day 0)
- [x] **Phase 1**: Agent-Toolkit Tools Path Resolution (Days 1-2)
- [ ] **Phase 2**: Memory-Core Hardening & Deduplication (Days 3-4)
- [ ] **Phase 3**: Agent-Toolkit MCP Integration (Days 5-6)
- [ ] **Phase 4**: MCP Server as Thin Adapter (Day 7)
- [ ] **Phase 5**: REST API as Thin Adapter (Day 8)
- [ ] **Phase 6**: Docker Compose Integration (Day 9)
- [ ] **Phase 7**: CI/CD & Enforcement (Day 10)
- [ ] **Phase 8**: Legacy Code Removal & Migration (Day 11)
- [ ] **Phase 9**: Final Integration & Documentation (Day 12)

### Status Snapshot (2025-10-01)

- Phase 2.1 closed on 2025-10-01: duplicate adapters under `packages/memories` and `packages/rag` remain removed and are enforced by `simple-tests/no-memories-import.test.ts` and `simple-tests/rag-adapters-removed.test.ts`.
- `LocalMemoryAdapter` now proxies every memory-core REST endpoint (store/search/get/delete/analysis/relationships/stats/health/cleanup/optimize) and returns FastMCP v3 response envelopes; `InMemoryMemoryAdapter`/`ResilientMemoryAdapter` were removed along with the `CORTEX_MCP_ALLOW_INPROCESS_MEMORY` escape hatch.
- `apps/cortex-os` `provideMemories()` instantiates the Remote Memory service against `LOCAL_MEMORY_BASE_URL`; tests currently rely on a fetch stub that covers store/search only, so analysis/relationship/stats paths still need end-to-end coverage.
- `packages/cortex-mcp/tests/test_unit_components.py` and `packages/cortex-mcp/tests/test_server_configuration.py` were updated for the `{ success, data, count }` payloads; rerun with `uv run pytest ...` once virtualenv deps (e.g., `pyjwt`) are present.
- `apps/cortex-os` emits `cortex.mcp.tool.execution.started/completed` events via the A2A bus; remaining Phase 2.3 verification blockers are seeding loopback auth for runtime HTTP tests, hardening `eventManager.emitEvent` validation, and deciding on the memory-core stub vs service strategy.
- Guard targets (`pnpm vitest simple-tests/no-memories-import.test.ts --config simple-tests/vitest.config.ts`, `pnpm nx run simple-tests:memories-guard`) stay green; unrelated simple-tests suites still fail on legacy scripts.

## Critical Architecture Deltas

### Non-Negotiable Changes

1. **Project Memory File (`CLAUDE.md`) is gone** → Replaced by **Local-Memory** (SQLite canonical + Qdrant vectors) with domains (project/session)
2. **ToolEngine/Scheduler runs through the MCP hub** (no bespoke tool runners); tools are **MCP tools**
3. **agent-toolkit** tools are exposed as `agent_toolkit_*` via MCP and resolve scripts from:
   - Priority 1: `$AGENT_TOOLKIT_TOOLS_DIR`
   - Priority 2: `$CORTEX_HOME/tools/agent-toolkit`
   - Priority 3: `$HOME/.Cortex-OS/tools/agent-toolkit` ← **primary path**
   - Priority 4: repo fallback: `packages/agent-toolkit/tools`
4. **A2A events** wrap every tool call (`tool.execution.started/completed`)
5. **No WebSockets** - Dual mode only: **MCP over STDIO** (local) and **HTTP/streamable** (remote)
6. **Fallback rules:** writes always hit SQLite; semantic search uses Qdrant **if up**, else FTS-only

---

## Architecture Overview

### Updated Agent System Flow

```
User Interaction Layer
│
├─ CLI / VS Code / Web UI
│     └─ (local MCP over STDIO → MCP Hub)
│
├─ ChatGPT / External IDEs
│     └─ (remote MCP over HTTP/Streamable → MCP Hub via TLS/Proxy)
│
└─ apps/cortex-os (service)
      └─ (MCP over HTTP/Streamable + emits A2A events)

────────────────────────────────────────────────────────────
               Agent Core & Scheduling (Hub-Centric)
────────────────────────────────────────────────────────────
             ┌──────────────────────────────────────┐
             │  Orchestrator (n0 / LangGraph / TSK) │
             │  - token budget + compressor         │
             │  - streaming out (StreamGen)         │
             └───────────────┬──────────────────────┘
                             │
                 ┌───────────▼───────────┐
                 │  A2A Bus (h2a queue)  │  ← emits:
                 │  - dual-buffer async   │     tool.execution.started
                 │  - correlation IDs     │     tool.execution.completed
                 └───────────┬───────────┘
                             │
                    ┌────────▼────────┐
                    │ ToolEngine/Sched│  (ALL tools via MCP)
                    └───┬───────┬─────┘
                        │       │
      ┌─────────────────▼─┐   ┌─▼───────────────────┐
      │  Tool Layer       │   │  Execution Surfaces  │
      │  (MCP sandboxed)  │   │  (guarded)          │
      │  • View/LS/Glob   │   │  • Filesystem       │
      │  • Grep (rg)      │   │  • Shell/Tests/Git  │
      │  • Edit/Patch     │   │  • Network (limited)│
      │  • Write/Replace  │   └─────────────────────┘
      │  • Batch/Dispatch │
      │  • TodoWrite      │
      │  • NotebookRead/Edit
      │  • Bash (restricted)
      │  • WebFetch (restricted)
      │  • agent_toolkit_*  ← ripgrep/semgrep/ast-grep/comby via scripts
      └─────────────────────┘

────────────────────────────────────────────────────────────
                    Storage & Memory (authoritative)
────────────────────────────────────────────────────────────
   ┌───────────────────────────────────────────────────────┐
   │ Local‑Memory (Memory‑Core API)                        │
   │  • store/search/analysis/relationships/stats          │
   │  • domains: project / session / global                │
   │  • writes → SQLite (canonical)                        │
   │  • semantic → Qdrant (ANN), fallback to FTS if down   │
   └───────────┬──────────────────────────┬────────────────┘
               │                          │
         ┌─────▼─────┐               ┌────▼──────┐
         │  SQLite   │               │  Qdrant   │
         │  unified- │               │  vectors  │
         │  memories │               │  + payload│
         │  FTS5     │               │  filters  │
         └───────────┘               └───────────┘
```

### Local-Memory Integration & Entry Points

```
External Clients
│
├─ MCP Clients (STDIO): Claude Desktop, local IDEs
├─ MCP Clients (HTTP/Streamable): ChatGPT, remote IDEs
└─ REST Clients: Editors / scripts / services

────────────────────────────────────────────────────────────
                  Entry Points (Dual Mode)
────────────────────────────────────────────────────────────
   ┌─────────────────────────────────────────────────────┐
   │ MCP Hub                                             │
   │  • stdio adapter (local)                            │
   │  • httpStream adapter (remote)                      │
   │  • tools exposed:                                   │
   │     - memory.store/search/analysis/relationships…   │
   │     - agent_toolkit_search/multi/codemod/validate…  │
   │  • A2A events emitted                               │
   └───────────┬─────────────────────────────┬───────────┘
               │                             │
        ┌──────▼──────┐                 ┌────▼───────┐
        │ REST API    │                 │ CLI runners │
        │ (OpenAPI)   │                 │ (optional)  │
        └──────┬──────┘                 └────────────┘
               │
────────────────────────────────────────────────────────────
                      Services Layer (Core)
────────────────────────────────────────────────────────────
   ┌─────────────────────────────────────────────────────┐
   │ Memory‑Core API (LocalMemoryProvider)               │
   │  • policy/tags/domains                              │
   │  • hybrid retrieval (ANN + BM25)                    │
   │  • embeddings gen (local)                           │
   │  • governance & quotas (optional)                   │
   └───────────┬───────────────────────────┬────────────┘
               │                           │
         ┌─────▼─────┐                ┌────▼─────┐
         │  SQLite   │                │  Qdrant  │
         │  canonical│                │  ANN     │
         │  FTS5     │                │  filters │
         └───────────┘                └──────────┘

────────────────────────────────────────────────────────────
                   Agent‑Toolkit Resolution
────────────────────────────────────────────────────────────
On startup, toolkit resolves tool scripts in priority order:
  1) $AGENT_TOOLKIT_TOOLS_DIR
  2) $CORTEX_HOME/tools/agent-toolkit
  3) $HOME/.Cortex-OS/tools/agent-toolkit   ← your primary path
  4) repo fallback: packages/agent-toolkit/tools
```

---

## Phase 0: Baseline & Safety Nets (Day 0)

### Tasks

- [x] **0.1** Map existing test coverage to new architecture

  - [x] Document current tests per package
  - [x] Identify which tests map to new architecture
  - [x] Identify gaps that need filling
  - [x] Create `test-matrix.md`

- [x] **0.2** Remove or deprecate duplicate implementations

  - [x] Remove `packages/mcp-server/test-server.js` (if exists)
  - [x] Document deprecation of Python `cortex-mcp` package
  - [x] Mark `packages/memories` stores as legacy

- [x] **0.3** Record baseline test outputs

  ```bash
  pnpm --filter @cortex-os/mcp-server test > baseline-mcp-new.log 2>&1
  pnpm --filter @cortex-os/memory-core test > baseline-core.log 2>&1
  pnpm --filter @cortex-os/memory-rest-api test > baseline-rest.log 2>&1
  pnpm --filter @cortex-os/agent-toolkit test > baseline-toolkit.log 2>&1
  ```

---

## Phase 1: Agent-Toolkit Tools Path Resolution (Days 1-2)

### Implementation Tasks

#### 1.1 Create Path Resolver Module

- [x] Create `packages/agent-toolkit/src/infra/paths.ts`
- [x] Implement `resolveToolsDir()` function with priority order:
  1. `AGENT_TOOLKIT_TOOLS_DIR` (explicit override)
  2. `CORTEX_HOME/tools/agent-toolkit`
  3. `$HOME/.Cortex-OS/tools/agent-toolkit` (your path)
  4. Repo fallback: `packages/agent-toolkit/tools`

#### 1.2 Update All Adapters

- [x] Update `SearchAdapters.ts` to use `resolveToolsDir()`
- [x] Update `CodemodAdapter.ts` to use `resolveToolsDir()`
- [x] Update `ValidateAdapter.ts` to use `resolveToolsDir()`
- [x] Update `CodemapAdapter.ts` to use `resolveToolsDir()`

#### 1.3 Create Tests

- [x] Write `packages/agent-toolkit/src/infra/__tests__/paths.test.ts`
  - [x] Test `AGENT_TOOLKIT_TOOLS_DIR` precedence
  - [x] Test `CORTEX_HOME` usage
  - [x] Test `$HOME/.Cortex-OS` default
  - [x] Test repo fallback
  - [x] Test error when no tools found

- [x] Write adapter integration tests
  - [x] Test each adapter uses resolved path
  - [x] Test scripts are executed from correct location

#### 1.4 CLI Configuration

- [x] Create `scripts/setup-agent-toolkit.sh`
- [x] Set `CORTEX_HOME` and `AGENT_TOOLKIT_TOOLS_DIR` defaults
- [x] Add validation for tools directory existence

#### 1.5 Verification

- [x] Path resolver prefers `$HOME/.Cortex-OS/tools/agent-toolkit`
- [x] All adapters use resolved path
- [x] CLI sets environment variables correctly
- [x] Fallback to repo path works
- [x] Error handling is clear and helpful

---

## Phase 2: Memory-Core Hardening & Deduplication (Days 3-4)

### Implementation Tasks

#### 2.1 Remove Memory Duplications

- [x] Remove/strip `packages/memories/src/adapters/store.sqlite.ts`
- [x] Remove/strip `packages/memories/src/adapters/store.qdrant.ts`
- [x] Remove `packages/memories/src/adapters/hybrid-search.ts`
  - 2025-09-30: Replaced with a legacy guard that throws via `legacyMemoryAdapterRemoved` to enforce use of memory-core.
- [x] Remove/strip `packages/rag/src/adapters/*`
  - 2025-10-01: Directory no longer exists; `simple-tests/rag-adapters-removed.test.ts` enforces absence to prevent regressions.
- [x] Remove `packages/rag-integration.ts`

#### 2.2 Refactor Python Cortex-MCP

- [x] Deprecate `packages/cortex-mcp` (Python)
  - 2025-09-30: Module import now emits a DeprecationWarning and runtime requires `LOCAL_MEMORY_BASE_URL`; the temporary `CORTEX_MCP_ALLOW_INPROCESS_MEMORY` escape hatch was removed on 2025-10-01.
- [x] Refactor to proxy to memory-core HTTP endpoint
  - 2025-10-01: `LocalMemoryAdapter` now forwards store/search/get/delete/analysis/relationships/stats/health/cleanup/optimize calls to the REST API using FastMCP success wrappers.
- [x] Remove in-process fallback path
  - 2025-10-01: Removed `InMemoryMemoryAdapter`, `ResilientMemoryAdapter`, and `CORTEX_MCP_ALLOW_INPROCESS_MEMORY`; HTTP proxy is now mandatory.
- [x] Ensure no duplicate memory logic
  - 2025-10-01: Python package delegates exclusively to memory-core; legacy helpers deleted with the fallback path.

#### 2.3 Update Apps to Use A2A

- [x] Replace mock bus in `apps/cortex-os` with proper A2A core
  - 2025-10-01: `wireA2A()` now builds on `@cortex-os/a2a-core` buses, schema registry, and ACLs without legacy stubs.
- [x] Add A2A event emissions around agent operations
  - 2025-09-30: MCP tool lifecycle now publishes `cortex.mcp.tool.execution.*` envelopes onto the bus and runtime event manager; observability export remains.
- [x] Ensure memory requests go through MCP hub
  - 2025-10-01: `provideMemories()` wraps the Local Memory REST API via `LOCAL_MEMORY_BASE_URL`, with tests stubbing outbound fetch to enforce HTTP proxying.

##### 2.3.1 Loopback Authentication for Runtime HTTP Tests

- [ ] Generate a loopback token during test bootstrap (`apps/cortex-os/tests/setup.global.ts`) and export helpers for HTTP suites.
- [ ] Update all runtime HTTP tests (e.g., `apps/cortex-os/tests/http/runtime-server.test.ts`) to send the header `Authorization: Bearer <loopback-token>`.
- [ ] Verify `pnpm --filter @apps/cortex-os test` now exercises authenticated paths instead of failing 401/404.

##### 2.3.2 Event Manager Validation Hardening

- [ ] Guard `apps/cortex-os/src/events/event-manager.ts` so `emitEvent` enforces required `type` and `payload` structure.
- [ ] Add negative/positive unit coverage in `apps/cortex-os/tests/events/event-manager.test.ts` (or create the suite) ensuring malformed events throw.
- [ ] Re-run focused tests (`pnpm vitest apps/cortex-os/tests/events/event-manager.test.ts --runInBand`) to confirm behavior.

##### 2.3.3 Memory-Core Test Strategy

- [ ] Adopt production-faithful coverage by launching the real memory-core service via Testcontainers (no synthetic stubs beyond network mocking safeguards).
- [ ] Add fixtures that provision memory-core with loopback auth, run migrations, and expose the base URL to runtime HTTP tests.
- [ ] Ensure teardown cleans containers and secrets; cache images where CI allows to keep runtimes acceptable.
- [ ] Update regression suites so Phase 2.3 closes with end-to-end coverage for analysis/relationships/stats/health using the live service.

#### 2.4 Create Tests

- [ ] Write memory deduplication enforcement tests
  - [x] Fail on direct imports from `packages/memories`
    - 2025-09-30: Guard runs via `pnpm vitest simple-tests/no-memories-import.test.ts --config simple-tests/vitest.config.ts`, blocking both package and relative imports with no allowlist.
- [x] Fail on direct imports from `packages/rag`
  - 2025-09-30: Covered by the same guard; use `pnpm nx run simple-tests:memories-guard` in Smart Nx until the broader simple-tests suite is stabilized.
  - [ ] Ensure all ops go through `LocalMemoryProvider`

- [ ] Write A2A integration tests for `apps/cortex-os`
  - [ ] Test `tool.execution.started` events
  - [ ] Test `tool.execution.completed` events
  - [ ] Test correlation IDs

#### 2.5 Verification

- [ ] All tests pass with 95%+ coverage
- [ ] No direct imports of legacy memory stores
- [ ] Python MCP server proxies to memory-core
- [ ] Apps use A2A bus for tool events
- [ ] Performance: store < 50ms, search < 100ms

---

## Phase 3: Agent-Toolkit MCP Integration (Days 5-6)

### Implementation Tasks

#### 3.0 ChatGPT Integration (stdio Transport)

- [x] Create `scripts/start-mcp-server-stdio.sh` for ChatGPT connector
  - 2025-10-01: Completed. Script launches MCP server in stdio mode for ChatGPT integration.
- [x] Document ChatGPT MCP configuration in `packages/mcp-server/docs/chatgpt-integration.md`
  - 2025-10-01: Completed. Full integration guide with troubleshooting and architecture details.
- [x] Add `start:stdio` script to `packages/mcp-server/package.json`
  - 2025-10-01: Already exists. Runs: `node dist/index.js --transport stdio`

**ChatGPT Configuration Example:**

```json
{
  "mcpServers": {
    "cortex-mcp": {
      "command": "/Users/jamiecraik/.Cortex-OS/scripts/start-mcp-server-stdio.sh",
      "env": {
        "LOCAL_MEMORY_BASE_URL": "http://localhost:3028/api/v1"
      }
    }
  }
}
```

#### 3.1 Register MCP Tools

- [ ] Create `packages/mcp-server/src/mcp/agent-toolkit-tools.ts`
- [ ] Register 5 agent-toolkit tools:
  - `agent_toolkit_search`
  - `agent_toolkit_multi_search`
  - `agent_toolkit_codemod`
  - `agent_toolkit_validate`
  - `agent_toolkit_codemap`
  - 2025-10-01: Core memory server now runs on FastMCP v3 (TypeScript). Agent toolkit integration still pending; existing memory.* tools run through FastMCP. ChatGPT stdio integration complete.

#### 3.2 Implement A2A Event Emission

- [x] Update `createAgentToolkit()` to emit events
- [x] Emit `tool.execution.started` with correlation ID
- [x] Emit `tool.execution.completed` with results
- [x] Include tool name and session in events
  - 2025-10-01: `apps/cortex-os` now publishes `cortex.mcp.tool.execution.*` envelopes and records them via the runtime event manager; observability export remains to be wired.

#### 3.3 Add Memory Persistence

- [ ] Store session metadata under `agents:toolkit:session`
- [ ] Persist diagnostics summaries to Local Memory
- [ ] Use `MEMORIES_SHORT_STORE=local` by default
- [ ] Use `LOCAL_MEMORY_BASE_URL` when set
  - 2025-10-01: FastMCP server exposes typed sessions (requestCount, lastAccess); need to persist/inspect via Local Memory.

#### 3.4 Implement Token Budget

- [ ] Create `TokenBudget` interface
- [ ] Enforce 40K token cap
- [ ] Trim to 20K when over limit
- [ ] Track token usage per session
- [ ] Warn when approaching limit

#### 3.5 Add Resilient Executor

- [ ] Implement circuit breaker pattern
- [ ] Add jittered backoff retry
- [ ] Handle concurrent operations safely
- [ ] Add 30 second timeout
- [ ] Preserve context across retries
  - 2025-10-01: FastMCP provides context hooks (progress, logging); resilience still manual.

#### 3.6 Create Tests

- [ ] MCP tool registration tests
- [ ] MCP tool execution tests
- [ ] A2A event emission tests
- [ ] Memory persistence tests
- [ ] Token budget tests
- [ ] Resilient executor tests
- [ ] CLI configuration validation tests

#### 3.7 Verification

- [ ] All agent-toolkit MCP tools registered
- [x] A2A events emitted for all operations (runtime tool envelopes flowing)
- [ ] Session metadata persisted to Local Memory
- [ ] Token budget enforced
- [ ] Circuit breaker and retry working
- [ ] CLI validates configuration
  - 2025-10-01: Need snapshot tests covering new FastMCP prompts/resources and event telemetry.

---

## Phase 4: MCP Server as Thin Adapter (Day 7)

### Implementation Tasks

#### 4.1 Ensure Pure Delegation

- [ ] Remove any business logic from MCP server
- [ ] Ensure pure delegation to memory-core
- [ ] Add agent-toolkit tool routing
- [ ] Remove direct DB/vector operations
- [ ] Add proper error mapping

#### 4.2 Create Tests

- [ ] Tool registration tests (memory + agent-toolkit)
- [ ] Transport tests (STDIO + HTTP)
- [ ] Provider delegation tests
- [ ] Agent-toolkit routing tests

#### 4.3 Verification

- [ ] MCP server has 0 business logic
- [ ] All operations delegate to provider
- [ ] Agent-toolkit tools accessible via MCP
- [ ] STDIO and HTTP transports functional
- [ ] Health checks reflect provider health

---

## Phase 5: REST API as Thin Adapter (Day 8)

### Implementation Tasks

#### 5.1 Ensure Pure Delegation

- [ ] Remove any business logic from REST API
- [ ] Ensure pure delegation to memory-core
- [ ] Add agent-toolkit endpoint routing
- [ ] Add proper HTTP status mapping
- [ ] Implement OpenAPI documentation

#### 5.2 Create Tests

- [ ] Endpoint delegation tests
- [ ] HTTP semantics tests
- [ ] Agent-toolkit endpoint tests

#### 5.3 Verification

- [ ] REST API is a thin wrapper only
- [ ] All endpoints delegate to provider
- [ ] Agent-toolkit endpoints functional
- [ ] Response formats consistent with MCP
- [ ] OpenAPI spec is accurate

---

## Phase 6: Docker Compose Integration (Day 9)

### Deployment Architecture

```
───────────────────────────────────────────────
        Local Deployment (Docker Compose)
───────────────────────────────────────────────

                 ┌───────────────────────────┐
                 │           Clients         │
                 │───────────────────────────│
                 │ - Claude Desktop (local)  │
                 │ - ChatGPT (remote)        │
                 │ - Editors/Tools (REST)    │
                 │ - apps/cortex-os (svc)    │
                 └───────────┬───────────────┘
                             │
───────────────────────────────────────────────
             Service Containers (core)
───────────────────────────────────────────────

   ┌───────────────────────────┐
   │ cortex-mcp (hub)          │
   │───────────────────────────│
   │ - MCP stdio (local)       │
   │ - MCP httpStream (remote) │
   │ - Tools:                  │
   │   • memory.*              │
   │   • agent_toolkit_*       │
   │ - A2A events emit         │
   │ - /healthz, /readyz       │
   └───────────┬───────────────┘
               │  (calls)
   ┌───────────────────────────┐
   │ rest-api                  │
   │───────────────────────────│
   │ - OpenAPI (thin)          │
   │ - Delegates → memory-core │
   │ - /healthz                │
   └───────────┬───────────────┘
               │  (delegates)
   ┌───────────────────────────┐
   │ local-memory              │
   │───────────────────────────│
   │ - Memory-Core API         │
   │ - Uses SQLite (truth)     │
   │ - Qdrant client (ANN)     │
   │ - Embeddings gen          │
   │ - /healthz                │
   └───────────┬───────────────┘
               │
───────────────┼────────────────────────────────
               │
   ┌───────────────────────────┐    ┌───────────────────────────┐
   │ SQLite                    │    │ Qdrant                    │
   │───────────────────────────│    │───────────────────────────│
   │ unified-memories.db       │    │ localhost:6333            │
   │ - Canonical store         │    │ - Vector ANN index        │
   │ - FTS5 keyword search     │    │ - Filters, hybrid (opt.)  │
   └───────────────────────────┘    └───────────────────────────┘

───────────────────────────────────────────────
                Optional/Support
───────────────────────────────────────────────
   ┌───────────────────────────┐
   │ reverse-proxy (Caddy)     │
   │───────────────────────────│
   │ - TLS for remote MCP      │
   │ - Public→cortex-mcp map   │
   └───────────────────────────┘

   ┌───────────────────────────┐
   │ apps-cortex-os (service)  │
   │───────────────────────────│
   │ - Calls MCP httpStream    │
   │ - Emits A2A events        │
   └───────────────────────────┘

   ┌───────────────────────────┐
   │ Agent-toolkit tools (host)│
   │───────────────────────────│
   │ /Users/jamiecraik/        │
   │  .Cortex-OS/tools/        │
   │  agent-toolkit            │
   └───────────────────────────┘
```

### Implementation Tasks

#### 6.1 Create Docker Compose Configuration

- [ ] Create `docker/memory-stack/docker-compose.yml`
- [ ] Define services in dependency order:
  1. `qdrant` (vector database)
  2. `local-memory` (memory-core API)
  3. `cortex-mcp` (MCP hub)
  4. `rest-api` (REST adapter)
  5. `a2a-bus` (NATS for events)
  6. `apps-cortex-os` (service)
- [ ] Configure health checks for all services
- [ ] Set environment variables for each service

#### 6.2 Configure Agent-Toolkit Tools Mount

- [ ] Bind-mount agent-toolkit tools into cortex-mcp container:

  ```
  Host: /Users/jamiecraik/.Cortex-OS/tools/agent-toolkit
  Container: /opt/agent-toolkit/tools
  ```

- [ ] Set `AGENT_TOOLKIT_TOOLS_DIR=/opt/agent-toolkit/tools`

- [ ] Ensure tools are executable in container

#### 6.3 Create Tests

- [ ] Write service health tests
  - [ ] Test `cortex-mcp` waits for `local-memory`
  - [ ] Test `local-memory` waits for `qdrant`
  - [ ] Test `rest-api` waits for `local-memory`
  - [ ] Test all `/healthz` endpoints

- [ ] Write Docker integration tests
  - [ ] Test store and retrieve via MCP
  - [ ] Test store and retrieve via REST
  - [ ] Test agent-toolkit operations
  - [ ] Test data persistence across restarts
  - [ ] Test A2A events flow between services

#### 6.4 Create Reverse Proxy Configuration (Optional)

- [ ] Create `docker/memory-stack/caddy/Caddyfile`
- [ ] Configure TLS termination for remote MCP
- [ ] Map public endpoints to cortex-mcp

#### 6.5 Verification

- [ ] All containers start in correct order
- [ ] Health checks pass (use `depends_on` with `condition: service_healthy`)
- [ ] Data persists across restarts
- [ ] MCP and REST produce identical results
- [ ] Agent-toolkit operations work via mounted tools
- [ ] A2A events flow between services
- [ ] Reverse proxy routes correctly (if configured)

### Docker Compose Configuration Example

```yaml
# docker/memory-stack/docker-compose.yml
version: '3.8'

services:
  qdrant:
    image: qdrant/qdrant:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/data

  local-memory:
    build: ../../packages/memory-core
    environment:
      - MEMORIES_SHORT_STORE=local
      - MEMORY_DB_PATH=/data/unified-memories.db
      - QDRANT_URL=http://qdrant:6333
    depends_on:
      qdrant:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9400/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
    volumes:
      - sqlite_data:/data
      - ~/.Cortex-OS/tools/agent-toolkit:/opt/agent-toolkit/tools:ro

  cortex-mcp:
    build: ../../packages/mcp-server
    environment:
      - LOCAL_MEMORY_BASE_URL=http://local-memory:9400
      - CORTEX_HOME=/root/.Cortex-OS
      - AGENT_TOOLKIT_TOOLS_DIR=/opt/agent-toolkit/tools
      - A2A_BUS_URL=nats://a2a-bus:4222
    depends_on:
      local-memory:
        condition: service_healthy
      a2a-bus:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9600/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
    ports:
      - "3024:3024"  # MCP HTTP
      - "9600:9600"  # MCP HTTP (alternative)
    volumes:
      - ~/.Cortex-OS/tools/agent-toolkit:/opt/agent-toolkit/tools:ro

  rest-api:
    build: ../../packages/memory-rest-api
    environment:
      - LOCAL_MEMORY_BASE_URL=http://local-memory:9400
    depends_on:
      local-memory:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
    ports:
      - "8080:8080"

  a2a-bus:
    image: nats:latest
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8222/varz"]
      interval: 30s
      timeout: 10s
      retries: 3
    ports:
      - "4222:4222"

  apps-cortex-os:
    build: ../../apps/cortex-os
    environment:
      - MCP_BASE_URL=http://cortex-mcp:9600
      - A2A_BUS_URL=nats://a2a-bus:4222
    depends_on:
      cortex-mcp:
        condition: service_healthy
      a2a-bus:
        condition: service_healthy

  reverse-proxy:
    image: caddy:latest
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./caddy/Caddyfile:/etc/caddy/Caddyfile:ro
    depends_on:
      cortex-mcp:
        condition: service_healthy

volumes:
  qdrant_data:
  sqlite_data:
```

### Client Access Patterns

```
Clients & Internal Apps
│
├── Claude Desktop / IDEs
│     └── (MCP over STDIO → cortex-mcp)
│
├── ChatGPT Dev Mode / Responses API
│     └── (MCP over HTTP / Streamable → cortex-mcp)
│
├── apps/cortex-os (runtime)
│     └── (MCP over HTTP / Streamable → cortex-mcp) + (A2A events)
│
└── Editors / Custom Tools
      └── (Direct REST API calls → rest-api)

───────────────────────────────────────────────
                Cortex Hub Layer
───────────────────────────────────────────────
   ┌─────────────────────────────────────────┐
   │      MCP Adapters + REST Adapter        │
   │─────────────────────────────────────────│
   │ MCP Adapter (STDIO)                     │
   │ MCP Adapter (HTTP/Streamable)           │
   │ REST API Adapter                         │
   │─────────────────────────────────────────│
   │ Tools exposed by hub:                   │
   │  • memory.store/search/analysis/…       │
   │  • agent_toolkit_search/multi/codemod/… │
   │─────────────────────────────────────────│
   │ A2A Event Bus (in-process library)      │
   │  • emits: tool.execution.started/completed
   └───────────────┬─────────────────────────┘
                   │ (delegates)
           ┌───────┴────────────────┐
           │   Memory-Core API      │
           │ (LocalMemoryProvider)  │
           └─────────┬──────────────┘
                     │
───────────────────────────────────────────────
              Local Memory Backend
───────────────────────────────────────────────
   ┌───────────────────────────┐
   │ SQLite (unified DB)       │
   │ - Canonical records       │
   │ - FTS5 keyword search     │
   └─────────┬─────────────────┘
             │
   ┌───────────────────────────┐
   │ Qdrant (Vector Index)     │
   │ - ANN semantic search     │
   │ - Payload filters / hybrid│
   │ - Optional; fallback to DB│
   └───────────────────────────┘

───────────────────────────────────────────────
              Agent-Toolkit Tools
───────────────────────────────────────────────
   On-disk tool scripts (resolved in order):
     1) $AGENT_TOOLKIT_TOOLS_DIR
     2) $CORTEX_HOME/tools/agent-toolkit
     3) $HOME/.Cortex-OS/tools/agent-toolkit      ◀─ primary (your path)
     4) repo fallback: packages/agent-toolkit/tools
```

### Deployment Notes

- **All writes → SQLite first (truth)**: Qdrant holds vectors; fallback to SQLite if Qdrant is offline
- **MCP hub is the single entry point**: Adapters are thin (no business logic)
- **Agent-toolkit tools**: Resolved from mounted directory, executed in container context
- **Search behavior**: If Qdrant healthy → semantic/hybrid; otherwise SQLite FTS5
- **No WebSockets**: Only STDIO and HTTP/streamable transports
- **Health checks**: Each service exposes `/healthz` (and `/readyz` where noted)
- **Service order**: Qdrant → local-memory → cortex-mcp → rest-api → apps-cortex-os
- **Remote access**: Reverse proxy terminates TLS and routes to cortex-mcp httpStream
- **Tools mounting**: Host tools directory bind-mounted read-only into containers

---

## Phase 7: CI/CD & Enforcement (Day 10)

### Implementation Tasks

#### 7.1 Create CI Scripts

- [ ] `scripts/ci/memory-enforce.test.sh`
- [ ] `scripts/ci/agent-toolkit-validate.test.sh`
- [ ] `scripts/ci/tools-path-validation.test.sh`

#### 7.2 Update GitHub Actions

- [ ] Add memory-core test job
- [ ] Add tools-path test job
- [ ] Add deduplication test job
- [ ] Add agent-toolkit test job
- [ ] Add A2A integration test job
- [ ] Add Docker stack test job
- [ ] Add governance enforcement job

#### 7.3 Configure Pre-commit Hooks

- [ ] Add `pnpm lint:staged`
- [ ] Add `at:validate:changed`
- [ ] Add `pnpm test:unit:changed`
- [ ] Add `pnpm ci:memory:enforce`
- [ ] Add `pnpm test:tools-path-resolution`

#### 7.4 Verification

- [ ] All CI jobs pass
- [ ] Memory enforcement is mandatory
- [ ] Agent-toolkit validation is mandatory
- [ ] Tools path resolution tested
- [ ] Pre-commit hooks enforce quality
- [ ] Coverage > 95% maintained

---

## Phase 8: Legacy Code Removal & Migration (Day 11)

### Implementation Tasks

#### 8.1 Remove Legacy Code

- [ ] Remove `packages/cortex-mcp` (Python) completely
- [ ] Remove `packages/memories/src/adapters/store.*.ts`
- [ ] Remove `packages/rag/src/adapters/*`
- [ ] Update all imports to use memory-core

#### 8.2 Create Migration Adapters (if needed)

- [ ] Create `MemoryCoreAdapter` for legacy API compatibility
- [ ] Transform legacy format to new format

#### 8.3 Create Tests

- [ ] Legacy import enforcement tests
- [ ] Migration adapter tests

#### 8.4 Verification

- [ ] Legacy code completely removed
- [ ] All imports use memory-core
- [ ] Full test suite passes

---

## Phase 9: Final Integration & Documentation (Day 12)

### Implementation Tasks

#### 9.1 Create Verification Script

- [ ] `scripts/verify-unified-stack.sh`
- [ ] Setup agent-toolkit environment
- [ ] Start Docker stack
- [ ] Run all test suites
- [ ] Verify parity
- [ ] Check architecture compliance

#### 9.2 Update Documentation

- [ ] Architecture diagrams with A2A and agent-toolkit
- [ ] Agent-toolkit integration guide
- [ ] Tools path resolution guide
- [ ] A2A event specification
- [ ] Migration guide from legacy
- [ ] Deployment guide for unified stack
- [ ] CLI usage examples

#### 9.3 Final Acceptance Criteria

- [ ] Single source of truth (memory-core)
- [ ] Thin adapters (MCP + REST + agent-toolkit)
- [ ] No duplicate business logic
- [ ] A2A events flow for all operations
- [ ] Agent-toolkit fully integrated
- [ ] Tools path resolution works with `$HOME/.Cortex-OS`
- [ ] Token budget enforced
- [ ] Docker compose runs cleanly
- [ ] All transports produce identical results
- [ ] 95%+ test coverage
- [ ] Performance benchmarks met
- [ ] CI/CD enforcement active

---

## Success Metrics

1. **Simplicity**: Memory-core contains all business logic
2. **Consistency**: MCP and REST return identical results
3. **Integration**: Agent-toolkit operations work via MCP/A2A
4. **Flexibility**: Tools path resolution supports local installs
5. **Reliability**: Graceful fallback when Qdrant unavailable
6. **Performance**: < 100ms for search operations
7. **Coverage**: 95%+ test coverage across all packages
8. **Compliance**: All governance rules enforced

---

## Key Code Snippets

### Path Resolver

```typescript
// packages/agent-toolkit/src/infra/paths.ts
export async function resolveToolsDir(): Promise<string> {
  const candidates = [
    process.env.AGENT_TOOLKIT_TOOLS_DIR,
    process.env.CORTEX_HOME && join(process.env.CORTEX_HOME, "tools/agent-toolkit"),
    join(homedir(), ".Cortex-OS/tools/agent-toolkit"),
    resolve(process.cwd(), "packages/agent-toolkit/tools"),
  ].filter(Boolean) as string[];

  for (const dir of candidates) {
    try { await access(dir); return dir; } catch {}
  }
  throw new Error("agent-toolkit tools directory not found");
}
```

### Environment Setup

```bash
# scripts/setup-agent-toolkit.sh
export CORTEX_HOME="${CORTEX_HOME:-$HOME/.Cortex-OS}"
export AGENT_TOOLKIT_TOOLS_DIR="${AGENT_TOOLKIT_TOOLS_DIR:-$CORTEX_HOME/tools/agent-toolkit}"
mkdir -p "$AGENT_TOOLKIT_TOOLS_DIR"
```

### MCP Tool Registration

```typescript
// packages/mcp-server/src/mcp/agent-toolkit-tools.ts
for (const tool of createAgentToolkitMcpTools()) {
  server.addTool({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    async execute(args) { return tool.handler(args); }
  });
}
```

---

## Environment Variables

```bash
# Agent-Toolkit
CORTEX_HOME=$HOME/.Cortex-OS
AGENT_TOOLKIT_TOOLS_DIR=$CORTEX_HOME/tools/agent-toolkit

# Memory
MEMORIES_SHORT_STORE=local
LOCAL_MEMORY_BASE_URL=http://localhost:9400
MEMORY_DB_PATH=./data/unified-memories.db

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=...
QDRANT_COLLECTION=local_memory_v1

# A2A
A2A_BUS_URL=nats://localhost:4222
```

---

## Quick Commands

```bash
# Setup environment
source scripts/setup-agent-toolkit.sh

# Run specific test suites
pnpm test:memory-deduplication
pnpm test:agent-toolkit
pnpm test:a2a-integration
pnpm test:tools-path-resolution

# Validate
pnpm at:validate:changed
pnpm ci:memory:enforce
pnpm structure:validate

# Docker
docker compose -f docker/memory-stack/docker-compose.yml up -d
docker compose -f docker/memory-stack/docker-compose.yml down
```

---

## Notes

- This plan ensures we build a unified architecture where memory-core is the single source of truth
- MCP, REST, and agent-toolkit are thin adapters that delegate to memory-core
- Tools path resolution supports local installation at `$HOME/.Cortex-OS/tools/agent-toolkit`
- A2A events provide observability for all operations
- Legacy duplications are eliminated
- CI/CD enforces all quality gates
