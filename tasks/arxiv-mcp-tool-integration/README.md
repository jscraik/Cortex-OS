# arXiv MCP Tool Integration - Task Overview

**Task ID**: `arxiv-mcp-tool-integration`  
**Status**: 🟡 **PHASE 1: RESEARCH** - Starting Implementation  
**Created**: 2025-01-12  
**Governance**: Fully Compliant with AGENTS.md and Agentic Coding Workflow

---

## Task Summary

Integrate arXiv MCP server as a tool available to LangGraph agents for academic paper search and retrieval, following brAInwav agent-first architecture principles. This adds arXiv research capabilities to the brAInwav Cortex-OS ecosystem without modifying existing RAG systems.

---

## Governance Compliance ✅

This task follows the complete brAInwav governance workflow as defined in:
- `AGENTS.md` (root) - Mandatory templates and workflow
- `.cortex/rules/agentic-coding-workflow.md` - Phase-by-phase execution
- `.cortex/rules/TASK_FOLDER_STRUCTURE.md` - Artifact organization
- `.cortex/templates/` - Official templates for research, feature spec, TDD plan

---

## Task Artifacts

### Phase 0: Tasks ✅ COMPLETE
**Directory**: `~/tasks/arxiv-mcp-tool-integration/`
**Compliance**: Task folder created following TASK_FOLDER_STRUCTURE.md

### Phase 1: Research ⏳ IN PROGRESS
**File**: `research.md` (pending)
**Template**: `.cortex/templates/research-template.md`
**Requirements**:
- Current state analysis
- Technology research
- Comparative analysis
- RAID analysis (Risks, Assumptions, Issues, Dependencies)
- Security threat model
- brAInwav-specific context

### Phase 2: Planning ⏳ PENDING
**Files**: 
- `feature-spec.md` (using `.cortex/templates/feature-spec-template.md`)
- `tdd-plan.md` (using `.cortex/templates/tdd-plan-template.md`)
- `implementation-checklist.md`

### Phases 3-7: Implementation, Review, Verification, Monitoring, Archive ⏳ PENDING

---

## Preflight Guards Status

### Required Before Implementation
- [x] **Time Freshness Guard**: Anchored to 2025-01-12T20:52:03Z
- [ ] **Vibe Check MCP**: Call before file writes (required after planning)
- [ ] **Local Memory parity**: Update memories.instructions.md with decisions
- [ ] **Secrets via 1Password CLI**: Configure any required API keys
- [ ] **Hybrid Model - Live-Only Rule**: Verify live engines available
- [ ] **Branding in logs/errors**: Include "[brAInwav]" in all outputs

---

## Architecture Overview

**Goal**: Integrate arXiv MCP as a LangGraph tool (not embedded in RAG)

**Technical Approach**:
- Use `@langchain/mcp-adapters` for MCP server integration
- Add tools to LangGraph ToolNode pattern in existing agent infrastructure
- Maintain separation: RAG handles internal corpora, MCP handles external arXiv
- Feature flag for safe deployment: `FEATURE_ARXIV_MCP=true`

**File Structure** (Adjusted for existing codebase):
```
packages/agent-toolkit/
├─ src/mcp/arxiv/index.ts                  NEW - MCP loader + LangGraph binding
├─ src/mcp/arxiv/schema.ts                 NEW - Zod contracts
├─ src/mcp/arxiv/normalize.ts              NEW - payload normalization
├─ src/mcp/arxiv/rateLimit.ts              NEW - throttle (1 req/3s)
└─ __tests__/mcp/arxiv.test.ts             NEW - unit tests

packages/agents/
├─ src/langgraph/arxiv-integration.ts     NEW - graph integration
└─ tests/integration/arxiv-mcp.test.ts    NEW - integration tests

docs/architecture/decisions/
└─ 002-arxiv-mcp-as-tool.md               NEW - ADR
```

---

## Quality Gates

### Pre-Implementation
- [ ] Research complete (Phase 1)
- [ ] Feature spec complete (Phase 2)
- [ ] TDD plan complete (Phase 2)
- [ ] Vibe Check MCP called
- [ ] Memory instructions updated
- [ ] Approval obtained

### Implementation Standards
- [ ] ≥90% test coverage
- [ ] Functions ≤40 lines
- [ ] Named exports only
- [ ] brAInwav branding in all logs/errors
- [ ] No mock/placeholder code in production paths
- [ ] Security scan clean
- [ ] Structure validation passing

---

## Dependencies & Compatibility

**New Dependencies**:
- `@langchain/mcp-adapters` (to be added)

**Environment Variables**:
- `MCP_ARXIV_URL` - arXiv MCP server endpoint
- `ARXIV_RATE_LIMIT_MS=3000` - API throttling
- `ARXIV_USER_AGENT="brAInwav/agents (+contact@company)"` - branded user agent
- `FEATURE_ARXIV_MCP=true` - feature flag

**Existing Infrastructure**:
- ✅ LangGraph already installed: `@langchain/langgraph": "0.4.9"`
- ✅ MCP patterns exist in `packages/agent-toolkit/src/mcp/`
- ✅ A2A events infrastructure available
- ✅ Environment variable patterns established

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| API rate limits (1 req/3s) | Implement throttle with exponential backoff |
| Empty/unstable feeds | Retry logic with friendly error messages |
| Tool overuse | LangGraph conditional routing + system prompt guardrails |
| Security vulnerabilities | Input sanitization + security scanning |
| Breaking changes | Feature flag + gradual rollout strategy |

---

## Next Actions

1. **Complete Phase 1 Research** - Create comprehensive research.md
2. **Phase 2 Planning** - Feature spec and TDD plan
3. **Vibe Check** - Call MCP before implementation
4. **Implementation** - Follow TDD red-green-refactor cycles
5. **Testing** - Comprehensive unit and integration tests
6. **Documentation** - ADR and usage documentation

---

## Timeline Estimate

- **Phase 1 (Research)**: 2-4 hours
- **Phase 2 (Planning)**: 4-6 hours  
- **Phase 3 (Implementation)**: 8-12 hours
- **Phase 4-7 (Review/Verification/Archive)**: 4-6 hours
- **Total**: 18-28 hours

---

**Maintainer**: brAInwav Development Team  
**Co-authored-by**: brAInwav Development Team  
**Status**: Phase 1 Research in progress

Co-authored-by: brAInwav Development Team <dev@brainwav.ai>