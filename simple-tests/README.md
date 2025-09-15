# Cortex-OS Simple Tests

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

</div>

This directory contains simple, fast-running tests for basic functionality validation and continuous integration smoke tests.

Note: cortex-cli is deprecated and being replaced by the Rust-based `codex` CLI (apps/cortex-code).
Some historical examples may reference cortex-cli modules; these will be migrated or removed in a
follow-up PR. New examples should prefer invoking `codex` for CLI behavior.

## Test Overview

### Purpose

Simple tests provide:

- **Fast Feedback** - Quick validation of basic functionality
- **Smoke Testing** - Basic system health checks
- **CI/CD Gates** - Fast tests for build pipelines
- **Developer Confidence** - Quick local validation
- **Regression Detection** - Catch basic breaking changes

### Test Categories

- **Unit Tests** - Individual function and class testing
- **Smoke Tests** - Basic system functionality
- **API Tests** - Simple endpoint validation
- **Configuration Tests** - Config file validation
- **Import Tests** - Module loading verification

## Directory Structure

```text
simple-tests/
├── unit/
│   ├── utils/
│   │   ├── helpers.test.js        # Utility function tests
│   │   └── validators.test.js     # Input validation tests
│   ├── core/
│   │   ├── config.test.js         # Configuration tests
│   │   └── logger.test.js         # Logging functionality
│   └── api/
│       ├── routes.test.js         # Basic route tests
│       └── middleware.test.js     # Middleware tests
├── smoke/
│   ├── system/
│   │   ├── startup.test.js        # System startup tests
│   │   └── health.test.js         # Health check tests
│   ├── api/
│   │   ├── endpoints.test.js      # API endpoint smoke tests
│   │   └── authentication.test.js # Auth smoke tests
│   └── database/
│       ├── connection.test.js     # DB connection tests
│       └── migrations.test.js     # Migration tests
├── integration/
│   ├── agent/
│   │   ├── creation.test.js       # Simple agent creation
│   │   └── communication.test.js  # Basic agent communication
│   ├── memory/
│   │   ├── storage.test.js        # Memory system tests
│   │   └── retrieval.test.js      # Memory retrieval tests
│   └── mcp/
│       ├── server.test.js         # MCP server tests
│       └── tools.test.js          # MCP tool tests
├── fixtures/
│   ├── data/                      # Test data files
│   ├── configs/                   # Test configurations
│   └── mocks/                     # Mock objects
└── utils/
    ├── test-helpers.js            # Test utility functions
    ├── mock-factories.js          # Mock object factories
    └── assertions.js              # Custom assertions
```

## Test Configuration

### Jest Configuration

```javascript
// simple-tests/jest.config.js
module.exports = {
  testMatch: ['<rootDir>/simple-tests/**/*.test.js'],
  testTimeout: 5000, // 5 second timeout
  collectCoverageFrom: ['src/**/*.js', '!src/**/*.test.js', '!src/tests/**'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/simple-tests/utils/test-setup.js'],
};
```

### Vitest Configuration

```typescript
// simple-tests/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['simple-tests/**/*.test.{js,ts}'],
    timeout: 5000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
```

## Unit Tests

### Utility Function Tests

```javascript
// simple-tests/unit/utils/helpers.test.js
import { describe, it, expect } from 'vitest';
import { formatDate, validateEmail, generateId } from '../../../src/utils/helpers.js';

describe('Helper Functions', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDate(date);
      expect(formatted).toBe('2024-01-15 10:30:00');
    });

    it('should handle invalid dates', () => {
      expect(() => formatDate('invalid')).toThrow();
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(validateEmail('invalid-email')).toBe(false);
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[a-zA-Z0-9_-]+$/);
    });
  });
});
```

### Configuration Tests

```javascript
// simple-tests/unit/core/config.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { loadConfig, validateConfig } from '../../../src/core/config.js';

describe('Configuration', () => {
  beforeEach(() => {
    // Reset environment variables
    delete process.env.NODE_ENV;
    delete process.env.DATABASE_URL;
  });

  describe('loadConfig', () => {
    it('should load default configuration', () => {
      const config = loadConfig();
      expect(config).toHaveProperty('port');
      expect(config).toHaveProperty('database');
      expect(config.port).toBe(3000);
    });

    it('should override with environment variables', () => {
      process.env.PORT = '8080';
      process.env.NODE_ENV = 'production';

      const config = loadConfig();
      expect(config.port).toBe(8080);
      expect(config.environment).toBe('production');
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      const config = {
        port: 3000,
        database: { url: 'postgresql://localhost/test' },
        environment: 'test',
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it('should reject invalid configuration', () => {
      const config = { port: 'invalid' };
      expect(() => validateConfig(config)).toThrow();
    });
  });
});
```

## Smoke Tests

### System Startup Tests

```javascript
// simple-tests/smoke/system/startup.test.js
import { describe, it, expect } from 'vitest';
import { startSystem, stopSystem } from '../../../src/system/index.js';

describe('System Startup', () => {
  it('should start system successfully', async () => {
    const system = await startSystem({
      port: 0, // Use random port
      database: { url: ':memory:' },
    });

    expect(system).toBeDefined();
    expect(system.isRunning()).toBe(true);

    await stopSystem(system);
  });

  it('should handle startup errors gracefully', async () => {
    const invalidConfig = {
      port: -1,
      database: { url: 'invalid://url' },
    };

    await expect(startSystem(invalidConfig)).rejects.toThrow();
  });
});
```

### API Endpoint Tests

```javascript
// simple-tests/smoke/api/endpoints.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../utils/test-helpers.js';

describe('API Endpoints', () => {
  let app;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('API Info', () => {
    it('should return API information', async () => {
      const response = await request(app).get('/api/info').expect(200);

      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('version');
    });
  });

  describe('Authentication', () => {
    it('should reject requests without auth', async () => {
      await request(app).get('/api/protected').expect(401);
    });
  });
});
```

## Integration Tests

### Agent Creation Tests

```javascript
// simple-tests/integration/agent/creation.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentManager } from '../../../src/agents/manager.js';
import { createTestDatabase } from '../../utils/test-helpers.js';

describe('Agent Creation', () => {
  let agentManager;
  let testDb;

  beforeEach(async () => {
    testDb = await createTestDatabase();
    agentManager = new AgentManager({ database: testDb });
  });

  afterEach(async () => {
    await testDb.close();
  });

  it('should create a simple agent', async () => {
    const agentConfig = {
      name: 'test-agent',
      type: 'simple',
      capabilities: ['text-generation'],
    };

    const agent = await agentManager.createAgent(agentConfig);

    expect(agent).toBeDefined();
    expect(agent.id).toBeDefined();
    expect(agent.name).toBe('test-agent');
    expect(agent.status).toBe('created');
  });

  it('should validate agent configuration', async () => {
    const invalidConfig = {
      name: '', // Invalid empty name
      type: 'unknown',
    };

    await expect(agentManager.createAgent(invalidConfig)).rejects.toThrow(
      'Invalid agent configuration',
    );
  });
});
```

### Memory System Tests

```javascript
// simple-tests/integration/memory/storage.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryService } from '../../../src/memory/service.js';
import { createTestDatabase } from '../../utils/test-helpers.js';

describe('Memory Storage', () => {
  let memoryService;
  let testDb;

  beforeEach(async () => {
    testDb = await createTestDatabase();
    memoryService = new MemoryService({ database: testDb });
  });

  afterEach(async () => {
    await testDb.close();
  });

  it('should store and retrieve simple memories', async () => {
    const memory = {
      content: 'Test memory content',
      type: 'text',
      metadata: { source: 'test' },
    };

    const stored = await memoryService.store(memory);
    expect(stored.id).toBeDefined();

    const retrieved = await memoryService.retrieve(stored.id);
    expect(retrieved.content).toBe(memory.content);
    expect(retrieved.type).toBe(memory.type);
  });

  it('should search memories by content', async () => {
    await memoryService.store({
      content: 'JavaScript programming tutorial',
      type: 'text',
    });

    await memoryService.store({
      content: 'Python data science guide',
      type: 'text',
    });

    const results = await memoryService.search('JavaScript');
    expect(results).toHaveLength(1);
    expect(results[0].content).toContain('JavaScript');
  });
});
```

## Test Utilities

### Test Helpers

```javascript
// simple-tests/utils/test-helpers.js
import { createServer } from '../../../src/server/index.js';
import { createDatabase } from '../../../src/database/index.js';

export async function createTestApp(config = {}) {
  const testConfig = {
    port: 0,
    environment: 'test',
    database: { url: ':memory:' },
    logging: { level: 'error' },
    ...config,
  };

  return await createServer(testConfig);
}

export async function createTestDatabase() {
  return await createDatabase({
    url: ':memory:',
    sync: true,
    logging: false,
  });
}

export function createMockAgent(overrides = {}) {
  return {
    id: 'test-agent-' + Date.now(),
    name: 'Test Agent',
    type: 'simple',
    status: 'active',
    capabilities: ['text-generation'],
    ...overrides,
  };
}

export function waitFor(condition, timeout = 1000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - start > timeout) {
        reject(new Error('Timeout waiting for condition'));
      } else {
        setTimeout(check, 10);
      }
    };
    check();
  });
}
```

### Mock Factories

```javascript
// simple-tests/utils/mock-factories.js
export function createMockRequest(overrides = {}) {
  return {
    method: 'GET',
    url: '/',
    headers: {},
    body: {},
    params: {},
    query: {},
    user: null,
    ...overrides,
  };
}

export function createMockResponse() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    statusCode: 200,
    headers: {},
  };
  return res;
}

export function createMockDatabase() {
  return {
    query: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    close: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
  };
}
```

## Running Tests

### Local Development

```bash
# Run all simple tests
npm run test:simple

# Run specific test categories
npm run test:unit
npm run test:smoke
npm run test:integration

# Run with coverage
npm run test:simple:coverage

# Watch mode for development
npm run test:simple:watch
```

### CI/CD Pipeline

```bash
# Fast CI tests (< 30 seconds)
npm run test:simple:fast

# Full simple test suite
npm run test:simple:full

# Coverage report
npm run test:simple:coverage:ci
```

### Test Scripts

```json
{
  "scripts": {
    "test:simple": "vitest run simple-tests/",
    "test:simple:watch": "vitest watch simple-tests/",
    "test:simple:coverage": "vitest run simple-tests/ --coverage",
    "test:simple:fast": "vitest run simple-tests/smoke/",
    "test:unit": "vitest run simple-tests/unit/",
    "test:smoke": "vitest run simple-tests/smoke/",
    "test:integration:simple": "vitest run simple-tests/integration/"
  }
}
```

## Best Practices

### Test Design

- **Fast Execution** - Keep tests under 5 seconds
- **Isolated Tests** - No dependencies between tests
- **Clear Naming** - Descriptive test and suite names
- **Single Responsibility** - One assertion per test
- **Reliable** - Consistent results across runs

### Test Organization

- **Logical Grouping** - Group related tests together
- **Consistent Structure** - Follow naming conventions
- **Minimal Setup** - Simple test configuration
- **Easy Maintenance** - Clear and readable tests
- **Good Coverage** - Cover critical paths

### Performance

- **Parallel Execution** - Run tests in parallel
- **Resource Cleanup** - Clean up after tests
- **Memory Management** - Avoid memory leaks
- **Fast Assertions** - Use efficient assertions
- **Mock External Services** - Avoid network calls

## Common Patterns

### Testing Async Code

```javascript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});

it('should handle promises', () => {
  return promiseFunction().then((result) => {
    expect(result).toBe(expected);
  });
});
```

### Testing Errors

```javascript
it('should throw on invalid input', () => {
  expect(() => validateInput('invalid')).toThrow();
});

it('should reject with error', async () => {
  await expect(asyncFunction('invalid')).rejects.toThrow();
});
```

### Mocking Dependencies

```javascript
import { vi } from 'vitest';

it('should call external service', () => {
  const mockService = vi.fn().mockResolvedValue('success');
  const result = processWithService(mockService);

  expect(mockService).toHaveBeenCalledWith(expectedArgs);
  expect(result).toBe('success');
});
```

## Related Documentation

- [Testing Strategy](/tests/README.md)
- [Integration Tests](/tests/)
- [Performance Tests](/k6/README.md)
- [CI/CD Configuration](/.github/workflows/)

---

## Agent Isolation Sandbox (Experimental Hardened Execution)

The sandbox provides a constrained execution environment for untrusted or tool-generated functions.
It runs user code inside a `worker_threads` isolate with a narrow API surface and emits structured
audit events for policy violations.

### Key Goals

- Prevent dynamic code injection (`eval`, `Function`)
- Restrict filesystem reads to declared allowlist paths (virtual file layer for tests)
- Block network egress except explicit allowlist hosts
- Enforce execution time budget (`maxExecutionMs`)
- Enforce memory soft cap via cooperative `alloc` API
- Detect non-serializable return values (structured cloning + JSON fallback)
- Abort early after excessive policy breaches (`maxViolations`)
- Emit consistent audit events with machine-consumable violation codes

### API (createAgentSandbox options)

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `allowedReadPaths` | `string[]` | yes | Root(s) (POSIX style) allowed for virtual file reads. Normalized path traversal outside these roots is denied. |
| `networkAllowlist` | `string[]` | yes | Hostnames permitted for `fetch`. All others produce `NET_DENIED` violation. |
| `maxExecutionMs` | `number` | yes | Hard wall-clock timeout; triggers `TIMEOUT` violation and termination. |
| `onAuditEvent` | `(evt) => void` | no | Callback invoked for each violation/audit event. |
| `memorySoftLimitBytes` | `number` | no | Cooperative soft limit; `alloc(bytes)` increments internal counter and throws + emits `MEMORY_SOFT_LIMIT` when exceeded. |
| `virtualFiles` | `Record<string,string>` | no | In-memory file map keyed by normalized absolute paths. Prevents real FS access in tests. |
| `maxViolations` | `number` | no | Early abort threshold. When reached, emits `VIOLATION_THRESHOLD` and terminates run. |

### Violation Codes

Codes are enumerated in the implementation and mirrored in the Zod contract schema (`libs/typescript/contracts/src/sandbox-audit-events.ts`).

| Code | Meaning | Typical Trigger |
|------|---------|-----------------|
| `DYNAMIC_CODE` | Dynamic evaluation attempt blocked | `eval('...')` or `new Function()` |
| `FS_DENIED` | Unauthorized filesystem path | Reading outside `allowedReadPaths` |
| `FS_TRAVERSAL` | Path traversal attempt detected | `../` escaping root without allowlist coverage |
| `NET_DENIED` | Network egress blocked | Host not in `networkAllowlist` |
| `MEMORY_SOFT_LIMIT` | Memory soft limit exceeded | Cumulative `alloc` bytes > `memorySoftLimitBytes` |
| `TIMEOUT` | Execution exceeded time budget | Wall clock runtime > `maxExecutionMs` |
| `SERIALIZE_ERROR` | Return value not serializable | Cyclic/closure-bound object rejected by `structuredClone` / JSON |
| `VIOLATION_THRESHOLD` | Abort due to too many violations | Reached configured `maxViolations` |

### Audit Event Shape (Contract)

Validated by Zod: `SandboxAuditEventSchema`.

```ts
{
  type: 'sandbox.<category>.<kind>',
  severity: 'low' | 'medium' | 'high',
  message: string,
  meta?: Record<string, unknown>,
  code?: ViolationCodeEnum
}
```

All sandbox events must start with the `sandbox.` prefix; the contract test enforces this.

### Serialization Guard

Return values are checked with:

1. `structuredClone(value)` – fast structural validation
2. `JSON.stringify(value)` – catches some edge shapes not rejected by clone

Failure emits `SERIALIZE_ERROR` and the sandbox run resolves with `success: false`.

### Early Abort Strategy

If `maxViolations` is set and the count of recorded violations meets or exceeds it, the worker is
terminated and a synthetic `sandbox.violation.threshold` event with code `VIOLATION_THRESHOLD` is
emitted before returning a failure result.

### Example Usage

```ts
import { createAgentSandbox } from './agent-isolation-sandbox-impl';

const sandbox = createAgentSandbox({
  allowedReadPaths: ['/allowed'],
  networkAllowlist: ['api.example.com'],
  maxExecutionMs: 200,
  memorySoftLimitBytes: 50_000,
  maxViolations: 3,
  virtualFiles: { '/allowed/config.json': '{"ok":true}' },
  onAuditEvent: evt => console.log('AUDIT', evt.code, evt.type)
});

const result = await sandbox.run(api => api.readFile('/allowed/config.json'));
if (result.success) {
  console.log('Value:', result.returnValue);
} else {
  console.warn('Sandbox failure', result.error?.message, result.violations.map(v => v.code));
}
```

### Future Hardening Ideas

- Syscall-level CPU budgeting (profiling + instruction sampling)
- Built-in resource metering (IO op counters)
- Per-run trace correlation IDs
- Optional write sandbox (temp overlay FS)

---

## Policy Hot Reload (Structure Guard)

The `PolicyHotReloader` enables runtime updates to structure guard policies without process restarts.

### Features

- Hybrid watcher: combines `fs.watch`, `fs.watchFile`, and a lightweight polling fallback for reliability.
- Baseline load does not emit an update event; only subsequent validated content changes trigger `policyReloaded`.
- Resilient to file deletion and later recreation (`fileDeleted` then `policyReloaded`).
- Differentiated error events for parse vs validation vs operational I/O issues.

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `policyReloaded` | `policy` | Emitted after a successful parse+validate with new serialized content |
| `validationError` | `Error` | Structural/schema validation failed (policy unchanged) |
| `parseError` | `Error` | JSON syntax error (policy unchanged) |
| `fileDeleted` | none | Policy file removed (last good policy retained) |
| `policyError` | `Error` | Operational error (watcher failure, read error, polling failure) |

### Usage

```ts
import { PolicyHotReloader } from './policy-hot-reloader-impl';

const reloader = new PolicyHotReloader('tools/structure-guard/policy.json');

reloader.on('policyReloaded', (p) => console.log('Policy updated to', p.version));
reloader.on('validationError', (e) => console.warn('Policy validation failed', e.message));
reloader.on('parseError', (e) => console.warn('Policy parse error', e.message));
reloader.on('fileDeleted', () => console.warn('Policy file deleted – using last good policy'));
reloader.on('policyError', (e) => console.warn('Policy operational error', e.message));

await reloader.startWatching();
// ... later ...
await reloader.stopWatching();
```

### Test Coverage

`policy-hot-reload.test.ts` validates:

- Change detection and new policy materialization
- Event emission correctness (`policyReloaded` with updated payload)
- Schema validation rejection path
- JSON parse error handling
- File deletion + recreation resilience

### Implementation Notes

- Debounce kept minimal (5ms) to keep tests deterministic; consider increasing for production to batch rapid successive writes.
- Polling interval (120ms) is a fallback; in production you can disable by code change if native watchers prove stable on your deployment platform.
- Initial baseline load avoids emitting `policyReloaded` so downstream consumers treat first event as a real change.

### Integration Pattern (Atomic Swap)

Downstream subsystems (e.g., an orchestration guard) should maintain an atomic reference to the
latest validated policy to avoid TOCTOU hazards across async handlers.

```ts
// policy-state.ts
import { PolicyHotReloader } from '../simple-tests/policy-hot-reloader-impl';
import { readFileSync } from 'node:fs';

// Atomic reference (single mutable binding – avoids partial copies)
let currentPolicy: any = undefined;

export function getCurrentPolicy() {
  return currentPolicy;
}

export async function initPolicyState(path = 'tools/structure-guard/policy.json') {
  // Optional: load baseline synchronously early during boot
  try {
    currentPolicy = JSON.parse(readFileSync(path, 'utf8'));
  } catch (_) {
    // baseline may not exist yet – rely on reloader events
  }

  const reloader = new PolicyHotReloader(path);
  reloader.on('policyReloaded', (p) => {
    // Atomic swap: single assignment; readers always see either old or new, never a torn state
    currentPolicy = p;
  });
  reloader.on('validationError', (e) => console.warn('[policy] validationError', e.message));
  reloader.on('parseError', (e) => console.warn('[policy] parseError', e.message));
  reloader.on('fileDeleted', () => console.warn('[policy] fileDeleted – retaining last good snapshot'));
  reloader.on('policyError', (e) => console.warn('[policy] operational error', e.message));
  await reloader.startWatching();
  return { reloader };
}

// Example consumer usage inside a request / event handler
export function isActionAllowed(action: string) {
  const policy = getCurrentPolicy();
  if (!policy) return false; // Conservative deny until first load
  return policy.allowedActions?.includes(action);
}
```

Key Points:

- Use a module-level mutable binding (or a small wrapper with `Atomics` if crossing worker boundaries).
- Never deep-clone on every read; hot path stays O(1) pointer dereference.
- Treat absence of policy as deny-by-default or fallback to a compiled-in safe baseline.
- Log errors but do not crash the process on transient parse/validation failures; last good policy remains active.
