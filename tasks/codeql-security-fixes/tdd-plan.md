# TDD Plan: CodeQL Security Fixes

**Date**: 2025-01-11  
**Task**: codeql-security-fixes  
**Approach**: Test-Driven Development (Red-Green-Refactor)

## TDD Principles

1. **Write failing tests FIRST** (RED phase)
2. **Get stakeholder approval** on test scenarios
3. **Implement minimal code to pass** (GREEN phase)
4. **Refactor for quality** while maintaining green tests
5. **Maintain ≥90% coverage** including security edge cases

## Test Organization

```
packages/
├── security/
│   ├── src/
│   │   ├── validators/
│   │   │   ├── type-validators.ts
│   │   │   └── input-sanitizers.ts
│   │   ├── shell/
│   │   │   └── safe-exec.ts
│   │   ├── crypto/
│   │   │   └── password-hash.ts
│   │   └── logging/
│   │       └── log-sanitizer.ts
│   └── __tests__/
│       ├── type-validators.test.ts
│       ├── safe-exec.test.ts
│       ├── password-hash.test.ts
│       └── log-sanitizer.test.ts
```

---

## Module 1: CORS Security (Alerts #213, #212)

### RED Phase - Write Failing Tests

```typescript
// apps/cortex-os/src/__tests__/cors-security.test.ts

describe('[brAInwav] CORS Security', () => {
  describe('Origin Validation', () => {
    it('should reject requests from unknown origins', async () => {
      const response = await request(app)
        .get('/mcp/health')
        .set('Origin', 'https://evil.com')
        .set('Cookie', 'credentials=true');
      
      expect(response.status).toBe(403);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should accept requests from whitelisted localhost origins', async () => {
      const response = await request(app)
        .get('/mcp/health')
        .set('Origin', 'http://localhost:3024');
      
      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3024');
    });

    it('should accept requests from environment-configured origins', async () => {
      process.env.ALLOWED_ORIGIN = 'https://trusted.brainwav.ai';
      
      const response = await request(app)
        .get('/mcp/health')
        .set('Origin', 'https://trusted.brainwav.ai');
      
      expect(response.status).toBe(200);
    });

    it('should NOT reflect arbitrary origins when credentials are enabled', async () => {
      const response = await request(app)
        .options('/mcp')
        .set('Origin', 'https://attacker.com')
        .set('Access-Control-Request-Method', 'POST');
      
      expect(response.headers['access-control-allow-origin']).not.toBe('https://attacker.com');
    });
  });
});
```

### GREEN Phase - Minimal Implementation

```typescript
// apps/cortex-os/src/config/cors.ts

const ALLOWED_ORIGINS = [
  'http://localhost:3024',
  'http://localhost:3026',
  'http://localhost:3028',
  'http://localhost:39300',
  process.env.ALLOWED_ORIGIN,
].filter(Boolean);

export function validateOrigin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
  if (!origin) {
    // Allow requests with no origin (same-origin requests)
    callback(null, true);
    return;
  }

  if (ALLOWED_ORIGINS.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error(`[brAInwav] CORS: Origin ${origin} not allowed`));
  }
}

export const corsOptions = {
  origin: validateOrigin,
  credentials: true,
};
```

### REFACTOR Phase
- Extract origin validation to separate function
- Add logging for rejected origins
- Document CORS policy

---

## Module 2: Type Confusion (Alerts #210, #191-195)

### RED Phase - Write Failing Tests

```typescript
// packages/security/__tests__/type-validators.test.ts

describe('[brAInwav] Type Validators', () => {
  describe('validateStringParam', () => {
    it('should accept valid string parameters', () => {
      const result = validateStringParam('hello', 'name');
      expect(result).toBe('hello');
    });

    it('should reject array parameters', () => {
      expect(() => {
        validateStringParam(['../'], 'path');
      }).toThrow(TypeError);
      expect(() => {
        validateStringParam(['../'], 'path');
      }).toThrow(/must be a string/);
    });

    it('should reject object parameters', () => {
      expect(() => {
        validateStringParam({ __proto__: { evil: true } }, 'data');
      }).toThrow(TypeError);
    });

    it('should reject null and undefined', () => {
      expect(() => validateStringParam(null, 'param')).toThrow();
      expect(() => validateStringParam(undefined, 'param')).toThrow();
    });

    it('should include parameter name in error message', () => {
      expect(() => {
        validateStringParam(123, 'userId');
      }).toThrow(/userId/);
    });

    it('should include brAInwav branding in error', () => {
      expect(() => {
        validateStringParam([], 'test');
      }).toThrow(/brAInwav/);
    });
  });

  describe('validateArrayParam', () => {
    it('should accept valid array parameters', () => {
      const result = validateArrayParam(['tag1', 'tag2'], 'tags');
      expect(result).toEqual(['tag1', 'tag2']);
    });

    it('should reject string parameters when array expected', () => {
      expect(() => {
        validateArrayParam('notAnArray', 'tags');
      }).toThrow(TypeError);
    });

    it('should validate array element types', () => {
      expect(() => {
        validateArrayParam([1, 2, 3], 'tags', 'string');
      }).toThrow(/must be string/);
    });
  });

  describe('Type Confusion Attack Prevention', () => {
    it('should prevent path traversal via array bypass', () => {
      // Attack: Send ["../", "/../secret.txt"] to bypass indexOf check
      const maliciousInput = ['../', '/../secret.txt'];
      
      expect(() => {
        validateStringParam(maliciousInput, 'path');
      }).toThrow();
    });

    it('should prevent prototype pollution via object bypass', () => {
      const maliciousInput = { __proto__: { isAdmin: true } };
      
      expect(() => {
        validateStringParam(maliciousInput, 'config');
      }).toThrow();
    });
  });
});
```

### GREEN Phase - Minimal Implementation

```typescript
// packages/security/src/validators/type-validators.ts

export function validateStringParam(param: unknown, name: string): string {
  if (typeof param !== 'string') {
    throw new TypeError(
      `[brAInwav] Parameter "${name}" must be a string, got ${typeof param}`
    );
  }
  return param;
}

export function validateArrayParam<T = unknown>(
  param: unknown,
  name: string,
  elementType?: 'string' | 'number' | 'boolean'
): T[] {
  if (!Array.isArray(param)) {
    throw new TypeError(
      `[brAInwav] Parameter "${name}" must be an array, got ${typeof param}`
    );
  }

  if (elementType) {
    param.forEach((element, index) => {
      if (typeof element !== elementType) {
        throw new TypeError(
          `[brAInwav] Parameter "${name}[${index}]" must be ${elementType}, got ${typeof element}`
        );
      }
    });
  }

  return param as T[];
}
```

### REFACTOR Phase
- Add optional max length validation
- Add optional regex pattern validation
- Extract common error formatting

---

## Module 3: Shell Injection (Alerts #204-209)

### RED Phase - Write Failing Tests

```typescript
// packages/security/__tests__/safe-exec.test.ts

import { safeExec, safeExecFile } from '../src/shell/safe-exec';

describe('[brAInwav] Safe Shell Execution', () => {
  describe('safeExecFile', () => {
    it('should execute simple commands safely', async () => {
      const result = await safeExecFile('echo', ['hello']);
      expect(result.stdout.trim()).toBe('hello');
    });

    it('should prevent command injection via arguments', async () => {
      // Attack: Try to inject additional commands
      const maliciousArg = 'test; cat /etc/passwd';
      const result = await safeExecFile('echo', [maliciousArg]);
      
      // Should echo the literal string, not execute cat
      expect(result.stdout).toContain('cat /etc/passwd');
      expect(result.stdout).not.toContain('root:');
    });

    it('should prevent shell metacharacter exploitation', async () => {
      const args = ['file.txt', '&&', 'rm', '-rf', '/'];
      const result = await safeExecFile('ls', args);
      
      // Should safely pass arguments without shell interpretation
      expect(result.stderr).not.toContain('cannot access');
    });

    it('should timeout long-running commands', async () => {
      await expect(
        safeExecFile('sleep', ['60'], { timeout: 100 })
      ).rejects.toThrow(/timeout/);
    });

    it('should include brAInwav branding in errors', async () => {
      await expect(
        safeExecFile('nonexistent-command', [])
      ).rejects.toThrow(/brAInwav/);
    });
  });

  describe('Shell Injection Prevention', () => {
    it('should safely handle user-provided search patterns', async () => {
      const userPattern = '$(cat /etc/passwd)';
      
      // This should search for the literal string, not execute the command
      await expect(
        safeExecFile('rg', [userPattern, '.'])
      ).resolves.toBeDefined();
    });

    it('should safely handle paths with spaces', async () => {
      const path = 'my folder/file.txt';
      const result = await safeExecFile('ls', [path]);
      
      // Should not interpret space as argument separator
      expect(result).toBeDefined();
    });
  });
});
```

### GREEN Phase - Minimal Implementation

```typescript
// packages/security/src/shell/safe-exec.ts

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface ExecOptions {
  timeout?: number;
  maxBuffer?: number;
  cwd?: string;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
}

export async function safeExecFile(
  command: string,
  args: string[],
  options: ExecOptions = {}
): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      timeout: options.timeout || 30000,
      maxBuffer: options.maxBuffer || 10 * 1024 * 1024, // 10MB
      cwd: options.cwd,
      shell: false, // CRITICAL: Never use shell
    });

    return { stdout, stderr };
  } catch (error) {
    throw new Error(
      `[brAInwav] Shell execution failed: ${error.message}`,
      { cause: error }
    );
  }
}
```

### REFACTOR Phase
- Add argument validation
- Add command whitelist option
- Add execution tracing/logging

---

## Module 4: Helmet CSP (Alert #202)

### RED Phase - Write Failing Tests

```typescript
// apps/cortex-os/packages/local-memory/__tests__/helmet-config.test.ts

describe('[brAInwav] Helmet Security Headers', () => {
  it('should set Content-Security-Policy header', async () => {
    const response = await request(app).get('/api/v1/health');
    
    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('should prevent inline scripts by default', async () => {
    const csp = parseCSP(response.headers['content-security-policy']);
    expect(csp['script-src']).not.toContain("'unsafe-inline'");
  });

  it('should set X-Frame-Options header', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.headers['x-frame-options']).toBe('DENY');
  });
});
```

### GREEN Phase - Minimal Implementation

```typescript
// apps/cortex-os/packages/local-memory/src/config/helmet.ts

export const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Required for some UI frameworks
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:*"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  frameguard: { action: 'deny' },
};
```

---

## Module 5: Sensitive Logging (Alert #189)

### RED Phase - Write Failing Tests

```typescript
// packages/security/__tests__/log-sanitizer.test.ts

describe('[brAInwav] Log Sanitization', () => {
  it('should redact API keys from logs', () => {
    const data = { apiKey: 'secret-key-123', name: 'test' };
    const sanitized = sanitizeForLogging(data);
    
    expect(sanitized.apiKey).toBe('[REDACTED]');
    expect(sanitized.name).toBe('test');
  });

  it('should redact nested sensitive fields', () => {
    const data = {
      vault: {
        apiKey: 'secret',
        secrets: { password: 'hunter2' },
        safe: 'ok'
      }
    };
    
    const sanitized = sanitizeForLogging(data);
    expect(sanitized.vault.apiKey).toBe('[REDACTED]');
    expect(sanitized.vault.secrets).toBe('[REDACTED]');
    expect(sanitized.vault.safe).toBe('ok');
  });

  it('should handle arrays with sensitive data', () => {
    const data = {
      items: [
        { id: 1, token: 'secret-1' },
        { id: 2, token: 'secret-2' }
      ]
    };
    
    const sanitized = sanitizeForLogging(data);
    expect(sanitized.items[0].token).toBe('[REDACTED]');
  });
});
```

### GREEN Phase - Minimal Implementation

```typescript
// packages/security/src/logging/log-sanitizer.ts

const SENSITIVE_FIELDS = [
  'apiKey', 'api_key', 'token', 'password', 'secret', 'secrets',
  'credential', 'credentials', 'auth', 'authorization'
];

export function sanitizeForLogging(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeForLogging);
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
```

---

## Module 6: Password Hashing (Alert #260)

### RED Phase - Write Failing Tests

```typescript
// packages/security/__tests__/password-hash.test.ts

describe('[brAInwav] Password Hashing', () => {
  it('should hash passwords using bcrypt', async () => {
    const password = 'test-password-123';
    const hash = await hashPassword(password);
    
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt format
  });

  it('should verify correct passwords', async () => {
    const password = 'correct-password';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect passwords', async () => {
    const hash = await hashPassword('correct');
    const isValid = await verifyPassword('wrong', hash);
    
    expect(isValid).toBe(false);
  });

  it('should use timing-safe comparison', async () => {
    const hash = await hashPassword('password');
    
    const start1 = Date.now();
    await verifyPassword('password', hash);
    const time1 = Date.now() - start1;
    
    const start2 = Date.now();
    await verifyPassword('wrong-password', hash);
    const time2 = Date.now() - start2;
    
    // Timing should be similar (within 10ms)
    expect(Math.abs(time1 - time2)).toBeLessThan(10);
  });
});
```

### GREEN Phase - Minimal Implementation

```typescript
// packages/security/src/crypto/password-hash.ts

import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  providedPassword: string,
  storedHash: string
): Promise<boolean> {
  return bcrypt.compare(providedPassword, storedHash);
}
```

---

## Test Coverage Goals

### Per-Module Coverage
- **Module 1 (CORS)**: 100% - Critical security boundary
- **Module 2 (Type Validation)**: 100% - Attack surface
- **Module 3 (Shell Exec)**: 100% - High-risk injection vector
- **Module 4 (Helmet)**: 95% - Configuration validation
- **Module 5 (Logging)**: 100% - Data leakage prevention
- **Module 6 (Password)**: 100% - Cryptographic operations

### Test Types
- ✅ **Unit Tests**: Individual function validation
- ✅ **Integration Tests**: End-to-end security flows
- ✅ **Security Tests**: Attack vector validation
- ✅ **Regression Tests**: Existing functionality preserved
- ✅ **Performance Tests**: No significant overhead

---

## TDD Workflow Checklist

For each module:

### RED Phase
- [ ] Write failing unit tests
- [ ] Write failing integration tests
- [ ] Write failing security/attack tests
- [ ] Get stakeholder approval on test scenarios
- [ ] Verify tests actually fail

### GREEN Phase
- [ ] Implement minimal code to pass tests
- [ ] Verify all tests pass
- [ ] No additional features beyond passing tests
- [ ] Document CodeQL alert number in code

### REFACTOR Phase
- [ ] Extract duplicated code
- [ ] Improve naming and clarity
- [ ] Add TSDoc comments
- [ ] Ensure functions ≤40 lines
- [ ] Verify tests still pass
- [ ] Run linters and formatters

### VERIFY Phase
- [ ] Run full test suite
- [ ] Check coverage ≥90%
- [ ] Run `pnpm security:scan`
- [ ] Verify CodeQL alert resolved
- [ ] Update implementation log

---

**Prepared by**: brAInwav Development Team  
**TDD Approach**: Red-Green-Refactor with security focus

Co-authored-by: brAInwav Development Team <dev@brainwav.ai>
