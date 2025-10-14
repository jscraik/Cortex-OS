# Implementation Checklist: arXiv MCP Tool Integration

**Task ID**: `arxiv-mcp-tool-integration`  
**Created**: 2025-01-12  
**Status**: Ready for Implementation  
**Total Tests**: 54 tests across 6 phases

This checklist breaks down the TDD plan into actionable steps with clear checkboxes for tracking progress through RED-GREEN-REFACTOR cycles.

---

## Phase A: Schema Validation & Core Types

### A.1: Input Schema Validation (RED Phase)
- [ ] **Write failing test**: Valid search input with all fields
- [ ] **Write failing test**: Reject query shorter than 2 characters  
- [ ] **Write failing test**: Reject query longer than 512 characters
- [ ] **Write failing test**: Apply default values for optional fields
- [ ] **Write failing test**: Reject invalid sortBy values
- [ ] **Write failing test**: Reject invalid numeric ranges
- [ ] **Verify all 6 tests FAIL**: RED phase complete

### A.1: Input Schema Implementation (GREEN Phase)
- [ ] **Create file**: `packages/agent-toolkit/src/mcp/arxiv/schema.ts`
- [ ] **Implement**: ArxivSearchInput schema with Zod validation
- [ ] **Add**: Query length validation (min 2, max 512 chars)
- [ ] **Add**: Numeric field validation (start ≥0, maxResults 1-50)
- [ ] **Add**: Enum validation for sortBy and sortOrder
- [ ] **Add**: Default values for optional fields
- [ ] **Verify all 6 tests PASS**: GREEN phase complete
- [ ] **Verify**: Function ≤40 lines compliance

### A.1: Input Schema Refactoring (REFACTOR Phase)
- [ ] **Extract**: Common validation patterns to utilities
- [ ] **Add**: JSDoc with brAInwav branding
- [ ] **Optimize**: Schema performance for frequent validation
- [ ] **Verify**: All tests still pass after refactoring
- [ ] **Verify**: Biome linting passes with zero violations

### A.2: Output Schema Validation (RED Phase)
- [ ] **Write failing test**: Valid arXiv paper item structure
- [ ] **Write failing test**: Require brAInwav brand in output
- [ ] **Write failing test**: Validate URL formats for links
- [ ] **Write failing test**: Handle optional fields correctly (DOI, PDF)
- [ ] **Verify all 4 tests FAIL**: RED phase complete

### A.2: Output Schema Implementation (GREEN Phase)
- [ ] **Implement**: ArxivSearchOutput schema with paper items
- [ ] **Add**: URL validation for paper and PDF links
- [ ] **Add**: Required brAInwav branding in output
- [ ] **Add**: Optional field handling (DOI, pdfUrl)
- [ ] **Verify all 4 tests PASS**: GREEN phase complete

### A.2: Output Schema Refactoring (REFACTOR Phase)
- [ ] **Extract**: URL validation to reusable utility
- [ ] **Add**: Comprehensive schema documentation
- [ ] **Verify**: All tests still pass after refactoring

**Phase A Completion**:
- [ ] **Total tests**: 10/10 passing
- [ ] **Coverage**: ≥95% on schema.ts
- [ ] **Quality**: Biome linting clean
- [ ] **Documentation**: JSDoc with brAInwav branding

---

## Phase B: Rate Limiting Implementation

### B.1: Basic Rate Limiting (RED Phase)
- [ ] **Write failing test**: Allow immediate first request
- [ ] **Write failing test**: Throttle subsequent requests to 3s intervals
- [ ] **Write failing test**: Queue multiple requests properly
- [ ] **Write failing test**: Handle concurrent requests from same client
- [ ] **Write failing test**: Implement exponential backoff on errors
- [ ] **Write failing test**: Include brAInwav correlation IDs in logs
- [ ] **Write failing test**: Respect maximum retry limits
- [ ] **Write failing test**: Handle rate limiter timeout scenarios
- [ ] **Verify all 8 tests FAIL**: RED phase complete

### B.1: Rate Limiting Implementation (GREEN Phase)
- [ ] **Create file**: `packages/agent-toolkit/src/mcp/arxiv/rateLimit.ts`
- [ ] **Implement**: RateLimitConfig interface
- [ ] **Implement**: withRateLimit wrapper function (≤40 lines)
- [ ] **Add**: Request queuing with 3-second minimum intervals
- [ ] **Add**: Exponential backoff with jitter for errors
- [ ] **Add**: Correlation ID generation for tracking
- [ ] **Add**: Maximum retry limit enforcement
- [ ] **Add**: Timeout handling and cleanup
- [ ] **Verify all 8 tests PASS**: GREEN phase complete

### B.1: Rate Limiting Refactoring (REFACTOR Phase)
- [ ] **Extract**: Backoff algorithm to separate utility
- [ ] **Optimize**: Memory usage for request tracking
- [ ] **Add**: Comprehensive error handling
- [ ] **Verify**: All tests still pass after refactoring

### B.2: Advanced Rate Limiting Features (RED Phase)
- [ ] **Write failing test**: Differentiate rate limit types (user vs system)
- [ ] **Write failing test**: Emit A2A events for rate limiting events
- [ ] **Write failing test**: Handle rate limiter persistence across restarts
- [ ] **Write failing test**: Provide rate limit status information
- [ ] **Verify all 4 tests FAIL**: RED phase complete

### B.2: Advanced Features Implementation (GREEN Phase)
- [ ] **Add**: Rate limit type differentiation
- [ ] **Add**: A2A event emission using @cortex-os/a2a-contracts
- [ ] **Add**: Rate limit status API
- [ ] **Add**: Optional persistence for state recovery
- [ ] **Verify all 4 tests PASS**: GREEN phase complete

### B.2: Advanced Features Refactoring (REFACTOR Phase)
- [ ] **Extract**: A2A event patterns to reusable helpers
- [ ] **Optimize**: Performance for high-frequency usage
- [ ] **Verify**: All tests still pass after refactoring

**Phase B Completion**:
- [ ] **Total tests**: 12/12 passing
- [ ] **Coverage**: ≥95% on rateLimit.ts
- [ ] **A2A Events**: Properly emitted and tested
- [ ] **Performance**: <100ms for rate limit checks

---

## Phase C: Response Normalization

### C.1: arXiv Response Parsing (RED Phase)
- [ ] **Write failing test**: Normalize arXiv Atom feed entry
- [ ] **Write failing test**: Extract authors correctly from feed format
- [ ] **Write failing test**: Handle missing optional fields gracefully
- [ ] **Write failing test**: Sanitize and validate URLs
- [ ] **Write failing test**: Include brAInwav branding in output
- [ ] **Write failing test**: Handle malformed/incomplete responses
- [ ] **Verify all 6 tests FAIL**: RED phase complete

### C.1: Response Normalization Implementation (GREEN Phase)
- [ ] **Create file**: `packages/agent-toolkit/src/mcp/arxiv/normalize.ts`
- [ ] **Implement**: normalizeArxivResponse function (≤40 lines)
- [ ] **Add**: Atom feed entry parsing logic
- [ ] **Add**: Author name extraction and formatting
- [ ] **Add**: URL sanitization and validation
- [ ] **Add**: brAInwav branding injection
- [ ] **Add**: Error handling for malformed responses
- [ ] **Verify all 6 tests PASS**: GREEN phase complete

### C.1: Normalization Refactoring (REFACTOR Phase)
- [ ] **Extract**: Field mapping to configuration object
- [ ] **Add**: Input validation for MCP responses
- [ ] **Optimize**: Performance for large response processing
- [ ] **Verify**: All tests still pass after refactoring

**Phase C Completion**:
- [ ] **Total tests**: 6/6 passing
- [ ] **Coverage**: ≥95% on normalize.ts
- [ ] **Error Handling**: Graceful degradation for bad data
- [ ] **Security**: URL validation prevents malicious links

---

## Phase D: MCP Adapter Integration

### D.1: MCP Tool Loading (RED Phase)
- [ ] **Write failing test**: Load arXiv tools with valid config
- [ ] **Write failing test**: Handle MCP server connection failures
- [ ] **Write failing test**: Validate tool configurations on load
- [ ] **Write failing test**: Register tools with LangGraph format
- [ ] **Write failing test**: Include brAInwav user agent in requests
- [ ] **Write failing test**: Emit A2A events for tool lifecycle
- [ ] **Write failing test**: Handle feature flag disabled state
- [ ] **Write failing test**: Implement proper cleanup on shutdown
- [ ] **Verify all 8 tests FAIL**: RED phase complete

### D.1: MCP Integration Implementation (GREEN Phase)
- [ ] **Create file**: `packages/agent-toolkit/src/mcp/arxiv/index.ts`
- [ ] **Add dependency**: @langchain/mcp-adapters to package.json
- [ ] **Implement**: ArxivMcpConfig interface
- [ ] **Implement**: loadArxivMcpTools function (≤40 lines)
- [ ] **Add**: MultiServerMCPClient integration
- [ ] **Add**: Tool loading and validation
- [ ] **Add**: LangGraph Tool[] format compliance
- [ ] **Add**: brAInwav user agent header injection
- [ ] **Add**: A2A event emission for tool lifecycle
- [ ] **Add**: Feature flag support
- [ ] **Add**: Cleanup and resource management
- [ ] **Verify all 8 tests PASS**: GREEN phase complete

### D.1: MCP Integration Refactoring (REFACTOR Phase)
- [ ] **Extract**: Configuration validation to utility
- [ ] **Optimize**: Tool loading performance
- [ ] **Add**: Comprehensive monitoring hooks
- [ ] **Verify**: All tests still pass after refactoring

### D.2: Error Handling & Resilience (RED Phase)
- [ ] **Write failing test**: Handle network timeouts with retries
- [ ] **Write failing test**: Log structured errors with correlation IDs
- [ ] **Write failing test**: Degrade gracefully when tools unavailable
- [ ] **Write failing test**: Handle malformed MCP responses
- [ ] **Verify all 4 tests FAIL**: RED phase complete

### D.2: Error Handling Implementation (GREEN Phase)
- [ ] **Add**: Network timeout handling with retries
- [ ] **Add**: Structured error logging with brAInwav branding
- [ ] **Add**: Graceful degradation patterns
- [ ] **Add**: MCP response validation
- [ ] **Verify all 4 tests PASS**: GREEN phase complete

### D.2: Error Handling Refactoring (REFACTOR Phase)
- [ ] **Extract**: Common error patterns to utilities
- [ ] **Optimize**: Error handling performance
- [ ] **Verify**: All tests still pass after refactoring

**Phase D Completion**:
- [ ] **Total tests**: 12/12 passing
- [ ] **Coverage**: ≥95% on index.ts
- [ ] **Integration**: @langchain/mcp-adapters working correctly
- [ ] **Resilience**: Proper error handling and recovery

---

## Phase E: LangGraph Integration

### E.1: Tool Registration & Selection (RED Phase)
- [ ] **Write failing test**: Register arXiv tools with LangGraph workflow
- [ ] **Write failing test**: Allow agent to select arXiv tool for academic queries
- [ ] **Write failing test**: Handle tool selection in multi-tool scenarios
- [ ] **Write failing test**: Pass tool results correctly through workflow
- [ ] **Write failing test**: Handle tool failures without breaking workflow
- [ ] **Write failing test**: Emit proper A2A events during tool execution
- [ ] **Verify all 6 tests FAIL**: RED phase complete

### E.1: LangGraph Integration Implementation (GREEN Phase)
- [ ] **Create file**: `packages/agents/src/langgraph/arxiv-integration.ts`
- [ ] **Implement**: createArxivIntegratedWorkflow function (≤40 lines)
- [ ] **Add**: LangGraph workflow with arXiv tools
- [ ] **Add**: Tool selection and routing logic
- [ ] **Add**: Workflow state management
- [ ] **Add**: Error handling for tool failures
- [ ] **Add**: A2A event integration
- [ ] **Verify all 6 tests PASS**: GREEN phase complete

### E.1: LangGraph Integration Refactoring (REFACTOR Phase)
- [ ] **Extract**: Workflow patterns to reusable components
- [ ] **Optimize**: Workflow performance
- [ ] **Add**: Comprehensive monitoring
- [ ] **Verify**: All tests still pass after refactoring

### E.2: End-to-End Workflow Testing (RED Phase)
- [ ] **Write failing test**: Complete academic paper search workflow
- [ ] **Write failing test**: Handle feature flag changes during execution
- [ ] **Write failing test**: Maintain performance within SLA targets
- [ ] **Write failing test**: Handle concurrent tool usage correctly
- [ ] **Verify all 4 tests FAIL**: RED phase complete

### E.2: End-to-End Implementation (GREEN Phase)
- [ ] **Add**: Complete workflow test scenarios
- [ ] **Add**: Performance validation
- [ ] **Add**: Concurrency handling
- [ ] **Add**: Dynamic configuration support
- [ ] **Verify all 4 tests PASS**: GREEN phase complete

### E.2: End-to-End Refactoring (REFACTOR Phase)
- [ ] **Optimize**: Overall workflow performance
- [ ] **Extract**: Reusable integration patterns
- [ ] **Verify**: All tests still pass after refactoring

**Phase E Completion**:
- [ ] **Total tests**: 10/10 passing
- [ ] **Coverage**: ≥95% on arxiv-integration.ts
- [ ] **Integration**: Seamless LangGraph workflow integration
- [ ] **Performance**: <3s average response time

---

## Phase F: Feature Flag & Configuration

### F.1: Configuration Management (RED Phase)
- [ ] **Write failing test**: Read configuration from environment variables
- [ ] **Write failing test**: Validate configuration on startup
- [ ] **Write failing test**: Handle missing optional config gracefully
- [ ] **Write failing test**: Support dynamic configuration updates
- [ ] **Verify all 4 tests FAIL**: RED phase complete

### F.1: Configuration Implementation (GREEN Phase)
- [ ] **Add**: Environment variable parsing
- [ ] **Add**: Configuration validation
- [ ] **Add**: Default value handling
- [ ] **Add**: Dynamic configuration support
- [ ] **Update file**: .env.example with arXiv configuration
- [ ] **Verify all 4 tests PASS**: GREEN phase complete

### F.2: Feature Flag Implementation (RED Phase)
- [ ] **Write failing test**: Enable/disable tools based on feature flag
- [ ] **Write failing test**: Handle feature flag changes without restart
- [ ] **Write failing test**: Log feature flag state changes
- [ ] **Verify all 3 tests FAIL**: RED phase complete

### F.2: Feature Flag Implementation (GREEN Phase)
- [ ] **Add**: Feature flag toggle behavior
- [ ] **Add**: Dynamic flag update support
- [ ] **Add**: Audit logging for flag changes
- [ ] **Verify all 3 tests PASS**: GREEN phase complete

### F.2: Configuration Refactoring (REFACTOR Phase)
- [ ] **Extract**: Configuration management to utility
- [ ] **Add**: Configuration validation
- [ ] **Optimize**: Startup performance
- [ ] **Verify**: All tests still pass after refactoring

**Phase F Completion**:
- [ ] **Total tests**: 7/7 passing
- [ ] **Coverage**: ≥95% on configuration modules
- [ ] **Environment**: .env.example updated
- [ ] **Feature Flags**: Working enable/disable functionality

---

## Final Integration & Quality Gates

### Code Quality Verification
- [ ] **Run**: `pnpm lint` - Zero violations
- [ ] **Run**: `pnpm typecheck` - No TypeScript errors
- [ ] **Verify**: All functions ≤40 lines
- [ ] **Verify**: Named exports only (no default exports)
- [ ] **Verify**: brAInwav branding in all logs/errors

### Testing & Coverage
- [ ] **Run**: `pnpm test` - All 54 tests passing
- [ ] **Verify**: ≥90% overall coverage
- [ ] **Verify**: ≥95% coverage on new code
- [ ] **Run**: Integration tests with mock MCP server
- [ ] **Run**: Performance tests within SLA targets

### Security & Compliance
- [ ] **Run**: `pnpm security:scan` - Zero high/critical issues
- [ ] **Verify**: Input validation on all user inputs
- [ ] **Verify**: Rate limiting enforced and tested
- [ ] **Verify**: No secrets in code
- [ ] **Verify**: Structured logging with correlation IDs

### Documentation & Examples
- [ ] **Create**: ADR at docs/architecture/decisions/002-arxiv-mcp-as-tool.md
- [ ] **Update**: packages/agent-toolkit/README.md
- [ ] **Update**: packages/agents/README.md
- [ ] **Create**: Usage examples and troubleshooting guide

### Deployment Preparation
- [ ] **Verify**: Feature flag default to false (safe deployment)
- [ ] **Verify**: Graceful degradation when disabled
- [ ] **Verify**: A2A events working for monitoring
- [ ] **Verify**: Configuration validation and error messages

---

## Verification Commands

### Run Before Each Phase
```bash
# Ensure clean state
pnpm lint
pnpm typecheck
pnpm test --run
```

### Run After Each GREEN Phase
```bash
# Verify implementation works
pnpm test packages/agent-toolkit/__tests__/mcp/arxiv/
pnpm test packages/agents/tests/integration/arxiv-mcp.test.ts
```

### Run Before Final Completion
```bash
# Full quality gate check
pnpm lint && pnpm test && pnpm security:scan
pnpm structure:validate
pnpm test:coverage --threshold 90
```

---

## Progress Tracking

### Overall Progress: 0/54 tests complete

#### Phase A (Schema): 0/10 ☐
- A.1 Input Schema: 0/6 ☐
- A.2 Output Schema: 0/4 ☐

#### Phase B (Rate Limiting): 0/12 ☐  
- B.1 Basic Rate Limiting: 0/8 ☐
- B.2 Advanced Features: 0/4 ☐

#### Phase C (Normalization): 0/6 ☐
- C.1 Response Parsing: 0/6 ☐

#### Phase D (MCP Integration): 0/12 ☐
- D.1 Tool Loading: 0/8 ☐
- D.2 Error Handling: 0/4 ☐

#### Phase E (LangGraph): 0/10 ☐
- E.1 Tool Registration: 0/6 ☐
- E.2 End-to-End: 0/4 ☐

#### Phase F (Configuration): 0/7 ☐
- F.1 Config Management: 0/4 ☐
- F.2 Feature Flags: 0/3 ☐

---

**Status**: Ready to begin Phase A.1 (RED tests)  
**Next Action**: Write failing tests for ArxivSearchInput validation

Co-authored-by: brAInwav Development Team