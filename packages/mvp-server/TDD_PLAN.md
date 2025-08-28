# MVP Server TDD Plan

## Goal
Achieve ≥90% readiness for the MVP Server package with focus on:
- HTTP/gRPC APIs
- AuthN/Z
- Rate limits
- Persistence adapters
- Input validation (Zod)
- RBAC/ABAC
- Idempotency
- Migrations
- Health/readiness probes
- OpenAPI

## Current Status
**Score: 85/100**
The server currently has a solid foundation with working security features, health checks, and basic API functionality. The critical error handler issue has been resolved.

## Phase 1: Critical Fixes (1-2 days)

### Task 1: Fix Test Infrastructure
**Objective**: Resolve failing tests due to missing dependencies and incorrect mocking

#### Test Cases:
```typescript
// tests/test-infrastructure-fixes.test.ts
describe('Test Infrastructure Fixes', () => {
  it('should resolve ws dependency issues', async () => {
    // Install missing ws dependency
    // Update McpConnection.test.ts to use proper mocking
    expect(() => import('ws')).not.toThrow();
  });

  it('should resolve swagger-parser dependency issues', async () => {
    // Install missing @apidevtools/swagger-parser dependency
    expect(() => import('@apidevtools/swagger-parser')).not.toThrow();
  });

  it('should fix vi.mock issues in placeholder tests', async () => {
    // Fix placeholder.test.ts to use proper vitest mocking
    const testFile = await import('./placeholder.test.ts');
    expect(testFile).toBeDefined();
  });
});
```

#### Implementation:
1. Install missing dependencies: `pnpm add -D ws @apidevtools/swagger-parser`
2. Fix mocking in placeholder.test.ts
3. Update McpConnection.test.ts to use proper WebSocket mocking
4. Fix OpenAPI test to handle missing dependencies gracefully

### Task 2: Enhance Error Handling
**Objective**: Add more specific error types and improve error responses

#### Test Cases:
```typescript
// tests/enhanced-error-handling.test.ts
describe('Enhanced Error Handling', () => {
  it('should handle validation errors with Zod', async () => {
    const app = buildServer();
    try {
      // Test route with Zod validation
      const res = await app.inject({
        method: 'POST',
        url: '/api/validate',
        payload: { invalid: 'data' }
      });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toHaveProperty('type', 'validation-error');
    } finally {
      await app.close();
    }
  });

  it('should handle authentication errors', async () => {
    const app = buildServer();
    try {
      // Test route requiring authentication
      const res = await app.inject({
        method: 'GET',
        url: '/api/protected'
      });
      expect(res.statusCode).toBe(401);
      expect(res.json()).toHaveProperty('type', 'unauthorized');
    } finally {
      await app.close();
    }
  });

  it('should handle rate limit errors', async () => {
    const app = buildServer();
    try {
      // Make multiple rapid requests to trigger rate limiting
      const requests = Array(100).fill(null).map(() => 
        app.inject({ method: 'GET', url: '/api/rate-limited' })
      );
      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited (429)
      const rateLimited = responses.filter(r => r.statusCode === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });
});
```

#### Implementation:
1. Add Zod validation middleware
2. Create specific error types for common scenarios
3. Enhance error response formatting
4. Add proper error logging

### Task 3: Improve Documentation
**Objective**: Add comprehensive API documentation and inline comments

#### Test Cases:
```typescript
// tests/documentation.test.ts
describe('Documentation', () => {
  it('should have comprehensive inline documentation', async () => {
    // Check that key files have proper JSDoc comments
    const serverFile = await readFile('./src/http-server.ts', 'utf-8');
    expect(serverFile).toContain('@param');
    expect(serverFile).toContain('@returns');
    expect(serverFile).toContain('@description');
  });

  it('should have API route documentation', async () => {
    // Check that routes have proper documentation
    const healthRoutes = await readFile('./src/routes/health.ts', 'utf-8');
    expect(healthRoutes).toContain('GET /health');
    expect(healthRoutes).toContain('Health check endpoint');
  });
});
```

#### Implementation:
1. Add JSDoc comments to all exported functions
2. Document API routes with example requests/responses
3. Add architecture documentation
4. Create README.md with usage examples

## Phase 2: Security and Reliability (2-3 days)

### Task 4: Add Comprehensive Health Checks
**Objective**: Implement more comprehensive system health checks

#### Test Cases:
```typescript
// tests/enhanced-health-checks.test.ts
describe('Enhanced Health Checks', () => {
  it('should check database connectivity', async () => {
    const app = buildServer();
    try {
      const res = await app.inject({ method: 'GET', url: '/api/health/db' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveProperty('database', 'ok');
    } finally {
      await app.close();
    }
  });

  it('should check external service connectivity', async () => {
    const app = buildServer();
    try {
      const res = await app.inject({ method: 'GET', url: '/api/health/external' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveProperty('externalServices');
    } finally {
      await app.close();
    }
  });

  it('should provide detailed system metrics', async () => {
    const app = buildServer();
    try {
      const res = await app.inject({ method: 'GET', url: '/api/health/metrics' });
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data).toHaveProperty('memory');
      expect(data).toHaveProperty('cpu');
      expect(data).toHaveProperty('uptime');
    } finally {
      await app.close();
    }
  });
});
```

#### Implementation:
1. Add database health check endpoint
2. Add external service health checks
3. Add system metrics collection
4. Add detailed health check reporting

### Task 5: Implement Circuit Breaker
**Objective**: Add resilience patterns to prevent cascading failures

#### Test Cases:
```typescript
// tests/circuit-breaker.test.ts
describe('Circuit Breaker', () => {
  it('should open circuit when failures exceed threshold', async () => {
    // Mock external service that always fails
    const failingService = vi.fn().mockRejectedValue(new Error('Service unavailable'));
    
    // Configure circuit breaker
    const breaker = new CircuitBreaker(failingService, {
      threshold: 5,
      timeout: 10000
    });
    
    // Make multiple failing requests
    const promises = Array(10).fill(null).map(() => breaker.fire());
    await Promise.allSettled(promises);
    
    // Circuit should be open
    expect(breaker.state).toBe('OPEN');
  });

  it('should automatically close circuit after timeout', async () => {
    // Mock external service that fails then succeeds
    let callCount = 0;
    const intermittentService = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= 5) {
        throw new Error('Service unavailable');
      }
      return 'success';
    });
    
    const breaker = new CircuitBreaker(intermittentService, {
      threshold: 3,
      timeout: 100
    });
    
    // Make failing requests to open circuit
    await Promise.allSettled(Array(5).fill(null).map(() => breaker.fire()));
    expect(breaker.state).toBe('OPEN');
    
    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Make successful request
    const result = await breaker.fire();
    expect(result).toBe('success');
    expect(breaker.state).toBe('CLOSED');
  });
});
```

#### Implementation:
1. Add circuit breaker library (e.g., opossum)
2. Implement circuit breaker for external service calls
3. Add circuit breaker monitoring
4. Add circuit breaker configuration

### Task 6: Enhance Rate Limiting
**Objective**: Add more sophisticated rate limiting capabilities

#### Test Cases:
```typescript
// tests/enhanced-rate-limiting.test.ts
describe('Enhanced Rate Limiting', () => {
  it('should support different rate limits for different routes', async () => {
    const app = buildServer();
    try {
      // High-frequency route (100 requests/minute)
      const highFreqPromises = Array(50).fill(null).map(() => 
        app.inject({ method: 'GET', url: '/api/high-freq' })
      );
      const highFreqResponses = await Promise.all(highFreqPromises);
      expect(highFreqResponses.every(r => r.statusCode !== 429)).toBe(true);
      
      // Low-frequency route (5 requests/minute)
      const lowFreqPromises = Array(10).fill(null).map(() => 
        app.inject({ method: 'POST', url: '/api/low-freq' })
      );
      const lowFreqResponses = await Promise.all(lowFreqPromises);
      const rateLimited = lowFreqResponses.filter(r => r.statusCode === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });

  it('should support IP-based rate limiting', async () => {
    const app = buildServer();
    try {
      // Make requests from different IPs
      const ip1Promises = Array(20).fill(null).map(() => 
        app.inject({ 
          method: 'GET', 
          url: '/api/ip-limited',
          headers: { 'X-Forwarded-For': '192.168.1.1' }
        })
      );
      const ip1Responses = await Promise.all(ip1Promises);
      
      const ip2Promises = Array(20).fill(null).map(() => 
        app.inject({ 
          method: 'GET', 
          url: '/api/ip-limited',
          headers: { 'X-Forwarded-For': '192.168.1.2' }
        })
      );
      const ip2Responses = await Promise.all(ip2Promises);
      
      // Both IPs should have their own rate limits
      const ip1RateLimited = ip1Responses.filter(r => r.statusCode === 429);
      const ip2RateLimited = ip2Responses.filter(r => r.statusCode === 429);
      expect(ip1RateLimited.length).toBeGreaterThan(0);
      expect(ip2RateLimited.length).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });
});
```

#### Implementation:
1. Configure route-specific rate limits
2. Add IP-based rate limiting
3. Add user-based rate limiting
4. Add rate limit configuration options

## Phase 3: Observability and Documentation (3-4 days)

### Task 7: Add Distributed Tracing
**Objective**: Integrate with observability stack for distributed tracing

#### Test Cases:
```typescript
// tests/distributed-tracing.test.ts
describe('Distributed Tracing', () => {
  it('should create traces for incoming requests', async () => {
    const app = buildServer();
    try {
      const res = await app.inject({ 
        method: 'GET', 
        url: '/api/trace-test',
        headers: {
          'traceparent': '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
        }
      });
      
      expect(res.statusCode).toBe(200);
      // Check that trace headers are propagated
      expect(res.headers).toHaveProperty('traceparent');
    } finally {
      await app.close();
    }
  });

  it('should create spans for external service calls', async () => {
    const app = buildServer();
    try {
      const res = await app.inject({ method: 'GET', url: '/api/external-call' });
      
      expect(res.statusCode).toBe(200);
      // Check that spans were created for external calls
      const spans = getCapturedSpans();
      expect(spans).toContainEqual(expect.objectContaining({
        name: 'http.client',
        attributes: expect.objectContaining({
          'http.url': expect.stringContaining('external-service')
        })
      }));
    } finally {
      await app.close();
    }
  });

  it('should propagate trace context to downstream services', async () => {
    const app = buildServer();
    try {
      const res = await app.inject({ 
        method: 'POST', 
        url: '/api/downstream-call',
        payload: { data: 'test' }
      });
      
      expect(res.statusCode).toBe(200);
      // Check that trace context was propagated
      const downstreamCalls = getDownstreamCalls();
      expect(downstreamCalls).toContainEqual(expect.objectContaining({
        headers: expect.objectContaining({
          'traceparent': expect.any(String)
        })
      }));
    } finally {
      await app.close();
    }
  });
});
```

#### Implementation:
1. Integrate OpenTelemetry SDK
2. Configure trace propagation
3. Add automatic instrumentation
4. Add manual span creation for business logic

### Task 8: Generate OpenAPI Specification
**Objective**: Automatically generate OpenAPI specification from routes

#### Test Cases:
```typescript
// tests/openapi-generation.test.ts
describe('OpenAPI Generation', () => {
  it('should generate valid OpenAPI specification', async () => {
    const app = buildServer();
    try {
      const res = await app.inject({ method: 'GET', url: '/api/docs/json' });
      
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
      
      const spec = res.json();
      expect(spec.openapi).toBe('3.0.3');
      expect(spec.info.title).toBe('@cortex-os/mvp-server');
      expect(spec.paths).toBeDefined();
    } finally {
      await app.close();
    }
  });

  it('should include route validation schemas in OpenAPI', async () => {
    const app = buildServer();
    try {
      const res = await app.inject({ method: 'GET', url: '/api/docs/json' });
      
      const spec = res.json();
      // Check that validation schemas are included
      expect(spec.components.schemas).toBeDefined();
      expect(Object.keys(spec.components.schemas).length).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });

  it('should serve Swagger UI documentation', async () => {
    const app = buildServer();
    try {
      const res = await app.inject({ method: 'GET', url: '/api/docs' });
      
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.body).toContain('<title>Swagger UI</title>');
    } finally {
      await app.close();
    }
  });
});
```

#### Implementation:
1. Add @fastify/swagger plugin
2. Configure OpenAPI generation
3. Add route schema documentation
4. Serve Swagger UI

### Task 9: Create Comprehensive API Documentation
**Objective**: Create comprehensive documentation for all API endpoints

#### Test Cases:
```typescript
// tests/api-documentation.test.ts
describe('API Documentation', () => {
  it('should have examples for all major endpoints', async () => {
    const docs = await readFile('./docs/api.md', 'utf-8');
    
    // Check for health endpoint documentation
    expect(docs).toContain('GET /api/health');
    expect(docs).toContain('GET /api/ready');
    expect(docs).toContain('GET /api/live');
    
    // Check for version endpoint documentation
    expect(docs).toContain('GET /api/version');
    
    // Check for metrics endpoint documentation
    expect(docs).toContain('GET /api/metrics');
  });

  it('should include authentication examples', async () => {
    const docs = await readFile('./docs/authentication.md', 'utf-8');
    
    expect(docs).toContain('Authorization: Bearer');
    expect(docs).toContain('Authentication Token');
    expect(docs).toContain('CORTEX_MCP_TOKEN');
  });

  it('should include rate limiting documentation', async () => {
    const docs = await readFile('./docs/rate-limiting.md', 'utf-8');
    
    expect(docs).toContain('Rate Limits');
    expect(docs).toContain('429 Too Many Requests');
    expect(docs).toContain('X-RateLimit-Limit');
  });
});
```

#### Implementation:
1. Create API documentation in docs/ directory
2. Add authentication documentation
3. Add rate limiting documentation
4. Add error handling documentation

## Phase 4: Advanced Features (4-5 days)

### Task 10: Implement Idempotency
**Objective**: Add idempotency support for safe retries

#### Test Cases:
```typescript
// tests/idempotency.test.ts
describe('Idempotency', () => {
  it('should handle duplicate requests with same idempotency key', async () => {
    const app = buildServer();
    try {
      // First request
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/payments',
        headers: {
          'Idempotency-Key': 'test-key-123'
        },
        payload: {
          amount: 100,
          currency: 'USD'
        }
      });
      
      expect(res1.statusCode).toBe(201);
      const paymentId1 = res1.json().id;
      
      // Duplicate request with same key
      const res2 = await app.inject({
        method: 'POST',
        url: '/api/payments',
        headers: {
          'Idempotency-Key': 'test-key-123'
        },
        payload: {
          amount: 100,
          currency: 'USD'
        }
      });
      
      expect(res2.statusCode).toBe(200); // Not 201 since it's a duplicate
      const paymentId2 = res2.json().id;
      
      // Same payment ID should be returned
      expect(paymentId1).toBe(paymentId2);
    } finally {
      await app.close();
    }
  });

  it('should expire idempotency keys after TTL', async () => {
    const app = buildServer();
    try {
      // First request with short TTL key
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/payments',
        headers: {
          'Idempotency-Key': 'short-ttl-key'
        },
        payload: {
          amount: 50,
          currency: 'EUR'
        }
      });
      
      expect(res1.statusCode).toBe(201);
      
      // Wait for TTL to expire (simulate)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Request with same key should create new resource
      const res2 = await app.inject({
        method: 'POST',
        url: '/api/payments',
        headers: {
          'Idempotency-Key': 'short-ttl-key'
        },
        payload: {
          amount: 50,
          currency: 'EUR'
        }
      });
      
      expect(res2.statusCode).toBe(201);
      expect(res1.json().id).not.toBe(res2.json().id);
    } finally {
      await app.close();
    }
  });
});
```

#### Implementation:
1. Add idempotency middleware
2. Implement idempotency key storage
3. Add idempotency key TTL
4. Add idempotency key validation

### Task 11: Add Database Migrations
**Objective**: Implement database migration system

#### Test Cases:
```typescript
// tests/database-migrations.test.ts
describe('Database Migrations', () => {
  it('should apply pending migrations on startup', async () => {
    // Mock database connection
    const db = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
      close: vi.fn()
    };
    
    // Apply migrations
    const migrationResult = await applyMigrations(db);
    
    expect(migrationResult.applied).toBeGreaterThan(0);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE'));
  });

  it('should handle migration rollbacks', async () => {
    // Mock database connection
    const db = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
      close: vi.fn()
    };
    
    // Apply migrations then rollback
    await applyMigrations(db);
    const rollbackResult = await rollbackMigrations(db, 1);
    
    expect(rollbackResult.reverted).toBe(1);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('DROP TABLE'));
  });

  it('should validate migration checksums', async () => {
    // Mock database connection with corrupted migration
    const db = {
      query: vi.fn().mockResolvedValue({ rows: [{ checksum: 'corrupted' }] }),
      close: vi.fn()
    };
    
    await expect(validateMigrationChecksums(db)).rejects.toThrow('Checksum mismatch');
  });
});
```

#### Implementation:
1. Add migration framework (e.g., umzug)
2. Create migration files directory
3. Implement migration CLI commands
4. Add migration validation

### Task 12: Implement RBAC/ABAC
**Objective**: Add role-based and attribute-based access control

#### Test Cases:
```typescript
// tests/rbac-abac.test.ts
describe('RBAC/ABAC', () => {
  it('should enforce role-based access control', async () => {
    const app = buildServer();
    try {
      // Request with admin role
      const adminRes = await app.inject({
        method: 'DELETE',
        url: '/api/users/123',
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });
      
      expect(adminRes.statusCode).toBe(204);
      
      // Request with user role
      const userRes = await app.inject({
        method: 'DELETE',
        url: '/api/users/123',
        headers: {
          'Authorization': 'Bearer user-token'
        }
      });
      
      expect(userRes.statusCode).toBe(403);
    } finally {
      await app.close();
    }
  });

  it('should enforce attribute-based access control', async () => {
    const app = buildServer();
    try {
      // Request for own resource (allowed)
      const ownRes = await app.inject({
        method: 'GET',
        url: '/api/documents/private-doc-123',
        headers: {
          'Authorization': 'Bearer user-123-token'
        }
      });
      
      expect(ownRes.statusCode).toBe(200);
      
      // Request for other user's resource (denied)
      const otherRes = await app.inject({
        method: 'GET',
        url: '/api/documents/private-doc-456',
        headers: {
          'Authorization': 'Bearer user-123-token'
        }
      });
      
      expect(otherRes.statusCode).toBe(403);
    } finally {
      await app.close();
    }
  });
});
```

#### Implementation:
1. Add RBAC/ABAC middleware
2. Implement policy engine
3. Add user context extraction
4. Add policy configuration

## Success Criteria

### Test Coverage
- ✅ 95%+ code coverage for new features
- ✅ All security tests passing
- ✅ All reliability tests passing
- ✅ All performance tests passing

### Performance
- ✅ p95 latency < 50ms for health endpoints
- ✅ p99 latency < 100ms for API endpoints
- ✅ 1000+ RPS for simple GET requests
- ✅ < 100MB memory usage under load

### Security
- ✅ All security headers properly set
- ✅ Rate limiting preventing abuse
- ✅ Authentication required for protected endpoints
- ✅ No security vulnerabilities in dependencies

### Reliability
- ✅ 99.9% uptime for core endpoints
- ✅ Graceful degradation under pressure
- ✅ Proper error handling and logging
- ✅ Idempotent operations where appropriate

By following this TDD plan, the MVP Server package should achieve ≥90% readiness for autonomous operation.