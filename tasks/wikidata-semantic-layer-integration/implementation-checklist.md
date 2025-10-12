# Implementation Checklist: Wikidata Semantic Layer Integration

**Task ID**: `wikidata-semantic-layer-integration`  
**Created**: 2025-01-11  
**Status**: Ready (Pending Vibe Check)

---

## Pre-Implementation Requirements

### ✅ Phase 1-2 Complete
- [x] Research document complete (`research.md` - 396 lines)
- [x] Feature spec complete (`feature-spec.md` - 473 lines)
- [x] TDD plan complete (`tdd-plan.md` - 949 lines)
- [ ] **Vibe Check MCP Call** - REQUIRED BEFORE PROCEEDING
- [ ] Feature spec approval (virtual/stakeholder)
- [ ] Memory instructions updated

---

## PHASE A: Schema + ASBR + Protocol (Discovery Path)

### A.1: Schema Definitions (RED → GREEN → REFACTOR)

**Test Suite 1-3**: ConnectorRemoteToolSchema validation (12 tests total)

#### RED Phase - Write Failing Tests
- [ ] Write 6 tests for `ConnectorRemoteToolSchema` validation
  - File: `libs/typescript/asbr-schemas/tests/schemas.test.ts`
  - Tests: valid tool, minimal tool, missing name, non-string tags, non-array scopes, extra fields
  - Run: `pnpm --filter @cortex-os/asbr-schemas test` → EXPECT 6 FAILURES

- [ ] Write 4 tests for `ConnectorManifestEntrySchema.remoteTools`
  - File: `libs/typescript/asbr-schemas/tests/schemas.test.ts`
  - Tests: with remoteTools, empty array, undefined (legacy), nested validation
  - Run: `pnpm --filter @cortex-os/asbr-schemas test` → EXPECT 4 FAILURES

- [ ] Write 2 tests for `ConnectorServiceEntrySchema.remoteTools`
  - File: `libs/typescript/asbr-schemas/tests/schemas.test.ts`
  - Tests: with remoteTools, without remoteTools
  - Run: `pnpm --filter @cortex-os/asbr-schemas test` → EXPECT 2 FAILURES

**Exit RED**: 12 tests written, all FAILING

#### GREEN Phase - Minimal Implementation
- [ ] Define `ConnectorRemoteToolSchema` in `libs/typescript/asbr-schemas/src/index.ts`
  - Schema: `z.object({name, description?, tags?, scopes?}).strict()`
  - Export type: `ConnectorRemoteTool`
  - Lines: ≤10
  - Run: Verify 6 tests PASS

- [ ] Add `remoteTools` field to `ConnectorManifestEntrySchema`
  - Add: `remoteTools: z.array(ConnectorRemoteToolSchema).optional()`
  - Location: After `tags` field, before `.strict()`
  - Run: Verify 4 tests PASS

- [ ] Add `remoteTools` field to `ConnectorServiceEntrySchema`
  - Add: `remoteTools: z.array(ConnectorRemoteToolSchema).optional()`
  - Location: After `timeouts` field, before `.strict()`
  - Run: Verify 2 tests PASS

- [ ] Export `ConnectorRemoteTool` type
  - Add: `export type ConnectorRemoteTool = z.infer<typeof ConnectorRemoteToolSchema>;`
  - Location: After other type exports (~line 415)

**Exit GREEN**: All 12 tests PASSING

#### REFACTOR Phase
- [ ] Add JSDoc comment for `ConnectorRemoteToolSchema`
  - Document: purpose, fields, example usage
  - Include brAInwav context

- [ ] Run quality checks
  - `pnpm --filter @cortex-os/asbr-schemas lint`
  - `pnpm --filter @cortex-os/asbr-schemas typecheck`
  - `pnpm --filter @cortex-os/asbr-schemas test`
  - All must pass

**Exit REFACTOR**: Code clean, documented, all tests passing

---

### A.2: ASBR Propagation (RED → GREEN → REFACTOR)

**Test Suite 4**: buildConnectorEntry propagation (4 tests)

#### RED Phase
- [ ] Create test file `packages/asbr/tests/unit/connectors/remote-tools-propagation.test.ts`
- [ ] Write 4 tests:
  - Propagate remoteTools from manifest to service entry
  - Omit when empty array
  - Omit when undefined
  - Deep clone (no mutation)
- [ ] Run: `pnpm --filter @cortex-os/asbr test remote-tools-propagation` → EXPECT 4 FAILURES

**Exit RED**: 4 tests written, all FAILING

#### GREEN Phase
- [ ] Update `buildConnectorEntry()` in `packages/asbr/src/connectors/manifest.ts`
  - Add spread condition for remoteTools
  - Code: `...(connector.remoteTools && connector.remoteTools.length > 0 ? { remoteTools: connector.remoteTools.map(tool => ({...tool})) } : {}),`
  - Location: After `timeouts` spread, before final `}`
  - Verify function remains ≤40 lines total
  - Run: Verify 4 tests PASS

- [ ] Update `config/connectors.manifest.json`
  - Add `remoteTools` array to Wikidata connector
  - 4 tools: vector_search_items, vector_search_properties, get_claims, sparql
  - Validate JSON syntax: `cat config/connectors.manifest.json | jq .`

**Exit GREEN**: All 4 tests PASSING, config updated

#### REFACTOR Phase
- [ ] Review `buildConnectorEntry` function length
  - If >40 lines, extract helper for remoteTools mapping
  - Ensure named exports only

- [ ] Update test fixture in `packages/asbr/tests/utils/connectors-manifest.ts`
  - Add example connector with remoteTools for reuse

- [ ] Run quality checks
  - `pnpm --filter @cortex-os/asbr lint`
  - `pnpm --filter @cortex-os/asbr test`

**Exit REFACTOR**: Code clean, reusable fixtures, tests passing

---

### A.3: Service-Map Integration (RED → GREEN → REFACTOR)

**Test Suite 5**: Service-map endpoint (3 tests)

#### RED Phase
- [ ] Extend `packages/asbr/tests/integration/api-endpoints.test.ts`
- [ ] Write 3 tests:
  - Service-map includes remoteTools for Wikidata
  - Signature remains deterministic
  - Legacy connectors omit remoteTools
- [ ] Run: `pnpm --filter @cortex-os/asbr test api-endpoints` → EXPECT 3 FAILURES

**Exit RED**: 3 tests written, all FAILING

#### GREEN Phase
- [ ] No code changes needed (propagation happens via buildConnectorEntry)
- [ ] Run tests: Verify 3 tests PASS
- [ ] Manual verification:
  - Start server: `pnpm dev` (or use existing instance)
  - Curl: `curl http://localhost:3024/v1/connectors/service-map | jq '.connectors[] | select(.id=="wikidata") | .remoteTools'`
  - Verify: 4 tools returned with correct structure

**Exit GREEN**: All 3 tests PASSING, manual verification confirms

#### REFACTOR Phase
- [ ] Update existing connector test expectations if needed
  - Ensure Perplexity/GitHub Actions tests don't expect remoteTools

**Exit REFACTOR**: All integration tests passing

---

### A.4: Protocol Consumer (RED → GREEN → REFACTOR)

**Test Suite 6**: Protocol parsing (2 tests)

#### RED Phase
- [ ] Extend `packages/protocol/tests/connectors.service-map.test.ts`
- [ ] Write 2 tests:
  - Parse remoteTools from service-map
  - Handle missing remoteTools gracefully
- [ ] Run: `pnpm --filter @cortex-os/protocol test` → EXPECT 2 FAILURES

**Exit RED**: 2 tests written, all FAILING

#### GREEN Phase
- [ ] No code changes needed in `packages/protocol/src/connectors/service-map.ts`
  - Zod schemas automatically parse optional fields
  - Just ensure ConnectorServiceEntrySchema is imported from @cortex-os/asbr-schemas
- [ ] Run: Verify 2 tests PASS

**Exit GREEN**: All 2 tests PASSING

#### REFACTOR Phase
- [ ] Run quality checks
  - `pnpm --filter @cortex-os/protocol lint && test`

**Exit REFACTOR**: Protocol package clean

---

## PHASE A EXIT CRITERIA

- [ ] All 21 Phase A tests PASSING (12 schema + 4 ASBR + 3 integration + 2 protocol)
- [ ] Coverage ≥95% on changed files
- [ ] `pnpm lint` passes for asbr-schemas, asbr, protocol
- [ ] `pnpm security:scan` clean
- [ ] Config manifest validated (valid JSON, 4 Wikidata tools)
- [ ] Manual smoke test passed (service-map endpoint returns tools)
- [ ] Documentation: Update `implementation-log.md` with Phase A completion

---

## PHASE B: MCP + Agents (Planning Path)

### B.1: MCP Manager Normalization (RED → GREEN → REFACTOR)

**Test Suite 7**: Tool name normalization (5 tests)

#### RED Phase
- [ ] Extend `packages/mcp/src/connectors/manager.test.ts`
- [ ] Write 5 tests:
  - Normalize vector_search_items → wikidata.vector_search_items
  - Normalize get_entity_claims → wikidata.get_claims
  - Normalize execute_sparql → wikidata.sparql
  - Attach correct tags
  - Log normalization with brAInwav context
- [ ] Run: `pnpm --filter @cortex-os/mcp test` → EXPECT 5 FAILURES

**Exit RED**: 5 tests written, all FAILING

#### GREEN Phase
- [ ] Implement normalization in `packages/mcp/src/connectors/manager.ts`
  - Add normalization function (≤30 lines)
  - Regex-based mapping for variants
  - Tag attachment logic
  - Logging with brAInwav context
- [ ] Run: Verify 5 tests PASS

**Exit GREEN**: All 5 tests PASSING

#### REFACTOR Phase
- [ ] Extract normalization to `packages/mcp/src/connectors/normalization.ts` (new file)
  - Keep helper ≤40 lines
  - Export named function `normalizeWikidataToolName()`

- [ ] Run quality checks
  - `pnpm --filter @cortex-os/mcp lint && test`

**Exit REFACTOR**: Normalization extracted, tests passing

---

### B.2: Agent Registry Tool Filtering (RED → GREEN → REFACTOR)

**Test Suite 8**: Registry with remoteTools (5 tests)

#### RED Phase
- [ ] Extend `packages/agents/tests/connectors/registry.test.ts`
- [ ] Write 5 tests:
  - Prefer remoteTools from service-map
  - Synthesize canonical tools when absent (Wikidata only)
  - Leave other connectors unchanged
  - Filter tools by tags
  - Filter tools by scopes
- [ ] Run: `pnpm --filter @cortex-os/agents test registry` → EXPECT 5 FAILURES

**Exit RED**: 5 tests written, all FAILING

#### GREEN Phase
- [ ] Update `packages/agents/src/connectors/registry.ts`
  - Add precedence logic (service-map > synthesis) (≤15 lines)
  - Add Wikidata synthesis fallback (≤20 lines)
  - Add tag filtering helper (≤15 lines)
  - Add scope filtering helper (≤15 lines)
- [ ] Run: Verify 5 tests PASS

**Exit GREEN**: All 5 tests PASSING

#### REFACTOR Phase
- [ ] Extract filtering helpers to separate functions if registry file >200 lines
- [ ] Run quality checks

**Exit REFACTOR**: Registry clean, helpers modular

---

### B.3: ExecutionSurfaceAgent Planning (RED → GREEN → REFACTOR)

**Test Suite 9**: Three-step workflow planning (5 tests)

#### RED Phase
- [ ] Extend `packages/agents/tests/subagents/ExecutionSurfaceAgent.fact-intent.test.ts`
- [ ] Write 5 tests:
  - Generate three-step plan (vector → claims → SPARQL)
  - Filter by scope (facts vs properties)
  - Degrade gracefully if SPARQL missing
  - Fallback to local if all tools missing
  - Include brAInwav branding in plan metadata
- [ ] Run: `pnpm --filter @cortex-os/agents test ExecutionSurfaceAgent` → EXPECT 5 FAILURES

**Exit RED**: 5 tests written, all FAILING

#### GREEN Phase
- [ ] Update `packages/agents/src/subagents/ExecutionSurfaceAgent.ts`
  - Add plan generation logic (≤35 lines)
  - Filter tools by scope/tags
  - Generate explicit step sequence
  - Add graceful degradation
  - Include brAInwav metadata
- [ ] Run: Verify 5 tests PASS

**Exit GREEN**: All 5 tests PASSING

#### REFACTOR Phase
- [ ] Simplify conditional logic (reduce cyclomatic complexity)
- [ ] Add OpenTelemetry spans for planning
- [ ] Run quality checks

**Exit REFACTOR**: Planning logic clean, instrumented

---

## PHASE B EXIT CRITERIA

- [ ] All 15 Phase B tests PASSING (5 MCP + 5 registry + 5 planning)
- [ ] Coverage ≥95% on changed files
- [ ] `pnpm lint && test` passes for mcp, agents
- [ ] Functions all ≤40 lines
- [ ] Telemetry spans added for key operations
- [ ] Documentation: Update `implementation-log.md` with Phase B completion

---

## PHASE C: RAG Orchestration + Provenance (Answering Path)

### C.1: Agents Shim Routing (RED → GREEN → REFACTOR)

**Test Suite 10**: Fact query routing (3 tests)

#### RED Phase
- [ ] Extend `packages/rag/__tests__/integrations/agents-shim.test.ts`
- [ ] Write 3 tests:
  - Route fact queries to wikidata.vector_search_items
  - Apply scope filters
  - Pass Matryoshka dimension hints
- [ ] Run: `pnpm --filter @cortex-os/rag test agents-shim` → EXPECT 3 FAILURES

**Exit RED**: 3 tests written, all FAILING

#### GREEN Phase
- [ ] Update `packages/rag/src/integrations/agents-shim.ts`
  - Route fact queries to callTool (≤15 lines)
  - Apply scope filters
  - Pass dimension hints from metadata
- [ ] Run: Verify 3 tests PASS

**Exit GREEN**: All 3 tests PASSING

#### REFACTOR Phase
- [ ] Extract routing logic to helper if needed
- [ ] Run quality checks

**Exit REFACTOR**: Routing clean

---

### C.2: Remote MCP Orchestration (RED → GREEN → REFACTOR)

**Test Suite 11**: Multi-step workflow (5 tests)

#### RED Phase
- [ ] Create `packages/rag/__tests__/remote-mcp.wikidata-vector.integration.test.ts` (NEW)
- [ ] Write 5 tests:
  - Execute vector → claims → SPARQL workflow
  - Stitch QIDs and claim GUIDs into metadata
  - Capture SPARQL query text
  - Fallback to local on network error
  - Preserve ranking on fallback
- [ ] Run: `pnpm --filter @cortex-os/rag test remote-mcp.wikidata` → EXPECT 5 FAILURES

**Exit RED**: 5 tests written, all FAILING

#### GREEN Phase
- [ ] Update `packages/rag/src/integrations/remote-mcp.ts`
  - Step 1: Invoke vector search (≤15 lines)
  - Step 2: Invoke claims for top-N QIDs (≤20 lines)
  - Step 3: Invoke SPARQL (optional) (≤10 lines)
  - Stitch metadata
  - Add fallback logic (≤15 lines)
- [ ] Run: Verify 5 tests PASS

**Exit GREEN**: All 5 tests PASSING

#### REFACTOR Phase
- [ ] Extract steps to composable functions:
  - `executeVectorSearch()` (≤25 lines)
  - `retrieveClaims()` (≤25 lines)
  - `enrichWithSparql()` (≤25 lines)
- [ ] Add retry logic with exponential backoff
- [ ] Add latency metrics (histograms)
- [ ] Run quality checks

**Exit REFACTOR**: Orchestration clean, resilient, instrumented

---

### C.3: Client Stub Tracking (RED → GREEN → REFACTOR)

**Test Suite 12**: Tool invocation tracking (3 tests)

#### RED Phase
- [ ] Extend `packages/rag/__tests__/stubs/agent-mcp-client.test.ts`
- [ ] Write 3 tests:
  - Queue callTool invocations
  - Return mock responses
  - Assert on invocation sequence
- [ ] Run: `pnpm --filter @cortex-os/rag test agent-mcp-client` → EXPECT 3 FAILURES

**Exit RED**: 3 tests written, all FAILING

#### GREEN Phase
- [ ] Update `packages/rag/src/stubs/agent-mcp-client.ts`
  - Add queue management (≤20 lines)
  - Add inspection helpers
- [ ] Run: Verify 3 tests PASS

**Exit GREEN**: All 3 tests PASSING

#### REFACTOR Phase
- [ ] Simplify stub API if needed
- [ ] Run quality checks

**Exit REFACTOR**: Stub clean

---

## PHASE C EXIT CRITERIA

- [ ] All 11 Phase C tests PASSING (3 shim + 5 orchestration + 3 stub)
- [ ] Coverage ≥95% on changed files
- [ ] `pnpm lint && test` passes for rag
- [ ] Retry logic tested (network failures)
- [ ] Metrics instrumented
- [ ] Documentation: Update `implementation-log.md` with Phase C completion

---

## PHASE D: Documentation & Final Verification

### D.1: Documentation Updates

- [ ] Update `docs/connectors/README.md`
  - Document `remoteTools` contract
  - Add canonical tool naming conventions
  - Include brAInwav branding examples
  - Add example: Wikidata connector with 4 tools

- [ ] Update `docs/runbooks/connectors.md`
  - Add verification steps for Wikidata tools
  - Document manual smoke test commands
  - Add troubleshooting section for tool discovery

- [ ] Update `docs/graphrag.md`
  - Clarify vector → claims → SPARQL flow
  - Document provenance metadata structure
  - Add example query with full provenance

- [ ] Update package READMEs
  - `packages/asbr/README.md`: Document remoteTools propagation
  - `packages/agents/README.md`: Document tool filtering
  - `packages/rag/README.md`: Document Wikidata orchestration

---

### D.2: Verification & Quality Assurance

- [ ] Run full test suite
  - `pnpm test` (all packages)
  - Verify all 47 new tests PASSING (21 + 15 + 11)

- [ ] Run coverage report
  - `pnpm test:coverage`
  - Verify ≥95% on changed files
  - Save report to `verification/coverage-report.html`

- [ ] Run security scan
  - `pnpm security:scan`
  - Verify zero high-severity findings
  - Save report to `verification/security-scan.json`

- [ ] Run structure validation
  - `pnpm structure:validate`
  - Verify clean output

- [ ] Run performance verification
  - Benchmark service-map generation
  - Verify <50ms
  - Save results to `verification/performance.json`

- [ ] Manual smoke tests
  - [ ] Start server: `pnpm dev`
  - [ ] Test service-map endpoint:
    ```bash
    curl http://localhost:3024/v1/connectors/service-map | \
      jq '.connectors[] | select(.id=="wikidata") | {id, remoteTools: .remoteTools | map(.name)}'
    ```
  - [ ] Verify output includes 4 tool names
  - [ ] Verify signature is valid hex string
  - [ ] Test legacy connector (Perplexity): verify no remoteTools field

---

### D.3: Final Artifacts

- [ ] Complete `implementation-log.md`
  - Document all phases completed
  - List all files changed
  - Note any deviations from plan

- [ ] Create `lessons-learned.md`
  - What went well (TDD benefits)
  - What was challenging (normalization complexity)
  - What to improve next time

- [ ] Create `SUMMARY.md`
  - Comprehensive task summary
  - Research findings and decisions
  - Implementation details and challenges
  - Test outcomes and coverage
  - Verification results

- [ ] Store test logs
  - Copy test output to `test-logs/phase-a-tests.log`
  - Copy test output to `test-logs/phase-b-tests.log`
  - Copy test output to `test-logs/phase-c-tests.log`

- [ ] Archive design artifacts
  - Save sequence diagrams to `design/` if created
  - Document architecture decisions

---

## PHASE D EXIT CRITERIA

- [ ] All documentation updated and reviewed
- [ ] All verification steps passed
- [ ] All artifacts created and stored in task folder
- [ ] Manual smoke tests passed
- [ ] Ready for code review and PR submission

---

## Final Checklist (All Phases)

### Quality Gates
- [ ] All 47 tests PASSING (100% green)
- [ ] ≥95% coverage on changed files
- [ ] `pnpm lint` clean (zero warnings)
- [ ] `pnpm typecheck` clean (zero errors)
- [ ] `pnpm security:scan` clean (zero high)
- [ ] `pnpm structure:validate` clean
- [ ] Performance budgets met (<50ms, <100ms)

### Code Standards
- [ ] All functions ≤40 lines
- [ ] Named exports only (no default)
- [ ] Async/await only (no .then() chains)
- [ ] brAInwav branding in all outputs
- [ ] No mock/placeholder code in production

### Documentation
- [ ] Feature spec complete
- [ ] TDD plan complete
- [ ] Implementation log complete
- [ ] Lessons learned complete
- [ ] Task summary complete
- [ ] All docs updated (connectors, runbooks, graphrag)

### Governance
- [ ] Task folder structure compliant
- [ ] Vibe Check MCP called (logged)
- [ ] Memory instructions updated
- [ ] Evidence trail complete

### Readiness for Review
- [ ] All exit criteria met
- [ ] All artifacts in place
- [ ] Ready for PR submission
- [ ] Ready for code review

---

**Total Test Count**: 47 tests (21 Phase A + 15 Phase B + 11 Phase C)  
**Estimated Time**: 16-24 hours  
**Current Status**: Ready (Pending Vibe Check)

Co-authored-by: brAInwav Development Team <dev@brainwav.ai>
