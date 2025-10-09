# Phase Specification: Phase 1 - Test-First Development (RED)

**Phase ID**: `phase-1-test-first-development`
**Parent Task**: `langgraph-hybrid-router-integration`
**Created**: 2025-01-09
**Status**: Draft
**Priority**: P1
**Estimated Duration**: 4 days
**Actual Duration**: 0 days

---

## Phase Summary

Create comprehensive failing test suites for all components of the LangGraph.js and Hybrid Router Integration. This phase follows strict TDD methodology - all tests must be written and failing before any implementation begins.

---

## Dependencies & Blocking

### Dependencies
- [x] Task management infrastructure setup - Status: Complete
- [x] Hierarchical task structure created - Status: Complete
- [x] Dependency tracking system implemented - Status: Complete

### Blocking
This phase blocks:
- `phase-2-context-graph-infrastructure`

---

## Deliverables

### Context Graph API Tests
**Status**: Not Started
**Completion Percentage**: 0%
**Files Created**:
- `packages/memory-core/tests/context-graph/context-graph-slice.test.ts`
- `packages/memory-core/tests/context-graph/context-graph-pack.test.ts`
- `packages/memory-core/tests/context-graph/context-graph-evidence.test.ts`
- `packages/memory-core/tests/context-graph/context-graph-thermal.test.ts`

**Acceptance Criteria**:
- [ ] All context slicing operations have comprehensive test coverage
- [ ] Context packing with citation generation is tested
- [ ] Evidence gating and ABAC compliance test scenarios
- [ ] Thermal-aware context operations testing
- [ ] All tests are currently failing (RED status)

### Hybrid Model Router Tests
**Status**: Not Started
**Completion Percentage**: 0%
**Files Created**:
- `packages/model-gateway/tests/hybrid-routing/hybrid-router-policy.test.ts`
- `packages/model-gateway/tests/hybrid-routing/hybrid-router-thermal.test.ts`
- `packages/model-gateway/tests/hybrid-routing/hybrid-router-privacy.test.ts`
- `packages/model-gateway/tests/hybrid-routing/hybrid-router-performance.test.ts`

**Acceptance Criteria**:
- [ ] MLX-first routing policy test scenarios
- [ ] Cloud burst logic testing
- [ ] Privacy mode enforcement tests
- [ ] Thermal-aware routing decisions
- [ ] All tests are currently failing (RED status)

### LangGraph.js Orchestration Tests
**Status**: Not Started
**Completion Percentage**: 0%
**Files Created**:
- `packages/orchestration/tests/langgraph/langgraph-slice.test.ts`
- `packages/orchestration/tests/langgraph/langgraph-plan.test.ts`
- `packages/orchestration/tests/langgraph/langgraph-execute.test.ts`
- `packages/orchestration/tests/langgraph/langgraph-pack.test.ts`
- `packages/orchestration/tests/langgraph/langgraph-thermal-integration.test.ts`

**Acceptance Criteria**:
- [ ] State graph workflow testing (slice → plan → execute → pack)
- [ ] Integration with existing thermal management
- [ ] Context-aware model routing decisions
- [ ] Budget enforcement and token management
- [ ] All tests are currently failing (RED status)

### Security and Governance Tests
**Status**: Not Started
**Completion Percentage**: 0%
**Files Created**:
- `tests/security/context-graph-integration/abac-compliance.test.ts`
- `tests/security/context-graph-integration/owasp-llm-top10.test.ts`
- `tests/security/context-graph-integration/privacy-enforcement.test.ts`
- `tests/security/context-graph-integration/evidence-gating.test.ts`
- `tests/security/context-graph-integration/audit-logging.test.ts`

**Acceptance Criteria**:
- [ ] ABAC compliance testing scenarios
- [ ] OWASP LLM Top-10 security validation
- [ ] Privacy mode security testing
- [ ] Evidence gating security controls
- [ ] Comprehensive audit trail testing
- [ ] All tests are currently failing (RED status)

---

## Quality Gates

### Must Pass Before Phase Completion
- [ ] **All Tests RED**: Verify all tests are failing (expected state)
- [ ] **Test Coverage Adequate**: Ensure comprehensive test scenarios
- [ ] **Stakeholder Approval**: Get approval on test scenarios
- [ ] **Test Structure Valid**: Verify test file structure and naming
- [ ] **Mock Dependencies**: Ensure all external dependencies are properly mocked

### Validation Steps
```bash
# Run all tests to verify they are failing
pnpm test packages/memory-core/tests/context-graph/
pnpm test packages/model-gateway/tests/hybrid-routing/
pnpm test packages/orchestration/tests/langgraph/
pnpm test tests/security/context-graph-integration/

# Verify test coverage
pnpm test:coverage --reporter=text

# Run security scanning on test files
pnpm security:scan
```

---

## Implementation Approach

### Step 1: Context Graph API Tests
Create comprehensive test suites for context graph operations

**Tasks**:
- [ ] Set up test environment with mock GraphRAG service
- [ ] Write context slicing tests with various scenarios
- [ ] Write context packing tests with citation validation
- [ ] Write evidence gating tests with ABAC scenarios
- [ ] Write thermal-aware context operation tests

**Validation**:
- [ ] All tests run and fail as expected
- [ ] Test scenarios cover all documented requirements
- [ ] Mock services properly simulate real dependencies

### Step 2: Hybrid Model Router Tests
Create test suites for hybrid model routing logic

**Tasks**:
- [ ] Set up test environment with mock model adapters
- [ ] Write MLX-first routing policy tests
- [ ] Write cloud burst logic tests
- [ ] Write privacy mode enforcement tests
- [ ] Write thermal-aware routing tests

**Validation**:
- [ ] All tests run and fail as expected
- [ ] Routing scenarios cover all policy conditions
- [ ] Mock adapters simulate real model behavior

### Step 3: LangGraph.js Orchestration Tests
Create test suites for state graph orchestration

**Tasks**:
- [ ] Set up test environment with mock LangGraph.js infrastructure
- [ ] Write state graph node tests for each phase
- [ ] Write integration tests for complete workflow
- [ ] Write thermal management integration tests
- [ ] Write budget enforcement tests

**Validation**:
- [ ] All tests run and fail as expected
- [ ] Workflow scenarios cover all execution paths
- [ ] State management properly tested

### Step 4: Security and Governance Tests
Create comprehensive security test suites

**Tasks**:
- [ ] Set up test environment with security mock services
- [ ] Write ABAC compliance tests
- [ ] Write OWASP LLM Top-10 security tests
- [ ] Write privacy enforcement tests
- [ ] Write evidence gating tests

**Validation**:
- [ ] All tests run and fail as expected
- [ ] Security scenarios cover all threat vectors
- [ ] Governance policies properly validated

---

## Testing Strategy

### Unit Tests
- **Test Suite 1**: Context Graph APIs
  - [ ] Context slicing with various depth/breadth configurations
  - [ ] Context packing with citation generation
  - [ ] Evidence gating with ABAC policy enforcement
  - [ ] Thermal-aware context operations

- **Test Suite 2**: Hybrid Model Router
  - [ ] MLX-first routing policy decisions
  - [ ] Cloud burst trigger conditions
  - [ ] Privacy mode enforcement
  - [ ] Thermal-aware routing decisions

- **Test Suite 3**: LangGraph.js Orchestration
  - [ ] State graph node implementations
  - [ ] Workflow execution paths
  - [ ] Thermal management integration
  - [ ] Budget enforcement mechanisms

### Integration Tests
- **Integration Scenario 1**: Context Graph + Model Router
  - [ ] Context slicing followed by model routing
  - [ ] Evidence gating before routing decisions
  - [ ] Thermal constraints applied

- **Integration Scenario 2**: LangGraph.js + Hybrid Router
  - [ ] State graph execution with model routing
  - [ ] Budget enforcement across workflow
  - [ ] Error handling and fallback scenarios

### Security Tests
- **Security Scenario 1**: ABAC Compliance
  - [ ] Role-based access control enforcement
  - [ ] Attribute-based filtering
  - [ ] Policy violation detection

- **Security Scenario 2**: OWASP LLM Top-10
  - [ ] Prompt injection prevention
  - [ ] Data poisoning detection
  - [ ] Model denial of service prevention

---

## Risk Management

### Identified Risks
| Risk | Impact | Probability | Mitigation | Status |
|------|--------|-------------|------------|--------|
| Test complexity too high | Medium | Medium | Break down into smaller test units | Active |
| Mock dependencies inaccurate | High | Low | Use realistic mock behavior | Monitored |
| Test scenarios incomplete | High | Medium | Review with stakeholders | Active |
| Security test coverage gaps | Critical | Low | Follow OWASP LLM Top-10 checklist | Monitored |

### Blockers
- [ ] GraphRAG service mock implementation - In progress
- [ ] Model adapter mock definitions - Planned
- [ ] Security test environment setup - Planned

---

## Progress Tracking

### Daily Progress
- **2025-01-09**: Phase specification created, task management infrastructure complete

### Milestones
- [ ] **M1-TDD-Setup**: 2025-01-10 - Test environment setup complete
- [ ] **M2-Context-Graph-Tests**: 2025-01-11 - Context graph tests written and failing
- [ ] **M3-Hybrid-Router-Tests**: 2025-01-12 - Hybrid router tests written and failing
- [ ] **M4-LangGraph-Tests**: 2025-01-13 - LangGraph.js tests written and failing
- [ ] **M5-Security-Tests**: 2025-01-14 - Security tests written and failing

---

## Notes & Observations

### What Went Well
- Task management infrastructure provides clear visibility
- Dependency tracking ensures proper phase sequencing
- Comprehensive templates streamline test creation

### Challenges Encountered
- None yet - phase just beginning

### Lessons Learned
- Importance of comprehensive test planning before implementation
- Value of realistic mock dependencies
- Need for stakeholder approval on test scenarios

---

## Completion Criteria

This phase is considered complete when:
- [ ] All test files are created and properly structured
- [ ] All tests run and fail as expected (RED status)
- [ ] Test scenarios cover all documented requirements
- [ ] Security test scenarios cover OWASP LLM Top-10
- [ ] Mock dependencies properly simulate real services
- [ ] Stakeholder approval obtained on test scenarios
- [ ] Quality gates pass validation
- [ ] Documentation is updated for next phase

---

## Sign-off

**Phase Started**: 2025-01-09
**Phase Completed**: In Progress
**Completed By**: [Name]
**Reviewed By**: [Name]
**Approved By**: [Name]

Co-authored-by: brAInwav Development Team