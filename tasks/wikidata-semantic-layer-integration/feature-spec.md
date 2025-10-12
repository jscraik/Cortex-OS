# Feature Specification: Wikidata Semantic Layer Integration

**Task ID**: `wikidata-semantic-layer-integration`  
**Feature Branch**: `feature/wikidata-semantic-layer-integration`  
**Created**: 2025-01-11  
**Status**: Draft  
**Priority**: P1  
**Assignee**: brAInwav AI Agent

**User Request**: 
> Enable brAInwav Cortex-OS agents to leverage Wikidata's semantic knowledge (vector search, claims, SPARQL) for fact-finding workflows with full provenance tracking. Agents should discover available tools through the connector service-map rather than hardcoded heuristics.

---

## Executive Summary

This feature adds schema-driven tool discovery for the Wikidata MCP connector, enabling agents to plan multi-step fact-finding workflows (vector search → claims retrieval → SPARQL provenance) with upfront knowledge of available capabilities. By extending the connector manifest schema with an optional `remoteTools` field, agents gain semantic metadata (tags, scopes) for intelligent routing without sacrificing brAInwav's local-first principles.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1: Agent Tool Discovery from Service-Map (Priority: P1)

**As a** brAInwav orchestration agent,  
**I want to** discover Wikidata's available MCP tools from the connector service-map,  
**So that** I can plan fact-finding workflows without hardcoded tool names.

**Why This Priority**: Core MVP functionality—without tool discovery, agents cannot dynamically adapt to connector capabilities, breaking the extensibility promise of the MCP architecture.

**Independent Test Criteria**: 
Can be fully tested by querying `/v1/connectors/service-map`, inspecting the Wikidata connector entry, and verifying the `remoteTools` array contains the four canonical tools with correct tags/scopes. Delivers standalone value: agents immediately gain tool metadata for planning.

**Acceptance Scenarios**:

1. **Given** the connector manifest includes Wikidata with `remoteTools: [{name: "wikidata.vector_search_items", tags: ["vector"], scopes: ["facts"]}]`  
   **When** an agent requests `/v1/connectors/service-map`  
   **Then** the response includes a Wikidata connector with `remoteTools[0].name === "wikidata.vector_search_items"`  
   **And** the tool has `tags: ["vector", "wikidata", "items"]` and `scopes: ["facts", "entities"]`

2. **Given** a legacy connector (Perplexity) without `remoteTools` in the manifest  
   **When** the service-map is generated  
   **Then** the Perplexity connector entry omits the `remoteTools` field (backward compatible)  
   **And** the service-map signature remains valid

**brAInwav Branding Requirements**:
- Service-map response includes `brand: "brAInwav"` at root
- Connector metadata includes `metadata.brand: "brAInwav"`

---

### User Story 2: Agent Plans Multi-Step Workflow Using Tool Metadata (Priority: P1)

**As a** RAG agent,  
**I want to** filter Wikidata tools by tags and scopes (e.g., "vector" + "facts"),  
**So that** I can construct a three-step workflow: vector search → claims → SPARQL.

**Why This Priority**: Enables intelligent orchestration—agents must route fact queries through appropriate tools based on semantic metadata.

**Independent Test Criteria**: 
Agent receives a "fact query" intent, inspects tool tags/scopes, and generates a plan with explicit tool sequence. Test passes if plan includes all three steps in correct order with appropriate scope filters.

**Acceptance Scenarios**:

1. **Given** ExecutionSurfaceAgent receives a `FactQueryIntent` for "Einstein's birthplace"  
   **When** it plans the workflow using service-map tool metadata  
   **Then** the plan includes Step 1: `wikidata.vector_search_items` (tags include "vector")  
   **And** Step 2: `wikidata.get_claims` (for top-N QIDs)  
   **And** Step 3: `wikidata.sparql` (optional, for provenance enrichment)

2. **Given** a query scoped to "properties" rather than "facts"  
   **When** the agent filters tools by scope  
   **Then** it selects `wikidata.vector_search_properties` instead of `vector_search_items`

**Dependencies**: 
- User Story 1 (service-map tool metadata available)

---

### User Story 3: MCP Manager Normalizes Upstream Tool Names (Priority: P2)

**As a** MCP connector manager,  
**I want to** map upstream tool name variants (`get_entity_claims`, `get_claims`) to the canonical `wikidata.get_claims`,  
**So that** agents use consistent tool identifiers regardless of MCP server variations.

**Why This Priority**: Important for resilience—Wikidata MCP server might use `execute_sparql` while agents expect `wikidata.sparql`. Normalization prevents brittle coupling.

**Independent Test Criteria**: 
MCP manager receives a tool call for `wikidata.get_claims`, translates to upstream `get_entity_claims` if needed, and verifies response. Test passes if translation is bidirectional and logged.

**Acceptance Scenarios**:

1. **Given** MCP server exposes tool named `get_entity_claims`  
   **When** MCP manager registers the Wikidata connector  
   **Then** it maps `get_entity_claims` → `wikidata.get_claims` in the internal registry  
   **And** logs the normalization with brAInwav context

2. **Given** an agent invokes `callTool("wikidata.get_claims", {qids: ["Q937"]})`  
   **When** MCP manager dispatches the call  
   **Then** it translates to upstream `get_entity_claims` if that's the server's name  
   **And** the response is returned under the canonical `wikidata.get_claims` identifier

---

### User Story 4: RAG Orchestration with Provenance Capture (Priority: P2)

**As a** RAG store implementation,  
**I want to** execute the three-step Wikidata workflow and capture provenance metadata (QID, claim GUID, SPARQL),  
**So that** retrieved facts include full attribution for trust and auditability.

**Why This Priority**: Enables cited answers—users can verify facts by following provenance trails to Wikidata source claims.

**Independent Test Criteria**: 
RAG store receives a fact query, orchestrates vector→claims→SPARQL, and returns results with `metadata.wikidata.qid`, `metadata.wikidata.claimGuid`, and `metadata.wikidata.sparql` fields populated. Test passes if metadata survives round-trip through local memory.

**Acceptance Scenarios**:

1. **Given** RAG store receives query "Who invented the telephone?"  
   **When** it orchestrates Wikidata tools  
   **Then** it calls `vector_search_items`, extracts top-5 QIDs  
   **And** calls `get_claims` for each QID  
   **And** optionally calls `sparql` for related provenance  
   **And** returns results with `metadata.wikidata = {qid: "Q34743", claimGuid: "Q34743$...", sparql: "..."}`

2. **Given** the Wikidata MCP server is unreachable  
   **When** RAG store attempts the workflow  
   **Then** it falls back to local-only retrieval  
   **And** logs the fallback with brAInwav context  
   **And** returns results without Wikidata provenance (graceful degradation)

**Dependencies**: 
- User Story 2 (agent planning)
- User Story 3 (tool normalization)

---

## Non-Functional Requirements

### Performance
- **[NFR-P-001]** Service-map generation must remain <50ms (currently ~10ms)
- **[NFR-P-002]** Zod schema validation for `remoteTools` <1ms per connector
- **[NFR-P-003]** Agent tool filtering by tags/scopes must be O(n) where n = tools per connector

### Security
- **[NFR-S-001]** Must pass `pnpm security:scan` with zero high-severity findings
- **[NFR-S-002]** Tool name validation prevents injection (regex: `^[a-z0-9._-]+$`)
- **[NFR-S-003]** Service-map signature remains deterministic (HMAC-SHA256 with stable key order)

### Accessibility (WCAG 2.2 AA)
- **[NFR-A-001]** Not applicable (backend schema changes only; no UI)

### Testing
- **[NFR-T-001]** 95%+ test coverage for changed files
- **[NFR-T-002]** TDD approach: schema tests → ASBR tests → agent tests → RAG tests
- **[NFR-T-003]** Integration tests verify service-map → agent → MCP end-to-end flow

### Observability
- **[NFR-O-001]** OpenTelemetry spans for multi-step Wikidata workflows
- **[NFR-O-002]** Structured logs include `brand: "brAInwav"` and tool invocation sequence
- **[NFR-O-003]** Metrics: `wikidata_tool_calls_total{tool="vector_search_items"}`
- **[NFR-O-004]** Error logs include connector ID, tool name, and upstream response

---

## Technical Constraints

### Must Use
- Named exports only (no `export default`)
- Async/await exclusively (no `.then()` chains)
- Functions ≤ 40 lines (split if longer)
- Zod schemas for input validation (`ConnectorRemoteToolSchema`)
- brAInwav branding in service-map, logs, and telemetry

### Must Avoid
- `Math.random()` for production data
- Mock/placeholder responses in production paths (e.g., "adapters not yet implemented")
- TODO comments in production code
- Direct cross-domain imports (use A2A events or published contracts)
- Secrets in code (N/A for this feature—Wikidata is public)

### Integration Points
- **MCP Tools**: Consumes Wikidata tools (`vector_search_items`, `get_claims`, `sparql`)
- **A2A Events**: Emits `FactQueryIntent` → receives orchestrated results
- **Databases**: Persists provenance metadata in Local Memory SQLite
- **External APIs**: Wikidata MCP server at `https://wd-mcp.wmcloud.org/mcp/`

---

## Architecture & Design

### System Components
```
┌──────────────────────────────────────────────────────────────┐
│                   Connector Manifest (config/)               │
│  {                                                           │
│    "id": "wikidata",                                         │
│    "remoteTools": [                                          │
│      {name: "wikidata.vector_search_items", tags: [...]}    │
│    ]                                                         │
│  }                                                           │
└────────────────────┬─────────────────────────────────────────┘
                     │ (loaded by)
                     ▼
┌──────────────────────────────────────────────────────────────┐
│           ASBR Service (packages/asbr/)                      │
│  - Validates manifest schema                                 │
│  - Propagates remoteTools to service-map                     │
│  - Signs service-map with HMAC-SHA256                        │
└────────────────────┬─────────────────────────────────────────┘
                     │ (publishes to)
                     ▼
┌──────────────────────────────────────────────────────────────┐
│      GET /v1/connectors/service-map                          │
│  {                                                           │
│    "brand": "brAInwav",                                      │
│    "connectors": [{                                          │
│      "id": "wikidata",                                       │
│      "remoteTools": [...]  ← NEW FIELD                       │
│    }],                                                       │
│    "signature": "..."                                        │
│  }                                                           │
└────────────────────┬─────────────────────────────────────────┘
                     │ (consumed by)
                     ▼
┌──────────────────────────────────────────────────────────────┐
│        Agents (packages/agents/)                             │
│  - Connector Registry parses remoteTools                     │
│  - ExecutionSurfaceAgent plans workflow by filtering tags    │
│  - Generates 3-step plan: vector → claims → SPARQL           │
└────────────────────┬─────────────────────────────────────────┘
                     │ (invokes tools via)
                     ▼
┌──────────────────────────────────────────────────────────────┐
│        MCP Manager (packages/mcp/)                           │
│  - Normalizes tool names (upstream → canonical)              │
│  - Dispatches callTool("wikidata.get_claims", ...)           │
└────────────────────┬─────────────────────────────────────────┘
                     │ (retrieves facts via)
                     ▼
┌──────────────────────────────────────────────────────────────┐
│         RAG Store (packages/rag/)                            │
│  - Orchestrates multi-step workflow                          │
│  - Stitches QIDs, claim GUIDs, SPARQL metadata               │
│  - Persists to Local Memory with provenance                  │
└──────────────────────────────────────────────────────────────┘
```

### Data Model

**ConnectorRemoteTool Schema**:
```typescript
export const ConnectorRemoteToolSchema = z
  .object({
    name: z.string().min(1), // Canonical name: "wikidata.vector_search_items"
    description: z.string().optional(), // Human-readable description
    tags: z.array(z.string()).optional(), // ["vector", "wikidata", "items"]
    scopes: z.array(z.string()).optional(), // ["facts", "entities"]
  })
  .strict();

export type ConnectorRemoteTool = z.infer<typeof ConnectorRemoteToolSchema>;
```

**ConnectorManifestEntry Extension**:
```typescript
export const ConnectorManifestEntrySchema = z
  .object({
    // ... existing fields ...
    remoteTools: z.array(ConnectorRemoteToolSchema).optional(), // NEW
  })
  .strict();
```

**ConnectorServiceEntry Extension** (mirrors manifest):
```typescript
export const ConnectorServiceEntrySchema = z
  .object({
    // ... existing fields ...
    remoteTools: z.array(ConnectorRemoteToolSchema).optional(), // NEW
  })
  .strict();
```

### API Contracts

**Service-Map Response** (unchanged endpoint, extended payload):
```json
{
  "id": "01JAG0Y4ZP1XK9YZ2FQ0N3WVCH",
  "brand": "brAInwav",
  "generatedAt": "2025-01-11T00:00:00Z",
  "ttlSeconds": 1800,
  "connectors": [
    {
      "id": "wikidata",
      "version": "2024.09.18",
      "endpoint": "https://wd-mcp.wmcloud.org/mcp/",
      "auth": { "type": "none" },
      "scopes": ["wikidata:vector-search", "wikidata:claims", "wikidata:sparql"],
      "ttlSeconds": 1800,
      "enabled": true,
      "metadata": { "brand": "brAInwav", "dumpDate": "2024-09-18" },
      "remoteTools": [
        {
          "name": "wikidata.vector_search_items",
          "description": "Vector search over Wikidata items using Matryoshka embeddings",
          "tags": ["vector", "wikidata", "items"],
          "scopes": ["facts", "entities"]
        },
        {
          "name": "wikidata.vector_search_properties",
          "description": "Vector search over Wikidata properties",
          "tags": ["vector", "wikidata", "properties"],
          "scopes": ["properties"]
        },
        {
          "name": "wikidata.get_claims",
          "description": "Retrieve claims for Wikidata entities",
          "tags": ["claims", "wikidata", "provenance"]
        },
        {
          "name": "wikidata.sparql",
          "description": "Execute SPARQL queries",
          "tags": ["sparql", "wikidata", "provenance"]
        }
      ]
    }
  ],
  "signature": "..."
}
```

---

## Dependencies

### Internal Dependencies (Cortex-OS packages)
- `@cortex-os/asbr-schemas` - Schema definitions (add `ConnectorRemoteToolSchema`)
- `@cortex-os/asbr` - Service-map generation (propagate `remoteTools`)
- `@cortex-os/protocol` - Service-map consumption (parse `remoteTools`)
- `@cortex-os/agents` - Tool filtering and workflow planning
- `@cortex-os/mcp` - Tool normalization and invocation
- `@cortex-os/rag` - Multi-step orchestration and provenance capture

### External Dependencies (npm/pypi)
- **None new required** - Uses existing Zod 3.25.76

### Service Dependencies
- Wikidata MCP server: `https://wd-mcp.wmcloud.org/mcp/` (external, public)
- Local Memory API: `http://localhost:3002` (internal, required for provenance persistence)

---

## Implementation Phases

### Phase 1: Schema + ASBR + Protocol (P1 Stories 1)
- [x] Research complete (`research.md`)
- [ ] Define `ConnectorRemoteToolSchema` in `@cortex-os/asbr-schemas`
- [ ] Write schema validation tests (RED → GREEN → REFACTOR)
- [ ] Add `remoteTools` field to `ConnectorManifestEntrySchema` and `ConnectorServiceEntrySchema`
- [ ] Update `buildConnectorEntry()` in ASBR to propagate `remoteTools`
- [ ] Verify service-map signature stability (snapshot tests)
- [ ] Update `config/connectors.manifest.json` with Wikidata tools
- [ ] Write ASBR integration test: GET /v1/connectors/service-map includes `remoteTools`
- [ ] Write Protocol consumer test: parse `remoteTools` from service-map payload

**Exit Criteria**: Service-map endpoint returns Wikidata connector with 4 tools; all tests green

### Phase 2: MCP + Agents (P1 Story 2, P2 Story 3)
- [ ] Implement tool normalization in `packages/mcp/src/connectors/manager.ts`
- [ ] Write unit tests for name mapping (upstream variants → canonical)
- [ ] Update `packages/agents/src/connectors/registry.ts` to consume `remoteTools`
- [ ] Implement tool filtering by tags/scopes
- [ ] Update `ExecutionSurfaceAgent.ts` to generate 3-step plans
- [ ] Write agent planning tests (fact intent → explicit tool sequence)
- [ ] Add telemetry for tool invocations (OpenTelemetry spans)

**Exit Criteria**: Agent generates plan with `wikidata.vector_search_items` → `wikidata.get_claims` → `wikidata.sparql`; normalization tests pass

### Phase 3: RAG + Provenance (P2 Story 4)
- [ ] Update `packages/rag/src/integrations/remote-mcp.ts` to orchestrate 3 steps
- [ ] Implement provenance capture (QID, claim GUID, SPARQL in metadata)
- [ ] Write RAG integration test: end-to-end workflow with mocked MCP responses
- [ ] Implement graceful fallback (MCP unreachable → local-only retrieval)
- [ ] Add retry logic with exponential backoff for network failures
- [ ] Update documentation (`docs/connectors/README.md`, `docs/graphrag.md`)

**Exit Criteria**: RAG store returns facts with `metadata.wikidata.*` fields; fallback test passes

---

## Success Metrics

### Quantitative
- [ ] 95%+ test coverage on changed files
- [ ] All quality gates passing (`pnpm lint && pnpm test && pnpm security:scan`)
- [ ] Service-map generation <50ms (performance budget)
- [ ] Zero high-severity security findings
- [ ] Agent planning time <100ms (with tool filtering)

### Qualitative
- [ ] Code review approval from maintainers
- [ ] Constitution compliance verified (local-first, named exports, ≤40 lines)
- [ ] brAInwav branding consistently applied (service-map, logs, telemetry)
- [ ] Documentation updated (runbooks, GraphRAG guide)
- [ ] Backward compatibility confirmed (legacy connectors unaffected)

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Manifest drift** (declared tools ≠ MCP server reality) | High (agent plans fail) | Low (Wikidata snapshots stable) | Document verification runbook; add advisory validation in future |
| **Schema evolution** breaks old clients | Medium (parsing failures) | Low (optional field + Zod lenient) | Test backward compat in CI; follow semver |
| **Wikidata MCP server downtime** | Medium (no remote facts) | Medium (external dependency) | Graceful fallback to local-only; log alerts |
| **Tool name confusion** (normalization bugs) | High (wrong tool invoked) | Low (comprehensive tests) | Unit tests for all known variants; log translations |
| **Signature instability** (HMAC changes) | High (clients reject service-map) | Low (deterministic serialization) | Snapshot tests for signature; stable key order |

---

## Open Questions

1. **Should we add runtime validation (Option 3 hybrid)?**
   - **Decision needed by**: Post-MVP (Phase 4 enhancement)
   - **Options**: (a) Pure static (current), (b) Advisory validation on health checks
   - **Impact**: Improves drift detection but adds complexity

2. **How should agents handle tools with identical tags?**
   - **Decision needed by**: Phase 2 (agent planning)
   - **Options**: (a) First match wins, (b) Score by multiple tags, (c) User preference
   - **Impact**: Affects planning determinism

---

## Compliance Checklist

- [x] Follows brAInwav Constitution principles (local-first, zero exfiltration)
- [x] Adheres to CODESTYLE.md standards (named exports, ≤40 lines, async/await)
- [x] RULES_OF_AI.md ethical guidelines respected (no fake data, no mocks in prod)
- [x] No mock production claims ("production-ready" only if fully implemented)
- [x] brAInwav branding included throughout (service-map, logs, metadata)
- [ ] WCAG 2.2 AA accessibility requirements met (N/A - backend only)
- [x] Security requirements satisfied (schema validation, signature stability)
- [x] Test-driven development approach documented (TDD plan next phase)
- [x] Local memory integration planned (provenance persistence)

---

## Appendix

### References
- Research: `tasks/wikidata-semantic-layer-integration/research.md`
- TDD Plan: `tasks/wikidata-semantic-layer-integration/tdd-plan.md` (next)
- Agentic Coding Workflow: `/.cortex/rules/agentic-coding-workflow.md`
- Task Folder Structure: `/.cortex/rules/TASK_FOLDER_STRUCTURE.md`

### Glossary
- **MCP**: Model Context Protocol - standard for AI-model tool interaction
- **A2A**: Agent-to-Agent communication via event bus
- **QID**: Wikidata entity identifier (e.g., Q937 for Albert Einstein)
- **Claim GUID**: Wikidata statement identifier for provenance
- **SPARQL**: Query language for RDF graphs (Wikidata knowledge base)
- **Matryoshka**: Variable-dimension embeddings (Wikidata uses for vector search)

---

**Version**: 1.0  
**Last Updated**: 2025-01-11  
**Status**: Ready for TDD Planning  
**Approved By**: [Pending governance review]

Co-authored-by: brAInwav Development Team <dev@brainwav.ai>
