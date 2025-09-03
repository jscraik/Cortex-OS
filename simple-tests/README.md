# Cortex-OS Simple Tests

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

This directory contains simple, fast-running tests for basic functionality validation and continuous integration smoke tests.

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
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/tests/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  setupFilesAfterEnv: ['<rootDir>/simple-tests/utils/test-setup.js']
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
        statements: 70
      }
    }
  }
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
        environment: 'test'
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
      database: { url: ':memory:' }
    });
    
    expect(system).toBeDefined();
    expect(system.isRunning()).toBe(true);
    
    await stopSystem(system);
  });

  it('should handle startup errors gracefully', async () => {
    const invalidConfig = {
      port: -1,
      database: { url: 'invalid://url' }
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
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('API Info', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/api/info')
        .expect(200);
      
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('version');
    });
  });

  describe('Authentication', () => {
    it('should reject requests without auth', async () => {
      await request(app)
        .get('/api/protected')
        .expect(401);
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
      capabilities: ['text-generation']
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
      type: 'unknown'
    };

    await expect(agentManager.createAgent(invalidConfig))
      .rejects.toThrow('Invalid agent configuration');
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
      metadata: { source: 'test' }
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
      type: 'text'
    });

    await memoryService.store({
      content: 'Python data science guide',
      type: 'text'
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
    ...config
  };

  return await createServer(testConfig);
}

export async function createTestDatabase() {
  return await createDatabase({
    url: ':memory:',
    sync: true,
    logging: false
  });
}

export function createMockAgent(overrides = {}) {
  return {
    id: 'test-agent-' + Date.now(),
    name: 'Test Agent',
    type: 'simple',
    status: 'active',
    capabilities: ['text-generation'],
    ...overrides
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
    ...overrides
  };
}

export function createMockResponse() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    statusCode: 200,
    headers: {}
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
    isConnected: vi.fn().mockReturnValue(true)
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
  return promiseFunction().then(result => {
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
