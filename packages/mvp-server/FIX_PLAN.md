# MVP Server Fix Plan

## Overview
This document outlines the specific fixes needed to address the issues identified in the MVP Server audit and achieve ≥90% readiness.

## Priority 1: Critical Fixes (1-2 days)

### Fix 1: Error Handler Registration Issue
**Status**: ✅ COMPLETED

**Issue**: The error handler was not properly registered as a Fastify plugin, causing timeouts during testing.

**Solution**: Converted error handler to a proper Fastify plugin callback pattern.

**Files Modified**:
- `src/middleware/error.ts` - Updated to use FastifyPluginCallback pattern
- `src/http-server.ts` - Updated plugin registration

**Verification**: ✅ Server tests now pass without timeout

### Fix 2: Plugin Registration Pattern
**Status**: ✅ COMPLETED

**Issue**: The logging plugin was not properly handling decorator registration, which could cause conflicts.

**Solution**: Updated logging plugin to check if decorator already exists before registering.

**Files Modified**:
- `src/plugins/logging.ts` - Added decorator existence check

**Verification**: ✅ Plugin registration tests pass

### Fix 3: Test Infrastructure Issues
**Status**: ⏳ IN PROGRESS

**Issue**: Several test files had infrastructure issues:
- Missing `ws` dependency for MCP connection tests
- Missing `@apidevtools/swagger-parser` dependency for OpenAPI tests
- Incorrect mocking in placeholder tests

**Solution**: 
1. Install missing dependencies
2. Fix mocking patterns in tests
3. Update test configurations

**Action Items**:
```bash
# Install missing dependencies
pnpm add -D ws @apidevtools/swagger-parser

# Fix test configurations
# Update McpConnection.test.ts to use proper WebSocket mocking
# Fix OpenAPI test to handle missing dependencies gracefully
# Fix placeholder.test.ts to use proper vitest mocking
```

**Files to Modify**:
- `package.json` - Add missing dependencies
- `tests/McpConnection.test.ts` - Fix WebSocket mocking
- `tests/openapi.test.ts` - Handle missing dependencies
- `tests/placeholder.test.ts` - Fix vitest mocking

### Fix 4: Dependency Issues
**Status**: ⏳ IN PROGRESS

**Issue**: Several tests fail due to missing or incorrect dependencies.

**Solution**: 
1. Install all required development dependencies
2. Fix import paths and module resolutions
3. Update test configurations

**Action Items**:
```bash
# Install required dependencies
pnpm add -D @apidevtools/swagger-parser ws

# Fix import issues in tests
# Update vitest configuration if needed
```

**Files to Modify**:
- `package.json` - Add dependencies
- `vitest.config.ts` - Update configuration if needed

## Priority 2: Security and Reliability Enhancements (2-3 days)

### Enhancement 1: Enhanced Error Handling
**Status**: ⏳ PLANNED

**Issue**: Current error handling is basic and could be more comprehensive.

**Solution**: 
1. Add Zod validation middleware
2. Create specific error types for common scenarios
3. Enhance error response formatting
4. Add proper error logging

**Test Cases to Implement**:
```typescript
// tests/enhanced-error-handling.test.ts
describe('Enhanced Error Handling', () => {
  it('should handle validation errors with Zod', async () => {
    // Test Zod validation errors
  });

  it('should handle authentication errors', async () => {
    // Test authentication errors
  });

  it('should handle rate limit errors', async () => {
    // Test rate limiting errors
  });
});
```

**Files to Create**:
- `src/middleware/validation.ts` - Zod validation middleware
- `src/errors/validation-error.ts` - Specific validation error type
- `tests/enhanced-error-handling.test.ts` - Enhanced error handling tests

### Enhancement 2: Comprehensive Health Checks
**Status**: ⏳ PLANNED

**Issue**: Current health checks are basic and could be more comprehensive.

**Solution**: 
1. Add database health check endpoint
2. Add external service health checks
3. Add system metrics collection
4. Add detailed health check reporting

**Test Cases to Implement**:
```typescript
// tests/enhanced-health-checks.test.ts
describe('Enhanced Health Checks', () => {
  it('should check database connectivity', async () => {
    // Test database health check
  });

  it('should check external service connectivity', async () => {
    // Test external service health checks
  });

  it('should provide detailed system metrics', async () => {
    // Test system metrics collection
  });
});
```

**Files to Create**:
- `src/routes/health-enhanced.ts` - Enhanced health check routes
- `src/health/database.ts` - Database health check utilities
- `src/health/external.ts` - External service health check utilities
- `src/health/metrics.ts` - System metrics collection
- `tests/enhanced-health-checks.test.ts` - Enhanced health check tests

### Enhancement 3: Circuit Breaker Implementation
**Status**: ⏳ PLANNED

**Issue**: No resilience patterns to prevent cascading failures.

**Solution**: 
1. Add circuit breaker library (e.g., opossum)
2. Implement circuit breaker for external service calls
3. Add circuit breaker monitoring
4. Add circuit breaker configuration

**Test Cases to Implement**:
```typescript
// tests/circuit-breaker.test.ts
describe('Circuit Breaker', () => {
  it('should open circuit when failures exceed threshold', async () => {
    // Test circuit breaker opening
  });

  it('should automatically close circuit after timeout', async () => {
    // Test circuit breaker closing
  });
});
```

**Files to Create**:
- `src/circuit-breaker/index.ts` - Circuit breaker utilities
- `tests/circuit-breaker.test.ts` - Circuit breaker tests

## Priority 3: Observability and Documentation (3-4 days)

### Enhancement 4: Distributed Tracing
**Status**: ⏳ PLANNED

**Issue**: No distributed tracing integration.

**Solution**: 
1. Integrate OpenTelemetry SDK
2. Configure trace propagation
3. Add automatic instrumentation
4. Add manual span creation for business logic

**Test Cases to Implement**:
```typescript
// tests/distributed-tracing.test.ts
describe('Distributed Tracing', () => {
  it('should create traces for incoming requests', async () => {
    // Test trace creation
  });

  it('should create spans for external service calls', async () => {
    // Test span creation for external calls
  });

  it('should propagate trace context to downstream services', async () => {
    // Test trace context propagation
  });
});
```

**Files to Create**:
- `src/observability/tracing.ts` - Tracing configuration
- `src/observability/instrumentation.ts` - Automatic instrumentation
- `tests/distributed-tracing.test.ts` - Distributed tracing tests

### Enhancement 5: OpenAPI Specification Generation
**Status**: ⏳ PLANNED

**Issue**: No automated OpenAPI specification generation.

**Solution**: 
1. Add @fastify/swagger plugin
2. Configure OpenAPI generation
3. Add route schema documentation
4. Serve Swagger UI

**Test Cases to Implement**:
```typescript
// tests/openapi-generation.test.ts
describe('OpenAPI Generation', () => {
  it('should generate valid OpenAPI specification', async () => {
    // Test OpenAPI spec generation
  });

  it('should include route validation schemas in OpenAPI', async () => {
    // Test schema inclusion
  });

  it('should serve Swagger UI documentation', async () => {
    // Test Swagger UI serving
  });
});
```

**Files to Create**:
- `src/plugins/swagger.ts` - Swagger/OpenAPI plugin
- `tests/openapi-generation.test.ts` - OpenAPI generation tests

### Enhancement 6: Comprehensive Documentation
**Status**: ⏳ PLANNED

**Issue**: Lack of comprehensive API and architectural documentation.

**Solution**: 
1. Create API documentation
2. Add authentication documentation
3. Add rate limiting documentation
4. Add error handling documentation

**Files to Create**:
- `docs/api.md` - API documentation
- `docs/authentication.md` - Authentication documentation
- `docs/rate-limiting.md` - Rate limiting documentation
- `docs/error-handling.md` - Error handling documentation
- `docs/architecture.md` - Architecture documentation

## Priority 4: Advanced Features (4-5 days)

### Enhancement 7: Idempotency Support
**Status**: ⏳ PLANNED

**Issue**: No idempotency support for safe retries.

**Solution**: 
1. Add idempotency middleware
2. Implement idempotency key storage
3. Add idempotency key TTL
4. Add idempotency key validation

**Test Cases to Implement**:
```typescript
// tests/idempotency.test.ts
describe('Idempotency', () => {
  it('should handle duplicate requests with same idempotency key', async () => {
    // Test idempotency handling
  });

  it('should expire idempotency keys after TTL', async () => {
    // Test idempotency key expiration
  });
});
```

**Files to Create**:
- `src/middleware/idempotency.ts` - Idempotency middleware
- `src/storage/idempotency.ts` - Idempotency key storage
- `tests/idempotency.test.ts` - Idempotency tests

### Enhancement 8: Database Migrations
**Status**: ⏳ PLANNED

**Issue**: No database migration system.

**Solution**: 
1. Add migration framework (e.g., umzug)
2. Create migration files directory
3. Implement migration CLI commands
4. Add migration validation

**Test Cases to Implement**:
```typescript
// tests/database-migrations.test.ts
describe('Database Migrations', () => {
  it('should apply pending migrations on startup', async () => {
    // Test migration application
  });

  it('should handle migration rollbacks', async () => {
    // Test migration rollback
  });

  it('should validate migration checksums', async () => {
    // Test migration validation
  });
});
```

**Files to Create**:
- `src/migrations/index.ts` - Migration framework
- `migrations/` - Migration files directory
- `tests/database-migrations.test.ts` - Database migration tests

### Enhancement 9: RBAC/ABAC Implementation
**Status**: ⏳ PLANNED

**Issue**: No role-based or attribute-based access control.

**Solution**: 
1. Add RBAC/ABAC middleware
2. Implement policy engine
3. Add user context extraction
4. Add policy configuration

**Test Cases to Implement**:
```typescript
// tests/rbac-abac.test.ts
describe('RBAC/ABAC', () => {
  it('should enforce role-based access control', async () => {
    // Test RBAC enforcement
  });

  it('should enforce attribute-based access control', async () => {
    // Test ABAC enforcement
  });
});
```

**Files to Create**:
- `src/middleware/access-control.ts` - Access control middleware
- `src/policies/index.ts` - Policy engine
- `tests/rbac-abac.test.ts` - RBAC/ABAC tests

## Verification Plan

### Test Execution
1. Run all existing tests to ensure no regressions
2. Execute new test cases for each enhancement
3. Verify error handling improvements
4. Validate security enhancements

### Code Review
1. Review all changes for type safety
2. Verify plugin registration patterns
3. Check test coverage completeness
4. Validate documentation quality

### Performance Testing
1. Measure request latency
2. Monitor memory usage
3. Test concurrent request handling
4. Verify circuit breaker performance

### Security Testing
1. Validate authentication enforcement
2. Verify rate limiting effectiveness
3. Check error information disclosure
4. Confirm access control implementation

## Success Metrics

### Code Quality
- ✅ 95%+ test coverage for new features
- ✅ Zero critical type safety issues
- ✅ Zero security policy violations
- ✅ Zero performance regressions

### Reliability
- ✅ 99.9% uptime for core endpoints
- ✅ Graceful error handling
- ✅ Proper resource cleanup
- ✅ Comprehensive logging

### Security
- ✅ All authentication enforced
- ✅ Rate limiting preventing abuse
- ✅ Secure error responses
- ✅ Access control properly implemented

### Performance
- ✅ p95 latency < 50ms for health endpoints
- ✅ p99 latency < 100ms for API endpoints
- ✅ < 100MB memory usage under load
- ✅ 1000+ RPS for simple GET requests

By implementing this fix plan, the MVP Server package should achieve the target ≥90% readiness for autonomous operation.