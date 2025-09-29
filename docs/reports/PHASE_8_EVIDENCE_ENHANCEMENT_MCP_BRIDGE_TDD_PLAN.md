# Phase 8 - Evidence Enhancement & MCP Bridge TDD Plan

## Overview

Implementation of Evidence Enhancement with MLX/remote LLMs and MCP Bridge executors following Test-Driven Development methodology for brAInwav Cortex-OS.

## Implementation Status

| Component | Status | Test Coverage | Implementation |
|-----------|--------|---------------|----------------|
| Evidence Runner Package | ✅ COMPLETED | ✅ COMPLETED | ✅ COMPLETED |
| Browser Executor (Playwright) | ✅ COMPLETED | ✅ COMPLETED | ✅ COMPLETED |
| Database Executor | ✅ COMPLETED | ✅ COMPLETED | ✅ COMPLETED |
| Tool Mapping Enhancement | ✅ COMPLETED | ✅ COMPLETED | ✅ COMPLETED |
| MCP Smoke Test Suite | ✅ COMPLETED | ✅ COMPLETED | ✅ COMPLETED |

## TDD Cycle Structure

### Cycle 1: Evidence Enhancement Foundation

**RED** → **GREEN** → **REFACTOR**

#### 1.1 RED Phase - Create Failing Tests

- [ ] Create `packages/evidence-runner/` package structure
- [ ] Write failing test: `packages/evidence-runner/tests/enhancement.test.ts`
- [ ] Test should verify evidence enrichment with MLX integration
- [ ] Verify deterministic configs and telemetry integration

#### 1.2 GREEN Phase - Minimal Implementation

- [ ] Implement basic `EvidenceEnhancer` class
- [ ] Add MLX integration for evidence processing
- [ ] Connect to existing brAInwav MLX infrastructure
- [ ] Ensure all tests pass with minimal implementation

#### 1.3 REFACTOR Phase - Optimize & Clean

- [ ] Extract business logic to appropriate utilities
- [ ] Implement proper error handling with brAInwav branding
- [ ] Add observability and telemetry hooks
- [ ] Optimize performance for deterministic results

### Cycle 2: MCP Bridge Browser Executor

**RED** → **GREEN** → **REFACTOR**

#### 2.1 RED Phase - Create Failing Tests

- [ ] Write failing test: `packages/mcp-bridge/tests/browser-executor.test.ts`
- [ ] Test Playwright-driven DOM extraction
- [ ] Verify secure browser automation
- [ ] Test error handling and cleanup

#### 2.2 GREEN Phase - Minimal Implementation

- [ ] Implement `BrowserExecutor` class in `mcp-bridge`
- [ ] Add Playwright integration with secure configuration
- [ ] Implement DOM extraction capabilities
- [ ] Ensure all browser tests pass

#### 2.3 REFACTOR Phase - Optimize & Clean

- [ ] Add proper resource cleanup and browser management
- [ ] Implement security constraints for browser automation
- [ ] Add telemetry and performance monitoring
- [ ] Optimize for concurrent browser operations

### Cycle 3: MCP Bridge Database Executor

**RED** → **GREEN** → **REFACTOR**

#### 3.1 RED Phase - Create Failing Tests

- [ ] Write failing test: `packages/mcp-bridge/tests/database-executor.test.ts`
- [ ] Test parameterized SQL execution
- [ ] Verify SQL injection protection
- [ ] Test connection pooling and cleanup

#### 3.2 GREEN Phase - Minimal Implementation

- [ ] Implement `DatabaseExecutor` class in `mcp-bridge`
- [ ] Add secure parameterized query support
- [ ] Implement connection management
- [ ] Ensure all database tests pass

#### 3.3 REFACTOR Phase - Optimize & Clean

- [ ] Add comprehensive SQL injection protection
- [ ] Implement proper connection pooling
- [ ] Add query performance monitoring
- [ ] Optimize for high-throughput database operations

### Cycle 4: Tool Mapping Enhancement

**RED** → **GREEN** → **REFACTOR**

#### 4.1 RED Phase - Create Failing Tests

- [ ] Write failing test: `packages/mcp-core/tests/tool-mapping.test.ts`
- [ ] Test safe fallback for unknown tool types
- [ ] Verify tool registration and discovery
- [ ] Test tool validation and security

#### 4.2 GREEN Phase - Minimal Implementation

- [ ] Enhance tool mapping system in `mcp-core`
- [ ] Add safe fallback mechanisms
- [ ] Implement tool type validation
- [ ] Ensure all tool mapping tests pass

#### 4.3 REFACTOR Phase - Optimize & Clean

- [ ] Add comprehensive tool validation
- [ ] Implement advanced fallback strategies
- [ ] Add tool performance monitoring
- [ ] Optimize tool discovery and registration

### Cycle 5: Integration & Smoke Testing

**RED** → **GREEN** → **REFACTOR**

#### 5.1 RED Phase - Create Failing Integration Tests

- [ ] Create comprehensive smoke test suite
- [ ] Add `pnpm test:mcp:smoke` command gated by `PLAYWRIGHT=1`
- [ ] Test end-to-end evidence enhancement workflow
- [ ] Verify integration between all components

#### 5.2 GREEN Phase - Integration Implementation

- [ ] Wire all components together
- [ ] Implement end-to-end workflows
- [ ] Add proper error handling across component boundaries
- [ ] Ensure all integration tests pass

#### 5.3 REFACTOR Phase - Production Optimization

- [ ] Add comprehensive monitoring and observability
- [ ] Implement performance optimizations
- [ ] Add security hardening
- [ ] Optimize for production deployment

## Quality Gates

### Test Coverage Requirements

- **Unit Tests**: Minimum 90% code coverage for all components
- **Integration Tests**: Full workflow coverage
- **Smoke Tests**: End-to-end validation gated by environment variables

### Performance Requirements

- **Evidence Enhancement**: < 2s processing time for standard evidence
- **Browser Executor**: < 5s for DOM extraction operations
- **Database Executor**: < 500ms for parameterized queries
- **Tool Mapping**: < 100ms for tool resolution

### Security Requirements

- **SQL Injection Protection**: 100% parameterized queries
- **Browser Security**: Sandboxed execution environment
- **Input Validation**: Comprehensive validation for all inputs
- **Output Sanitization**: Secure handling of all outputs

## Architecture Decisions

### Evidence Enhancement Strategy

- **Primary**: MLX models for privacy-sensitive evidence processing
- **Fallback**: Remote LLMs for complex analysis when MLX unavailable
- **Configuration**: Deterministic configs for reproducible results
- **Telemetry**: Full observability integration with brAInwav branding

### MCP Bridge Architecture

- **Browser Executor**: Playwright-based with security constraints
- **Database Executor**: Parameterized queries with connection pooling
- **Tool Mapping**: Dynamic discovery with safe fallbacks
- **Error Handling**: Comprehensive error recovery with graceful degradation

### Integration Patterns

- **Event-Driven**: A2A messaging for component communication
- **Circuit Breaker**: Fault tolerance for external dependencies
- **Bulkhead**: Resource isolation between components
- **Monitoring**: Full observability with brAInwav branding

## Implementation Timeline

### Week 1: Foundation (Cycles 1-2)

- **Days 1-2**: Evidence Runner package and tests
- **Days 3-4**: Browser Executor implementation
- **Day 5**: Integration testing and refinement

### Week 2: Core Implementation (Cycles 3-4)

- **Days 1-2**: Database Executor implementation
- **Days 3-4**: Tool Mapping enhancement
- **Day 5**: Component integration testing

### Week 3: Integration & Validation (Cycle 5)

- **Days 1-2**: End-to-end integration
- **Days 3-4**: Smoke test suite implementation
- **Day 5**: Performance optimization and security hardening

## Dependencies

### Existing Components

- ✅ MLX infrastructure from `packages/rag` and `apps/cortex-py`
- ✅ MCP bridge foundation from `packages/mcp-bridge`
- ✅ MCP core from `packages/mcp-core`
- ✅ A2A messaging from `packages/a2a`

### New Dependencies

- 🔄 Playwright for browser automation
- 🔄 Database drivers for secure query execution
- 🔄 Enhanced tool validation framework
- 🔄 Smoke test framework with environment gating

## Validation Criteria

### Functional Validation

- [ ] Evidence enhancement produces deterministic, enriched outputs
- [ ] Browser executor safely extracts DOM content with Playwright
- [ ] Database executor executes parameterized queries securely
- [ ] Tool mapping handles unknown types with safe fallbacks
- [ ] Smoke tests validate end-to-end workflows

### Non-Functional Validation

- [ ] Performance meets defined SLAs
- [ ] Security requirements fully satisfied
- [ ] Observability provides comprehensive insights
- [ ] Error handling provides graceful degradation

### Quality Validation

- [ ] Code coverage exceeds 90% for all components
- [ ] No security vulnerabilities detected
- [ ] Documentation complete and accurate
- [ ] Integration tests validate all workflows

## Success Metrics

### Development Metrics

- **Test-First Development**: 100% of features developed with failing tests first
- **Code Coverage**: >90% for all new components
- **Security Score**: 100% for security requirements
- **Performance SLA**: All components meet defined performance targets

### Operational Metrics

- **Evidence Enhancement Success Rate**: >95%
- **Browser Executor Reliability**: >99% uptime
- **Database Query Performance**: <500ms average
- **Tool Resolution Success**: >99% for known tools

---

**Implementation Notes:**

- All components must include brAInwav branding in logs and outputs
- Follow existing Cortex-OS patterns for error handling and observability
- Integrate with existing A2A messaging infrastructure
- Maintain compatibility with current MCP protocol standards

**Quality Assurance:**

- Each TDD cycle must complete fully before proceeding to next cycle
- All tests must pass before moving from RED to GREEN phase
- Refactoring must not break existing functionality
- Integration tests must validate component boundaries

**Security Requirements:**

- All external inputs must be validated and sanitized
- Database queries must use parameterized statements only
- Browser automation must run in sandboxed environment
- Evidence enhancement must not leak sensitive information

---

*Co-authored-by: brAInwav Development Team*
