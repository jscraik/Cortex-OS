# Wikidata Semantic Layer Integration - Task Overview

**Task ID**: `wikidata-semantic-layer-integration`  
**Status**: ✅ **PHASES 1-2 COMPLETE** - Ready for Implementation (Pending Vibe Check)  
**Created**: 2025-01-11  
**Governance**: Fully Compliant with AGENTS.md and Agentic Coding Workflow

---

## Task Summary

Enable brAInwav Cortex-OS agents to leverage Wikidata's semantic knowledge (vector search, claims, SPARQL) for fact-finding workflows with full provenance tracking by adding schema-driven tool discovery through the connector service-map.

---

## Governance Compliance ✅

This task follows the complete brAInwav governance workflow as defined in:
- `AGENTS.md` (root) - Mandatory templates and workflow
- `.cortex/rules/agentic-coding-workflow.md` - Phase-by-phase execution
- `.cortex/rules/TASK_FOLDER_STRUCTURE.md` - Artifact organization
- `.cortex/templates/` - Official templates for research, feature spec, TDD plan

---

## Task Artifacts

### Phase 1: Research ✅ COMPLETE
**File**: `research.md` (396 lines)

**Contents**:
- Current state observations (existing connector infrastructure)
- Technology research (3 options analyzed)
- Comparative analysis (Option 1: Static remoteTools selected)
- Recommended approach with full rationale
- RAID analysis (Risks, Assumptions, Issues, Dependencies)
- Security threat model
- PIECES feasibility assessment
- Wikidata tool inventory appendix

**Compliance**:
- ✅ Used `.cortex/templates/research-template.md`
- ✅ Documented brAInwav-specific context (MCP, A2A, Local Memory)
- ✅ Referenced external standards (MCP v2024.11, JSON Schema, WCAG 2.2 AA)
- ✅ RAID analysis complete
- ✅ Security analysis included

---

### Phase 2: Planning ✅ COMPLETE

#### Feature Specification
**File**: `feature-spec.md` (473 lines)

**Contents**:
- Executive summary
- **4 prioritized user stories** (P1, P1, P2, P2)
  - Story 1: Agent tool discovery from service-map (P1)
  - Story 2: Multi-step workflow planning (P1)
  - Story 3: MCP manager normalization (P2)
  - Story 4: RAG orchestration with provenance (P2)
- Given-When-Then acceptance criteria for each story
- Non-functional requirements (Performance, Security, Testing, Observability)
- Technical constraints (Must Use / Must Avoid)
- Architecture diagrams (text-based component flow)
- Data model (Zod schemas for ConnectorRemoteTool)
- API contracts (service-map response structure)
- **3 implementation phases** with exit criteria
- Success metrics (quantitative + qualitative)
- Risks & mitigations matrix
- Compliance checklist

**Compliance**:
- ✅ Used `.cortex/templates/feature-spec-template.md`
- ✅ User stories independently testable (MVP principle)
- ✅ User stories prioritized (P1 > P2)
- ✅ brAInwav branding requirements specified
- ✅ References research findings
- ✅ Aligns with CODESTYLE.md and RULES_OF_AI.md

---

#### TDD Plan
**File**: `tdd-plan.md` (949 lines)

**Contents**:
- Task summary and scope
- **PRP gate alignment** (G0-G7 cross-references)
- Enforcement profile targets (95% coverage, <50ms performance)
- Prerequisites and dependencies
- **Complete test strategy** (47 tests total):
  - Phase A: 21 tests (Schema + ASBR + Protocol)
  - Phase B: 15 tests (MCP + Agents)
  - Phase C: 11 tests (RAG + Provenance)
- **RED-GREEN-REFACTOR cycles** for each phase
- Test suites with Given-When-Then scenarios
- Implementation checklist embedded
- Exit criteria and quality gates
- Timeline estimate (16-24 hours)

**Compliance**:
- ✅ Used `.cortex/templates/tdd-plan-template.md`
- ✅ PRP gate alignment included
- ✅ BDD scenarios (Given-When-Then) for all tests
- ✅ TDD mandate (tests first, then code)
- ✅ Quality gates specified
- ✅ brAInwav standards (95% coverage, ≤40 lines, named exports)

---

#### Implementation Checklist
**File**: `implementation-checklist.md` (586 lines)

**Contents**:
- Actionable breakdown of all 47 tests
- Phase-by-phase checklist with checkboxes
- RED-GREEN-REFACTOR steps for each test suite
- File locations for each implementation
- Line count limits for functions
- Quality gate verification steps
- Documentation update checklist
- Final verification procedures
- Exit criteria for each phase

**Compliance**:
- ✅ Breaks down TDD plan into concrete steps
- ✅ Maps to task folder structure
- ✅ References all quality gates
- ✅ Includes verification commands

---

### Phase 3: Implementation ⏳ NEXT (Requires Vibe Check)

**Status**: **BLOCKED - Must call Vibe Check MCP before proceeding**

**Required Before Starting**:
1. ⏳ **Call Vibe Check MCP** (AGENTS.md Section 11.1)
   - Tool: `vibe_check`
   - Parameters: `{plan: "summary", phase: "3-implementation"}`
   - Environment: `VIBE_CHECK_HTTP_URL=http://127.0.0.1:2091`
   - Log must include "brAInwav-vibe-check"

2. ⏳ **Update Memory Instructions** (AGENTS.md Section 14)
   - File: `.github/instructions/memories.instructions.md`
   - Append: Decision to use static manifest (Option 1)
   - Rationale: local-first, deterministic, auditable
   - Evidence: research.md comparative analysis

3. ⏳ **Get Approval** for feature spec (virtual or stakeholder)

**Files to Create During Implementation**:
- `implementation-log.md` - Real-time progress notes
- `test-logs/` - Test execution results per phase
- `verification/` - Coverage reports, security scans
- `code-review.md` - Review comments (Phase 4)
- `lessons-learned.md` - Insights from TDD process
- `SUMMARY.md` - Final comprehensive summary (Phase 7)

---

## Implementation Phases Overview

### Phase A: Schema + ASBR + Protocol (Discovery Path)
**Tests**: 21 (12 schema + 4 ASBR + 3 integration + 2 protocol)  
**Estimated Time**: 4-6 hours  
**Files Changed**: 6
- `libs/typescript/asbr-schemas/src/index.ts` - Add ConnectorRemoteToolSchema
- `libs/typescript/asbr-schemas/tests/schemas.test.ts` - Add 12 tests
- `packages/asbr/src/connectors/manifest.ts` - Propagate remoteTools
- `packages/asbr/tests/unit/connectors/remote-tools-propagation.test.ts` - Add 4 tests
- `packages/asbr/tests/integration/api-endpoints.test.ts` - Add 3 tests
- `config/connectors.manifest.json` - Add Wikidata remoteTools

---

### Phase B: MCP + Agents (Planning Path)
**Tests**: 15 (5 MCP + 5 registry + 5 planning)  
**Estimated Time**: 5-7 hours  
**Files Changed**: 6
- `packages/mcp/src/connectors/manager.ts` - Add normalization
- `packages/mcp/src/connectors/normalization.ts` - Extract helper (new)
- `packages/mcp/src/connectors/manager.test.ts` - Add 5 tests
- `packages/agents/src/connectors/registry.ts` - Add filtering
- `packages/agents/src/subagents/ExecutionSurfaceAgent.ts` - Add planning
- `packages/agents/tests/` - Add 10 tests

---

### Phase C: RAG + Provenance (Answering Path)
**Tests**: 11 (3 shim + 5 orchestration + 3 stub)  
**Estimated Time**: 5-7 hours  
**Files Changed**: 5
- `packages/rag/src/integrations/agents-shim.ts` - Add routing
- `packages/rag/src/integrations/remote-mcp.ts` - Add orchestration
- `packages/rag/src/stubs/agent-mcp-client.ts` - Add tracking
- `packages/rag/__tests__/integrations/agents-shim.test.ts` - Add 3 tests
- `packages/rag/__tests__/remote-mcp.wikidata-vector.integration.test.ts` - Add 5 tests (new)

---

### Phase D: Documentation & Verification
**Estimated Time**: 2-4 hours  
**Files Changed**: 6
- `docs/connectors/README.md` - Document remoteTools contract
- `docs/runbooks/connectors.md` - Add verification steps
- `docs/graphrag.md` - Document provenance flow
- `packages/asbr/README.md` - Update
- `packages/agents/README.md` - Update
- `packages/rag/README.md` - Update

---

## Technical Approach

### Schema-First Design
- Define `ConnectorRemoteToolSchema` with Zod
- Optional field: backward compatible with legacy connectors
- Strict schema: reject unknown properties

### Canonical Tool Names
```
wikidata.vector_search_items     (tags: vector, wikidata, items | scopes: facts, entities)
wikidata.vector_search_properties (tags: vector, wikidata, properties | scopes: properties)
wikidata.get_claims               (tags: claims, wikidata, provenance)
wikidata.sparql                   (tags: sparql, wikidata, provenance)
```

### Multi-Step Orchestration
```
Step 1: wikidata.vector_search_items(query, scope="facts")
        ↓ Returns top-N QIDs
Step 2: wikidata.get_claims(qids=[top-N])
        ↓ Returns claims with GUIDs
Step 3: wikidata.sparql(query) [optional]
        ↓ Returns provenance metadata
Result: {content, metadata: {wikidata: {qid, claimGuid, sparql}}}
```

### Graceful Degradation
```
IF remoteTools available → Use service-map tools
ELSE IF Wikidata connector → Synthesize canonical tools
ELSE → Local-only retrieval

IF MCP unreachable → Fallback to local store
LOG error with brAInwav context
PRESERVE existing ranking
```

---

## Success Criteria

### Quantitative
- ✅ All 47 tests PASSING (100% green)
- ✅ ≥95% coverage on changed files
- ✅ Service-map generation <50ms
- ✅ Agent planning <100ms
- ✅ Zero high-severity security findings

### Qualitative
- ✅ brAInwav branding consistently applied
- ✅ Functions ≤40 lines
- ✅ Named exports only
- ✅ No mock/placeholder code
- ✅ Backward compatibility preserved
- ✅ Documentation complete

---

## Quality Gates

### Pre-Implementation
- [x] Research complete
- [x] Feature spec complete
- [x] TDD plan complete
- [ ] **Vibe Check MCP called** ← REQUIRED NEXT STEP
- [ ] Memory instructions updated
- [ ] Approval obtained

### Per-Phase
- [ ] All tests written (RED)
- [ ] All tests passing (GREEN)
- [ ] Code refactored (REFACTOR)
- [ ] Coverage ≥95%
- [ ] `pnpm lint && test` clean
- [ ] Implementation log updated

### Pre-PR
- [ ] All 47 tests passing
- [ ] `pnpm security:scan` clean
- [ ] `pnpm structure:validate` clean
- [ ] Documentation updated
- [ ] Manual smoke tests passed
- [ ] Artifacts complete

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Manifest drift | Document verification runbook; advisory validation in future |
| Signature instability | Snapshot tests; stable key order in buildConnectorEntry |
| Tool name confusion | Comprehensive normalization tests; log all translations |
| Network failures | Retry with exponential backoff; graceful fallback to local |
| Coverage gaps | Run coverage after each GREEN phase; add tests if <95% |

---

## Folder Structure

```
tasks/wikidata-semantic-layer-integration/
├── README.md                          ← This file (overview)
├── research.md                        ✅ Phase 1 (396 lines)
├── feature-spec.md                    ✅ Phase 2 (473 lines)
├── tdd-plan.md                        ✅ Phase 2 (949 lines)
├── implementation-checklist.md        ✅ Phase 2 (586 lines)
├── GOVERNANCE_COMPLIANCE_STATUS.md    ✅ Tracking doc
├── implementation-log.md              ⏳ Phase 3+ (pending)
├── code-review.md                     ⏳ Phase 4 (pending)
├── lessons-learned.md                 ⏳ Phase 7 (pending)
├── SUMMARY.md                         ⏳ Phase 7 (pending)
├── design/                            ✅ Created (empty)
├── test-logs/                         ✅ Created (empty - Phase 3+)
├── verification/                      ✅ Created (empty - Phase 5+)
├── HITL-feedback/                     ✅ Created (empty - if needed)
├── refactoring/                       ✅ Created (empty - Phase 4+)
└── monitoring/                        ✅ Created (empty - Phase 6+)
```

---

## References

### Governance Documents
- `AGENTS.md` - Repository agent rules
- `.cortex/rules/agentic-coding-workflow.md` - Phase lifecycle
- `.cortex/rules/TASK_FOLDER_STRUCTURE.md` - Artifact organization
- `.cortex/rules/RULES_OF_AI.md` - Ethical guardrails
- `.cortex/rules/constitution.md` - Decision authority
- `CODESTYLE.md` - Coding standards

### Templates Used
- `.cortex/templates/research-template.md` ✅
- `.cortex/templates/feature-spec-template.md` ✅
- `.cortex/templates/tdd-plan-template.md` ✅

### Related Documentation
- `docs/connectors/README.md` - Connector architecture
- `docs/runbooks/connectors.md` - Operational procedures
- `docs/graphrag.md` - Graph RAG implementation

---

## Next Actions

### Immediate (Before Implementation)

1. **Call Vibe Check MCP** (REQUIRED)
   ```bash
   # Via MCP client or manual invocation
   # Tool: vibe_check
   # Parameters: {plan: "Wikidata semantic layer integration...", phase: "3-implementation"}
   # Log output must include "brAInwav-vibe-check"
   ```

2. **Update Memory Instructions**
   ```bash
   # Append to .github/instructions/memories.instructions.md
   # - Decision: Use static manifest (Option 1)
   # - Rationale: local-first, deterministic, auditable
   # - Trade-offs: manual updates vs. network dependency
   # - Evidence: research.md sections 3.1, 3.2, 3.3
   ```

3. **Get Virtual Approval**
   - Review feature spec user stories
   - Confirm alignment with requirements
   - Document approval in implementation-log.md

### Implementation (After Approval)

4. **Start Phase A.1** (RED phase)
   - Write 12 schema validation tests
   - Verify all tests FAIL
   - Proceed to GREEN phase

5. **Continue TDD Cycle**
   - Follow implementation-checklist.md
   - Mark checkboxes as complete
   - Update implementation-log.md after each phase

---

## Timeline

- **Phase 1 (Research)**: ✅ Complete - 396 lines, 2025-01-11
- **Phase 2 (Planning)**: ✅ Complete - 3 docs, 2008 total lines, 2025-01-11
- **Phase 3 (Implementation)**: ⏳ Next - Est. 16-24 hours
  - Phase A: 4-6 hours
  - Phase B: 5-7 hours
  - Phase C: 5-7 hours
  - Phase D: 2-4 hours
- **Phase 4 (Review)**: ⏳ Pending
- **Phase 5 (Verification)**: ⏳ Pending
- **Phase 6 (Monitoring)**: ⏳ Pending
- **Phase 7 (Archive)**: ⏳ Pending

---

## Contact & Collaboration

**Maintainer**: brAInwav Development Team  
**Co-authors**: brAInwav AI Agents  
**Governance**: Fully compliant with brAInwav standards  
**Status**: Ready for implementation pending Vibe Check approval

---

**Last Updated**: 2025-01-11  
**Version**: 1.0  
**Status**: Phases 1-2 Complete, Ready for Phase 3

Co-authored-by: brAInwav Development Team <dev@brainwav.ai>
