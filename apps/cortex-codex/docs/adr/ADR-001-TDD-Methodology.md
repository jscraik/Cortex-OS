# ADR-001: Adoption of Test-Driven Development (TDD) Methodology

## Status

**ACCEPTED** - 2025-09-03

## Context

The Cortex CLI project involves integrating complex functionality from the prior Cortex codebase into the simpler, cleaner codex-rs foundation. Given the complexity of this integration and the need for reliable rollback capabilities, we need a development methodology that ensures:

1. **Reliability**: Each integration step can be verified to work correctly
2. **Reversibility**: Any change can be safely rolled back without breaking the system  
3. **Maintainability**: Code remains understandable and modifiable as complexity grows
4. **Quality**: High code quality is maintained throughout the integration process

## Decision

We will adopt **Test-Driven Development (TDD)** as the primary development methodology for the Cortex CLI project, following the strict Red-Green-Refactor cycle:

### TDD Process

1. **RED**: Write a failing test that defines the desired functionality
2. **GREEN**: Write the minimal code necessary to make the test pass
3. **REFACTOR**: Improve the code quality while keeping all tests green

### Implementation Strategy

- **Every feature starts with a failing test**
- **No production code without a corresponding test**
- **Comprehensive test coverage (target: >=95%)**
- **Multiple testing levels**: Unit tests, integration tests, property-based tests
- **Continuous integration with quality gates**

### Rollback Strategy

- **Git tags for each completed task** (e.g., `v0.1.0-foundation`, `v0.1.1-config`)
- **Feature flags for optional functionality**
- **Database migrations with up/down scripts** (if needed)
- **Atomic, reversible commits**

## Alternatives Considered

### 1. Traditional Development (Code-First)

- **Pros**: Faster initial development, familiar to most developers
- **Cons**: Higher risk of regressions, difficult to ensure comprehensive testing, rollbacks are risky
- **Verdict**: Too risky for complex integration project

### 2. Behavior-Driven Development (BDD)

- **Pros**: Better stakeholder communication, user-focused testing
- **Cons**: Overhead for a primarily technical integration project, less suitable for library/framework code
- **Verdict**: Good for future user-facing features, but TDD is better for current technical integration

### 3. Hybrid Approach (Some TDD, Some Traditional)

- **Pros**: Flexibility to choose approach per component
- **Cons**: Inconsistent quality, unclear when to use which approach, potential gaps in testing
- **Verdict**: Could lead to inconsistent quality and missed edge cases

## Consequences

### Positive

- **High Confidence**: Each integrated feature is thoroughly tested
- **Safe Rollbacks**: Clear rollback points with verified functionality
- **Better Design**: TDD naturally leads to more modular, testable code
- **Regression Prevention**: Comprehensive test suite catches breaking changes
- **Documentation**: Tests serve as living documentation of system behavior
- **Easier Debugging**: Failing tests pinpoint exact issues

### Negative

- **Initial Slower Development**: Writing tests first requires more upfront time
- **Learning Curve**: Team members may need to adapt to TDD practices
- **Test Maintenance**: Tests need to be maintained alongside production code
- **Perfectionism Risk**: Over-testing simple functionality

### Mitigation Strategies

- **Time Boxing**: Set reasonable time limits for test writing to avoid over-engineering
- **Test Categories**: Use different test types (unit/integration/property) appropriately
- **Pragmatic Approach**: Focus on testing behavior, not implementation details
- **Continuous Learning**: Regular retrospectives to improve TDD practices

## Implementation Plan

### Phase 1: Foundation (Current)

- Set up comprehensive integration tests for build system
- Establish CI/CD pipeline with quality gates
- Create first rollback tag (`v0.1.0-foundation`)

### Phase 2: Core Components

- TDD for configuration system integration
- TDD for error handling and logging
- TDD for provider abstraction layer

### Phase 3: Feature Integration

- TDD for each model provider (OpenAI, Anthropic, Local)
- TDD for MCP integration
- TDD for GitHub features

### Quality Gates

```bash
# Required for every commit
cargo test --workspace --all-features
cargo clippy --workspace -- -D warnings
cargo fmt --check

# Required for rollback tags
cargo doc --workspace --all-features
# Enforce coverage >= 95%
cargo llvm-cov --workspace --all-features --fail-under-lines 95 --text
```

## Monitoring and Review

- **Weekly retrospectives** on TDD effectiveness
- **Test coverage tracking** with automatic reporting
- **Performance monitoring** to ensure tests don't slow development excessively
- **Quality metrics** tracking (bug reports, rollback frequency)

## References

- [Test-Driven Development by Kent Beck](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530)
- [Growing Object-Oriented Software, Guided by Tests](https://www.amazon.com/Growing-Object-Oriented-Software-Guided-Tests/dp/0321503627)
- [Rust Testing Best Practices](https://doc.rust-lang.org/book/ch11-00-testing.html)

---

**Decision Date**: 2025-09-03  
**Review Date**: 2025-10-01 (4 weeks)  
**Next ADR**: ADR-002 (Provider Abstraction Design)
