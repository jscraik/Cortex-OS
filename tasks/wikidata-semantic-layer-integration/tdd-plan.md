# TDD Plan: Wikidata Semantic Layer Integration

**Task ID**: `wikidata-semantic-layer-integration`  
**Created**: 2025-01-11  
**Status**: Ready for Implementation  
**Estimated Effort**: 16-24 hours  
**PRP Integration**: G2 (Test Plan), G4 (Verification), G6 (Performance)

---

## Task Summary

Implement schema-driven tool discovery for Wikidata MCP connector by adding `ConnectorRemoteToolSchema` to the connector manifest, propagating tool metadata through ASBR service-map, enabling agents to discover and plan multi-step fact-finding workflows (vector search → claims → SPARQL) with full provenance tracking.

---

## PRP Gate Alignment

> **Integration Note**: This task aligns with PRP Runner quality gates to ensure consistent quality standards.

### Enforcement Profile Reference
- **Source**: brAInwav Default Standards (no custom enforcement profile)
- **Coverage Targets**: From PRP G2 (Test Plan gate)
  - Lines: **95%** (brAInwav standard for changed files)
  - Branches: **90%** (brAInwav standard)
  - Functions: **95%** (brAInwav standard)
  - Statements: **95%** (brAInwav standard)
- **Performance Budgets**: From PRP G2/G6
  - Service-map generation: **<50ms** (existing baseline ~10ms)
  - Schema validation: **<1ms** per connector
  - Agent planning: **<100ms** with tool filtering
- **Accessibility Target**: From PRP G2
  - Score: **N/A** (backend-only changes)
  - WCAG Level: AA (brAInwav standard)
  - WCAG Version: 2.2 (brAInwav standard)
- **Security**: brAInwav Zero-Tolerance Policy
  - Critical: **0**
  - High: **0**
  - Medium: **≤5**

### Gate Cross-References
- **G0 (Ideation)**: Blueprint → `tasks/wikidata-semantic-layer-integration/research.md`
- **G1 (Architecture)**: Policy compliance tracked in `feature-spec.md` Architecture section
- **G2 (Test Plan)**: **This document** fulfills test planning requirements
- **G4 (Verification)**: Quality gates defined in Exit Criteria section
- **G6 (Performance)**: Budgets specified in NFR-P-001 through NFR-P-003
- **Evidence Trail**: All artifacts in `tasks/wikidata-semantic-layer-integration/`

---

## Scope & Goals

### In Scope
- ✅ `ConnectorRemoteToolSchema` definition with name, description, tags, scopes
- ✅ Optional `remoteTools` field in manifest and service-map schemas
- ✅ ASBR propagation of remoteTools to service-map
- ✅ Protocol consumer parsing of remoteTools
- ✅ MCP manager tool name normalization
- ✅ Agent registry tool filtering by tags/scopes
- ✅ ExecutionSurfaceAgent three-step workflow planning
- ✅ RAG orchestration with provenance capture
- ✅ brAInwav branding in all outputs and error messages
- ✅ Coverage targets per enforcement profile (95% lines)
- ✅ Graceful degradation (MCP unreachable → local-only)

### Out of Scope
- ❌ Runtime MCP tools/list introspection (deferred to future)
- ❌ UI for tool discovery (backend-only)
- ❌ Matryoshka dimension parameter optimization (uses existing defaults)
- ❌ SPARQL query optimization (uses upstream implementation)
- ❌ Multi-connector orchestration (single Wikidata connector focus)

### Success Criteria
1. All tests pass (100% green) across all phases
2. Quality gates pass: `pnpm lint && pnpm test && pnpm security:scan && pnpm structure:validate`
3. Coverage meets/exceeds 95% on changed files
4. Performance budgets satisfied (<50ms service-map, <100ms planning)
5. Security scan clean (zero high-severity findings)
6. Backward compatibility verified (legacy connectors unchanged)
7. No mock/placeholder code in production paths
8. brAInwav branding consistently applied (service-map, logs, telemetry)
9. Evidence artifacts created in task folder

---

## Prerequisites & Dependencies

### Required Research
- [x] Research document completed: `tasks/wikidata-semantic-layer-integration/research.md`
- [x] Approach selected and approved: Option 1 (Static remoteTools)
- [x] Feature spec completed: `tasks/wikidata-semantic-layer-integration/feature-spec.md`
- [x] Open questions resolved (see research RAID analysis)

### Internal Dependencies
- **Package**: `@cortex-os/asbr-schemas` - Schema definitions (add ConnectorRemoteToolSchema)
- **Package**: `@cortex-os/asbr` - Service-map generation (propagate remoteTools)
- **Package**: `@cortex-os/protocol` - Service-map consumption (parse remoteTools)
- **Package**: `@cortex-os/agents` - Workflow planning (filter by tags/scopes)
- **Package**: `@cortex-os/mcp` - Tool normalization (canonical names)
- **Package**: `@cortex-os/rag` - Provenance orchestration (QID, claim GUID, SPARQL)

### External Dependencies
- **Library**: `zod@3.25.76` - Schema validation - License: MIT ✅ Already in lockfile
- **Service**: Wikidata MCP server (`https://wd-mcp.wmcloud.org/mcp/`) - External, public, read-only

### Environment Setup
```bash
# Standard Cortex-OS development environment
cd /Users/jamiecraik/.Cortex-OS
pnpm install
pnpm readiness:check

# Verify Wikidata MCP server reachable (manual)
curl -I https://wd-mcp.wmcloud.org/mcp/
```

---

## Testing Strategy (Write Tests First!)

> **TDD Mandate**: All tests MUST be written and failing BEFORE implementation begins.
> This section defines the test plan that will drive implementation.

---

## PHASE A: Schema + ASBR + Protocol (Discovery Path)

### Phase A.1: Unit Tests - ConnectorRemoteToolSchema (Write First - RED)

#### Test Suite 1: Schema Validation
**File**: `libs/typescript/asbr-schemas/tests/schemas.test.ts`

**Test Cases**:

1. **Test**: `should accept valid ConnectorRemoteTool with all fields`
   - **Given**: Tool object with `{name: "wikidata.vector_search_items", description: "Vector search", tags: ["vector"], scopes: ["facts"]}`
   - **When**: `ConnectorRemoteToolSchema.parse(tool)` is called
   - **Then**: Parsing succeeds, returns typed object with all fields
   - **Coverage Target**: `ConnectorRemoteToolSchema` definition

2. **Test**: `should accept minimal ConnectorRemoteTool with name only`
   - **Given**: Tool object with `{name: "wikidata.sparql"}`
   - **When**: Schema parses tool
   - **Then**: Succeeds; description/tags/scopes are undefined
   - **Coverage Target**: Optional field handling

3. **Test**: `should reject ConnectorRemoteTool with missing name`
   - **Given**: Tool object `{description: "Missing name", tags: ["test"]}`
   - **When**: Schema validation runs
   - **Then**: Throws ZodError with path `["name"]` and code `"invalid_type"`
   - **Coverage Target**: Required field validation

4. **Test**: `should reject ConnectorRemoteTool with non-string tags`
   - **Given**: Tool object `{name: "test", tags: [123, 456]}`
   - **When**: Schema validation runs
   - **Then**: Throws ZodError indicating array element type mismatch
   - **Coverage Target**: Array element type validation

5. **Test**: `should reject ConnectorRemoteTool with non-array scopes`
   - **Given**: Tool object `{name: "test", scopes: "invalid"}`
   - **When**: Schema validation runs
   - **Then**: Throws ZodError for invalid type
   - **Coverage Target**: Field type validation

6. **Test**: `should reject ConnectorRemoteTool with unknown extra fields (strict mode)`
   - **Given**: Tool object `{name: "test", unknownField: "value"}`
   - **When**: Schema validation runs
   - **Then**: Throws ZodError with code `"unrecognized_keys"`
   - **Coverage Target**: Strict schema enforcement

---

#### Test Suite 2: ConnectorManifestEntry with remoteTools
**File**: `libs/typescript/asbr-schemas/tests/schemas.test.ts`

**Test Cases**:

1. **Test**: `should accept ConnectorManifestEntry with remoteTools array`
   - **Given**: Manifest entry with valid connector fields + `remoteTools: [{name: "wikidata.get_claims"}]`
   - **When**: `ConnectorManifestEntrySchema.parse(entry)` is called
   - **Then**: Succeeds; `entry.remoteTools` is array with 1 element
   - **Coverage Target**: Optional remoteTools field

2. **Test**: `should accept ConnectorManifestEntry with empty remoteTools array`
   - **Given**: Manifest entry with `remoteTools: []`
   - **When**: Schema validation runs
   - **Then**: Succeeds; `entry.remoteTools` equals `[]`
   - **Coverage Target**: Empty array handling

3. **Test**: `should accept ConnectorManifestEntry without remoteTools (legacy)`
   - **Given**: Manifest entry with all required fields, no `remoteTools`
   - **When**: Schema validation runs
   - **Then**: Succeeds; `entry.remoteTools` is undefined
   - **Coverage Target**: Backward compatibility

4. **Test**: `should validate nested ConnectorRemoteTool schemas in remoteTools`
   - **Given**: Manifest entry with `remoteTools: [{description: "Missing name"}]`
   - **When**: Schema validation runs
   - **Then**: Throws ZodError for nested schema violation
   - **Coverage Target**: Nested schema validation

---

#### Test Suite 3: ConnectorServiceEntry with remoteTools
**File**: `libs/typescript/asbr-schemas/tests/schemas.test.ts`

**Test Cases**:

1. **Test**: `should accept ConnectorServiceEntry with remoteTools`
   - **Given**: Service entry with valid fields + `remoteTools: [{name: "wikidata.sparql", tags: ["sparql"]}]`
   - **When**: `ConnectorServiceEntrySchema.parse(entry)` is called
   - **Then**: Succeeds; typed object with remoteTools
   - **Coverage Target**: Service entry remoteTools field

2. **Test**: `should accept ConnectorServiceEntry without remoteTools`
   - **Given**: Service entry with no remoteTools field
   - **When**: Schema validation runs
   - **Then**: Succeeds; backward compatible
   - **Coverage Target**: Optional field on service entry

---

### Phase A.2: Unit Tests - ASBR Propagation (Write First - RED)

#### Test Suite 4: buildConnectorEntry remoteTools Propagation
**File**: `packages/asbr/tests/unit/connectors/remote-tools-propagation.test.ts`

**Test Cases**:

1. **Test**: `should propagate remoteTools from manifest to service entry`
   - **Given**: Manifest with connector containing `remoteTools: [{name: "wikidata.vector_search_items", tags: ["vector"]}]`
   - **When**: `buildConnectorServiceMap(manifest)` is called
   - **Then**: Service-map connector includes `remoteTools` array with tool
   - **Coverage Target**: `buildConnectorEntry()` remoteTools copy logic

2. **Test**: `should omit remoteTools field when manifest has empty array`
   - **Given**: Manifest with connector containing `remoteTools: []`
   - **When**: Service-map is built
   - **Then**: Service entry omits `remoteTools` field (not included in spread)
   - **Coverage Target**: Empty array handling in buildConnectorEntry

3. **Test**: `should omit remoteTools field when manifest has undefined`
   - **Given**: Manifest with connector without `remoteTools` field
   - **When**: Service-map is built
   - **Then**: Service entry omits `remoteTools` field
   - **Coverage Target**: Legacy connector support

4. **Test**: `should deep-clone remoteTools array (no mutation)`
   - **Given**: Manifest with `remoteTools: [tool1, tool2]`
   - **When**: Service-map is built and tool1 is mutated
   - **Then**: Original manifest tools remain unchanged
   - **Coverage Target**: Immutability via `map(tool => ({...tool}))`

---

### Phase A.3: Integration Tests - Service-Map Endpoint (Write First - RED)

#### Test Suite 5: Service-Map API with remoteTools
**File**: `packages/asbr/tests/integration/api-endpoints.test.ts` (extend existing)

**Test Cases**:

1. **Test**: `should include remoteTools in GET /v1/connectors/service-map for Wikidata connector`
   - **Given**: Config manifest includes Wikidata with 4 canonical tools
   - **When**: GET `/v1/connectors/service-map` is called
   - **Then**: Response body `connectors[wikidata].remoteTools` has length 4
   - **And**: First tool has `name: "wikidata.vector_search_items"`
   - **Coverage Target**: End-to-end service-map generation

2. **Test**: `should maintain service-map signature determinism with remoteTools`
   - **Given**: Manifest with remoteTools in stable order
   - **When**: Service-map is generated twice
   - **Then**: Signatures are identical (HMAC-SHA256 stable)
   - **Coverage Target**: Signature stability via sorted keys

3. **Test**: `should omit remoteTools for legacy connectors (Perplexity, GitHub Actions)`
   - **Given**: Manifest includes connectors without remoteTools
   - **When**: Service-map is generated
   - **Then**: Those connectors lack `remoteTools` field
   - **Coverage Target**: Backward compatibility in service-map

---

### Phase A.4: Unit Tests - Protocol Consumer (Write First - RED)

#### Test Suite 6: Protocol Service-Map Parsing
**File**: `packages/protocol/tests/connectors.service-map.test.ts` (extend existing)

**Test Cases**:

1. **Test**: `should parse remoteTools from service-map payload`
   - **Given**: Service-map JSON with connector containing `remoteTools: [{name: "wikidata.get_claims"}]`
   - **When**: Protocol consumer parses payload
   - **Then**: Typed connector object has `remoteTools` array
   - **Coverage Target**: Protocol consumer remoteTools handling

2. **Test**: `should handle missing remoteTools in service-map gracefully`
   - **Given**: Service-map payload with connector lacking `remoteTools`
   - **When**: Parsing occurs
   - **Then**: No error; `remoteTools` field is undefined
   - **Coverage Target**: Optional field parsing

---

## PHASE B: MCP + Agents (Planning Path)

### Phase B.1: Unit Tests - MCP Manager Normalization (Write First - RED)

#### Test Suite 7: Tool Name Normalization
**File**: `packages/mcp/src/connectors/manager.test.ts` (extend existing)

**Test Cases**:

1. **Test**: `should normalize upstream 'vector_search_items' to 'wikidata.vector_search_items'`
   - **Given**: MCP server exposes tool named `vector_search_items`
   - **When**: MCP manager registers Wikidata connector
   - **Then**: Internal registry maps to `wikidata.vector_search_items`
   - **Coverage Target**: Normalization logic in manager

2. **Test**: `should normalize 'get_entity_claims' to 'wikidata.get_claims'`
   - **Given**: Upstream tool `get_entity_claims`
   - **When**: Normalization runs
   - **Then**: Canonical name is `wikidata.get_claims`
   - **Coverage Target**: Variant mapping

3. **Test**: `should normalize 'execute_sparql' to 'wikidata.sparql'`
   - **Given**: Upstream tool `execute_sparql`
   - **When**: Normalization runs
   - **Then**: Canonical name is `wikidata.sparql`
   - **Coverage Target**: SPARQL variant handling

4. **Test**: `should attach correct tags to normalized tools`
   - **Given**: Tool `wikidata.vector_search_items` is normalized
   - **When**: Tags are assigned
   - **Then**: Tool has tags `["vector", "wikidata", "items"]`
   - **Coverage Target**: Tag attachment logic

5. **Test**: `should log normalization with brAInwav context`
   - **Given**: Tool normalization occurs
   - **When**: Logger is inspected
   - **Then**: Log includes `brand: "brAInwav"` and tool name mapping
   - **Coverage Target**: Observability compliance

---

### Phase B.2: Unit Tests - Agent Registry Tool Filtering (Write First - RED)

#### Test Suite 8: Connector Registry with remoteTools
**File**: `packages/agents/tests/connectors/registry.test.ts` (extend existing)

**Test Cases**:

1. **Test**: `should prefer remoteTools from service-map over synthesis`
   - **Given**: Service-map includes Wikidata with `remoteTools: [...]`
   - **When**: Agent registry consumes service-map
   - **Then**: Registry uses service-map tools (not synthesized)
   - **Coverage Target**: Precedence logic in registry

2. **Test**: `should synthesize canonical Wikidata tools when remoteTools absent`
   - **Given**: Service-map includes Wikidata without `remoteTools`
   - **When**: Registry initializes
   - **Then**: Registry synthesizes 4 canonical tools for Wikidata only
   - **Coverage Target**: Synthesis fallback (Wikidata-specific)

3. **Test**: `should leave other connectors unchanged when synthesizing`
   - **Given**: Service-map includes Perplexity without `remoteTools`
   - **When**: Synthesis runs
   - **Then**: Perplexity connector tools remain empty (no synthesis)
   - **Coverage Target**: Connector-specific synthesis

4. **Test**: `should filter tools by tags`
   - **Given**: Registry has tools with tags `["vector"]`, `["claims"]`, `["sparql"]`
   - **When**: Agent filters by tag `"vector"`
   - **Then**: Returns only tools with `"vector"` tag
   - **Coverage Target**: Tag filtering helper

5. **Test**: `should filter tools by scopes`
   - **Given**: Tools with scopes `["facts"]`, `["properties"]`
   - **When**: Agent filters by scope `"facts"`
   - **Then**: Returns tools matching `"facts"` scope
   - **Coverage Target**: Scope filtering helper

---

### Phase B.3: Unit Tests - ExecutionSurfaceAgent Planning (Write First - RED)

#### Test Suite 9: Three-Step Workflow Planning
**File**: `packages/agents/tests/subagents/ExecutionSurfaceAgent.fact-intent.test.ts` (extend existing)

**Test Cases**:

1. **Test**: `should generate three-step plan for fact query intent`
   - **Given**: ExecutionSurfaceAgent receives `FactQueryIntent` for "Einstein's birthplace"
   - **When**: Agent plans workflow using registry tools
   - **Then**: Plan includes 3 steps: Step 1 `wikidata.vector_search_items`, Step 2 `wikidata.get_claims`, Step 3 `wikidata.sparql`
   - **Coverage Target**: Plan generation in ExecutionSurfaceAgent

2. **Test**: `should filter vector search by scope (facts vs properties)`
   - **Given**: Query intent scoped to "properties"
   - **When**: Agent filters tools by scope
   - **Then**: Plan uses `wikidata.vector_search_properties` not `vector_search_items`
   - **Coverage Target**: Scope-aware tool selection

3. **Test**: `should degrade gracefully if SPARQL tool missing`
   - **Given**: Registry lacks `wikidata.sparql` tool
   - **When**: Agent generates plan
   - **Then**: Plan includes only Step 1 (vector) + Step 2 (claims); SPARQL optional
   - **Coverage Target**: Graceful degradation logic

4. **Test**: `should fallback to local-only if all Wikidata tools missing`
   - **Given**: Registry has no Wikidata tools
   - **When**: Agent plans fact query
   - **Then**: Plan falls back to local memory retrieval only
   - **Coverage Target**: Full fallback path

5. **Test**: `should include brAInwav branding in plan metadata`
   - **Given**: Plan is generated
   - **When**: Plan metadata is inspected
   - **Then**: Metadata includes `brand: "brAInwav"`
   - **Coverage Target**: Branding compliance

---

## PHASE C: RAG Orchestration + Provenance (Answering Path)

### Phase C.1: Unit Tests - Agents Shim Routing (Write First - RED)

#### Test Suite 10: Fact Query Routing
**File**: `packages/rag/__tests__/integrations/agents-shim.test.ts` (extend existing)

**Test Cases**:

1. **Test**: `should route fact queries to wikidata.vector_search_items`
   - **Given**: RAG receives fact-scoped query
   - **When**: Agents shim routes query
   - **Then**: Invokes `callTool("wikidata.vector_search_items", {query, scope: "facts"})`
   - **Coverage Target**: Routing logic in agents-shim

2. **Test**: `should apply scope filters to vector search`
   - **Given**: Query scoped to "entities"
   - **When**: Tool call is made
   - **Then**: Parameters include `scope: "entities"`
   - **Coverage Target**: Scope filter application

3. **Test**: `should pass Matryoshka dimension hints if available`
   - **Given**: Connector metadata includes `embeddingDimensions: 1024`
   - **When**: Vector search is invoked
   - **Then**: Parameters include dimension hint (optional)
   - **Coverage Target**: Metadata propagation

---

### Phase C.2: Integration Tests - Remote MCP Orchestration (Write First - RED)

#### Test Suite 11: Multi-Step Wikidata Workflow
**File**: `packages/rag/__tests__/remote-mcp.wikidata-vector.integration.test.ts` (NEW)

**Test Cases**:

1. **Test**: `should execute vector → claims → SPARQL workflow successfully`
   - **Setup**: Mock MCP client returns vector results with QIDs, then claims, then SPARQL metadata
   - **Given**: RAG store receives "Who invented the telephone?" query
   - **When**: Orchestration executes
   - **Then**: 
     - Step 1 invokes `wikidata.vector_search_items`
     - Step 2 invokes `wikidata.get_claims` with top-5 QIDs
     - Step 3 invokes `wikidata.sparql` (optional)
     - Returns results with `metadata.wikidata = {qid, claimGuid, sparql}`
   - **Coverage Target**: Full orchestration in remote-mcp.ts

2. **Test**: `should stitch QIDs and claim GUIDs into metadata`
   - **Given**: Vector search returns `[{qid: "Q34743", score: 0.95}]`
   - **When**: Claims are retrieved for Q34743
   - **Then**: Metadata includes `qid: "Q34743"`, `claimGuid: "Q34743$..."` from claim response
   - **Coverage Target**: Metadata stitching logic

3. **Test**: `should capture SPARQL query text in metadata.wikidata.sparql`
   - **Given**: SPARQL step executes query `SELECT ?inventor WHERE {...}`
   - **When**: Result is returned
   - **Then**: `metadata.wikidata.sparql` contains query text
   - **Coverage Target**: SPARQL capture

4. **Test**: `should fallback to local store when MCP server unreachable`
   - **Setup**: Mock MCP client throws network error
   - **Given**: RAG attempts Wikidata workflow
   - **When**: Network failure occurs
   - **Then**: Falls back to local-only retrieval; logs error with brAInwav context
   - **Coverage Target**: Network error fallback

5. **Test**: `should preserve existing ranking when fallback occurs`
   - **Given**: Local store has results for query
   - **When**: Fallback triggers
   - **Then**: Returns local results in original relevance order
   - **Coverage Target**: Ranking preservation

---

### Phase C.3: Unit Tests - Client Stub Tool Invocation Tracking (Write First - RED)

#### Test Suite 12: MCP Client Stub
**File**: `packages/rag/__tests__/stubs/agent-mcp-client.test.ts` (extend existing)

**Test Cases**:

1. **Test**: `should queue callTool invocations in order`
   - **Given**: Client stub is initialized
   - **When**: `callTool("tool1", {})` then `callTool("tool2", {})` are called
   - **Then**: Queue contains 2 invocations in order
   - **Coverage Target**: Queue management in stub

2. **Test**: `should return mock response for callTool`
   - **Given**: Stub configured with mock response for "wikidata.get_claims"
   - **When**: `callTool("wikidata.get_claims", {qids: ["Q937"]})` is called
   - **Then**: Returns configured mock response
   - **Coverage Target**: Mock response handling

3. **Test**: `should allow assertion on tool call sequence`
   - **Given**: Workflow invokes tools in sequence: vector → claims → sparql
   - **When**: Test asserts on invocation queue
   - **Then**: Queue[0] is vector, Queue[1] is claims, Queue[2] is sparql
   - **Coverage Target**: Assertion helper in stub

---

## Implementation Checklist

> **Order**: Follow this sequence strictly. Each checkbox should be marked when complete.
> **TDD Rule**: Tests are written and RED before implementation begins.

---

### Phase 0: Setup & Scaffolding

- [ ] Verify all packages exist and are buildable
  - [ ] `@cortex-os/asbr-schemas`
  - [ ] `@cortex-os/asbr`
  - [ ] `@cortex-os/protocol`
  - [ ] `@cortex-os/agents`
  - [ ] `@cortex-os/mcp`
  - [ ] `@cortex-os/rag`

- [ ] Set up test configuration (already configured)
  - [x] Vitest configured for TypeScript packages
  - [x] Coverage reporting configured
  - [x] Test fixtures directory structure exists

- [ ] Document initial architecture
  - [x] Feature spec created with architecture diagrams
  - [x] Research document includes design decisions
  - [ ] Update package READMEs as changes are made

---

### Phase A: Schema + ASBR + Protocol (Discovery Path)

#### Phase A.1: Write Failing Tests (RED)

- [ ] Write Test Suite 1: ConnectorRemoteToolSchema validation (6 tests)
  - File: `libs/typescript/asbr-schemas/tests/schemas.test.ts`
  - Run: Verify all 6 tests FAIL

- [ ] Write Test Suite 2: ConnectorManifestEntry with remoteTools (4 tests)
  - File: `libs/typescript/asbr-schemas/tests/schemas.test.ts`
  - Run: Verify all 4 tests FAIL

- [ ] Write Test Suite 3: ConnectorServiceEntry with remoteTools (2 tests)
  - File: `libs/typescript/asbr-schemas/tests/schemas.test.ts`
  - Run: Verify all 2 tests FAIL

- [ ] Write Test Suite 4: ASBR propagation (4 tests)
  - File: `packages/asbr/tests/unit/connectors/remote-tools-propagation.test.ts`
  - Run: Verify all 4 tests FAIL

- [ ] Write Test Suite 5: Service-map endpoint (3 tests)
  - File: `packages/asbr/tests/integration/api-endpoints.test.ts`
  - Run: Verify all 3 tests FAIL

- [ ] Write Test Suite 6: Protocol consumer (2 tests)
  - File: `packages/protocol/tests/connectors.service-map.test.ts`
  - Run: Verify all 2 tests FAIL

**Exit RED Phase**: 21 tests written, all FAILING

---

#### Phase A.2: Implement Minimal Code (GREEN)

- [ ] Implement ConnectorRemoteToolSchema
  - File: `libs/typescript/asbr-schemas/src/index.ts`
  - Add schema definition (≤10 lines)
  - Export type: `ConnectorRemoteTool`
  - Run Test Suite 1: Verify 6 tests PASS

- [ ] Add remoteTools field to ConnectorManifestEntrySchema
  - File: `libs/typescript/asbr-schemas/src/index.ts`
  - Add: `remoteTools: z.array(ConnectorRemoteToolSchema).optional()`
  - Run Test Suite 2: Verify 4 tests PASS

- [ ] Add remoteTools field to ConnectorServiceEntrySchema
  - File: `libs/typescript/asbr-schemas/src/index.ts`
  - Add: `remoteTools: z.array(ConnectorRemoteToolSchema).optional()`
  - Run Test Suite 3: Verify 2 tests PASS

- [ ] Update buildConnectorEntry to propagate remoteTools
  - File: `packages/asbr/src/connectors/manifest.ts`
  - Add spread condition for remoteTools (≤5 lines)
  - Function remains ≤40 lines total
  - Run Test Suite 4: Verify 4 tests PASS

- [ ] Update config manifest with Wikidata tools
  - File: `config/connectors.manifest.json`
  - Add `remoteTools` array to Wikidata connector (4 tools)
  - Validate JSON syntax

- [ ] Verify service-map endpoint includes remoteTools
  - Run Test Suite 5: Verify 3 tests PASS
  - Manual test: `curl http://localhost:3024/v1/connectors/service-map | jq '.connectors[] | select(.id=="wikidata") | .remoteTools'`

- [ ] Update protocol consumer to parse remoteTools
  - File: `packages/protocol/src/connectors/service-map.ts`
  - No code changes needed (Zod automatically parses optional fields)
  - Run Test Suite 6: Verify 2 tests PASS

**Exit GREEN Phase**: All 21 tests PASSING

---

#### Phase A.3: Refactor & Optimize (REFACTOR)

- [ ] Extract schema validation helpers if needed
  - Only if duplication exists (DRY principle)

- [ ] Ensure all functions ≤40 lines
  - Review `buildConnectorEntry`
  - Split if necessary

- [ ] Add JSDoc comments for exported schemas
  - File: `libs/typescript/asbr-schemas/src/index.ts`
  - Document ConnectorRemoteToolSchema purpose and fields

- [ ] Update test fixtures
  - File: `packages/asbr/tests/utils/connectors-manifest.ts`
  - Add fixture with remoteTools for reuse

- [ ] Run full quality suite
  - `pnpm --filter @cortex-os/asbr-schemas lint`
  - `pnpm --filter @cortex-os/asbr-schemas test`
  - `pnpm --filter @cortex-os/asbr lint`
  - `pnpm --filter @cortex-os/asbr test`
  - `pnpm --filter @cortex-os/protocol test`

**Exit REFACTOR Phase**: All tests still PASSING, code clean, quality gates green

---

### Phase B: MCP + Agents (Planning Path)

#### Phase B.1: Write Failing Tests (RED)

- [ ] Write Test Suite 7: MCP manager normalization (5 tests)
  - File: `packages/mcp/src/connectors/manager.test.ts`
  - Run: Verify all 5 tests FAIL

- [ ] Write Test Suite 8: Agent registry filtering (5 tests)
  - File: `packages/agents/tests/connectors/registry.test.ts`
  - Run: Verify all 5 tests FAIL

- [ ] Write Test Suite 9: ExecutionSurfaceAgent planning (5 tests)
  - File: `packages/agents/tests/subagents/ExecutionSurfaceAgent.fact-intent.test.ts`
  - Run: Verify all 5 tests FAIL

**Exit RED Phase**: 15 tests written, all FAILING

---

#### Phase B.2: Implement Minimal Code (GREEN)

- [ ] Implement tool name normalization in MCP manager
  - File: `packages/mcp/src/connectors/manager.ts`
  - Add normalization function (≤30 lines)
  - Map upstream variants to canonical names
  - Attach tags based on tool name
  - Run Test Suite 7: Verify 5 tests PASS

- [ ] Update agent registry to consume remoteTools
  - File: `packages/agents/src/connectors/registry.ts`
  - Add precedence logic (service-map > synthesis)
  - Add Wikidata-specific synthesis fallback (≤20 lines)
  - Add tag/scope filtering helpers (≤15 lines each)
  - Run Test Suite 8: Verify 5 tests PASS

- [ ] Update ExecutionSurfaceAgent for three-step planning
  - File: `packages/agents/src/subagents/ExecutionSurfaceAgent.ts`
  - Add plan generation logic (≤35 lines)
  - Filter tools by scope/tags
  - Generate explicit step sequence
  - Add graceful degradation
  - Run Test Suite 9: Verify 5 tests PASS

**Exit GREEN Phase**: All 15 tests PASSING

---

#### Phase B.3: Refactor & Optimize (REFACTOR)

- [ ] Extract tool normalization to helper function
  - File: `packages/mcp/src/connectors/normalization.ts` (new)
  - Keep helper ≤40 lines

- [ ] Simplify conditional logic in registry
  - Reduce cyclomatic complexity if >10

- [ ] Add OpenTelemetry spans for tool invocations
  - File: `packages/mcp/src/connectors/manager.ts`
  - Add span around callTool with tool name attribute

- [ ] Run full quality suite
  - `pnpm --filter @cortex-os/mcp lint && test`
  - `pnpm --filter @cortex-os/agents lint && test`

**Exit REFACTOR Phase**: All tests PASSING, telemetry added, code clean

---

### Phase C: RAG Orchestration + Provenance (Answering Path)

#### Phase C.1: Write Failing Tests (RED)

- [ ] Write Test Suite 10: Agents shim routing (3 tests)
  - File: `packages/rag/__tests__/integrations/agents-shim.test.ts`
  - Run: Verify all 3 tests FAIL

- [ ] Write Test Suite 11: Remote MCP orchestration (5 tests)
  - File: `packages/rag/__tests__/remote-mcp.wikidata-vector.integration.test.ts` (NEW)
  - Run: Verify all 5 tests FAIL

- [ ] Write Test Suite 12: Client stub tracking (3 tests)
  - File: `packages/rag/__tests__/stubs/agent-mcp-client.test.ts`
  - Run: Verify all 3 tests FAIL

**Exit RED Phase**: 11 tests written, all FAILING

---

#### Phase C.2: Implement Minimal Code (GREEN)

- [ ] Update agents shim for fact query routing
  - File: `packages/rag/src/integrations/agents-shim.ts`
  - Route fact queries to `callTool("wikidata.vector_search_*", ...)`
  - Apply scope filters
  - Pass Matryoshka hints if available
  - Run Test Suite 10: Verify 3 tests PASS

- [ ] Implement remote MCP orchestration
  - File: `packages/rag/src/integrations/remote-mcp.ts`
  - Step 1: Invoke vector search (≤15 lines)
  - Step 2: Invoke claims for top-N QIDs (≤20 lines)
  - Step 3: Invoke SPARQL (optional) (≤10 lines)
  - Stitch metadata: QID, claim GUID, SPARQL
  - Add fallback logic (≤15 lines)
  - Run Test Suite 11: Verify 5 tests PASS

- [ ] Extend client stub for tool invocation tracking
  - File: `packages/rag/src/stubs/agent-mcp-client.ts`
  - Add queue management (≤20 lines)
  - Add inspection helpers
  - Run Test Suite 12: Verify 3 tests PASS

**Exit GREEN Phase**: All 11 tests PASSING

---

#### Phase C.3: Refactor & Optimize (REFACTOR)

- [ ] Extract orchestration steps to composable functions
  - File: `packages/rag/src/integrations/remote-mcp.ts`
  - `executeVectorSearch()`, `retrieveClaims()`, `enrichWithSparql()`
  - Each ≤25 lines

- [ ] Add retry logic with exponential backoff
  - For network failures (wrap MCP calls)
  - Max 3 retries, backoff: 100ms, 200ms, 400ms

- [ ] Add latency metrics
  - Instrument each step with timing spans
  - `wikidata.vector_search.duration_ms` histogram

- [ ] Run full quality suite
  - `pnpm --filter @cortex-os/rag lint && test`
  - `pnpm security:scan` (ensure no new findings)

**Exit REFACTOR Phase**: All tests PASSING, instrumented, resilient

---

### Phase D: Documentation & Final Verification

- [ ] Update connector documentation
  - File: `docs/connectors/README.md`
  - Document `remoteTools` contract
  - Add canonical tool naming conventions
  - Include brAInwav branding examples

- [ ] Update operational runbook
  - File: `docs/runbooks/connectors.md`
  - Add verification steps for Wikidata tools
  - Document manual smoke test commands

- [ ] Update GraphRAG documentation
  - File: `docs/graphrag.md`
  - Clarify vector → claims → SPARQL flow
  - Document provenance metadata structure

- [ ] Run comprehensive verification
  - `pnpm structure:validate`
  - `pnpm security:scan`
  - `pnpm test:coverage` (verify ≥95% on changed files)

- [ ] Manual smoke tests
  - `curl http://localhost:3024/v1/connectors/service-map | jq '.connectors[] | select(.id=="wikidata")'`
  - Verify 4 tools in `remoteTools` array
  - Verify signature is valid hex string

- [ ] Update task artifacts
  - `implementation-log.md`: Document completed steps
  - `lessons-learned.md`: Capture insights from TDD process
  - `verification/`: Store test coverage reports, security scan output

**Exit Phase D**: All documentation updated, smoke tests pass, artifacts complete

---

## Exit Criteria & Quality Gates

### Test Coverage
- [ ] ≥95% line coverage on all changed files
- [ ] ≥90% branch coverage
- [ ] ≥95% function coverage
- [ ] ≥95% statement coverage

### Quality Gates
- [ ] `pnpm lint` passes (zero warnings)
- [ ] `pnpm typecheck` passes (zero errors)
- [ ] `pnpm test` passes (100% green)
- [ ] `pnpm security:scan` passes (zero high-severity)
- [ ] `pnpm structure:validate` passes

### Performance Verification
- [ ] Service-map generation <50ms (measure via test)
- [ ] Schema validation <1ms per connector (measure via benchmark)
- [ ] Agent planning <100ms with tool filtering (measure via test)

### Backward Compatibility
- [ ] Legacy connectors (Perplexity, GitHub Actions) tests still pass
- [ ] Service-map signature remains valid
- [ ] Protocol consumers without remoteTools support still function

### brAInwav Compliance
- [ ] Service-map includes `brand: "brAInwav"`
- [ ] Connector metadata includes `metadata.brand: "brAInwav"`
- [ ] Logs include brAInwav context
- [ ] Telemetry spans include brAInwav tags

### Evidence Artifacts
- [ ] Test coverage report saved to `verification/coverage-report.html`
- [ ] Security scan saved to `verification/security-scan.json`
- [ ] Performance benchmark saved to `verification/performance.json`
- [ ] All test suites documented in `test-logs/`

---

## Risk Mitigation During Implementation

### Risk: Manifest Drift
**Mitigation**: Document operational runbook for quarterly verification; add TODO for advisory validation in future sprint

### Risk: Signature Instability
**Mitigation**: Snapshot tests for service-map signature; verify stable key order in buildConnectorEntry

### Risk: Tool Name Confusion
**Mitigation**: Comprehensive normalization tests for all known variants; log all translations

### Risk: Network Failures
**Mitigation**: Retry logic with exponential backoff; graceful fallback to local-only; alert on repeated failures

### Risk: Coverage Gaps
**Mitigation**: Run `pnpm test:coverage` after each GREEN phase; add tests if coverage drops below 95%

---

## Dependencies on External Services

### Wikidata MCP Server
- **URL**: https://wd-mcp.wmcloud.org/mcp/
- **Availability**: External, best-effort (not SLA'd)
- **Fallback**: Local-only retrieval if unreachable
- **Verification**: Manual curl during smoke tests

### Local Memory API
- **URL**: http://localhost:3002
- **Required**: Yes (for provenance persistence)
- **Fallback**: None (required service)
- **Verification**: Automated in integration tests

---

## Timeline Estimate

- **Phase A** (Schema + ASBR + Protocol): 4-6 hours
  - RED: 1 hour (21 tests)
  - GREEN: 2-3 hours (implementation)
  - REFACTOR: 1-2 hours (cleanup, docs)

- **Phase B** (MCP + Agents): 5-7 hours
  - RED: 1 hour (15 tests)
  - GREEN: 3-4 hours (normalization + planning)
  - REFACTOR: 1-2 hours (telemetry, helpers)

- **Phase C** (RAG + Provenance): 5-7 hours
  - RED: 1 hour (11 tests)
  - GREEN: 3-4 hours (orchestration + fallback)
  - REFACTOR: 1-2 hours (retry, metrics)

- **Phase D** (Docs + Verification): 2-4 hours
  - Documentation: 1-2 hours
  - Verification: 1 hour
  - Smoke tests: 1 hour

**Total Estimated Effort**: 16-24 hours

---

## Approval & Sign-Off

- [ ] Feature spec approved (see `feature-spec.md`)
- [ ] TDD plan reviewed and approved (this document)
- [ ] Implementation checklist acknowledged
- [ ] Ready to proceed to Phase 3 (Implementation)

**Next Step**: Call Vibe Check MCP before beginning Phase A.1 (Write Failing Tests)

---

**Version**: 1.0  
**Last Updated**: 2025-01-11  
**Status**: Ready for Implementation (Pending Vibe Check)  
**Approved By**: [Pending governance review]

Co-authored-by: brAInwav Development Team <dev@brainwav.ai>
