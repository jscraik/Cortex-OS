# Cortex-OS ASBR-Lite Refactor TDD Plan

## Purpose

Create a production-grade ASBR-lite runtime under `apps/cortex-os` by:

- Consolidating runtime responsibilities and removing the duplicate `packages/asbr` server.
- Migrating reusable modules (auth, events, config, evidence, SDK pieces) into shared libraries.
- Eliminating mocks/stubs in favor of exercised integrations.
- Updating dependencies to reflect the live implementation only.

Each workstream below follows the **Red → Green → Refactor** loop with concrete tests before implementation.

---

## 0. Readiness & Environment Checklist

- [x] Define temporary workspace root (`$CORTEX_OS_TMP`) for filesystem-based fixtures in tests.
  - `tests/setup.global.ts` now provisions an ephemeral root and cleans it up; XDG helpers respect the variable.
- [x] Ensure OTEL test exporter available (`@opentelemetry/sdk-node` in devDependencies).
  - Already present at repo root (`package.json` + lock). Runtime modules reuse the shared dependency.
- [~] Confirm NATS (or selected bus) test container service reachable in CI.
  - Added `tests/a2a/nats-smoke.test.ts`, which exercises `@testcontainers/nats` when available and skips with a warning otherwise. Requires Docker-enabled environments to install the optional deps.
- [~] Baseline commands (`pnpm test:smart`, `pnpm lint:smart`, `pnpm typecheck:smart`) green before refactor.
  - `pnpm test:smart`/`typecheck:smart` pending run; `lint:smart` currently fails due to pre-existing workspace lint errors (missing `.d.ts` references in `libs/typescript/contracts` etc.). Documented for follow-up outside this TDD scope.

---

## 1. Runtime Bootstrap Consolidation ✅

**Goal**: `startRuntime()` boots HTTP + MCP services using DI-managed singletons.

1. ✅ Integration test `apps/cortex-os/tests/runtime.bootstrap.integration.test.ts` covers `/health`, `/v1/events?stream=sse`, and MCP `/tools` against the live runtime.
2. ✅ Runtime now spins up actual HTTP + MCP servers (`apps/cortex-os/src/http/runtime-server.ts`, `apps/cortex-os/src/mcp/server.ts`) with `listen/close` handles returned from `startRuntime()`.
3. ✅ Container resolves DI singletons before boot; runtime returns `{ httpUrl, mcpUrl, stop }` for graceful shutdown.
4. 🔄 Cleanup of legacy UI/RAG/Simlab boot helpers deferred to later workstreams.

**Notes & Follow-ups**

- Current HTTP server is Node `http` + manual SSE to keep dependencies light; revisit for richer framework if needed.
- In-process A2A emitter is a temporary shim until Workstream 8 wires the real bus.
- Document new runtime surfaces in API docs during API harmonization (Workstream 5).

---

## 2. Authentication & Configuration Migration ✅

**Goal**: Port token-based auth + config management from `packages/asbr`.

Completed work:

- Token lifecycle (generate/validate/revoke/cleanup) landed in `apps/cortex-os/src/security/auth.ts` with coverage via `tests/security/auth.test.ts` (real fs-backed temp dirs).
- XDG helpers (`apps/cortex-os/src/platform/xdg.ts`) now expose config paths under `~/.cortex-os`.
- Auth module exports wired for upcoming HTTP integration; runtime tests green.

Pending (tracked for later workstreams):

- Wire `authenticateRequest` into the incoming REST endpoints once Workstream 5 introduces them.
- Migrate richer config loading (allowlists, policies) alongside policy router work.
- Remove the legacy auth code from `packages/asbr` after dependent modules are migrated.

---

## 3. Event System & Telemetry ✅ (phase 1)

**Goal**: Unified event manager with SSE/WebSocket support + OTEL spans.

Completed in this iteration:

1. Introduced a lightweight event manager (`apps/cortex-os/src/events/event-manager.ts`) that buffers events, persists them to `~/.cortex-os/state/events/ledger.ndjson`, and broadcasts over the runtime SSE stream.
2. Runtime bootstrap now exposes the event manager handle and emits `runtime.started` as a real event.
3. Integration tests (`tests/events/sse.test.ts`) assert SSE delivery and ledger persistence.
4. HTTP server abstraction now supports event broadcasts (`src/http/runtime-server.ts`).

Remaining telemetry follow-ups:

- OTEL spans/exporters still to be wired (future chunk of Workstream 3).
- Removal of legacy event modules in `packages/asbr` scheduled once API migration is complete.

---

## 4. Task, Profile, Artifact, Evidence Persistence

**Goal**: Durable storage across restarts with typed repositories.

Status:

- ✅ Shared schema library (`libs/typescript/asbr-schemas`) now exports all core Zod models + error classes with tests.
- ✅ Filesystem helpers in `apps/cortex-os/src/platform/xdg.ts` expose persistent `config`, `state`, and `data` paths for repositories.
- ✅ JSON store utilities (`apps/cortex-os/src/platform/json-store.ts`) provide atomic writes + graceful reads and power persistence tests.
- ✅ Task repository persisted under `data/tasks/<uuid>.json` with CRUD, idempotency, update/replace semantics, and restart coverage.
- ✅ Profile repository persisted under `data/profiles/<uuid>.json` with CRUD, merge/replace updates, and restart coverage.
- ✅ Artifact repository stores metadata + binary payloads under `data/artifacts/<yyyy-mm-dd>/<uuid>/` with digest/ETag coverage and restart verification.
- ✅ Evidence repository persists records under `data/evidence/<id>.json` with query filters, restart coverage, and optimistic locking hooks.
- ✅ Runtime wiring binds repositories via DI and exposes them through the runtime HTTP server for upcoming API work.
- ✅ Optimistic locking prototype in place (digest comparison on artifact/evidence repositories; hooks ready for task/profile adoption).
- 🔄 Cleanup – remove in-memory maps from `packages/asbr` and document new persistence behaviour once consumers migrate.

Current breakdown:

1. **Repositories & Helpers**
   - Extend XDG helpers to expose `data` paths and directory bootstrap. ✅
   - Build JSON read/write utilities (atomic writes, digests for artifacts). ✅ (artifact digests tracked for future when artifact repo lands)
2. **Task repository** – CRUD + idempotency cache persisted under `data/tasks/<uuid>.json` with restart test coverage. ✅
3. **Profile repository** – storage under `data/profiles/<uuid>.json`, restart coverage. ✅
4. **Artifact repository** – metadata + binary payload directories (`data/artifacts/<yyyy-mm-dd>/<uuid>/`), tests for digest/ETag). ✅
5. **Evidence repository** – record storage/query filters under `data/evidence/...`, restart verification). ✅
6. **Runtime integration** – bind repositories via DI, expose through runtime handle, update tests to use real persistence. ✅
7. **Optimistic locking** – digest comparison surfaced on artifact/evidence repositories with conflict tests. ✅
8. **Cleanup** – remove in-memory maps from `packages/asbr` and document new persistence behaviour. ✅

Dependencies:

- Consider `fs-extra` or native fs wrappers for additional atomic tooling around artifact payload streaming.
- Extend digest-based optimistic locking to task/profile repositories when concurrent mutation workflows materialise.

Output: Local-first durable task/evidence management.

---

## 5. API Surface Harmonization

**Goal**: Single HTTP API implementing ASBR contracts.

Suggested sub-track:

Status:

- ✅ Contract tests now target the live runtime (see `apps/cortex-os/tests/http/api.test.ts`).
- ✅ `/v1/tasks`, `/v1/profiles`, `/v1/artifacts`, `/v1/evidence`, `/health`, and SSE streams handled by the runtime HTTP server with optimistic locking.
- ✅ Rate-limiting + trace propagation tests.
- ✅ Remove the legacy Express server under `packages/asbr` once parity is confirmed.

Dependencies:

- Align documentation `apps/cortex-os/docs/api.md` (and related deployment docs) to the new endpoints and locking semantics.

Output: Production-ready API for second brain.

---

## 6. SDK Alignment

**Goal**: `@cortex-os/asbr` SDK consumes new runtime.

Status:

- 🔄 Update SDK to use node-compatible SSE client; fix helpers (e.g., `createTaskInput` ensures scopes).
- 🔄 Tests running against live runtime: `createTask`, `subscribe`, `listArtifacts`, `upsertProfile`.
- 🔄 Publish SDK type definitions from shared schemas.
- 🔄 Remove legacy SDK entrypoints pointing at old server.

Dependencies:

- Ensure package exports `dist` built via consistent bundler (tsup/rollup).

Output: Developers interact with runtime through updated SDK.

---

## 7. Policy Router & Governance

**Goal**: Enforce contracts/policies per docs.

1. Create `libs/asbr-policy` with policy registry + evaluation hooks.
2. Tests:
   - Unit: policy enabling/disabling, hot reload via config.
   - Integration: policy blocking unsafe workflow emits audit event + 403.
3. Wire router into task creation, MCP tool execution.
4. Document policy configuration in `.cortex/docs`.

Dependencies:

- Add YAML parser or reuse `js-yaml` for policy files.

Output: Runtime enforces governance gates.

---

## 8. A2A Transport Upgrade

**Goal**: Replace in-process bus with real transport + DLQ/outbox.

1. Write failing integration test using NATS test container verifying publish/consume of `cortex.*` events.
2. Configure bus with ACL + schema registry (reuse existing code) and persistence.
3. Ensure MCP audit events emit to bus; add tests.
4. Update deployment docs with transport requirements.

Dependencies:

- Add `nats` client, `testcontainers` (if not present) for integration tests.

Output: Runtime participates in distributed event mesh.

---

## 9. Cleanup & Removal

**Goal**: Remove obsolete code, ensure dependency integrity.

1. Delete remaining runtime code under `packages/asbr` (retain mined libraries moved to `libs/*`).
2. Remove unused feature packages under `apps/cortex-os/packages` or flesh them out with real implementations + tests.
3. Run repo-wide dependency audit, bump versions, prune duplicates, update lockfile.
4. Update docs (README, deployment, roadmap) to reflect new structure.
5. Update `.cortex/readiness.yml` for `apps/cortex-os` with coverage & checklist status.

---

## Traceability & Reporting

- After each workstream: update this plan with status + link to PR/commit.
- Maintain ADRs for major architectural decisions (`project-documentation/design-documentation/`).
- Ensure CI gates (`pnpm biome:staged`, `pnpm lint:smart`, `pnpm test:smart`) run before merges.

## Definition of Done

- `apps/cortex-os` provides the entire ASBR-lite functionality with no dependency on `packages/asbr` runtime code.
- SDK consumers use live endpoints only; no mocks/stubs remain in tests.
- Documentation and readiness files mirror actual behavior.
