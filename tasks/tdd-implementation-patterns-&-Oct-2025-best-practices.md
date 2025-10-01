# TDD Implementation Patterns & October 2025 Best Practices

**Companion Guide to Principled TDD Plan**

---

## Modern Testing Patterns (Oct 2025)

### 1. AI-First Testing with LLM Validation

**Pattern**: Use LLMs to validate complex outputs while maintaining deterministic tests

```typescript
// tests/agents/output-validation.test.ts
import { validateWithLLM } from '@cortex/testing';

describe('Agent Code Generation', () => {
  it('should generate syntactically correct code', async () => {
    const code = await agent.generateCode('Create a binary search function');
    
    // Traditional assertion
    expect(code).toContain('function');
    
    // LLM-based validation for quality
    const validation = await validateWithLLM(code, {
      criteria: [
        'Implements binary search correctly',
        'Handles edge cases (empty array, single element)',
        'Uses TypeScript type annotations',
        'Includes JSDoc comments'
      ],
      model: 'gpt-4o-mini', // Fast, cheap validator
      cache: true // Cache similar validations
    });
    
    expect(validation.score).toBeGreaterThan(0.8);
    expect(validation.passed).toBe(true);
  });
});
```

**Why (Oct 2025)**: LLMs excel at semantic validation while maintaining test reproducibility through caching and deterministic prompts.

---

### 2. Contract Testing for MCP/A2A

**Pattern**: Test interfaces between services with consumer-driven contracts

```typescript
// tests/contracts/mcp-memory.contract.ts
import { defineContract, testContract } from '@cortex/contract-testing';

const memoryContract = defineContract({
  consumer: 'cortex-py',
  provider: 'cortex-os-mcp',
  interactions: [
    {
      description: 'Search memories with semantic query',
      request: {
        method: 'POST',
        path: '/mcp/tools/memory_search',
        body: {
          query: 'machine learning',
          limit: 5,
          use_ai: true
        }
      },
      response: {
        status: 200,
        body: {
          memories: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              content: expect.any(String),
              similarity: expect.any(Number),
            })
          ]),
          total: expect.any(Number)
        }
      }
    }
  ]
});

describe('MCP Memory Contract', () => {
  testContract(memoryContract);
});
```

**Validation in CI**:

```bash
# Provider verifies all consumer contracts
pnpm run contract:verify --provider cortex-os-mcp

# Consumer tests against provider
pnpm run contract:test --consumer cortex-py
```

---

### 3. Property-Based Testing for Data Transformations

**Pattern**: Generate random inputs to find edge cases

```typescript
// tests/memory/embedding-properties.test.ts
import * as fc from 'fast-check';

describe('Embedding Service Properties', () => {
  it.prop([
    fc.string({ minLength: 1, maxLength: 10000 }),
    fc.constantFrom('text', 'image', 'audio')
  ])('should produce stable embeddings for same input', 
    async (content, modality) => {
      const embedding1 = await embedService.embed(content, { modality });
      const embedding2 = await embedService.embed(content, { modality });
      
      // Embeddings should be identical for deterministic models
      expect(embedding1).toEqual(embedding2);
      
      // Vector should be normalized
      const magnitude = Math.sqrt(
        embedding1.reduce((sum, val) => sum + val * val, 0)
      );
      expect(magnitude).toBeCloseTo(1.0, 2);
    }
  );
  
  it.prop([fc.array(fc.string(), { minLength: 2, maxLength: 100 })])
    ('batch embeddings should match individual embeddings',
    async (texts) => {
      const individual = await Promise.all(
        texts.map(t => embedService.embed(t))
      );
      const batch = await embedService.embedBatch(texts);
      
      individual.forEach((emb, i) => {
        expect(emb).toEqual(batch[i]);
      });
    }
  );
});
```

---

### 4. Snapshot Testing for Complex Outputs

**Pattern**: Capture and version complex outputs for regression detection

```typescript
// tests/agents/plan-generation.test.ts
describe('Agent Planning Snapshots', () => {
  it('should generate consistent plans for known tasks', async () => {
    const task = loadFixture('tasks/refactor-auth.json');
    const plan = await planner.plan(task);
    
    // Snapshot the plan structure
    expect(plan).toMatchSnapshot({
      id: expect.any(String), // Exclude dynamic fields
      timestamp: expect.any(Number),
      steps: expect.arrayContaining([
        expect.objectContaining({
          description: expect.any(String),
          tool: expect.any(String),
          priority: expect.any(Number)
        })
      ])
    });
  });
  
  it('should update snapshot on --updateSnapshot', async () => {
    // When plan generation improves, run:
    // pnpm test -- --updateSnapshot
    const task = loadFixture('tasks/optimize-performance.json');
    const plan = await planner.plan(task);
    expect(plan).toMatchSnapshot();
  });
});
```

---

### 5. Chaos Engineering in Tests

**Pattern**: Inject failures to verify resilience

```typescript
// tests/resilience/chaos.test.ts
import { ChaosMonkey } from '@cortex/testing';

describe('Memory Service Resilience', () => {
  let chaos: ChaosMonkey;
  
  beforeEach(() => {
    chaos = new ChaosMonkey({
      target: 'database',
      faultInjection: {
        latency: { min: 100, max: 5000, probability: 0.3 },
        errors: { codes: [500, 503], probability: 0.1 },
        networkPartition: { probability: 0.05 }
      }
    });
  });
  
  it('should retry on transient failures', async () => {
    chaos.enable();
    
    const result = await withRetry(() => 
      memoryService.search('test'), {
        maxAttempts: 3,
        backoff: 'exponential'
      }
    );
    
    expect(result).toBeDefined();
    expect(chaos.getMetrics().retries).toBeGreaterThan(0);
  });
  
  it('should circuit break after repeated failures', async () => {
    chaos.enable({ errors: { probability: 1.0 } }); // 100% failure
    
    // First 5 attempts trip circuit breaker
    for (let i = 0; i < 5; i++) {
      await expect(memoryService.search('test')).rejects.toThrow();
    }
    
    // 6th attempt immediately rejected by circuit breaker
    const start = Date.now();
    await expect(memoryService.search('test')).rejects.toThrow('Circuit breaker open');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(10); // No network call made
  });
});
```

---

## October 2025 AI/ML Testing Trends

### 6. Model Drift Detection

**Pattern**: Monitor embedding quality over time

```python
# tests/ml/drift_detection_test.py
import pytest
from cortex.testing import DriftDetector

@pytest.fixture
def drift_detector():
    return DriftDetector(
        baseline_embeddings="fixtures/embeddings_v1.npy",
        threshold=0.15  # 15% distribution shift triggers alert
    )

def test_embedding_distribution_stability(drift_detector):
    """Ensure new model produces similar embeddings"""
    test_sentences = load_test_corpus()
    new_embeddings = embed_batch(test_sentences)
    
    drift_score = drift_detector.calculate_drift(new_embeddings)
    
    assert drift_score < 0.15, f"Embedding drift detected: {drift_score:.2%}"
    
def test_downstream_task_performance():
    """Verify embeddings maintain search quality"""
    queries = load_search_queries()
    expected_results = load_ground_truth()
    
    for query, expected in zip(queries, expected_results):
        results = semantic_search(query, top_k=10)
        
        # Calculate NDCG@10
        ndcg = calculate_ndcg(results, expected)
        assert ndcg > 0.85, f"Search quality degraded for query: {query}"
```

---

### 7. Prompt Injection Resistance

**Pattern**: Red team testing for LLM security

```typescript
// tests/security/prompt-injection.test.ts
import { PromptInjectionAttacks } from '@cortex/security-testing';

describe('Agent Prompt Injection Resistance', () => {
  const attacks = new PromptInjectionAttacks();
  
  it.each(attacks.getAllAttackVectors())(
    'should resist prompt injection: %s',
    async (attackVector) => {
      const maliciousInput = attacks.generate(attackVector);
      const response = await agent.process(maliciousInput);
      
      // Should not execute unintended actions
      expect(response.actions).not.toContainEqual(
        expect.objectContaining({ type: 'system_command' })
      );
      
      // Should detect and flag injection attempt
      expect(response.flags).toContain('potential_injection');
    }
  );
  
  it('should sanitize jailbreak attempts', async () => {
    const jailbreak = attacks.generate('DAN_jailbreak');
    const response = await agent.process(jailbreak);
    
    expect(response.blocked).toBe(true);
    expect(response.reason).toContain('safety policy');
  });
});
```

---

### 8. Multi-Agent Orchestration Testing

**Pattern**: Test agent collaboration with deterministic scenarios

```typescript
// tests/orchestration/multi-agent.test.ts
describe('Multi-Agent Task Execution', () => {
  it('should coordinate 3 agents to complete complex task', async () => {
    const task = {
      goal: 'Analyze codebase and suggest refactors',
      decomposition: [
        { agent: 'analyzer', subtask: 'Identify code smells' },
        { agent: 'architect', subtask: 'Propose refactor plan' },
        { agent: 'coder', subtask: 'Generate refactor diffs' }
      ]
    };
    
    const orchestrator = new AgentOrchestrator();
    const result = await orchestrator.execute(task);
    
    // Verify handoffs occurred
    expect(result.execution_log).toContainEqual(
      expect.objectContaining({
        from: 'analyzer',
        to: 'architect',
        data: expect.objectContaining({ code_smells: expect.any(Array) })
      })
    );
    
    // Verify final output quality
    expect(result.status).toBe('success');
    expect(result.artifacts.diffs.length).toBeGreaterThan(0);
    
    // Each diff should be valid
    for (const diff of result.artifacts.diffs) {
      const applied = applyDiff(diff);
      expect(applied.success).toBe(true);
    }
  });
});
```

---

## Testing Infrastructure (2025)

### 9. Ephemeral Test Environments

**Pattern**: Spin up isolated environments per PR

```yaml
# .github/workflows/test-ephemeral.yml
name: Ephemeral Environment Tests

on: [pull_request]

jobs:
  deploy-ephemeral:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Create namespace
        run: |
          NAMESPACE="pr-${{ github.event.pull_request.number }}"
          kubectl create namespace $NAMESPACE
          
      - name: Deploy stack
        run: |
          helm install cortex-test ./charts/cortex-os \
            --namespace pr-${{ github.event.pull_request.number }} \
            --set image.tag=${{ github.sha }} \
            --set resources.limits.memory=2Gi
          
      - name: Wait for readiness
        run: |
          kubectl wait --for=condition=ready pod \
            -l app=cortex-os \
            -n pr-${{ github.event.pull_request.number }} \
            --timeout=300s
          
      - name: Run E2E tests
        env:
          TEST_ENV_URL: "https://pr-${{ github.event.pull_request.number }}.test.cortex-os.dev"
        run: |
          pnpm test:e2e
          
      - name: Cleanup
        if: always()
        run: |
          kubectl delete namespace pr-${{ github.event.pull_request.number }}
```

---

### 10. Mutation Testing Best Practices

**Pattern**: Focus mutation testing on critical paths

```javascript
// stryker.conf.mjs
export default {
  packageManager: 'pnpm',
  testRunner: 'vitest',
  coverageAnalysis: 'perTest',
  mutate: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/generated/**'
  ],
  // Focus on high-value mutations
  mutator: {
    plugins: ['@stryker-mutator/typescript-checker'],
    excludedMutations: [
      'StringLiteral', // Low signal for most apps
      'BlockStatement'
    ]
  },
  // Prioritize critical modules
  incremental: true,
  incrementalFile: '.stryker-tmp/incremental.json',
  thresholds: {
    high: 80,
    low: 70,
    break: 60
  },
  // Performance optimization
  concurrency: 4,
  timeoutMS: 60000,
  // Custom config for critical paths
  mutate: [
    {
      files: 'src/security/**/*.ts',
      mutator: 'all', // Maximum mutations
      threshold: 90   // Higher bar
    },
    {
      files: 'src/memory/core/**/*.ts',
      mutator: 'all',
      threshold: 85
    }
  ]
};
```

**Running strategically**:

```bash
# Full run (CI only, ~30 min)
pnpm run mutation:test

# Incremental (development, ~5 min)
pnpm run mutation:test --incremental

# Specific module
pnpm run mutation:test --mutate src/memory/core/**/*.ts
```

---

## Performance Testing Patterns

### 11. Realistic Load Profiles

**Pattern**: Model real-world traffic patterns

```javascript
// tests/performance/load-profiles.js
import http from 'k6/http';
import { check, group } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    // Morning peak: 8-10 AM
    morning_peak: {
      executor: 'ramping-vus',
      startTime: '0s',
      stages: [
        { duration: '5m', target: 50 },  // Ramp up
        { duration: '15m', target: 100 }, // Sustain
        { duration: '5m', target: 20 },  // Ramp down
      ],
    },
    // Afternoon steady state
    afternoon: {
      executor: 'constant-vus',
      startTime: '25m',
      vus: 30,
      duration: '2h',
    },
    // Evening spike: 5-7 PM
    evening_spike: {
      executor: 'ramping-arrival-rate',
      startTime: '2h45m',
      stages: [
        { duration: '10m', target: 200 }, // Rapid increase
        { duration: '30m', target: 200 }, // Hold
        { duration: '20m', target: 50 },  // Decline
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<250', 'p(99)<500'],
    http_req_failed: ['rate<0.005'],
    errors: ['rate<0.01'],
  },
};

export default function() {
  group('User Journey: Search + Retrieve', () => {
    // 1. Search memories
    const searchRes = http.post('http://api/memories/search', 
      JSON.stringify({ query: 'machine learning', limit: 10 }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    const searchOk = check(searchRes, {
      'search status is 200': (r) => r.status === 200,
      'search returns results': (r) => JSON.parse(r.body).memories.length > 0,
    });
    errorRate.add(!searchOk);
    
    // 2. Retrieve specific memory
    if (searchOk) {
      const memories = JSON.parse(searchRes.body).memories;
      const memoryId = memories[0].id;
      
      const getRes = http.get(`http://api/memories/${memoryId}`);
      const getOk = check(getRes, {
        'get status is 200': (r) => r.status === 200,
      });
      errorRate.add(!getOk);
    }
  });
}
```

---

### 12. Database Performance Testing

**Pattern**: Test query performance with realistic data volumes

```typescript
// tests/performance/database.test.ts
import { faker } from '@faker-js/faker';
import { performance } from 'node:perf_hooks';

describe('Database Query Performance', () => {
  beforeAll(async () => {
    // Seed realistic data volume
    await seedDatabase({
      memories: 100_000,
      users: 1_000,
      sessions: 10_000
    });
  });
  
  it('should search 100k memories in <100ms', async () => {
    const start = performance.now();
    
    const results = await db.memory.findMany({
      where: {
        content: { search: 'machine learning' },
        userId: testUserId
      },
      take: 20,
      orderBy: { similarity: 'desc' }
    });
    
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(100);
    expect(results.length).toBeLessThanOrEqual(20);
  });
  
  it('should handle concurrent queries without degradation', async () => {
    const queries = Array(50).fill(null).map((_, i) => 
      db.memory.findMany({
        where: { userId: `user-${i % 10}` },
        take: 10
      })
    );
    
    const start = performance.now();
    await Promise.all(queries);
    const duration = performance.now() - start;
    
    // 50 queries should complete in <500ms with connection pooling
    expect(duration).toBeLessThan(500);
  });
});
```

---

## Code Quality Automation

### 13. Pre-commit Quality Gates

**Pattern**: Fast feedback loop with staged file checks

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🧪 Running TDD Coach validation..."
pnpm tdd-coach validate --staged

echo "🎨 Checking code style..."
pnpm biome check --staged

echo "🔒 Scanning for secrets..."
pnpm secret-scan --staged

echo "📦 Validating types..."
pnpm tsc --noEmit

echo "✅ Pre-commit checks passed!"
```

---

### 14. Automated Test Generation

**Pattern**: Use AI to generate test scaffolds (not final tests)

```typescript
// scripts/generate-test-scaffold.ts
import { analyzeFunction } from '@cortex/code-analysis';
import { generateTestScaffold } from '@cortex/test-generation';

async function scaffoldTests(filePath: string) {
  const functions = await analyzeFunction(filePath);
  
  for (const func of functions) {
    const scaffold = await generateTestScaffold({
      function: func,
      testTypes: ['unit', 'edge-cases', 'error-handling'],
      framework: 'vitest'
    });
    
    const testPath = filePath.replace('.ts', '.test.ts');
    
    // Write scaffold with TODO comments for manual completion
    await writeFile(testPath, `
// AUTO-GENERATED SCAFFOLD - COMPLETE ASSERTIONS
${scaffold}

// TODO: Add property-based tests
// TODO: Add integration tests if needed
// TODO: Verify edge cases are comprehensive
    `);
  }
}
```

**Important**: Always manually review and complete generated tests. Scaffolds save time but shouldn't be trusted blindly.

---

## Observability in Tests

### 15. Test Telemetry

**Pattern**: Collect metrics from test runs

```typescript
// tests/setup/telemetry.ts
import { TestTelemetry } from '@cortex/testing';

const telemetry = new TestTelemetry({
  exportTo: 'grafana',
  metrics: ['duration', 'memory', 'flake_count']
});

export const mochaHooks = {
  beforeEach() {
    telemetry.startTest(this.currentTest);
  },
  
  afterEach() {
    telemetry.endTest(this.currentTest, {
      passed: this.currentTest.state === 'passed',
      duration: this.currentTest.duration,
      retries: this.currentTest._retries
    });
  }
};
```

**Grafana Dashboard Query**:

```promql
# Test duration P95
histogram_quantile(0.95, 
  sum(rate(test_duration_seconds_bucket[5m])) by (le, test_name)
)

# Flake rate by file
sum(rate(test_flakes_total[1h])) by (test_file) / 
sum(rate(test_runs_total[1h])) by (test_file)
```

---

## Testing Anti-Patterns to Avoid (2025)

### ❌ Over-mocking

```typescript
// BAD: Mocks entire universe
it('should process payment', async () => {
  const mockDB = vi.fn().mockResolvedValue({ id: 1 });
  const mockStripe = vi.fn().mockResolvedValue({ paid: true });
  const mockEmail = vi.fn().mockResolvedValue({ sent: true });
  
  await processPayment(mockDB, mockStripe, mockEmail);
  
  expect(mockDB).toHaveBeenCalled(); // Test proves nothing
});

// GOOD: Real collaborators, mock external APIs only
it('should process payment', async () => {
  mockStripe.charges.create.mockResolvedValue({ id: 'ch_123', paid: true });
  
  const result = await processPayment(realDB, realStripe, realEmailService);
  
  const charge = await realDB.charge.findUnique({ where: { id: result.chargeId } });
  expect(charge.status).toBe('completed');
});
```

---

### ❌ Flaky Time Dependencies

```typescript
// BAD: Non-deterministic
it('should expire after 1 hour', async () => {
  const token = createToken();
  await sleep(3600000); // Wait 1 hour!!!
  expect(token.isExpired()).toBe(true);
});

// GOOD: Inject clock
it('should expire after 1 hour', () => {
  const clock = new MockClock();
  const token = createToken({ clock });
  
  clock.advance({ hours: 1 });
  expect(token.isExpired()).toBe(true);
});
```

---

### ❌ Testing Implementation Details

```typescript
// BAD: Brittle internal testing
it('should call updateCache', () => {
  const spy = vi.spyOn(service, 'updateCache');
  service.processData(data);
  expect(spy).toHaveBeenCalled(); // Who cares?
});

// GOOD: Test observable behavior
it('should return cached data on second call', async () => {
  await service.processData(data);
  
  const start = performance.now();
  const result = await service.processData(data); // Cached
  const duration = performance.now() - start;
  
  expect(result).toEqual(expectedResult);
  expect(duration).toBeLessThan(10); // Cache hit is fast
});
```

---

## Summary: The Test-First Mindset

1. **Red**: Write a failing test that specifies behavior
2. **Green**: Write minimal code to make it pass
3. **Refactor**: Improve code without changing behavior
4. **Commit**: Small, tested changes with evidence

**Quality > Speed**: One well-tested feature beats five untested features.

**Automation > Manual**: If you test it once, automate it.

**Evidence > Assumptions**: Show the failing test, show the passing test, show the coverage.

---

**Related**:

- [Main TDD Plan](./Users/jamiecraik/.Cortex-OS/tasks/cortex-os-&-cortex-py-tdd-plan.md)
- [brAInwav Quality Gates](/.eng/quality_gate.json)
- [CODESTYLE.md](/CODESTYLE.md)
