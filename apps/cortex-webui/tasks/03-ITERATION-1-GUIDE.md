# Iteration 1: Foundation & Security - Implementation Guide
## Week-by-Week Breakdown with Code Examples

---

## Week 1: TDD Infrastructure Setup

### Day 1-2: Bootstrap Quality Gates

#### Task: Create Quality Gate Enforcer Tests First

```typescript
// scripts/ci/__tests__/quality-gate-enforcer.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QualityGateEnforcer } from '../quality-gate-enforcer';

describe('QualityGateEnforcer', () => {
  it('should pass when line coverage meets threshold', async () => {
    const contract = {
      coverage: { line: 95, branch: 95 }
    };
    
    const metrics = {
      coverage: {
        total: { lines: { pct: 96 }, branches: { pct: 96 } }
      }
    };
    
    const enforcer = new QualityGateEnforcer(contract, metrics);
    const result = await enforcer.checkCoverage();
    
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('should fail when line coverage below threshold', async () => {
    const contract = {
      coverage: { line: 95, branch: 95 }
    };
    
    const metrics = {
      coverage: {
        total: { lines: { pct: 85 }, branches: { pct: 96 } }
      }
    };
    
    const enforcer = new QualityGateEnforcer(contract, metrics);
    const result = await enforcer.checkCoverage();
    
    expect(result.passed).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({
        type: 'coverage',
        message: expect.stringContaining('Line coverage 85%')
      })
    );
  });
});
```

#### Implementation: Make Tests Pass

```typescript
// scripts/ci/quality-gate-enforcer.ts
import fs from 'node:fs';
import path from 'node:path';

interface QualityContract {
  coverage: {
    line: number;
    branch: number;
    mutation_score?: number;
  };
  security: {
    max_critical: number;
    max_high: number;
  };
}

export class QualityGateEnforcer {
  private contract: QualityContract;
  private metrics: Metrics;
  private violations: Violation[] = [];

  constructor(contract: QualityContract, metrics: Metrics) {
    this.contract = contract;
    this.metrics = metrics;
  }

  async checkCoverage(): Promise<EnforcementResult> {
    const violations: Violation[] = [];

    if (!this.metrics.coverage) {
      return { passed: true, violations };
    }

    const { lines, branches } = this.metrics.coverage.total;

    if (lines.pct < this.contract.coverage.line) {
      violations.push({
        type: 'coverage',
        message: `Line coverage ${lines.pct}% < required ${this.contract.coverage.line}%`,
        severity: 'high',
      });
    }

    if (branches.pct < this.contract.coverage.branch) {
      violations.push({
        type: 'coverage',
        message: `Branch coverage ${branches.pct}% < required ${this.contract.coverage.branch}%`,
        severity: 'high',
      });
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }
}
```

---

## Week 2: Security Hardening

### Day 1-2: Express Security Middleware (TDD)

#### Step 1: Write Comprehensive Tests

```typescript
// backend/src/middleware/__tests__/security.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { securityMiddleware } from '../security';

describe('Security Middleware', () => {
  let app: express.Application;
  let server: any;

  beforeAll(() => {
    app = express();
    app.use(securityMiddleware());
    
    app.get('/api/test', (req, res) => {
      res.json({ message: 'success' });
    });

    server = app.listen(0);
  });

  afterAll(() => {
    server.close();
  });

  describe('Security Headers (Helmet)', () => {
    it('should set X-Frame-Options to DENY', async () => {
      const res = await request(server).get('/api/test');
      expect(res.headers['x-frame-options']).toBe('DENY');
    });

    it('should set X-Content-Type-Options to nosniff', async () => {
      const res = await request(server).get('/api/test');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should remove X-Powered-By header', async () => {
      const res = await request(server).get('/api/test');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit excessive requests', async () => {
      const requests = Array(150).fill(null).map(() =>
        request(server).get('/api/test')
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});
```

#### Step 2: Implement Middleware to Pass Tests

```typescript
// backend/src/middleware/security.ts
import helmet from 'helmet';
import hpp from 'hpp';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

export const securityMiddleware = () => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173',
  ];

  return [
    // Helmet - Security headers
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      frameguard: {
        action: 'deny',
      },
    }),

    // CORS
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    }),

    // HPP - HTTP Parameter Pollution
    hpp({
      whitelist: ['tags', 'filters'],
    }),

    // Rate limiting
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
    }),
  ];
};
```

---

## Week 3: Operational Readiness

### Health Check Implementation

```typescript
// backend/src/services/__tests__/healthService.test.ts
describe('Health Checks', () => {
  it('should return healthy when all dependencies up', async () => {
    const db = mockDatabase({ connected: true });
    const redis = mockRedis({ connected: true });
    
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'healthy',
      checks: {
        database: 'ok',
        redis: 'ok',
      },
    });
  });

  it('should return unhealthy when critical services down', async () => {
    const db = mockDatabase({ connected: false });
    
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(503);
    expect(response.body.status).toBe('unhealthy');
  });
});
```

---

## Week 4: Authentication Coverage

### JWT Implementation

```typescript
// backend/src/middleware/__tests__/auth.test.ts
describe('JWT Authentication', () => {
  it('should generate valid JWT with payload', () => {
    const payload = { userId: 1, email: 'test@example.com', role: 'user' };
    const token = generateToken(payload);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(1);
    expect(decoded.role).toBe('user');
  });

  it('should reject expired token', () => {
    const token = generateToken({ userId: 1 }, { expiresIn: '0s' });

    return new Promise((resolve) => {
      setTimeout(() => {
        expect(() => verifyToken(token)).toThrow('expired');
        resolve(undefined);
      }, 1000);
    });
  });
});
```

This guide provides complete TDD examples for Iteration 1, following the RED-GREEN-REFACTOR cycle strictly.
