# TDD Plan Template Conformance Analysis

**Date**: 2025-10-08  
**Files Analyzed**:
- `.cortex/templates/tdd-plan-template.md` (525 lines)
- `packages/tdd-coach/docs/tdd-planning-guide.md` (766 lines)
- `packages/tdd-coach/docs/tdd-quick-references-card.md` (534 lines)

---

## Conformance Assessment

### ❌ MISSING REQUIREMENTS

The tdd-plan-template.md is missing critical requirements from tdd-coach documentation:

#### 1. Quality Gates (from tdd-planning-guide.md)
**Missing**:
- ❌ 95/95 coverage requirement (line AND branch)
- ❌ Mutation score ≥ 80% requirement
- ❌ Flake rate < 1% requirement
- ❌ Security gates (0 Critical/High vulnerabilities)
- ❌ Performance SLO requirements (P95 latency)
- ❌ Reliability SLOs (graceful shutdown, backpressure)

**Current**: Template only mentions "90%+ test coverage" (not specific enough)

#### 2. Operational Readiness Rubric (20-point checklist)
**Missing**:
- ❌ Infrastructure & Health (health endpoints, config management, secrets, timeouts)
- ❌ Resilience & Reliability (retries, circuit breakers, idempotency, logs, metrics)
- ❌ Observability (distributed tracing, dashboards, graceful shutdown, resource limits)
- ❌ Deployment & Security (migrations, rollback strategy, SBOM, chaos testing)
- ❌ Environment & Process (staging parity, runbooks, data privacy, dependency audit)

**Impact**: Cannot achieve operational readiness score ≥ 95%

#### 3. Advanced Test Types
**Missing**:
- ❌ Property-based tests (for parsers, serializers, numeric operations)
- ❌ Fuzz tests (input validation, protocol handling)
- ❌ Contract tests (service APIs, consumer and provider sides)
- ❌ Chaos/fault injection tests (Toxiproxy, partial failures)
- ❌ Load testing (k6, realistic data, SLO targeting)
- ❌ Concurrency testing (race detectors, randomized schedulers)

**Current**: Template only covers Unit, Integration, E2E, A11y, Security, Performance

#### 4. Test Quality Requirements  
**Missing from template**:
- ❌ Deterministic and repeatable tests
- ❌ No test dependencies or ordering requirements
- ❌ Proper test isolation with setup/teardown
- ❌ Snapshot/golden tests for log formats and metric names
- ❌ Resource monitoring (memory, CPU, file handles)

#### 5. TDD Cycle Structure (from quick-reference-card)
**Missing**:
- ❌ Explicit 2-minute cycle documentation
- ❌ "Before You Code Checklist"
- ❌ Test naming convention examples
- ❌ Three A's pattern (Arrange-Act-Assert)
- ❌ Common test smells and fixes
- ❌ "When to Write Which Test" guidance

#### 6. Operational Tests
**Missing**:
- ❌ Timeout enforcement tests
- ❌ Retry logic verification (exponential backoff, circuit breakers)
- ❌ Idempotency tests
- ❌ Graceful shutdown tests (SIGTERM handling)
- ❌ Health check validation
- ❌ Metrics emission tests
- ❌ Trace span verification
- ❌ Log field validation

#### 7. Security Testing
**Missing specifics**:
- ❌ Role-based access testing (all roles and permissions)
- ❌ SQL injection prevention tests
- ❌ XSS prevention tests
- ❌ Command injection prevention
- ❌ Secrets handling verification (never logged, encrypted at rest)
- ❌ Vulnerability scanning automation
- ❌ Supply chain security (SBOM, signature verification)
- ❌ License compliance validation

### ✅ WHAT'S ALIGNED

The template correctly includes:
- ✅ TDD mandate (write tests first)
- ✅ Phase-based approach (RED-GREEN-REFACTOR)
- ✅ Unit, Integration, E2E test structure
- ✅ Given-When-Then format
- ✅ brAInwav branding requirements
- ✅ Implementation checklist
- ✅ Quality gate commands (lint, test, security:scan)

---

## Recommendations

### Priority 1: Add Quality Gates Section
Insert after "Success Criteria":

```markdown
## Quality Gates (TDD Coach Standards)

### Coverage Requirements
- **Line Coverage**: ≥ 95% on changed code
- **Branch Coverage**: ≥ 95% on changed code
- **Mutation Score**: ≥ 80% (prevents vacuous tests)
- **Flake Rate**: < 1% (tracked over last N runs)

### Operational Readiness
- **Score Required**: ≥ 95% (19/20 points minimum)
- **Rubric**: See Operational Readiness Rubric below

### Security Gates
- **Vulnerabilities**: 0 Critical/High allowed
- **Secrets Scan**: Must be clean
- **SBOM**: Generation and validation required

### Performance SLOs
- **P95 Latency**: < [X]ms under expected load
- **Error Rate**: < [Y]%
- **Headroom**: 10% above targets required
```

### Priority 2: Add Operational Readiness Rubric
Insert comprehensive 20-point checklist from tdd-planning-guide.md

### Priority 3: Expand Test Types
Add sections for:
- Property-based tests
- Fuzz tests  
- Contract tests
- Chaos/fault injection tests
- Load/stress tests
- Concurrency tests

### Priority 4: Add Operational Test Section
Before "Implementation Checklist":

```markdown
### Phase 7: Operational Tests (Write First)

#### System Behavior Tests
- Timeout enforcement
- Retry logic with circuit breakers
- Idempotency verification
- Graceful shutdown (SIGTERM handling)
- Health check validation
- Metrics emission
- Distributed tracing spans
- Structured log fields

#### Resource Monitoring
- Memory usage tracking
- CPU consumption
- File handle limits
- Queue depth/backpressure
```

### Priority 5: Add TDD Quick Reference
Insert at beginning after "Task Summary":

```markdown
## TDD Cycle (Quick Reference)

**2-Minute Cycle**:
1. **RED** (30-60s): Write failing test specifying behavior
2. **GREEN** (30-60s): Minimal implementation to pass
3. **REFACTOR** (30-60s): Improve code, keep tests green
4. **COMMIT** (<50 lines): Save progress

**Before You Code Checklist**:
- [ ] Do I have a failing test?
- [ ] Is the test specific and focused?
- [ ] Can I describe the behavior in one sentence?
- [ ] Is this <50 lines of change?

**If NO to any: STOP. Write the test first.**
```

### Priority 6: Add Test Quality Section
```markdown
## Test Quality Requirements

All tests must be:
- **Deterministic**: Same input always produces same output
- **Repeatable**: Can run multiple times with same result
- **Isolated**: No dependencies on other tests
- **Independent**: Order doesn't matter
- **Fast**: Quick feedback loop (<2 minutes total)

### Test Patterns
- **Three A's**: Arrange, Act, Assert
- **Given-When-Then**: Clear behavior specification
- **Single Assertion**: One concept per test (where possible)
```

---

## Impact of Non-Conformance

### Development Quality
- ❌ Cannot achieve 95/95 coverage without explicit requirement
- ❌ Missing mutation testing leads to vacuous tests
- ❌ No operational readiness tracking
- ❌ Advanced test types not considered

### Production Readiness
- ❌ Cannot score operational readiness without rubric
- ❌ Missing critical operational tests (graceful shutdown, backpressure, etc.)
- ❌ Security testing incomplete
- ❌ No chaos/fault injection validation

### Process Compliance
- ❌ Template doesn't enforce tdd-coach standards
- ❌ Generated plans won't pass tdd-coach validation
- ❌ Inconsistency between template and tooling

---

## Recommended Actions

1. **Update Template** (High Priority)
   - Add all missing sections from analysis
   - Align with tdd-planning-guide.md requirements
   - Include quick-reference-card guidance

2. **Create Examples** (Medium Priority)
   - Generate example TDD plan using updated template
   - Show property-based, fuzz, contract test examples
   - Demonstrate operational readiness scoring

3. **Tool Integration** (Medium Priority)
   - Update `cortex-task plan` to validate against tdd-coach requirements
   - Add prompts for quality gates and operational readiness
   - Generate rubric checklist automatically

4. **Documentation** (Low Priority)
   - Update task-management-guide.md to reference tdd-coach standards
   - Cross-link template with tdd-planning-guide.md
   - Add troubleshooting for common gaps

---

## Conclusion

The tdd-plan-template.md provides a good foundation but **does not conform** to the comprehensive requirements in tdd-coach documentation. The template focuses on basic TDD (RED-GREEN-REFACTOR) but misses:
- 95/95 coverage requirement
- Mutation testing requirement
- 20-point operational readiness rubric
- Advanced test types (property-based, fuzz, contract, chaos)
- Operational test categories
- Security testing specifics

**Recommendation**: Update template to be fully conformant with tdd-coach standards for production-ready development.

---

**Status**: Non-Conformant - Update Required  
**Priority**: High (affects code quality and production readiness)

Co-authored-by: brAInwav Development Team
