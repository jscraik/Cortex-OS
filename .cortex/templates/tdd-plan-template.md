# TDD Plan: [FEATURE_NAME]

**Task ID**: `[task-id-slug]`  
**Created**: [YYYY-MM-DD]  
**Status**: [Draft / In Progress / Complete]  
**Estimated Effort**: [X hours/days]

---

## Task Summary

[2-3 sentences describing what will be implemented and the primary goal]

Example: "Implement OAuth 2.1 PKCE authentication for brAInwav Local Memory REST endpoints while maintaining local-first guarantees and full observability through OpenTelemetry instrumentation."

---

## Scope & Goals

### In Scope
- ✅ [Specific deliverable 1]
- ✅ [Specific deliverable 2]
- ✅ [Specific deliverable 3]
- ✅ brAInwav branding in all outputs and error messages
- ✅ 90%+ test coverage
- ✅ WCAG 2.2 AA compliance (if UI components)

### Out of Scope
- ❌ [What won't be done in this iteration]
- ❌ [Future enhancements to defer]
- ❌ [Related but separate concerns]

### Success Criteria
1. All tests pass (100% green)
2. Quality gates pass: `pnpm lint && pnpm test && pnpm security:scan`
3. 90%+ test coverage maintained
4. Constitution compliance verified
5. No mock/placeholder code in production paths
6. brAInwav branding consistently applied

---

## Prerequisites & Dependencies

### Required Research
- [x] Research document completed: `tasks/[task-id].research.md`
- [x] Approach selected and approved
- [ ] Open questions resolved

### Internal Dependencies
- **Package**: `@cortex-os/[package]` - [Why needed]
- **Package**: `@cortex-os/[package]` - [Why needed]

### External Dependencies
- **Library**: `[package-name]@[version]` - [Purpose] - License: [type]
- **Service**: [Service name] - [Required state/version]

### Environment Setup
```bash
# Any special setup commands
pnpm install
# Other setup steps
```

---

## Testing Strategy (Write Tests First!)

> **TDD Mandate**: All tests MUST be written and failing BEFORE implementation begins.
> This section defines the test plan that will drive implementation.

### Phase 1: Unit Tests (Write First)

#### Test Suite 1: [Component/Module Name]
**File**: `[path-to-test-file].spec.ts`

**Test Cases**:

1. **Test**: `should [expected behavior] when [condition]`
   - **Given**: [Initial state/setup]
   - **When**: [Action performed]
   - **Then**: [Expected outcome]
   - **Coverage Target**: [Function/method names]

2. **Test**: `should reject [invalid input] with [error message including brAInwav branding]`
   - **Given**: [Invalid state]
   - **When**: [Action with bad input]
   - **Then**: [Appropriate error thrown with brAInwav context]

3. **Test**: `should handle [edge case] gracefully`
   - **Given**: [Edge condition]
   - **When**: [Edge case triggered]
   - **Then**: [Graceful degradation or clear error]

[Add more test cases as needed]

---

#### Test Suite 2: [Another Component]
**File**: `[path-to-test-file].spec.ts`

**Test Cases**:
[Same structure as above]

---

### Phase 2: Integration Tests (Write First)

#### Integration Test 1: [Integration Scenario]
**File**: `[path-to-integration-test].integration.spec.ts`

**Scenario**: [Description of what's being integrated]

**Test Cases**:

1. **Test**: `should integrate [Component A] with [Component B]`
   - **Setup**: [Integration test environment setup]
   - **Given**: [Initial integrated state]
   - **When**: [Cross-component action]
   - **Then**: [Expected integrated behavior]

2. **Test**: `should emit A2A event [event-name] when [trigger]`
   - **Setup**: [Event listener mock]
   - **Given**: [State before event]
   - **When**: [Event trigger]
   - **Then**: [Event emitted with correct payload]

---

### Phase 3: End-to-End Tests (Write First)

#### E2E Test 1: [User Journey]
**File**: `[path-to-e2e-test].e2e.spec.ts`

**User Story**: [Reference to user story from spec]

**Test Cases**:

1. **Test**: `should complete [user journey] successfully`
   - **Given**: [Starting application state]
   - **When**: [User actions in sequence]
   - **Then**: [Complete flow succeeds with brAInwav branded output]

---

### Phase 4: Accessibility Tests (If UI Components)

**File**: `[path-to-a11y-test].a11y.spec.ts`

**Test Cases**:

1. **Test**: `should pass axe accessibility audit`
   - Uses `jest-axe` to validate WCAG 2.2 AA compliance

2. **Test**: `should be keyboard navigable`
   - Validates tab order and keyboard interactions

3. **Test**: `should have appropriate ARIA labels`
   - Validates screen reader compatibility

---

### Phase 5: Security Tests

**File**: `[path-to-security-test].security.spec.ts`

**Test Cases**:

1. **Test**: `should reject requests without valid authentication`
2. **Test**: `should sanitize user inputs to prevent XSS`
3. **Test**: `should not expose sensitive data in error messages`
4. **Test**: `should pass Semgrep security scan`

---

### Phase 6: Performance Tests (If Applicable)

**File**: `[path-to-perf-test].perf.spec.ts`

**Test Cases**:

1. **Test**: `should complete operation within [X]ms for 95th percentile`
2. **Test**: `should handle [N] concurrent requests`
3. **Test**: `should not leak memory over [X] iterations`

---

## Implementation Checklist

> **Order**: Follow this sequence strictly. Each checkbox should be marked when complete.
> **TDD Rule**: Tests are written and RED before implementation begins.

### Phase 0: Setup & Scaffolding

- [ ] Create package directory structure (if new package)
  - [ ] `src/` directory
  - [ ] `tests/` or `__tests__/` directory
  - [ ] `package.json` with named exports
  - [ ] `tsconfig.json` with `composite: true`
  - [ ] `project.json` for Nx integration

- [ ] Set up test configuration
  - [ ] Vitest config (TypeScript) or pytest config (Python)
  - [ ] Test fixtures and mocks directory
  - [ ] Coverage reporting configured

- [ ] Document initial architecture
  - [ ] Create ADR if significant architectural decision
  - [ ] Update package README.md

---

### Phase 1: Write Failing Tests (RED)

- [ ] **Unit Test Suite 1**: [Component name]
  - [ ] Test case 1: [description] - Status: ❌ RED
  - [ ] Test case 2: [description] - Status: ❌ RED
  - [ ] Test case 3: [description] - Status: ❌ RED

- [ ] **Unit Test Suite 2**: [Component name]
  - [ ] Test case 1: [description] - Status: ❌ RED
  - [ ] Test case 2: [description] - Status: ❌ RED

- [ ] **Integration Tests**
  - [ ] Integration scenario 1 - Status: ❌ RED
  - [ ] Integration scenario 2 - Status: ❌ RED

- [ ] **E2E Tests**
  - [ ] User journey 1 - Status: ❌ RED

- [ ] **Accessibility Tests** (if UI)
  - [ ] Axe audit test - Status: ❌ RED
  - [ ] Keyboard navigation test - Status: ❌ RED

- [ ] **Security Tests**
  - [ ] Auth rejection test - Status: ❌ RED
  - [ ] Input sanitization test - Status: ❌ RED

- [ ] Run test suite - verify ALL tests are RED (failing)
- [ ] Get stakeholder approval on test scenarios

---

### Phase 2: Minimal Implementation (GREEN)

> **Goal**: Write minimal code to make tests pass. Don't optimize yet.

- [ ] **Core Types & Interfaces**
  - [ ] Define Zod schemas for input validation
  - [ ] Create TypeScript interfaces/types
  - [ ] Export from index with named exports

- [ ] **Domain Layer** (Business Logic)
  - [ ] Implement [core function 1] (≤40 lines)
  - [ ] Implement [core function 2] (≤40 lines)
  - [ ] Add brAInwav branding to outputs
  - [ ] Run unit tests - verify GREEN for this layer

- [ ] **Application Layer** (Orchestration)
  - [ ] Implement [orchestration logic 1] (≤40 lines)
  - [ ] Add MCP tool integration (if applicable)
  - [ ] Add A2A event emission (if applicable)
  - [ ] Run integration tests - verify GREEN

- [ ] **Infrastructure Layer** (I/O, External)
  - [ ] Implement [database interaction] (≤40 lines)
  - [ ] Implement [external API call] (≤40 lines)
  - [ ] Add error handling with brAInwav context
  - [ ] Run all tests - verify ALL GREEN

- [ ] **Observability**
  - [ ] Add OpenTelemetry spans for key operations
  - [ ] Add structured logging with Pino
  - [ ] Emit Prometheus metrics (if applicable)
  - [ ] Include brAInwav context in telemetry

---

### Phase 3: Refactor (REFACTOR while keeping GREEN)

> **Goal**: Improve code quality without changing behavior. Tests stay GREEN.

- [ ] **Code Quality Improvements**
  - [ ] Extract duplicated logic into shared utilities
  - [ ] Ensure all functions are ≤40 lines
  - [ ] Simplify complex conditionals with guard clauses
  - [ ] Add JSDoc comments for public APIs
  - [ ] Verify named exports only (no default exports)

- [ ] **Performance Optimization**
  - [ ] Add caching where appropriate
  - [ ] Optimize database queries
  - [ ] Reduce unnecessary allocations
  - [ ] Run performance tests - verify targets met

- [ ] **Error Handling**
  - [ ] Standardize error messages with brAInwav branding
  - [ ] Add error codes and structured error objects
  - [ ] Improve error recovery logic

- [ ] Run full test suite - verify ALL still GREEN after refactoring

---

### Phase 4: Integration & Documentation

- [ ] **MCP/A2A Integration**
  - [ ] Update MCP contracts if new tools added
  - [ ] Update A2A event schemas if new events
  - [ ] Test contract compatibility
  - [ ] Update `libs/typescript/contracts` as needed

- [ ] **Documentation**
  - [ ] Update package README.md
    - [ ] Installation instructions
    - [ ] API documentation
    - [ ] Usage examples
    - [ ] brAInwav branding
  - [ ] Add inline code comments for complex logic
  - [ ] Update root README.md if user-facing feature
  - [ ] Create examples in `examples/` directory

- [ ] **Configuration**
  - [ ] Update environment variable documentation
  - [ ] Add config schema validation
  - [ ] Document configuration options

---

### Phase 5: Quality Gates

- [ ] **Linting & Formatting**
  - [ ] Run `pnpm biome:staged` - verify pass
  - [ ] Run `pnpm lint:smart` - verify pass
  - [ ] Fix any linting violations

- [ ] **Type Checking**
  - [ ] Run `pnpm typecheck:smart` - verify pass
  - [ ] Fix any type errors

- [ ] **Testing**
  - [ ] Run `pnpm test:smart` - verify 100% pass
  - [ ] Run `pnpm test:coverage` - verify 90%+ coverage
  - [ ] All tests GREEN

- [ ] **Security**
  - [ ] Run `pnpm security:scan` - verify zero high findings
  - [ ] Run `pnpm security:scan:gitleaks` - verify no secrets
  - [ ] Fix any security issues

- [ ] **Structure Validation**
  - [ ] Run `pnpm structure:validate` - verify pass
  - [ ] Fix any structural violations

- [ ] **Accessibility** (if UI)
  - [ ] Run accessibility audit - verify WCAG 2.2 AA
  - [ ] Fix any a11y violations

---

### Phase 6: Review & Polish

- [ ] **Code Review Preparation**
  - [ ] Self-review code for Constitution compliance
  - [ ] Verify no mock/placeholder code in production
  - [ ] Check brAInwav branding throughout
  - [ ] Ensure all functions ≤40 lines

- [ ] **Local Memory Documentation**
  - [ ] Store implementation insights in local-memory
  - [ ] Document key decisions and rationale
  - [ ] Tag with relevant context for future work

- [ ] **CHANGELOG Update**
  - [ ] Add entry describing changes
  - [ ] List affected files/packages
  - [ ] Note breaking changes (if any)

- [ ] **Git Workflow**
  - [ ] Commit with conventional commit format
  - [ ] Include `Co-authored-by: brAInwav Development Team`
  - [ ] Push to feature branch

---

## Architecture Decisions

### Key Design Choices

1. **[Decision 1]**: [What was decided]
   - **Rationale**: [Why this approach]
   - **Alternatives Considered**: [Other options]
   - **Trade-offs**: [What we're giving up]

2. **[Decision 2]**: [What was decided]
   - **Rationale**: [Why this approach]
   - **Impact**: [How this affects the system]

---

## Risk Mitigation

| Risk | Mitigation Strategy | Status |
|------|-------------------|--------|
| [Risk description] | [How we're addressing it] | [Planned/In Progress/Complete] |
| Example: Test flakiness | Use deterministic seeds, avoid time-based tests | Planned |

---

## Performance Considerations

### Expected Performance
- **Operation**: [Operation name]
  - **Target**: [Performance target with metric]
  - **Measurement**: [How to verify]

### Optimization Opportunities
- [Future optimization possibility 1]
- [Future optimization possibility 2]

---

## Rollout Plan

### Phase 1: Initial Release
- [ ] Deploy to development environment
- [ ] Run smoke tests
- [ ] Monitor observability dashboards

### Phase 2: Validation
- [ ] Integration testing with dependent packages
- [ ] User acceptance testing (if applicable)
- [ ] Performance validation in dev environment

### Phase 3: Production
- [ ] Merge to main branch
- [ ] CI/CD pipeline completion
- [ ] Production deployment
- [ ] Post-deployment monitoring

---

## Monitoring & Observability

### Metrics to Track
- **Metric 1**: [What to monitor and why]
- **Metric 2**: [What to monitor and why]

### Alerts to Configure
- **Alert**: [Condition that triggers alert]
- **Severity**: [Critical/Warning/Info]
- **Response**: [What to do when alerted]

### Dashboards
- [Link to or description of relevant dashboards]

---

## Rollback Plan

### Conditions for Rollback
- [Condition that would trigger rollback]
- [Condition that would trigger rollback]

### Rollback Procedure
1. [Step 1]
2. [Step 2]
3. [Step 3]

---

## Future Enhancements

### Deferred to Later
- [Enhancement 1]: [Why deferred and when to revisit]
- [Enhancement 2]: [Why deferred and when to revisit]

### Ideas for Iteration
- [Idea 1]
- [Idea 2]

---

## Lessons Learned (Post-Implementation)

> **Note**: Fill this section out after implementation is complete

### What Went Well
- [Success 1]
- [Success 2]

### What Could Be Improved
- [Improvement opportunity 1]
- [Improvement opportunity 2]

### Unexpected Challenges
- [Challenge 1 and how it was resolved]
- [Challenge 2 and how it was resolved]

### Insights for Future Work
- [Insight 1]
- [Insight 2]

---

## References

### Internal Documentation
- Feature Spec: `tasks/[task-id]-spec.md`
- Research: `tasks/[task-id].research.md`
- Related ADRs: [Links]

### External Resources
- [Link to relevant documentation]
- [Link to library docs]
- [Link to standard/spec]

---

**Implementation Started**: [YYYY-MM-DD or "Not Started"]  
**Implementation Completed**: [YYYY-MM-DD or "In Progress"]  
**Tests All Green**: [Yes/No]  
**Quality Gates Passed**: [Yes/No]

Co-authored-by: brAInwav Development Team
