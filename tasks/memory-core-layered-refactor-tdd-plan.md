# TDD Plan: Memory Core Layered Refactor

**Task ID**: `memory-core-layered-refactor`
**Created**: 2025-10-11
**Status**: Draft
**Estimated Effort**: 4-5 days
**PRP Integration**: Supports G1 Architecture, G2 Test Plan, G4 Verification, G6 Performance, G7 Monitoring gates

---

## Task Summary

Implement a layered memory architecture in `@cortex-os/memory-core` that separates short-term, working, procedural, episodic, semantic, and long-term concerns while keeping SQLite as the canonical episodic store and Qdrant for semantic/long-term vectors. Update factory wiring, adapters, and docs to explain when to enable the local MCP server, REST API, and Pieces integration.

---

## PRP Gate Alignment

> **Integration Note**: This task aligns with PRP Runner quality gates to ensure consistent quality standards.

### Enforcement Profile Reference
- **Source**: `packages/workflow-common/src/schemas/enforcement-profile.ts` (default brAInwav profile)
- **Coverage Targets**: From PRP G2 (Test Plan gate)
  - Lines: `95%` (from `enforcementProfile.budgets.coverageLines` defaults)
  - Branches: `95%` (from `enforcementProfile.budgets.coverageBranches` defaults)
  - Functions: 95% (brAInwav standard)
  - Statements: 95% (brAInwav standard)
- **Performance Budgets**: From PRP G2/G6 defaults
  - LCP: `2500ms`
  - TBT: `300ms`
- **Accessibility Target**: From PRP G2 defaults
  - Score: `90`
  - WCAG Level: AA (brAInwav standard)
  - WCAG Version: 2.2 (brAInwav standard)
- **Security**: brAInwav Zero-Tolerance Policy
  - Critical: 0
  - High: 0
  - Medium: ≤5

### Gate Cross-References
- **G0 (Ideation)**: Covered by existing memory-core refactor mandate
- **G1 (Architecture)**: Layered design documented in updated implementation plan & README diagrams
- **G2 (Test Plan)**: This document enumerates test suites and coverage expectations
- **G4 (Verification)**: Lint, test, and coverage automation mapped to acceptance criteria
- **Evidence Trail**: Test logs, coverage, and docs referenced in `reports/` once implementation completes

---

## Scope & Goals

### In Scope
- ✅ Introduce layer-specific interfaces for short-term, working, procedural, episodic, semantic, and long-term memory concerns
- ✅ Refactor `LocalMemoryProvider` to orchestrate those layers and preserve reversible provenance metadata
- ✅ Extend `createMemoryProviderFromEnv` and config parsing to initialise SQLite + Qdrant tiers alongside optional TODO/checklist storage
- ✅ Update MCP/REST/Pieces adapter documentation to define activation order and guardrails
- ✅ Maintain brAInwav logging/branding and telemetry across new components
- ✅ Coverage targets per enforcement profile
- ✅ WCAG 2.2 AA compliance (doc updates follow accessible formatting)

### Out of Scope
- ❌ Building new MCP endpoints beyond existing list/read/search
- ❌ Shipping production migrations for alternative databases (e.g., Postgres)
- ❌ Implementing brand-new ingestion pipelines beyond existing workflows

### Success Criteria
1. All tests pass (100% green)
2. Quality gates pass: `pnpm --filter memory-core lint && pnpm --filter memory-core test && pnpm --filter memory-core typecheck`
3. Coverage meets/exceeds enforcement profile targets (≥95% on changed files)
4. Performance budgets satisfied for Qdrant and SQLite access (validated via existing smoke tests + new latency assertions)
5. Security scan clean (`pnpm security:scan --scope=memory-core`)
6. Constitution compliance verified (brAInwav branding, provenance, retention policies)
7. No mock/placeholder code in production paths
8. brAInwav branding consistently applied in errors/logs
9. Evidence artifacts created and indexed (test logs, coverage summary, updated docs)

---

## Prerequisites & Dependencies

### Required Research
- [x] Review existing `MemoryWorkflowEngine` usage for short-term orchestration
- [x] Analyse current SQLite + Qdrant integration points in `LocalMemoryProvider`
- [x] Review compliance requirements from memory hygiene guidance (source pointers, deletion)
- [ ] Confirm availability of Qdrant collection management utilities for semantic/long-term split

### Internal Dependencies
- **Package**: `@cortex-os/tool-spec` – shared request/response contracts for memory APIs
- **Package**: `@cortex-os/utils` – safeFetch utilities, logging helpers
- **Package**: `@cortex-os/mcp-server` – consumes factory output; requires coordination on config shape changes

### External Dependencies
- **Library**: `better-sqlite3@^9` – episodic store persistence (already in repo)
- **Library**: `@qdrant/js-client-rest@^1` – semantic/long-term vector persistence
- **Service**: Qdrant (>=1.8) – ensures support for payload-based filters required for provenance erasure

### Environment Setup
```bash
pnpm install
# Optional: start local Qdrant for integration tests
./docker/scripts/dev-qdrant-up.sh
# Ensure MEMORY_DB_PATH points to writable sqlite file under repo data/
export MEMORY_DB_PATH="./data/unified-memories.db"
```

---

## Testing Strategy (Write Tests First!)

> **TDD Mandate**: All tests MUST be written and failing BEFORE implementation begins.
> This section defines the test plan that will drive implementation.

### Phase 1: Unit Tests (Write First)

#### Test Suite 1: ShortTermMemoryStore
**File**: `packages/memory-core/__tests__/layers/short-term.store.test.ts`

**Test Cases**:

1. **Test**: `should create isolated working session state via MemoryWorkflowEngine`
   - **Given**: a ShortTermMemoryStore with mocked `MemoryWorkflowEngine`
   - **When**: storing a payload
   - **Then**: returns generated id, retains data in in-memory map, and no SQLite writes occur
   - **Coverage Target**: `ShortTermMemoryStore.store`, `ShortTermMemoryStore.flush`

2. **Test**: `should discard expired short-term entries on flush`
   - **Given**: store seeded with timestamped entries beyond TTL
   - **When**: `flushExpired()` invoked
   - **Then**: entries removed and metrics/log events emitted with brAInwav branding

3. **Test**: `should convert checkpoints to short-term snapshot`
   - **Given**: stubbed `CheckpointManager` returning stubbed state
   - **When**: calling `snapshot`
   - **Then**: output matches expected structure with reversible pointer metadata

#### Test Suite 2: WorkingMemoryChecklist
**File**: `packages/memory-core/__tests__/layers/working.checklist.test.ts`

**Test Cases**:
1. **Test**: `should add checklist item and persist via checkpoint`
2. **Test**: `should mark checklist item complete and emit event`
3. **Test**: `should refuse duplicates based on normalized content hash`

#### Test Suite 3: ProceduralMemoryRegistry
**File**: `packages/memory-core/__tests__/layers/procedural.registry.test.ts`

**Test Cases**:
1. `should index markdown files and capture provenance (source_id, hash, loc)`
2. `should skip files without consent metadata` (simulate front-matter requirement)
3. `should refresh index when source version hash changes`

#### Test Suite 4: EpisodicMemoryStore (SQLite)
**File**: `packages/memory-core/__tests__/layers/episodic.sqlite.test.ts`

**Test Cases**:
1. `should persist episodic record with reversible pointer metadata`
2. `should enforce tenant/label normalization`
3. `should support eraseBySourceId cascading to Qdrant payload references`

#### Test Suite 5: SemanticLongTermMemoryStore (Qdrant)
**File**: `packages/memory-core/__tests__/layers/semantic.qdrant.test.ts`

**Test Cases**:
1. `should upsert embeddings into semantic collection`
2. `should route high-importance memories into long-term collection`
3. `should delete both semantic + long-term vectors on erasure`

### Phase 2: Integration Tests (Write First)

#### Integration Test 1: MemoryLayerOrchestrator end-to-end
**File**: `packages/memory-core/__tests__/orchestrator.integration.test.ts`

**Scenario**: storing memory flows through short-term → episodic → semantic/long-term based on importance

**Test Cases**:
1. `should promote from short-term to episodic and semantic layers on persist`
2. `should bypass persistence when configured as short-term only`
3. `should merge procedural + episodic hits during search with provenance payload`
4. `should honour deletion by source_id across all layers`

#### Integration Test 2: createMemoryProviderFromEnv factory
**File**: `packages/memory-core/__tests__/factory.integration.test.ts`

**Scenario**: environment toggles instantiate appropriate layers and adapters

**Test Cases**:
1. `should create local provider with SQLite episodic + Qdrant semantic when env set`
2. `should wrap remote REST provider when LOCAL_MEMORY_BASE_URL defined`
3. `should attach Pieces adapter when PIECES_MCP_ENABLED=true`

### Phase 3: Contract & Adapter Tests

#### Test Suite: MCP adapter parity
**File**: `packages/memory-core/__tests__/adapters/mcp-parity.test.ts`

**Test Cases**:
1. `should expose MCP resources for list/read/search using layered provider`
2. `should describe activation order (local → REST → Pieces) via health endpoint metadata`

### Phase 4: Documentation Verification

- Add markdown lint checks via `pnpm lint:docs` (if available) or run Vale/markdownlint to ensure accessible formatting
- Manual QA: verify README layering table renders correctly, includes WCAG-compliant headings, and describes MCP/REST/Pieces activation steps

---

## Test Data & Fixtures

- SQLite fixture database seeded via helper `createEphemeralSqlite()` inside tests
- Temporary Qdrant container spun up via `docker-compose -f docker/qdrant-compose.yml up -d` (guard tests with env flag)
- Markdown fixture files placed under `packages/memory-core/testdata/procedural/`
- Checklist fixtures stored under `packages/memory-core/testdata/working/`

---

## Automation & Evidence Collection

- Capture coverage report: `pnpm --filter memory-core test:coverage -- --reporter=json-summary`
- Store integration test logs under `reports/memory-core-layered-refactor/`
- Update `.cortex/evidence-index.json` with references to new test logs and coverage output

---

## Open Questions

1. Do we need distinct Qdrant collections for semantic vs. long-term memories or can a single collection with payload flag suffice?
2. Should procedural markdown indexing respect repo-level consent metadata (front matter) or rely on folder allowlist?
3. What is the retention policy for working-memory checklist items once persisted to episodic store?

---

## Approval Checklist

- [ ] Test suites authored and failing
- [ ] Implementation aligns with layered architecture plan
- [ ] Evidence artifacts captured and indexed
- [ ] Stakeholders sign off on MCP/REST/Pieces activation order documentation

