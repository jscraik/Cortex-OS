# TDD-Based Improvement Plan for packages/agents

## Executive Summary

This plan addresses critical issues identified in code review, prioritizing fixes using TDD principles to ensure robust, production-ready code.

## Priority 1: Critical Fixes (Blockers)

### 1. Server Startup Crash Vulnerability

**File**: `server.ts` (lines 14-25)
**Issue**: Agent initialization lacks error handling
**Risk**: Server crash on startup if agent fails to initialize

#### TDD Test Cases

```typescript
describe('Server Startup', () => {
  it('should handle agent initialization failure gracefully', async () => {
    // Mock agent initialization to throw
    // Verify server logs error and exits gracefully
  });

  it('should register agent successfully when initialization passes', async () => {
    // Mock successful agent initialization
    // Verify agent is registered
  });
});
```

#### Implementation Fix

```typescript
// server.ts
try {
  const agent = new CortexAgent({
    name: 'CortexAgent',
    cortex: { /* config */ },
  });
  agentRegistry.registerAgent(agent);
} catch (error) {
  logger.error('Failed to initialize CortexAgent:', error);
  process.exit(1);
}
```

### 2. Inconsistent Security Implementation

**File**: `server.ts` (lines 36-41, 67-84)
**Issue**: Auth middleware not applied to sensitive endpoints
**Risk**: Unauthorized access to protected endpoints

#### TDD Test Cases

```typescript
describe('Endpoint Security', () => {
  it('should require auth for /metrics endpoint', async () => {
    // Request without API key
    // Expect 401 response
  });

  it('should allow access to /health without auth', async () => {
    // Request to /health
    // Expect 200 response
  });
});
```

#### Implementation Fix

```typescript
// server.ts
// Apply auth to all sensitive endpoints
server.app.get('/api/v1/agents', auth, async (c) => { /* ... */ });
server.app.get('/api/v1/tools', auth, async (c) => { /* ... */ });
server.app.post('/api/v1/chat', auth, async (c) => { /* ... */ });
```

## Priority 2: Type Safety & Error Handling

### 3. Replace `any` Types with Proper TypeScript

**Files**: Multiple files using `any` type

#### TDD Test Cases

```typescript
describe('Type Safety', () => {
  it('should validate tool execution interface', () => {
    // Create mock tool with invalid execute method
    // Should throw TypeError
  });

  it('should handle malformed tool responses', () => {
    // Test with various malformed responses
    // Should handle gracefully
  });
});
```

#### Implementation Fixes

```typescript
// src/utils/modelRouter.ts
interface OllamaConfig {
  baseUrl?: string;
  models?: string[];
}

let ollamaConfig: OllamaConfig | null = null;

// src/monitoring/metrics.ts
interface Context {
  req: { method: string; path: string };
  res: { status: number };
}

function monitoring(c: Context, next: () => Promise<void>) {
  // Implementation
}
```

### 4. Proper Error Type Handling

**File**: `src/CortexAgent.ts` (lines 243-258)

#### TDD Test Cases

```typescript
describe('Error Handling', () => {
  it('should handle network errors specifically', async () => {
    // Mock network error
    // Should retry with fallback
  });

  it('should handle authentication errors', async () => {
    // Mock auth error
    // Should return specific error message
  });
});
```

#### Implementation Fix

```typescript
// Define error types
class NetworkError extends Error { /* ... */ }
class AuthenticationError extends Error { /* ... */ }
class ValidationError extends Error { /* ... */ }

// In catch block
catch (error) {
  if (error instanceof NetworkError) {
    logger.warn('Network error, retrying with fallback');
    // Retry logic
  } else if (error instanceof AuthenticationError) {
    logger.error('Authentication failed:', error);
    throw new Error('Authentication required');
  } else {
    logger.error('Unexpected error:', error);
    throw error;
  }
}
```

## Priority 3: Performance & Memory Management

### 5. Memory Leak Prevention

**Files**: `src/middleware/auth.ts`, `src/monitoring/metrics.ts`

#### TDD Test Cases

```typescript
describe('Memory Management', () => {
  it('should clean up expired rate limit entries', async () => {
    // Add expired rate limit entries
    // Trigger cleanup
    // Verify entries removed
  });

  it('should limit metrics storage size', async () => {
    // Add metrics beyond limit
    // Verify oldest entries removed
  });
});
```

#### Implementation Fixes

```typescript
// auth.ts - Add cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore) {
    if (now > data.resetTime + 3600000) { // 1 hour expiry
      rateLimitStore.delete(key);
    }
  }
}, 300000); // Clean every 5 minutes

// metrics.ts - Add retention
const MAX_HISTOGRAM_ENTRIES = 1000;
const METRIC_RETENTION_HOURS = 24;

// Clean old entries
if (histogram.length > MAX_HISTOGRAM_ENTRIES) {
  histogram.splice(0, histogram.length - MAX_HISTOGRAM_ENTRIES);
}
```

## Priority 4: Remove Unnecessary Code

### 6. Backward Compatibility Cleanup

**Files**: `src/tools/system-tools.ts`, `src/tools/mcp-tools.ts`

#### Safe to Remove

```typescript
// src/tools/system-tools.ts - Line 68
// REMOVE: export const componentHealthTool = systemHealthTool;

// src/tools/mcp-tools.ts - Line 66
// REMOVE: export const callMCPToolTool = callMCPTool;

// src/CortexAgent.ts - Lines 337-340
// REMOVE:
// setDelegator(delegator: any): void {
//   // TODO: Implement delegator assignment for complex tasks
// }
```

#### Verification Tests

```typescript
describe('Backward Compatibility Cleanup', () => {
  it('should not export componentHealthTool', () => {
    expect(() => require('./tools/system-tools').componentHealthTool).toThrow();
  });

  it('should not have setDelegator method', () => {
    const agent = new CortexAgent();
    expect(agent.setDelegator).toBeUndefined();
  });
});
```

## Implementation Sequence

### Phase 1: Critical Fixes (Days 1-2)

1. Write tests for server startup error handling
2. Implement server startup error handling
3. Write tests for endpoint security
4. Apply auth middleware consistently
5. Verify all tests pass

### Phase 2: Type Safety (Days 3-4)

1. Identify all `any` usages
2. Define proper TypeScript interfaces
3. Replace `any` types incrementally
4. Update tests to cover type validation

### Phase 3: Error Handling (Days 5-6)

1. Define error class hierarchy
2. Update error handling patterns
3. Add error-specific recovery logic
4. Test error scenarios

### Phase 4: Performance (Days 7-8)

1. Implement memory cleanup mechanisms
2. Add performance monitoring
3. Load test memory usage
4. Optimize as needed

### Phase 5: Cleanup (Day 9)

1. Remove backward compatibility code
2. Update any remaining references
3. Final test suite run
4. Documentation update

## Success Metrics

- **100% test coverage** for all new/modified code
- **Zero `any` types** in TypeScript
- **All security endpoints** protected
- **Memory stable** under load (24hr test)
- **Zero warnings** from TypeScript compiler

## Rollback Plan

Each phase will be in a separate branch. If any phase fails:

1. Revert to previous branch
2. Fix failing tests
3. Re-attempt with updated approach

This ensures we maintain a working system while improving quality.
