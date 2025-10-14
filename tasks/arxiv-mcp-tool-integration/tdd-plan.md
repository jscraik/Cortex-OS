# TDD Plan: arXiv MCP Tool Integration

**Task ID**: `arxiv-mcp-tool-integration`  
**Created**: 2025-01-12  
**Test Framework**: Vitest  
**Coverage Target**: ≥90%

---

## Task Summary & Scope

This TDD plan implements arXiv MCP tool integration for brAInwav Cortex-OS agents. The implementation adds academic paper search capabilities through LangGraph tool integration while maintaining agent-first architecture and local-first principles.

**Scope In**:
- MCP adapter integration for arXiv tools
- LangGraph tool binding and selection
- Rate limiting for arXiv API compliance (1 req/3s)
- Input/output schema validation
- A2A event emission for observability
- Feature flag implementation

**Scope Out**:
- Modifications to existing RAG systems
- Custom arXiv API implementation (using MCP only)
- User interface changes
- Authentication/authorization changes

---

## PRP Gate Alignment

### Gate G0: Research & Planning ✅
- **Research Complete**: `research.md` documents MCP adapter approach
- **Feature Spec Complete**: `feature-spec.md` defines 4 prioritized user stories
- **Architecture Decided**: @langchain/mcp-adapters with LangGraph integration

### Gate G1: Design & Contracts ✅
- **API Contracts**: Zod schemas for arXiv input/output defined
- **Error Handling**: Graceful degradation patterns specified
- **Integration Points**: LangGraph ToolNode and A2A events identified

### Gate G2: Implementation Standards ⏳
- **TDD Process**: Red-Green-Refactor cycles planned below
- **Code Quality**: Functions ≤40 lines, named exports, brAInwav branding
- **Testing**: Unit and integration tests with ≥90% coverage

### Gate G3: Security & Compliance ⏳
- **Input Validation**: Query sanitization and length limits
- **Rate Limiting**: Client-side enforcement for API compliance
- **Audit Logging**: Correlation IDs and structured logging

### Gate G4: Integration & E2E ⏳
- **LangGraph Integration**: Tool selection and workflow execution
- **A2A Events**: Monitoring and observability integration
- **Feature Flags**: Safe rollout and rollback capabilities

### Gate G5: Production Readiness ⏳
- **Performance**: <3s response times, proper error handling
- **Monitoring**: Metrics, logs, and alerts configured
- **Documentation**: ADR, usage guides, troubleshooting

### Gate G6: Deployment ⏳
- **Environment Config**: Environment variables and feature flags
- **Rollback Plan**: Safe disable through feature flag
- **Monitoring**: Real-time metrics and error tracking

### Gate G7: Validation & Closure ⏳
- **User Acceptance**: All acceptance scenarios pass
- **Performance**: Meets latency and throughput targets
- **Stability**: Error rates within acceptable thresholds

---

## Enforcement Profile Targets

### Coverage Requirements
- **Overall Coverage**: ≥90% (brAInwav Constitution requirement)
- **New Code Coverage**: ≥95% (higher bar for new features)
- **Branch Coverage**: ≥85% (ensure all code paths tested)
- **Mutation Score**: ≥80% (test quality validation)

### Performance Targets
- **Tool Loading**: <100ms initialization time
- **Query Response**: <3s average response time
- **Rate Limiting**: Enforce 1 request/3 second limit
- **Memory Usage**: <10MB additional memory footprint

### Quality Gates
- **Linting**: Biome checks pass with zero violations
- **Type Checking**: TypeScript strict mode compliance
- **Security**: No high/critical vulnerabilities in security scan
- **Structure**: Nx workspace validation passes

---

## Prerequisites & Dependencies

### Development Environment
- Node.js ≥20.0.0 (existing requirement)
- pnpm workspace environment (existing)
- Vitest testing framework (existing)
- Biome linting and formatting (existing)

### Dependencies to Add
```json
{
  "@langchain/mcp-adapters": "^0.1.0"
}
```

### Test Dependencies (existing)
- `vitest` for unit and integration testing
- `@vitest/coverage-v8` for coverage reporting
- `msw` for HTTP request mocking
- `supertest` for API testing

### External Services
- arXiv MCP server for integration testing (mock for unit tests)
- Local memory MCP for storing task context
- A2A event system for monitoring integration

---

## Test Strategy & Organization

### Test Pyramid Structure

```
    E2E Tests (5%)
    ├─ LangGraph workflow integration
    └─ Feature flag behavior validation
    
  Integration Tests (25%)
  ├─ MCP adapter integration
  ├─ A2A event emission
  └─ Rate limiting with timing
  
Unit Tests (70%)
├─ Schema validation
├─ Response normalization  
├─ Rate limiting logic
├─ Error handling
└─ Configuration parsing
```

### Test Organization

```
packages/agent-toolkit/__tests__/mcp/arxiv/
├─ schema.test.ts              # Input/output validation
├─ normalize.test.ts           # Response transformation
├─ rateLimit.test.ts          # Throttling and backoff
└─ index.test.ts              # Tool loading and integration

packages/agents/tests/integration/
└─ arxiv-mcp.test.ts          # LangGraph integration
```

---

## Phase A: Schema Validation & Core Types (RED-GREEN-REFACTOR)

### A.1: Input Schema Validation (RED Phase)

**Test File**: `packages/agent-toolkit/__tests__/mcp/arxiv/schema.test.ts`

**Tests to Write** (6 tests):

```typescript
describe('ArxivSearchInput validation', () => {
  test('should accept valid search input with all fields', () => {
    // RED: Expect test to fail initially
  });
  
  test('should reject query shorter than 2 characters', () => {
    // RED: Expect test to fail initially
  });
  
  test('should reject query longer than 512 characters', () => {
    // RED: Expect test to fail initially
  });
  
  test('should apply default values for optional fields', () => {
    // RED: Expect test to fail initially
  });
  
  test('should reject invalid sortBy values', () => {
    // RED: Expect test to fail initially
  });
  
  test('should reject invalid numeric ranges', () => {
    // RED: Expect test to fail initially
  });
});
```

**Files to Create** (GREEN Phase):
- `packages/agent-toolkit/src/mcp/arxiv/schema.ts`

**Expected Implementation** (≤40 lines per function):
```typescript
export const ArxivSearchInput = z.object({
  query: z.string().min(2).max(512),
  start: z.number().int().min(0).default(0),
  maxResults: z.number().int().min(1).max(50).default(10),
  sortBy: z.enum(["relevance", "submittedDate", "lastUpdatedDate"]).default("submittedDate"),
  sortOrder: z.enum(["ascending", "descending"]).default("descending"),
});
```

### A.2: Output Schema Validation (RED Phase)

**Tests to Write** (4 tests):

```typescript
describe('ArxivSearchOutput validation', () => {
  test('should accept valid arXiv paper item', () => {
    // RED: Test arXiv paper structure validation
  });
  
  test('should require brAInwav brand in output', () => {
    // RED: Ensure branding compliance
  });
  
  test('should validate URL formats for paper links', () => {
    // RED: URL validation for paper and PDF links
  });
  
  test('should handle optional fields correctly', () => {
    // RED: DOI and PDF URL optional field handling
  });
});
```

**REFACTOR Phase Goals**:
- Extract common validation patterns
- Optimize schema performance
- Add JSDoc documentation with brAInwav branding

---

## Phase B: Rate Limiting Implementation (RED-GREEN-REFACTOR)

### B.1: Basic Rate Limiting (RED Phase)

**Test File**: `packages/agent-toolkit/__tests__/mcp/arxiv/rateLimit.test.ts`

**Tests to Write** (8 tests):

```typescript
describe('Rate Limiting', () => {
  test('should allow immediate first request', () => {
    // RED: First request should go through immediately
  });
  
  test('should throttle subsequent requests to 3 second intervals', () => {
    // RED: Verify 3-second minimum interval
  });
  
  test('should queue multiple requests properly', () => {
    // RED: Test request queuing behavior
  });
  
  test('should handle concurrent requests from same client', () => {
    // RED: Multiple simultaneous requests handling
  });
  
  test('should implement exponential backoff on errors', () => {
    // RED: Backoff algorithm for error responses
  });
  
  test('should include brAInwav correlation IDs in logs', () => {
    // RED: Structured logging requirements
  });
  
  test('should respect maximum retry limits', () => {
    // RED: Prevent infinite retry loops
  });
  
  test('should handle rate limiter timeout scenarios', () => {
    // RED: Timeout and cleanup behavior
  });
});
```

**Files to Create** (GREEN Phase):
- `packages/agent-toolkit/src/mcp/arxiv/rateLimit.ts`

**Expected Implementation** (≤40 lines per function):
```typescript
export interface RateLimitConfig {
  minIntervalMs: number;
  maxRetries: number;
  backoffFactor: number;
}

export const withRateLimit = async <T>(
  key: string,
  fn: () => Promise<T>,
  config: RateLimitConfig
): Promise<T> => {
  // Implementation with proper throttling
};
```

### B.2: Advanced Rate Limiting Features (RED Phase)

**Tests to Write** (4 tests):

```typescript
describe('Advanced Rate Limiting', () => {
  test('should differentiate between rate limit types (user vs system)', () => {
    // RED: Different limiting strategies
  });
  
  test('should emit A2A events for rate limiting events', () => {
    // RED: Monitoring integration
  });
  
  test('should handle rate limiter persistence across restarts', () => {
    // RED: State persistence if needed
  });
  
  test('should provide rate limit status information', () => {
    // RED: Rate limit status API
  });
});
```

**REFACTOR Phase Goals**:
- Extract rate limiting to reusable utility
- Optimize memory usage for tracking
- Add comprehensive error handling

---

## Phase C: Response Normalization (RED-GREEN-REFACTOR)

### C.1: arXiv Response Parsing (RED Phase)

**Test File**: `packages/agent-toolkit/__tests__/mcp/arxiv/normalize.test.ts`

**Tests to Write** (6 tests):

```typescript
describe('Response Normalization', () => {
  test('should normalize arXiv Atom feed entry to structured format', () => {
    // RED: Complete entry transformation
  });
  
  test('should extract authors correctly from feed format', () => {
    // RED: Author name parsing and formatting
  });
  
  test('should handle missing optional fields gracefully', () => {
    // RED: DOI, PDF links, categories parsing
  });
  
  test('should sanitize and validate URLs', () => {
    // RED: URL validation and security
  });
  
  test('should include brAInwav branding in normalized output', () => {
    // RED: Branding requirement compliance
  });
  
  test('should handle malformed or incomplete responses', () => {
    // RED: Error resilience and logging
  });
});
```

**Files to Create** (GREEN Phase):
- `packages/agent-toolkit/src/mcp/arxiv/normalize.ts`

**Expected Implementation** (≤40 lines per function):
```typescript
export const normalizeArxivResponse = (
  mcpResponse: unknown
): ArxivSearchOutput => {
  // Transform MCP response to structured format
  // Include brAInwav branding
  // Handle errors gracefully
};
```

**REFACTOR Phase Goals**:
- Extract field mapping to configuration
- Add comprehensive input validation
- Optimize performance for large responses

---

## Phase D: MCP Adapter Integration (RED-GREEN-REFACTOR)

### D.1: MCP Tool Loading (RED Phase)

**Test File**: `packages/agent-toolkit/__tests__/mcp/arxiv/index.test.ts`

**Tests to Write** (8 tests):

```typescript
describe('MCP Tool Loading', () => {
  test('should load arXiv tools successfully with valid config', () => {
    // RED: Basic tool loading functionality
  });
  
  test('should handle MCP server connection failures gracefully', () => {
    // RED: Connection error handling
  });
  
  test('should validate tool configurations on load', () => {
    // RED: Configuration validation
  });
  
  test('should register tools with LangGraph format', () => {
    // RED: LangGraph Tool[] format compliance
  });
  
  test('should include brAInwav user agent in requests', () => {
    // RED: User agent header requirement
  });
  
  test('should emit A2A events for tool lifecycle', () => {
    // RED: Tool start/success/failure events
  });
  
  test('should handle feature flag disabled state', () => {
    // RED: Feature flag behavior
  });
  
  test('should implement proper cleanup on shutdown', () => {
    // RED: Resource cleanup and connection management
  });
});
```

**Files to Create** (GREEN Phase):
- `packages/agent-toolkit/src/mcp/arxiv/index.ts`

**Expected Implementation** (≤40 lines per function):
```typescript
export interface ArxivMcpConfig {
  url: string;
  headers?: Record<string, string>;
  minIntervalMs?: number;
  userAgent: string;
  enabled?: boolean;
}

export const loadArxivMcpTools = async (
  config: ArxivMcpConfig
): Promise<Tool[]> => {
  // Use @langchain/mcp-adapters
  // Integrate rate limiting
  // Add brAInwav branding
};
```

### D.2: Error Handling & Resilience (RED Phase)

**Tests to Write** (4 tests):

```typescript
describe('Error Handling', () => {
  test('should handle network timeouts with appropriate retries', () => {
    // RED: Network resilience
  });
  
  test('should log structured errors with correlation IDs', () => {
    // RED: Logging requirements
  });
  
  test('should degrade gracefully when tools unavailable', () => {
    // RED: Graceful degradation
  });
  
  test('should handle malformed MCP responses', () => {
    // RED: Response validation and error handling
  });
});
```

**REFACTOR Phase Goals**:
- Extract common error handling patterns
- Optimize tool loading performance
- Add comprehensive monitoring hooks

---

## Phase E: LangGraph Integration (RED-GREEN-REFACTOR)

### E.1: Tool Registration & Selection (RED Phase)

**Test File**: `packages/agents/tests/integration/arxiv-mcp.test.ts`

**Tests to Write** (6 tests):

```typescript
describe('LangGraph Integration', () => {
  test('should register arXiv tools with LangGraph workflow', () => {
    // RED: Tool registration in agent workflow
  });
  
  test('should allow agent to select arXiv tool for academic queries', () => {
    // RED: Autonomous tool selection
  });
  
  test('should handle tool selection in multi-tool scenarios', () => {
    // RED: Tool selection logic
  });
  
  test('should pass tool results correctly through workflow', () => {
    // RED: Data flow validation
  });
  
  test('should handle tool failures without breaking workflow', () => {
    // RED: Error resilience in workflows
  });
  
  test('should emit proper A2A events during tool execution', () => {
    // RED: Monitoring integration
  });
});
```

**Files to Create** (GREEN Phase):
- `packages/agents/src/langgraph/arxiv-integration.ts`

**Expected Implementation** (≤40 lines per function):
```typescript
export const createArxivIntegratedWorkflow = async (
  config: ArxivMcpConfig
): Promise<CompiledGraph> => {
  // Create LangGraph workflow with arXiv tools
  // Include proper error handling
  // Add monitoring integration
};
```

### E.2: End-to-End Workflow Testing (RED Phase)

**Tests to Write** (4 tests):

```typescript
describe('End-to-End Workflows', () => {
  test('should complete academic paper search workflow end-to-end', () => {
    // RED: Complete user journey test
  });
  
  test('should handle feature flag changes during execution', () => {
    // RED: Dynamic configuration changes
  });
  
  test('should maintain performance within SLA targets', () => {
    // RED: Performance validation
  });
  
  test('should handle concurrent tool usage correctly', () => {
    // RED: Concurrency and resource management
  });
});
```

**REFACTOR Phase Goals**:
- Optimize workflow performance
- Extract reusable integration patterns
- Add comprehensive monitoring

---

## Phase F: Feature Flag & Configuration (RED-GREEN-REFACTOR)

### F.1: Configuration Management (RED Phase)

**Tests to Write** (4 tests):

```typescript
describe('Configuration Management', () => {
  test('should read configuration from environment variables', () => {
    // RED: Environment variable parsing
  });
  
  test('should validate configuration on startup', () => {
    // RED: Configuration validation
  });
  
  test('should handle missing optional configuration gracefully', () => {
    // RED: Default value handling
  });
  
  test('should support dynamic configuration updates', () => {
    // RED: Runtime configuration changes
  });
});
```

### F.2: Feature Flag Implementation (RED Phase)

**Tests to Write** (3 tests):

```typescript
describe('Feature Flag Behavior', () => {
  test('should enable/disable tools based on feature flag', () => {
    // RED: Feature flag toggle behavior
  });
  
  test('should handle feature flag changes without restart', () => {
    // RED: Dynamic flag updates
  });
  
  test('should log feature flag state changes', () => {
    // RED: Audit logging for flag changes
  });
});
```

**REFACTOR Phase Goals**:
- Centralize configuration management
- Add configuration validation
- Optimize startup performance

---

## Implementation Checklist

### Phase A: Schema Validation ✅ (After GREEN)
- [ ] ArxivSearchInput schema with validation
- [ ] ArxivSearchOutput schema with brAInwav branding
- [ ] Comprehensive input validation tests
- [ ] Error message formatting with branding
- [ ] Schema documentation and examples

### Phase B: Rate Limiting ✅ (After GREEN)
- [ ] Basic rate limiting with 3-second intervals
- [ ] Exponential backoff for errors
- [ ] Request queuing and timeout handling
- [ ] A2A event emission for rate limiting
- [ ] Structured logging with correlation IDs

### Phase C: Response Normalization ✅ (After GREEN)
- [ ] arXiv Atom feed parsing
- [ ] Author name extraction and formatting
- [ ] URL validation and sanitization
- [ ] Error handling for malformed responses
- [ ] brAInwav branding in normalized output

### Phase D: MCP Integration ✅ (After GREEN)
- [ ] @langchain/mcp-adapters implementation
- [ ] Tool loading and configuration
- [ ] Connection error handling
- [ ] Feature flag integration
- [ ] A2A event emission for tool lifecycle

### Phase E: LangGraph Integration ✅ (After GREEN)
- [ ] Tool registration with LangGraph workflows
- [ ] Agent tool selection logic
- [ ] End-to-end workflow testing
- [ ] Performance optimization
- [ ] Monitoring and observability

### Phase F: Production Readiness ✅ (After GREEN)
- [ ] Environment variable configuration
- [ ] Feature flag implementation
- [ ] Error handling and logging
- [ ] Documentation and examples
- [ ] Deployment and rollback procedures

---

## Quality Gates & Verification

### Code Quality Requirements
- [ ] All functions ≤40 lines (brAInwav standard)
- [ ] Named exports only (no default exports)
- [ ] TypeScript strict mode compliance
- [ ] Biome linting with zero violations
- [ ] Comprehensive JSDoc documentation

### Testing Requirements
- [ ] ≥90% code coverage (overall)
- [ ] ≥95% coverage on new code
- [ ] All RED-GREEN-REFACTOR cycles completed
- [ ] Integration tests for all user stories
- [ ] Performance tests within SLA targets

### Security & Compliance
- [ ] Input validation for all user inputs
- [ ] Rate limiting enforced and tested
- [ ] Structured logging with correlation IDs
- [ ] No secrets in code (environment variables only)
- [ ] Security scan with zero high/critical issues

### Monitoring & Observability
- [ ] A2A events for all tool lifecycle events
- [ ] Metrics collection for performance monitoring
- [ ] Error logging with proper context
- [ ] brAInwav branding in all logs and outputs
- [ ] Feature flag monitoring and alerting

---

## Timeline & Milestones

### Week 1: Core Implementation
- **Days 1-2**: Phase A & B (Schema validation, Rate limiting)
- **Days 3-4**: Phase C & D (Normalization, MCP integration)
- **Day 5**: Testing and bug fixes

### Week 2: Integration & Polish
- **Days 1-2**: Phase E (LangGraph integration)
- **Days 3-4**: Phase F (Feature flags, Configuration)
- **Day 5**: End-to-end testing and documentation

### Week 3: Review & Deployment
- **Days 1-2**: Code review and security assessment
- **Days 3-4**: Staging deployment and validation
- **Day 5**: Production rollout preparation

---

## Success Criteria

### Functional Requirements ✅
- [ ] All user stories from feature-spec.md implemented
- [ ] All acceptance scenarios pass
- [ ] Feature flag enables/disables functionality correctly
- [ ] Graceful degradation when MCP server unavailable

### Performance Requirements ✅
- [ ] Tool loading <100ms
- [ ] Query response <3s average
- [ ] Rate limiting enforces 1 req/3s limit
- [ ] Memory usage <10MB additional footprint

### Quality Requirements ✅
- [ ] ≥90% test coverage achieved
- [ ] Zero high/critical security vulnerabilities
- [ ] All brAInwav branding requirements met
- [ ] Complete documentation and examples

---

## Risk Mitigation

### Technical Risks
- **MCP Adapter Compatibility**: Pin specific versions, comprehensive testing
- **Performance Degradation**: Implement timeouts and circuit breakers
- **Rate Limiting Failures**: Client-side enforcement with monitoring
- **External Service Dependency**: Feature flag for quick disable

### Operational Risks
- **Tool Overuse**: System prompt guardrails and usage monitoring
- **Cost Implications**: Rate limiting prevents excessive API usage
- **Security Vulnerabilities**: Regular scans and input validation
- **Configuration Errors**: Comprehensive validation and testing

---

## Documentation Requirements

### Technical Documentation
- [ ] ADR documenting MCP adapter decision
- [ ] API documentation for new tool interfaces
- [ ] Configuration reference for environment variables
- [ ] Troubleshooting guide for common issues

### User Documentation
- [ ] Quick start guide for enabling arXiv tools
- [ ] Best practices for academic query formulation
- [ ] Integration examples for different use cases
- [ ] Performance tuning recommendations

---

**Status**: Ready for Implementation  
**TDD Coach Compliance**: ✅ Complete

**Next Steps**:
1. Begin Phase A implementation with RED tests
2. Follow strict RED-GREEN-REFACTOR cycles
3. Maintain ≥90% coverage throughout
4. Document progress in implementation-log.md

Co-authored-by: brAInwav Development Team