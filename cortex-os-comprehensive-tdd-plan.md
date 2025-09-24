# Cortex-OS Comprehensive TDD Plan

# Production-Ready ASBR Runtime with MLX-First Hybrid Architecture

**Version**: 2.0 • **Date**: 2025-09-23 • **Status**: Implementation Ready
**Target**: Complete deterministic second brain with governance, proofs, and MLX acceleration

## Executive Summary

This comprehensive TDD plan transforms Cortex-OS from a conceptual architecture into a production-ready ASBR (Autonomous Software Behavior Reasoning) runtime. The plan addresses all critical components: MLX-first execution, ASBR-lite kernel, Cerebrum planning layer, deterministic execution, and full governance capabilities.

## Vision Alignment

**Target State**: A governed, local-first, deterministic second brain that:

- Plans, simulates, executes, and proves with MLX acceleration
- Enforces contracts and routes capabilities via policy
- Learns by replay and attaches proofs to every action
- Provides team-grade velocity to solo developers with auditability

---

## 🎯 Integration Architecture Overview

Cortex-OS follows a plug-in architecture where external applications connect via three primary protocols:

```typescript
// tests/architecture/integration.test.ts
describe('Cortex-OS Integration Architecture', () => {
  it('should define clear integration contracts', () => {
    // MCP Contract - Tool Discovery & Execution
    const mcpContract = {
      tools: {
        list: 'GET /mcp/tools',
        execute: 'POST /mcp/tools/execute',
        capabilities: 'GET /mcp/capabilities'
      },
      transport: ['stdio', 'http', 'sse'],
      auth: ['bearer', 'signature']
    };

    // A2A Contract - Event-Driven Communication
    const a2aContract = {
      publish: 'POST /a2a/events/{type}',
      subscribe: 'WS /a2a/events/{type}',
      query: 'GET /a2a/events'
    };

    // API Contract - RESTful Operations
    const apiContract = {
      health: 'GET /health',
      tasks: 'GET|POST /api/v1/tasks',
      agents: 'GET /api/v1/agents',
      metrics: 'GET /metrics'
    };

    expect(mcpContract).toBeDefined();
    expect(a2aContract).toBeDefined();
    expect(apiContract).toBeDefined();
  });

  it('should validate application integration points', () => {
    const integrations = {
      'cortex-webui': ['MCP', 'API'],
      'cortex-marketplace': ['MCP', 'A2A'],
      'cortex-code': ['MCP', 'API']
    };

    expect(integrations['cortex-webui']).toContain('MCP');
    expect(integrations['cortex-code']).toContain('MCP');
  });
});
```

---

## 🎯 Phase 0: Foundation & Prerequisites (Week 1)

### 0.1 Environment Validation

```typescript
// tests/foundation/environment.test.ts
describe('Cortex-OS Environment Validation', () => {
  it('should validate MLX availability and Metal support', async () => {
    const mlxCheck = await checkMLXAvailability();

    expect(mlxCheck.available).toBe(true);
    expect(mlxCheck.metalSupported).toBe(true);
    expect(mlxCheck.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should validate all dependencies are resolvable', async () => {
    const dependencies = [
      '@cortex-os/a2a-core',
      '@cortex-os/memories',
      '@cortex-os/orchestration',
      '@cortex-os/mcp',
      '@cortex-os/rag'
    ];

    for (const dep of dependencies) {
      await expect(import(dep)).resolves.not.toThrow();
    }
  });

  it('should validate development toolchain', async () => {
    const tools = ['pnpm', 'typescript', 'vitest', 'oxlint', 'biome'];

    for (const tool of tools) {
      const { stdout } = await execAsync(`${tool} --version`);
      expect(stdout).toBeDefined();
    }
  });
});
```

### 0.2 Repository Structure Validation

```typescript
// tests/foundation/structure.test.ts
describe('Repository Structure', () => {
  const requiredStructure = [
    // Core Runtime App
    'apps/cortex-os/src/',

    // External Applications (via MCP/A2A/API)
    'apps/cortex-webui/src/',
    'apps/cortex-marketplace/src/',
    'apps/cortex-code/src/',

    // API Gateway
    'apps/api/src/',

    // Core Runtime Packages
    'packages/asbr/src/',
    'packages/kernel/src/',
    'packages/model-gateway/src/',
    'packages/a2a/src/',
    'packages/a2a-core/src/',
    'packages/a2a-services/src/',
    'packages/mcp-core/src/',
    'packages/mcp-bridge/src/',
    'packages/mcp-registry/src/',
    'packages/orchestration/src/',
    'packages/memories/src/',
    'packages/rag/src/',
    'packages/agents/src/',
    'packages/simlab/src/',

    // Supporting Packages
    'packages/evals/src/',
    'packages/agent-toolkit/src/',
    'packages/observability/src/',
    'packages/policy/src/',
    'packages/security/src/',
    'packages/cortex-logging/src/',
    'packages/cortex-sec/src/',
    'packages/prp-runner/src/',
    'packages/commands/src/',
    'packages/hooks/src/',
    'packages/registry/src/',
    'packages/cortex-rules/src/',
    'packages/github/src/',
    'packages/cortex-ai-github/src/',
    'packages/cortex-semgrep-github/src/',
    'packages/cortex-structure-github/src/'
  ];

  it('should have all required directories', () => {
    for (const dir of requiredStructure) {
      expect(fs.existsSync(dir)).toBe(true);
    }
  });

  it('should validate package boundaries', () => {
    const boundaries = validatePackageBoundaries();
    expect(boundaries.violations).toHaveLength(0);
  });

  it('should verify package dependencies', () => {
    const packages = getAllPackageDependencies();

    // Core ASBR dependencies
    expect(packages['@cortex-os/asbr']).toContain('@cortex-os/a2a-core');
    expect(packages['@cortex-os/asbr']).toContain('@cortex-os/mcp-core');

    // Model gateway dependencies
    expect(packages['@cortex-os/model-gateway']).toContain('@cortex-os/a2a-contracts');
    expect(packages['@cortex-os/model-gateway']).toContain('@cortex-os/orchestration');

    // MCP registry dependencies
    expect(packages['@cortex-os/mcp-registry']).toContain('@cortex-os/mcp-core');

    // Evaluation framework dependencies
    expect(packages['@cortex-os/evals']).toContain('@cortex-os/a2a-core');
  });
});
```

---

## 🧠 Phase 1: ASBR-lite Kernel (Week 2-3)

### 1.1 Dependency Injection Container

```typescript
// tests/kernel/di-container.test.ts
describe('ASBR-lite DI Container', () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
  });

  it('should register and resolve services with contracts', () => {
    container.register('MemoryStore', InMemoryStore, [SINGLETON]);
    container.register('EventBus', A2AEventBus, [SINGLETON]);
    container.register('PolicyRouter', PolicyRouter, []);

    const memory = container.resolve<MemoryStore>('MemoryStore');
    const eventBus = container.resolve<EventBus>('EventBus');

    expect(memory).toBeInstanceOf(InMemoryStore);
    expect(eventBus).toBeInstanceOf(A2AEventBus);
  });

  it('should enforce contract validation on resolution', () => {
    container.register('InvalidService', class {}, []);

    expect(() => {
      container.resolve<Contract>('InvalidService');
    }).toThrow('Contract validation failed');
  });

  it('should handle circular dependencies gracefully', () => {
    container.register('ServiceA', ServiceA, []);
    container.register('ServiceB', ServiceB, [DEP_ON_A]);

    expect(() => container.resolve('ServiceA')).not.toThrow();
  });
});
```

### 1.2 Contract Registry

```typescript
// tests/kernel/contract-registry.test.ts
describe('Contract Registry', () => {
  let registry: ContractRegistry;

  beforeEach(() => {
    registry = new ContractRegistry();
  });

  it('should register and validate schemas', () => {
    const taskSchema = z.object({
      id: z.string(),
      type: z.enum(['analysis', 'generation', 'validation']),
      input: z.record(z.unknown()),
      constraints: z.object({
        timeout: z.number().optional(),
        maxRetries: z.number().optional()
      }).optional()
    });

    registry.register('Task', taskSchema);

    const validation = registry.validate('Task', {
      id: 'task-123',
      type: 'analysis',
      input: { query: 'test' }
    });

    expect(validation.valid).toBe(true);
  });

  it('should enforce schema versioning', () => {
    registry.register('Event', v1EventSchema, '1.0.0');
    registry.register('Event', v2EventSchema, '2.0.0');

    const v1Validation = registry.validate('Event', v1Data, '1.0.0');
    const v2Validation = registry.validate('Event', v2Data, '2.0.0');

    expect(v1Validation.valid).toBe(true);
    expect(v2Validation.valid).toBe(true);
  });

  it('should provide schema evolution guidance', () => {
    const evolution = registry.getEvolutionPath('Event', '1.0.0', '2.0.0');

    expect(evolution.breakingChanges).toHaveLength(1);
    expect(evolution.migrationSteps).toBeDefined();
  });
});
```

### 1.3 Policy Router

```typescript
// tests/kernel/policy-router.test.ts
describe('Policy Router', () => {
  let router: PolicyRouter;

  beforeEach(() => {
    router = new PolicyRouter();
  });

  it('should route MLX requests locally by default', async () => {
    const request = {
      type: 'inference',
      model: 'mlx-lm',
      input: { prompt: 'Hello' },
      constraints: { localOnly: true }
    };

    const route = await router.route(request);

    expect(route.target).toBe('local-mlx');
    expect(route.cost).toBe(0);
    expect(route.latency).toBeLessThan(100);
  });

  it('should enforce capability policies', async () => {
    router.addPolicy({
      name: 'local-first',
      rules: [
        {
          condition: { capability: 'inference' },
          action: { priority: ['local-mlx', 'ollama', 'frontier'] }
        }
      ]
    });

    const request = { type: 'inference', model: 'gpt-4' };
    const route = await router.route(request);

    expect(route.target).toBe('local-mlx');
    expect(route.fallbackTargets).toContain('ollama');
  });

  it('should handle policy conflicts gracefully', async () => {
    router.addPolicy({ name: 'policy1', priority: 1, rules: [...] });
    router.addPolicy({ name: 'policy2', priority: 2, rules: [...] });

    const request = { type: 'test' };
    const route = await router.route(request);

    expect(route.appliedPolicies).toContain('policy2');
    expect(route.conflicts).toHaveLength(0);
  });
});
```

### 1.4 Deterministic Scheduler

```typescript
// tests/kernel/scheduler.test.ts
describe('Deterministic Scheduler', () => {
  let scheduler: DeterministicScheduler;

  beforeEach(() => {
    scheduler = new DeterministicScheduler();
  });

  it('should execute tasks in deterministic order', async () => {
    const executionOrder: string[] = [];

    const task1 = { id: '1', priority: 1, execute: () => executionOrder.push('1') };
    const task2 = { id: '2', priority: 2, execute: () => executionOrder.push('2') };
    const task3 = { id: '3', priority: 1, execute: () => executionOrder.push('3') };

    await scheduler.schedule([task1, task2, task3]);

    expect(executionOrder).toEqual(['2', '1', '3']);
  });

  it('should provide reproducible execution with seed', async () => {
    const seed = 'test-seed-123';
    const results1 = await scheduler.executeWithSeed(tasks, seed);
    const results2 = await scheduler.executeWithSeed(tasks, seed);

    expect(results1).toEqual(results2);
  });

  it('should enforce resource constraints', async () => {
    scheduler.setConstraints({ maxMemory: '1GB', maxConcurrent: 2 });

    const heavyTasks = Array(5).fill().map(() => ({
      id: Math.random().toString(),
      memory: '500MB',
      execute: async () => {}
    }));

    await expect(scheduler.schedule(heavyTasks)).resolves.not.toThrow();
  });
});
```

---

## 🤖 Phase 2: Cerebrum Layer (Week 3-4)

### 2.1 Planning System

```typescript
// tests/cerebrum/planning.test.ts
describe('Cerebrum Planning System', () => {
  let cerebrum: Cerebrum;

  beforeEach(() => {
    cerebrum = new Cerebrum();
  });

  it('should create executable plans from natural language', async () => {
    const request = {
      goal: 'Analyze the codebase for security vulnerabilities',
      context: { repository: './', tools: ['semgrep', 'codeql'] }
    };

    const plan = await cerebrum.plan(request);

    expect(plan.steps).toHaveLength.greaterThan(0);
    expect(plan.steps[0]).toMatchObject({
      action: expect.any(String),
      inputs: expect.any(Object),
      expectedOutputs: expect.any(Array)
    });
  });

  it('should validate plan feasibility', async () => {
    const impossiblePlan = {
      steps: [
        { action: 'read-minds', inputs: {}, requires: ['telepathy'] }
      ]
    };

    const validation = await cerebrum.validatePlan(impossiblePlan);

    expect(validation.feasible).toBe(false);
    expect(validation.missingCapabilities).toContain('telepathy');
  });

  it('should simulate execution before real execution', async () => {
    const plan = await cerebrum.createPlan('Test goal');

    const simulation = await cerebrum.simulate(plan);

    expect(simulation.success).toBeDefined();
    expect(simulation.estimatedDuration).toBeGreaterThan(0);
    expect(simulation.resourceUsage).toBeDefined();
  });
});
```

### 2.2 Critique System

```typescript
// tests/cerebrum/critique.test.ts
describe('Cerebrum Critique System', () => {
  let cerebrum: Cerebrum;

  it('should identify potential issues in plans', async () => {
    const riskyPlan = {
      steps: [
        { action: 'delete-all-files', confirmation: false },
        { action: 'deploy-to-production', review: false }
      ]
    };

    const critique = await cerebrum.critique(riskyPlan);

    expect(critique.issues).toHaveLength.greaterThan(0);
    expect(critique.issues.some(i => i.severity === 'critical')).toBe(true);
  });

  it('should suggest improvements', async () => {
    const plan = await cerebrum.createPlan('Simple task');

    const improvements = await cerebrum.suggestImprovements(plan);

    expect(improvements).toHaveLength.greaterThan(0);
    expect(improvements[0]).toMatchObject({
      description: expect.any(String),
      impact: expect.any(String),
      confidence: expect.any(Number)
    });
  });
});
```

### 2.3 Teaching & Replay System

```typescript
// tests/cerebrum/teaching.test.ts
describe('Teaching & Replay System', () => {
  let teaching: TeachingSystem;

  beforeEach(() => {
    teaching = new TeachingSystem();
  });

  it('should capture execution examples', async () => {
    const example = await teaching.captureExample({
      input: { query: 'Analyze code' },
      steps: [...executionTrace],
      output: { result: 'Analysis complete' }
    });

    expect(example.id).toBeDefined();
    expect(example.steps).toHaveLength.greaterThan(0);
  });

  it('should learn from examples', async () => {
    await teaching.addExamples([example1, example2]);

    const learning = await teaching.learnPattern('code-analysis');

    expect(learning.pattern).toBeDefined();
    expect(learning.confidence).toBeGreaterThan(0.5);
  });

  it('should replay executions with different inputs', async () => {
    const replay = await teaching.replay(exampleId, {
      query: 'Analyze different code'
    });

    expect(replay.success).toBe(true);
    expect(replay.adaptations).toHaveLength.greaterThan(0);
  });
});
```

---

## ⚡ Phase 3: Hybrid Model Integration (MLX + Ollama Cloud) (Week 4-5)

### 3.1 MLX Server Integration

```typescript
// tests/mlx/integration.test.ts
describe('MLX Integration', () => {
  let cortex: CortexOSRuntime;
  let mlxClient: MLXClient;

  beforeEach(async () => {
    cortex = await CortexOSRuntime.start();
    mlxClient = new MLXClient({ url: 'http://localhost:8081' }); // cortex-py canonical MLX port
  });

  afterEach(async () => {
    await cortex.stop();
  });

  it('should connect to cortex-py MLX server', async () => {
    const health = await mlxClient.health();

    expect(health.status).toBe('healthy');
    expect(health.metal_supported).toBe(true);
    expect(health.mlx_version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should generate embeddings with Metal acceleration', async () => {
    const response = await mlxClient.embeddings({
      texts: ['Hello world', 'Machine learning'],
      'Qwen3-Embedding-4B'
    });

    expect(response.embeddings).toHaveLength(2);
    expect(response.embeddings[0]).toHaveLength.greaterThan(0);
    expect(response.processing_time).toBeLessThan(1000);
  });

  it('should execute chat completion with MLX models', async () => {
    const response = await mlxClient.chat({
      'GLM-4.5-mlx-4Bit'
      messages: [
        { role: 'user', content: 'What is machine learning?' }
      ],
      max_tokens: 100
    });

    expect(response.choices).toHaveLength.greaterThan(0);
    expect(response.choices[0].message.content).toBeDefined();
    expect(response.usage.total_tokens).toBeGreaterThan(0);
  });

  it('should handle batch processing efficiently', async () => {
    const batch = Array(100).fill().map((_, i) => ({
      text: `Test text ${i}`,
      model: 'all-MiniLM-L6-v2'
    }));

    const results = await mlxClient.batchEmbeddings(batch);

    expect(results).toHaveLength(100);
    expect(results.every(r => r.embedding)).toBe(true);
  });
});
```

### 3.2 Python A2A Integration

```typescript
// tests/mlx/a2a-integration.test.ts
describe('Python A2A Integration', () => {
  let cortex: CortexOSRuntime;
  let a2aClient: A2AClient;

  beforeEach(async () => {
    cortex = await CortexOSRuntime.start();
    a2aClient = new A2AClient({ url: cortex.a2aUrl });
  });

  afterEach(async () => {
    await cortex.stop();
  });

  it('should receive MLX performance events from cortex-py', async () => {
    const events: any[] = [];

    a2aClient.subscribe('mlx.performance', (event) => {
      events.push(event);
    });

    // Trigger MLX processing
    await cortex.execute({
      type: 'embedding',
      texts: ['test text']
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    expect(events).toHaveLength.greaterThan(0);
    expect(events[0]).toMatchObject({
      type: 'mlx.performance',
      data: {
        processing_time: expect.any(Number),
        model_used: expect.any(String)
      }
    });
  });

      #### Implementation Status (2025-09-23)

      Module A (Deterministic Scheduler) implemented at `packages/kernel/src/scheduler/deterministicScheduler.ts` and exported via `packages/kernel/src/index.ts`.

      Validated Capabilities (GREEN via tests in `simple-tests/kernel/`):
      1. Deterministic ordering: priority (descending) then stable FNV-1a hash of `id + seed`, final `id` tiebreak.
      2. Seed reproducibility: identical `executionHash` + record sequence for identical seed & inputs (`executeWithSeed`).
      3. Resource gating: batch window via `maxConcurrent`; soft memory trimming via `maxMemoryMB` (keeps first fitting tasks, never empties batch).
      4. Replay: `replay(trace, taskMap)` reconstructs tasks and produces identical `executionHash` when logic unchanged.

      Tests Added:
      - `deterministic-scheduler.order.test.ts`
      - `deterministic-scheduler.seed.test.ts`
      - `deterministic-scheduler.constraints.test.ts`
      - `deterministic-scheduler.replay.test.ts`

      Execution Hash Rationale:
      - Initial implementation hashed only record canonical form; different seeds with identical task outputs could collide.
      - Adjusted `computeExecutionHash` to include `seed` and record index, guaranteeing divergence across seeds while preserving determinism for identical seeds.

      Outcome: Scheduler module considered stable foundation for Proof System (Module B). Proceeding to scaffold failing proof tests next.

#### 1.5 Proof System (Module B) – Implementation Status (2025-09-24)

Current Implementation (kernel package):
- Source: `packages/kernel/src/proof/proofSystem.ts`
- Exports: `createProofSession`, `finalizeProof` (async), `verifyProof`, `ProofSigner`, `createInMemoryProofStore`, `produceProofFromScheduleResult`.

Deterministic Artifacts:
- Digest = FNV-1a over canonical execution records + serialized claims.
- Scheduler `executionHash` preserved as contextual field; digest is separate integrity primitive.
- Required claims enforced at verification (currently `totalTasks`).

Signing Layer:
- Optional `ProofSigner` interface (sign + optional verify). Mock signer used in adapter tests.
- Detached signature stored with signerId; verification path adds `signature-invalid` issue when mismatch.

Persistence:
- In-memory store offering `save/get/list/clear`. Future: emit `proof.generated` CloudEvent for cross-feature indexing.

Adapter Integration:
- `produceProofFromScheduleResult` populates baseline claims: `totalTasks`, `allSucceeded` and optionally signs & persists artifact.

Test Coverage (GREEN):
- `proof-system.basic.test.ts`: happy path, tampered digest detection, missing required claim detection.
- `proof-system.adapter.test.ts`: adapter creation, persistence round-trip, signature verification, signature tamper invalidation.

Acceptance Matrix (Initial)

| Capability | Test Case | Status | Notes |
|------------|-----------|--------|-------|
| Create proof session | basic happy path | Pass | Claims mutable pre-finalize |
| Required claim enforcement | missing totalTasks | Pass | Artifact produced; verification flags issue |
| Digest integrity detection | tampered claims | Pass | `digest-mismatch` issued |
| Signature support | adapter signer test | Pass | Mock implementation |
| Signature tamper detection | altered signature | Pass | `signature-invalid` issued |
| Adapter from scheduler | adapter creation | Pass | Seeds claims + persists |
| Persistence list/get | adapter test | Pass | In-memory only |
| All succeeded claim | adapter creation | Pass | Derived from records |
| Missing required claim isolation | basic missing test | Pass | Future: extend set |

Planned Enhancements (Exit Criteria for Module B Completion):
1. Add CloudEvent emission on proof generation (contracts + test).
2. Introduce Zod contract for `ProofArtifact` in `contracts/` with validation tests.
3. Upgrade digest to cryptographic (e.g., BLAKE3) behind feature flag + reproducibility test.
4. Add audit query API (time range + filters) with tests.
5. Integrate with governance proofs tests (Phase 4) to reuse artifact path.

Status: Proof System core primitives GREEN. Remaining enhancements tracked for completion milestone.

    const events: any[] = [];

    a2aClient.subscribe('service.*', (event) => {
      events.push(event);
    });

    // Simulate cortex-py restart
    await cortex.restartService('cortex-py');

    await new Promise(resolve => setTimeout(resolve, 1000));

    const lifecycleEvents = events.filter(e => e.type.includes('service'));
    expect(lifecycleEvents).toHaveLength.greaterThan(0);
  });
});
```

### 3.2 Model Gateway Integration

### 3.3 Hybrid Conjunction & Privacy Mode

```typescript
// tests/model-gateway/hybrid-routing.test.ts
describe('Hybrid Routing & Conjunction', () => {
  let router: import('@cortex-os/model-gateway').ModelRouter;

  beforeEach(async () => {
    router = new (await import('@cortex-os/model-gateway')).ModelRouter();
    await router.initialize();
  });

  it('should select cloud model when context is massive and mode is enterprise', async () => {
    // Ensure privacy mode disabled for this test
    router.setPrivacyMode(false);
    router.setHybridMode('enterprise');

    // Ask for chat without specifying a model; very large context triggers cloud
    const selected = (router as any).selectModel('chat', undefined, 120_000, 'enterprise');
    expect(selected).toBeTruthy();
    expect(selected.provider).toBe('ollama-cloud');
  });

  it('should enforce privacy mode to MLX-only routing', async () => {
    router.setPrivacyMode(true);

    const capabilities: Array<'embedding'|'chat'|'reranking'> = ['embedding','chat','reranking'];
    for (const cap of capabilities) {
      const models = router.getAvailableModels(cap as any);
      // In privacy mode, only MLX providers should be present
      expect(models.every(m => m.provider === 'mlx')).toBe(true);
    }
  });
});
```

```typescript
// tests/orchestration/hybrid-models-validation.test.ts
describe('Orchestration Hybrid Models (7 required)', () => {
  it('should validate all 7 required models are configured', async () => {
    const mod = await import('@cortex-os/orchestration/src/config/hybrid-model-integration');
    const router = new mod.OrchestrationHybridRouter();
    const validation = router.validateModels();

    expect(validation.valid).toBe(true);
    expect(validation.missing).toHaveLength(0);
  });
});
```

### 3.4 Hybrid Configuration References

- `config/hybrid-model-enforcement.json` — central routing rules (MLX-first = 100, privacy mode, conjunction patterns)
- `packages/model-gateway/src/model-router.ts` — hybrid router (privacy/performance/enterprise/conjunction modes)
- `packages/orchestration/src/config/hybrid-model-integration.ts` — 7 required models (GLM-4.5, Qwen2.5-VL, Gemma-2-2B, SmolLM-135M, Gemma-3-270M, Qwen3-Embedding-4B, Qwen3-Reranker-4B)
- `scripts/hybrid-deployment-validation.sh` — deployment validation (health checks + routing)
- Env: `CORTEX_HYBRID_MODE`, `CORTEX_MLX_FIRST_PRIORITY`, `CORTEX_PRIVACY_MODE`, `CORTEX_CONJUNCTION_ENABLED`, `MLX_BASE_URL`, `OLLAMA_BASE_URL`

```typescript
// tests/model-gateway/router.test.ts
describe('Model Gateway Router', () => {
  let gateway: ModelGateway;

  beforeEach(() => {
    gateway = new ModelGateway();
  });

  it('should route to MLX by default for local models', async () => {
    const request = {
      model: 'mistral-7b',
      prompt: 'Test prompt',
      local: true
    };

    const route = await gateway.route(request);

    expect(route.provider).toBe('mlx');
    expect(route.cost).toBe(0);
  });

  it('should fallback to Ollama when MLX unavailable', async () => {
    // Mock MLX failure
    gateway.setProviderHealth('mlx', false);

    const request = { model: 'glm-4.5', prompt: 'Test' };
    const response = await gateway.execute(request);

    expect(response.provider).toBe('ollama');
    expect(response.fallback).toBe(true);
  });

  it('should enforce usage limits and budgets', async () => {
    gateway.setBudget({
      monthly: 100,
      provider: { openai: 50, ollama: 0, mlx: 0 }
    });

    const expensiveRequest = {
      model: 'gpt-4',
      prompt: 'A'.repeat(100000)
    };

    await expect(gateway.execute(expensiveRequest))
      .rejects.toThrow('Budget exceeded');
  });
});
```

---

## 🔒 Phase 4: Governance & Security (Week 5-6)

### 4.1 Policy Enforcement

```typescript
// tests/governance/policy-enforcement.test.ts
describe('Policy Enforcement', () => {
  let governance: GovernanceSystem;

  beforeEach(() => {
    governance = new GovernanceSystem();
  });

  it('should enforce local-first policy', async () => {
    governance.addPolicy({
      id: 'local-first',
      rules: [
        {
          target: 'inference',
          condition: { model: /.*/ },
          action: { priority: ['mlx', 'ollama'], allowFrontier: false }
        }
      ]
    });

    const request = { type: 'inference', model: 'gpt-4' };
    const decision = await governance.evaluate(request);

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('local-first policy');
  });

  it('should validate capability usage', async () => {
    governance.registerCapability('file-write', {
      schema: fileWriteSchema,
      quota: { perHour: 100, perDay: 1000 }
    });

    await governance.useCapability('file-write', { path: '/test.txt' });

    const usage = await governance.getUsage('file-write');
    expect(usage.current.hour).toBe(1);
  });

  it('should detect and prevent privilege escalation', async () => {
    const maliciousRequest = {
      action: 'execute-system-command',
      command: 'sudo rm -rf /',
      elevation: 'auto'
    };

    const scan = await governance.securityScan(maliciousRequest);

    expect(scan.issues).toHaveLength.greaterThan(0);
    expect(scan.blocked).toBe(true);
  });
});
```

### 4.2 Proof System

```typescript
// tests/governance/proofs.test.ts
describe('Proof System', () => {
  let proofSystem: ProofSystem;

  beforeEach(() => {
    proofSystem = new ProofSystem();
  });

  it('should generate execution proofs', async () => {
    const execution = {
      id: 'exec-123',
      steps: [...],
      inputs: { ... },
      outputs: { ... },
      timestamp: new Date()
    };

    const proof = await proofSystem.generateProof(execution);

    expect(proof.hash).toBeDefined();
    expect(proof.signature).toBeDefined();
    expect(proof.verifiable).toBe(true);
  });

  it('should verify proof integrity', async () => {
    const proof = await proofSystem.generateProof(execution);

    // Tamper with proof
    proof.outputs.result = 'modified';

    const verification = await proofSystem.verify(proof);

    expect(verification.valid).toBe(false);
    expect(verification.issues).toContain('integrity check failed');
  });

  it('should provide audit trail', async () => {
    await proofSystem.recordExecution(execution1);
    await proofSystem.recordExecution(execution2);

    const audit = await proofSystem.getAuditTrail({
      startTime: start,
      endTime: end
    });

    expect(audit.executions).toHaveLength(2);
    expect(audit.totalProofs).toBe(2);
  });
});
```

---

## 🔄 Phase 5: Event System & A2A Integration (Week 6-7)

### 5.1 Event Bus Implementation

```typescript
// tests/events/a2a-bus.test.ts
describe('A2A Event Bus', () => {
  let eventBus: A2AEventBus;

  beforeEach(() => {
    eventBus = new A2AEventBus();
  });

  it('should publish and subscribe to CloudEvents', async () => {
    const received: any[] = [];

    eventBus.subscribe('task.*', (event) => {
      received.push(event);
    });

    const event = {
      id: uuid(),
      source: 'cortex-os',
      type: 'task.created',
      data: { taskId: '123', type: 'analysis' },
      time: new Date()
    };

    await eventBus.publish(event);

    expect(received).toHaveLength(1);
    expect(received[0].data.taskId).toBe('123');
  });

  it('should implement outbox pattern for reliability', async () => {
    const event = createTestEvent();

    // Simulate publish failure
    eventBus.setPublisher(async () => { throw new Error('Network error'); });

    await eventBus.publish(event);

    const pending = await eventBus.getOutboxEvents();
    expect(pending).toHaveLength(1);
  });

  it('should handle DLQ and retries', async () => {
    const failingEvent = createTestEvent();
    let attempts = 0;

    eventBus.setSubscriber(async (event) => {
      attempts++;
      if (attempts < 3) throw new Error('Temporary failure');
    });

    await eventBus.publish(failingEvent);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const dlq = await eventBus.getDLQEvents();
    expect(dlq).toHaveLength(1);
  });
});
```

### 5.2 Event Validation

```typescript
// tests/events/validation.test.ts
describe('Event Validation', () => {
  let validator: EventValidator;

  beforeEach(() => {
    validator = new EventValidator();
  });

  it('should validate CloudEvents format', () => {
    const invalidEvent = {
      // Missing required CloudEvents fields
      data: { test: 'value' }
    };

    const validation = validator.validate(invalidEvent);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('Missing required field: id');
  });

  it('should enforce schema validation', () => {
    validator.registerSchema('task.created', taskCreatedSchema);

    const event = {
      id: '123',
      source: 'test',
      type: 'task.created',
      data: { taskId: 'invalid-id' } // Should be UUID
    };

    const validation = validator.validate(event);

    expect(validation.valid).toBe(false);
    expect(validation.schemaErrors).toHaveLength.greaterThan(0);
  });
});
```

---

## 🧪 Phase 5.5: Package Integration Testing (Week 7)

### 5.5.1 Agent Toolkit Integration

```typescript
// tests/packages/agent-toolkit.test.ts
describe('Agent Toolkit Integration', () => {
  it('should provide unified code search interface', async () => {
    const toolkit = await import('@cortex-os/agent-toolkit');

    const results = await toolkit.multiSearch('function.*test', './src');

    expect(results.ripgrep).toBeDefined();
    expect(results.semgrep).toBeDefined();
    expect(results.astGrep).toBeDefined();
  });

  it('should perform structural code modifications', async () => {
    const toolkit = await import('@cortex-os/agent-toolkit');

    await toolkit.codemod(
      'find(:[x])',
      'replace(:[x])',
      './src'
    );

    const validation = await toolkit.validateProject(['*.ts']);
    expect(validation.errors).toHaveLength(0);
  });
});
```

### 5.5.2 Evaluation Framework Integration

```typescript
// tests/packages/evals.test.ts
describe('Evaluation Framework', () => {
  it('should run agent performance evaluations', async () => {
    const evals = await import('@cortex-os/evals');

    const results = await evals.evaluateAgent({
      agent: 'code-analysis',
      tasks: testTasks,
      metrics: ['accuracy', 'latency', 'cost']
    });

    expect(results.summary.accuracy).toBeGreaterThan(0.8);
    expect(results.summary.averageLatency).toBeLessThan(5000);
  });

  it('should track evaluation history', async () => {
    const evals = await import('@cortex-os/evals');

    const history = await evals.getEvaluationHistory({
      agent: 'code-analysis',
      limit: 10
    });

    expect(history).toHaveLength.greaterThan(0);
    expect(history[0].metrics).toBeDefined();
  });
});
```

### 5.5.3 GitHub Integration Packages

```typescript
// tests/packages/github-integration.test.ts
describe('GitHub Integration Packages', () => {
  it('should integrate AI GitHub workflows', async () => {
    const aiGithub = await import('@cortex-os/cortex-ai-github');

    const prAnalysis = await aiGithub.analyzePR({
      owner: 'cortex-os',
      repo: 'cortex-os',
      prNumber: 123
    });

    expect(prAnalysis.riskScore).toBeDefined();
    expect(prAnalysis.suggestions).toHaveLength.greaterThan(0);
  });

  it('should run Semgrep security scans', async () => {
    const semgrep = await import('@cortex-os/cortex-semgrep-github');

    const scan = await semgrep.scanRepository({
      repository: './',
      rules: ['security', 'correctness']
    });

    expect(scan.findings).toBeDefined();
    expect(scan.summary).toBeDefined();
  });

  it('should validate repository structure', async () => {
    const structure = await import('@cortex-os/cortex-structure-github');

    const validation = await structure.validate('./');

    expect(validation.errors).toHaveLength(0);
    expect(validation.structure.compliant).toBe(true);
  });
});
```

---

## 📊 Phase 6: Observability & Monitoring (Week 7-8)

### 6.1 Comprehensive Metrics

```typescript
// tests/monitoring/metrics.test.ts
describe('Cortex-OS Metrics', () => {
  let metrics: CortexMetrics;

  beforeEach(() => {
    metrics = new CortexMetrics();
  });

  it('should track MLX performance metrics', () => {
    // NOTE: Using glm-4.5 (primary) instead of legacy example models for consistency with hybrid set
metrics.recordMLXInference({
      model: 'glm-4.5',
      tokens: 100,
      latency: 1500,
      memory: '2GB'
    });

    const summary = metrics.getMLXSummary();

    expect(summary.totalRequests).toBe(1);
    expect(summary.averageLatency).toBe(1500);
    expect(summary.models).toContain('mistral-7b');
  });

  it('should track planning and execution metrics', () => {
    metrics.recordPlan({
      duration: 5000,
      steps: 5,
      success: true
    });

    metrics.recordExecution({
      planId: 'plan-123',
      duration: 30000,
      success: true,
      resourceUsage: { cpu: 0.8, memory: '4GB' }
    });

    const planning = metrics.getPlanningMetrics();
    expect(planning.successRate).toBe(1);
  });

  it('should export Prometheus format', () => {
    metrics.recordAgentExecution('code-analysis', 5000, true);

    const prometheus = metrics.toPrometheus();

    expect(prometheus).toContain('cortex_agent_executions_total');
    expect(prometheus).toContain('agent="code-analysis"');
    expect(prometheus).toContain('status="success"');
  });
});
```

### 6.2 Distributed Tracing

```typescript
// tests/monitoring/tracing.test.ts
describe('Distributed Tracing', () => {
  let tracer: CortexTracer;

  beforeEach(() => {
    tracer = new CortexTracer();
  });

  it('should trace execution across components', async () => {
    const rootSpan = tracer.startSpan('execution');

    // Simulate multi-component execution
    const planSpan = tracer.startSpan('planning', { parent: rootSpan });
    await simulatePlanning();
    planSpan.end();

    const mlxSpan = tracer.startSpan('mlx-inference', { parent: rootSpan });
    await simulateMLXInference();
    mlxSpan.end();

    rootSpan.end();

    const trace = tracer.getTrace(rootSpan.traceId);

    expect(trace.spans).toHaveLength(3);
    expect(trace.spans[1].parentId).toBe(rootSpan.spanId);
  });

  it('should capture context propagation', async () => {
    const context = { traceId: '123', userId: 'user-456' };

    const span = tracer.startSpan('test', { context });

    expect(span.context.traceId).toBe('123');
    expect(span.context.userId).toBe('user-456');
  });
});
```

---

## 🚀 Phase 7: Production Deployment (Week 8-9)

### 7.1 Container Orchestration

```typescript
// tests/deployment/orchestration.test.ts
describe('Container Orchestration', () => {
  let orchestrator: ContainerOrchestrator;

  beforeEach(() => {
    orchestrator = new ContainerOrchestrator();
  });

  it('should deploy Cortex-OS core runtime', async () => {
    const coreStack = {
      cortexOs: {
        image: 'cortex-os:latest',
        // Conceptual example (see compose for actual mapping)
        ports: ['8080:8080'], // model-gateway/hybrid router in real deployment
        environment: {
          MLX_ENABLE_METAL: 'true',
          CORTEX_LOCAL_FIRST: 'true'
        },
        resources: {
          memory: '8GB',
          cpu: 4
        }
      },
      mlx: {
        image: 'mlx-server:latest',
        ports: ['8081:8081'],
        devices: ['/dev/dri']
      }
    };

    await orchestrator.deploy(coreStack);

    const status = await orchestrator.getStatus();
    expect(status.cortexOs.running).toBe(true);
    expect(status.mlx.running).toBe(true);
  });

  it('should deploy external applications independently', async () => {
    // Deploy Cortex-OS core first
    await orchestrator.deployCoreRuntime();

    // External applications can be deployed separately
    const webui = {
      image: 'cortex-webui:latest',
      ports: ['3000:3000'],
      environment: {
        CORTEX_MCP_URL: 'http://cortex-os:8081',
        CORTEX_API_URL: 'http://cortex-os:8080'
      }
    };

    const marketplace = {
      image: 'cortex-marketplace:latest',
      ports: ['3001:3001'],
      environment: {
        CORTEX_A2A_URL: 'http://cortex-os:8082',
        CORTEX_MCP_URL: 'http://cortex-os:8081'
      }
    };

    await orchestrator.deployApp('webui', webui);
    await orchestrator.deployApp('marketplace', marketplace);

    const apps = await orchestrator.getAppsStatus();
    expect(apps.webui.running).toBe(true);
    expect(apps.marketplace.running).toBe(true);
  });

  it('should handle dynamic service discovery', async () => {
    // Applications should discover Cortex-OS services
    const discovery = await orchestrator.serviceDiscovery();

    expect(discovery.services).toContainEqual(
      expect.objectContaining({
        name: 'cortex-os-mcp',
        url: expect.stringContaining('http://')
      })
    );

    expect(discovery.services).toContainEqual(
      expect.objectContaining({
        name: 'cortex-os-api',
        url: expect.stringContaining('http://')
      })
    );

    expect(discovery.services).toContainEqual(
      expect.objectContaining({
        name: 'cortex-py-mlx',
        url: expect.stringContaining('http://')
      })
    );
  });

  it('should handle health checks and auto-healing', async () => {
    // Simulate container failure
    await orchestrator.simulateFailure('cortex-os');

    await new Promise(resolve => setTimeout(resolve, 5000));

    const status = await orchestrator.getStatus();
    expect(status.cortexOs.restartCount).toBeGreaterThan(0);
  });
});
```

### 7.2 Configuration Management

```typescript
// tests/deployment/config.test.ts
describe('Configuration Management', () => {
  it('should validate environment configuration', () => {
    const config = new RuntimeConfig();

    config.validate({
      MLX_ENABLE_METAL: 'true',
      CORTEX_LOCAL_FIRST: 'true',
      CORTEX_MAX_MEMORY: '16GB',
      CORTEX_POLICY_ENFORCEMENT: 'strict'
    });

    expect(config.isValid()).toBe(true);
  });

  it('should handle configuration hot-reload', async () => {
    const config = new RuntimeConfig();

    const initial = config.get('policy.localFirst');
    expect(initial).toBe(true);

    // Update configuration
    await config.reload({ CORTEX_LOCAL_FIRST: 'false' });

    const updated = config.get('policy.localFirst');
    expect(updated).toBe(false);
  });
});
```

---

## 🛒 Phase 7.5: External Application Integration (Week 8-9)

### 7.5.1 MCP Tool Integration Tests

```typescript
// tests/integration/mcp-tools.test.ts
describe('MCP Tool Integration', () => {
  let cortex: CortexOSRuntime;
  let mcpClient: MCPClient;

  beforeEach(async () => {
    cortex = await CortexOSRuntime.start();
    mcpClient = new MCPClient({ url: cortex.mcpUrl });
  });

  afterEach(async () => {
    await cortex.stop();
  });

  it('should expose core Cortex-OS tools via MCP', async () => {
    const tools = await mcpClient.listTools();

    expect(tools).toContainEqual(
      expect.objectContaining({
        name: 'cortex_plan',
        description: expect.stringContaining('Create execution plan')
      })
    );
    expect(tools).toContainEqual(
      expect.objectContaining({
        name: 'cortex_execute',
        description: expect.stringContaining('Execute task')
      })
    );
    expect(tools).toContainEqual(
      expect.objectContaining({
        name: 'cortex_search',
        description: expect.stringContaining('Search knowledge')
      })
    );
  });

  it('should handle tool execution from external applications', async () => {
    const result = await mcpClient.executeTool('cortex_plan', {
      goal: 'Analyze repository security',
      context: { tools: ['semgrep'] }
    });

    expect(result.success).toBe(true);
    expect(result.plan).toBeDefined();
    expect(result.plan.steps).toHaveLength.greaterThan(0);
  });
});
```

### 7.5.2 A2A Event Integration Tests

```typescript
// tests/integration/a2a-events.test.ts
describe('A2A Event Integration', () => {
  let cortex: CortexOSRuntime;
  let a2aClient: A2AClient;

  beforeEach(async () => {
    cortex = await CortexOSRuntime.start();
    a2aClient = new A2AClient({ url: cortex.a2aUrl });
  });

  afterEach(async () => {
    await cortex.stop();
  });

  it('should publish lifecycle events for external consumption', async () => {
    const events: any[] = [];

    a2aClient.subscribe('task.*', (event) => {
      events.push(event);
    });

    // Execute a task to generate events
    await cortex.execute({ type: 'test' });

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(events).toHaveLength.greaterThan(0);
    expect(events[0]).toMatchObject({
      type: expect.stringMatching(/^task\./),
      source: 'cortex-os',
      data: expect.any(Object)
    });
  });

  it('should handle events from external applications', async () => {
    const marketplaceEvent = {
      type: 'marketplace.server.installed',
      data: {
        serverId: 'mcp-server-test',
        version: '1.0.0'
      }
    };

    await a2aClient.publish(marketplaceEvent.type, marketplaceEvent.data);

    // Verify Cortex-OS processes the event
    const processed = await cortex.hasProcessedEvent(marketplaceEvent);
    expect(processed).toBe(true);
  });
});
```

### 7.5.3 REST API Integration Tests

```typescript
// tests/integration/rest-api.test.ts
describe('REST API Integration', () => {
  let cortex: CortexOSRuntime;

  beforeEach(async () => {
    cortex = await CortexOSRuntime.start();
  });

  afterEach(async () => {
    await cortex.stop();
  });

  it('should provide health endpoint for external monitoring', async () => {
    const response = await fetch(`${apiUrl}/health`);

    expect(response.status).toBe(200);
    const health = await response.json();

    expect(health.status).toBe('healthy');
    expect(health.services).toBeDefined();
  });

  it('should handle task management via API', async () => {
    // Create task via API
    const createResponse = await fetch(`${apiUrl}/api/v1/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'analysis',
        input: { target: './src' }
      })
    });

    expect(createResponse.status).toBe(201);
    const task = await createResponse.json();

    // Query task status
    const statusResponse = await fetch(`${corsystem.httpUrl}/api/v1/tasks/${task.id}`);
    expect(statusResponse.status).toBe(200);
  });

  it('should support webhook integration', async () => {
    const webhook = {
      event: 'github.pr',
      payload: {
        action: 'opened',
        repository: 'test/repo',
        number: 123
      }
    };

    const response = await fetch(`${apiUrl}/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': 'pull_request'
      },
      body: JSON.stringify(webhook)
    });

    expect(response.status).toBe(202);
    const result = await response.json();
    expect(result.taskId).toBeDefined();
  });
});
```

### 7.5.3 API Gateway Integration

```typescript
// tests/api/gateway.test.ts
describe('API Gateway', () => {
  let gateway: APIGateway;

  beforeEach(async () => {
    gateway = new APIGateway();
    await gateway.start();
  });

  afterEach(async () => {
    await gateway.stop();
  });

  it('should route webhooks to Cortex-OS', async () => {
    const webhook = {
      event: 'github.pr',
      payload: { action: 'opened', pr: { number: 123 } }
    };

    const response = await fetch(`${gateway.url}/webhooks/github`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhook)
    });

    expect(response.status).toBe(202);
    const result = await response.json();
    expect(result.taskId).toBeDefined();
  });

  it('should enforce rate limiting', async () => {
    const requests = Array(100).fill().map(() =>
      fetch(`${gateway.url}/api/v1/health`)
    );

    const responses = await Promise.allSettled(requests);
    const tooManyRequests = responses.filter(r =>
      r.status === 'fulfilled' && r.value.status === 429
    );

    expect(tooManyRequests.length).toBeGreaterThan(0);
  });
});
```

---

## 🧪 Phase 8: End-to-End Testing (Week 9-10)

### 8.1 Complete Workflow Tests

```typescript
// tests/e2e/complete-workflow.test.ts
describe('Cortex-OS End-to-End Workflows', () => {
  let cortex: CortexOSRuntime;

  beforeEach(async () => {
    cortex = await CortexOSRuntime.start();
  });

  afterEach(async () => {
    await cortex.stop();
  });

  it('should complete full analysis workflow', async () => {
    // 1. Create plan
    const plan = await cortex.cerebrum.plan({
      goal: 'Analyze repository for security issues',
      tools: ['semgrep', 'codeql']
    });

    // 2. Execute with MLX
    const execution = await cortex.execute(plan, {
      useMLX: true,
      localOnly: true
    });

    // 3. Verify results
    expect(execution.status).toBe('completed');
    expect(execution.proof).toBeDefined();
    expect(execution.metrics.localExecution).toBe(true);
  });

  it('should handle teaching and replay', async () => {
    // 1. Execute task
    const original = await cortex.executeTask('code-analysis');

    // 2. Capture as example
    const example = await cortex.teaching.capture(original);

    // 3. Replay with new input
    const replayed = await cortex.teaching.replay(example.id, {
      repository: 'different-repo'
    });

    expect(replayed.success).toBe(true);
    expect(replayed.adaptations).toHaveLength.greaterThan(0);
  });

  it('should enforce governance policies', async () => {
    // Try to execute non-local inference
    const request = {
      model: 'gpt-4',
      prompt: 'Test',
      forceRemote: true
    };

    await expect(cortex.execute(request))
      .rejects.toThrow('Policy violation: local-first required');
  });
});
```

### 8.2 Performance and Load Testing

```typescript
// tests/performance/load.test.ts
describe('Load Testing', () => {
  it('should handle 100 concurrent requests', async () => {
    const requests = Array(100).fill().map(() =>
      cortex.execute({ model: 'glm-4.5', prompt: 'Hello' })
    );

    const results = await Promise.allSettled(requests);

    const successful = results.filter(r => r.status === 'fulfilled');
    expect(successful.length).toBeGreaterThan(95);
  });

  it('should maintain performance under sustained load', async () => {
    const duration = 60000; // 1 minute
    const requestsPerSecond = 10;

    const metrics = await loadTest({
      duration,
      rps: requestsPerSecond,
      () => cortex.execute({ model: 'glm-4.5', prompt: 'Test' })
    });

    expect(metrics.p99Latency).toBeLessThan(2000);
    expect(metrics.errorRate).toBeLessThan(0.01);
  });
});
```

---

## Boundaries & Independence

Standalone Applications (run independently, protocol-only integration):

- apps/cortex-code
- apps/cortex-webui
- apps/cortex-marketplace

All other packages are part of the core cortex-os runtime and MUST NOT be treated as standalone deployables.

Boundary Rules:

- No cross-feature reach-through imports (enforced by structure validation)
- External apps communicate only via MCP, A2A, or REST API
- Shared logic resides in designated shared packages; no duplication in apps

Validation Commands:

```bash
pnpm structure:validate
pnpm lint:smart
```

## Governance & Nx Enforcement

Repository Enforcement Gates:

```bash
pnpm build:smart
pnpm typecheck:smart
pnpm lint:smart
pnpm test:smart
pnpm ci:governance
pnpm structure:validate
pnpm security:scan:diff
```

Governance Assertions:

- Named exports only (no default exports)
- Functions <= 40 lines (CI enforced)
- Async/await only (no .then chains)
- All TS projects have "composite": true
- Policy: hybrid MLX-first routing with privacy mode respected

Recommended Pre-Commit Hook (conceptual):

```bash
pnpm biome:staged && pnpm lint && pnpm test --filter changed
```

Placeholder Annotations:

- Patterns like `rules: [...]` or `steps: [...]` intentionally mark TDD scaffolding.
- Replace with concrete implementations during the red/green phase.

## 📋 Success Criteria & Validation Gates

### ✅ Technical Requirements

- [ ] Hybrid routing enforced (MLX-first + cloud conjunction)
- [ ] Privacy mode forces MLX-only providers
- [ ] 7 required orchestration models configured and validated

- [ ] Zero compilation errors in all packages
- [ ] 95%+ test coverage across all components
- [ ] TypeScript strict mode enabled and passing
- [ ] All contracts validated and versioned
- [ ] MLX integration functional with Metal acceleration
- [ ] Python MLX server (cortex-py) operational
- [ ] Deterministic execution verified
- [ ] Policy enforcement working
- [ ] Proof system operational

### ✅ Package Integration Requirements

- [ ] **ASBR Package**: Brain-only orchestration functional
- [ ] **Model Gateway**: MLX/Ollama/Frontier routing working
- [ ] **A2A Stack**: Event bus, contracts, services operational
- [ ] **MCP Suite**: Core, bridge, registry functional
- [ ] **Agent Toolkit**: Code search and modification working
- [ ] **Evaluation Framework**: Agent performance tracking active
- [ ] **GitHub Packages**: AI, Semgrep, structure validation working
- [ ] **Orchestration**: Functional workflows with retries
- [ ] **Memories**: Short/long term storage with provenance
- [ ] **RAG**: Ingest, retrieve, rerank with citations
- [ ] **Security Package**: All security scans passing
- [ ] **Observability**: Metrics, traces, logs collected
- [ ] **Policy Package**: Governance policies enforced
- [ ] **Cortex Logging**: Structured logging operational
- [ ] **PRP Runner**: Product requirement pipelines functional
- [ ] **cortex-py**: MLX server providing Metal acceleration

### ✅ Application Requirements

- [ ] **Cortex-OS App**: Main runtime operational
- [ ] **External App Integration**: All external apps can connect via MCP/A2A/API
- [ ] **MCP Protocol**: Tool discovery and execution working for external apps
- [ ] **A2A Protocol**: Event publishing and subscription functional
- [ ] **REST API**: Complete external API with authentication and rate limiting
- [ ] **Webhook Support**: GitHub and other webhook integrations working
- [ ] **Application Independence**: Each app can run standalone or integrated

### ✅ Operational Requirements

- [ ] Container orchestration functional
- [ ] Health checks comprehensive
- [ ] Metrics collection complete
- [ ] Distributed tracing implemented
- [ ] Hot-reload configuration working
- [ ] Graceful shutdown implemented
- [ ] Auto-healing functional

### ✅ Production Requirements

- [ ] Load tests passing (100 RPS, <2s P99)
- [ ] Security scans passing (OWASP L1 + MITRE ATLAS)
- [ ] Memory stable under load
- [ ] Zero data loss in failure scenarios
- [ ] Audit trail complete and verifiable
- [ ] All policies documented and enforced
- [ ] Accessibility compliance achieved
- [ ] Performance budgets maintained
- [ ] Python MLX server performance benchmarks met
- [ ] Metal acceleration confirmed operational

---

## 🔧 Implementation Commands

### Phase 0: Foundation

```bash
# Setup development environment
./scripts/dev-setup.sh

# Validate environment
pnpm readiness:check

# Initialize repository structure
pnpm structure:validate
```

### Phase 1-2: Core Kernel & Cerebrum

```bash
# Implement DI container
pnpm test:watch tests/kernel/di-container.test.ts

# Build contract registry
pnpm test:watch tests/kernel/contract-registry.test.ts

# Develop cerebrum components
pnpm test:watch tests/cerebrum/
```

### Phase 3-4: Hybrid & Governance

```bash
# Test Hybrid (MLX + Ollama Cloud) integration
./scripts/hybrid-deployment-validation.sh

# MLX/Ollama health checks
curl -sf http://localhost:8081/health >/dev/null
curl -sf http://localhost:11434/api/tags >/dev/null

# Env (example)
export CORTEX_HYBRID_MODE=performance
export CORTEX_MLX_FIRST_PRIORITY=100
export CORTEX_PRIVACY_MODE=false
export CORTEX_CONJUNCTION_ENABLED=true

# Test MLX integration
pnpm test:watch tests/mlx/integration.test.ts

# Start cortex-py MLX server
cd apps/cortex-py && pnpm start

# Validate governance
pnpm test:watch tests/governance/

# Performance testing
pnpm test:performance
```

### Phase 5-8: Integration & Production

```bash
# Full system tests
pnpm test:e2e

# Load testing
pnpm test:load

# Security scanning
pnpm security:scan:all
```

---

## 📊 Timeline & Resources

### Duration: 10 weeks

- **Weeks 1-2**: Foundation & ASBR Kernel
- **Weeks 3-4**: Cerebrum Layer
- **Weeks 5-6**: MLX & Governance
- **Weeks 7-8**: Observability & Events
- **Weeks 9-10**: E2E Testing & Production

### Required Resources

- **Engineering**: 3-4 senior developers
- **Infrastructure**: macOS hosts with Metal support
- **Monitoring**: Prometheus/Grafana stack
- **Testing**: Load testing environment

---

## 🚀 Expected Outcomes

### Before Implementation

```bash
❌ cortex-os conceptual only
❌ No working runtime
❌ Missing MLX integration
❌ No governance system
```

### After Implementation

```bash
✅ Complete ASBR runtime operational
✅ MLX-first execution working
✅ Full governance and policy enforcement
✅ Production-ready with monitoring
✅ 95%+ test coverage
✅ All vision components implemented
```

---

## 📈 Risk Mitigation

### Technical Risks

- **MLX Compatibility**: Comprehensive testing matrix
- **Performance Issues**: Early profiling and optimization
- **Determinism**: Strict validation and replay testing

### Operational Risks

- **Deployment Complexity**: Container orchestration automation
- **Monitoring Gaps**: Comprehensive observability stack
- **Configuration Drift**: Configuration-as-code practices

### Quality Risks

- **Test Coverage**: Strict 95% threshold enforcement
- **Security**: Multiple scanning layers and validation
- **Documentation**: Automated documentation generation

---

## 🏗️ Complete Integration Architecture

### Application Integration Diagram

```
┌─────────────────┐    MCP    ┌──────────────────┐
│   cortex-webui  │ ◄────────► │                  │
│                 │            │                  │
│  - UI Controls  │            │   Cortex-OS      │
│  - Dashboards   │            │   Core Runtime   │
│  - A11y Support │   API     │                  │
└─────────────────┘ ◄────────► │                  │
                              │                  │
┌─────────────────┐    A2A    │  - ASBR Kernel   │
│cortex-marketplace│ ◄────────► │  - Cerebrum      │
│                 │            │  - Event Bus     │
│  - MCP Catalog  │            │  - Policies      │
│  - Tool Install │            │  - Memory Store  │
└─────────────────┘            │                  │
                              │                  │
┌─────────────────┐    MCP    │                  │
│   cortex-code   │ ◄────────► │                  │
│                 │            │                  │
│  - Editor       │   API     │   Ports:         │
│  - TUI          │ ◄────────► │   - 8080: API    │
│  - REPL         │            │   - 8081: MCP    │
└─────────────────┘            │   - 8082: A2A    │
                              └──────────────────┘
                                       ▲
                                       │
                    ┌─────────────────────────┐
                    │      cortex-py          │
                    │                         │
                    │  - MLX Server (Metal)   │
                    │  - Embeddings            │
                    │  - Chat Completion       │
                    │  - A2A Events            │
                    │  - Port 8083            │
                    └─────────────────────────┘
                                       ▲
                                       │
                                ┌─────────────────┐
                                │   apps/api      │
                                │                 │
                                │  - Rate Limit   │
                                │  - Auth         │
                                │  - Webhooks     │
                                └─────────────────┘
```

### Integration Points Summary

1. **MCP (Model Context Protocol)**
   - Tool discovery and execution
   - Real-time communication
   - Used by: cortex-webui, cortex-code, cortex-marketplace

2. **A2A (Agent-to-Agent)**
   - Event-driven communication
   - Pub/sub messaging
   - Used by: cortex-marketplace, external integrations, cortex-py

3. **REST API**
   - Task management
   - System monitoring
   - Webhook handling
   - Used by: cortex-webui, cortex-code, external systems

4. **MLX Server Integration**
   - High-performance ML inference via Metal
   - Embeddings generation
   - Chat completion
   - Used by: All Cortex-OS ML operations

5. **Application Independence**
   - Each app can run standalone
   - Zero coupling to implementation details
   - Protocol-based integration only

**This comprehensive TDD plan ensures Cortex-OS becomes a production-ready, governed ASBR runtime that serves as the brain for a pluggable ecosystem of applications, fulfilling its vision as a deterministic, local-first second brain with MLX acceleration and complete auditability.**

**Co-authored-by: Cortex-OS Development Team**

---

## 🔍 Fresh Eyes Technical & Operational Review (2025-09-23)

This section captures an independent gap analysis between the original phased TDD goals and the current repository
state. It converts the assessment into an incremental, test-first execution backlog while preserving architectural
governance rules.

### ✅ Strength Summary

- Strong governance: structure guard, memory constraints, mutation + coverage gates.
- Mature security scanning layers (Semgrep multi-profile, Snyk, license, SBOM).
- Refactored Cerebrum implementation (removal of legacy oversized agent code) aligns with ≤40 line function rule.
- Hybrid / model gateway scaffolding present; MLX integration scripts exist.
- Observability foundations (OTel, metrics scripts) + carbon & accessibility tracking.

### ⚠ Key Gaps vs Plan (Condensed)

| Area | Gap | Impact | Priority |
|------|-----|--------|----------|
| Deterministic Scheduler | Not implemented (only described) | Reproducibility + trust | High |
| Proof System | Absent (no hash/sign/verify pipeline) | Audit + compliance blocking | High |
| Hybrid 7-Model Validation | Test not enforced | Silent routing regressions | High |
| Privacy Mode Enforcement | Lacks explicit negative test | Privacy guarantee risk | High |
| Policy Conflict Resolution Tests | Missing conflict + local-first denial tests | Governance integrity | High |
| Event Outbox + DLQ Reliability | Not validated with publish failure scenarios | Delivery guarantees | Medium |
| Contract Evolution Guidance | No diff/migration path tests | Backward compatibility | Medium |
| Budget / Quota Enforcement | Not fully tested | Cost containment risk | Medium |
| Replay / Teaching Confidence Metrics | Partial scaffolding | Learning efficiency | Medium |
| Load & Sustained Performance Tests | Absent harness | Scalability unknown | Medium |
| Aggregated Health + Discovery | Not consolidated | Ops visibility | Medium |
| Prometheus Metrics Schema Test | Not enforced | Monitoring drift | Medium |
| Orchestrator Class + Auto-Heal Sim | Conceptual only | Deployment resilience | Medium |

---

## 🧪 Updated Test-Driven Backlog (Actionable Modules)

Each module follows: (1) Write failing spec(s) (2) Minimal implementation (3) Refactor for governance; all functions ≤40 LOC, named exports only.

### Module A: Deterministic Scheduler

**Goal**: Provide reproducible task ordering with seed + resource constraints.

**Tests (create first)**:

1. `tests/kernel/deterministic-scheduler.order.test.ts` – Priority > FIFO > tie-break by deterministic hash.
2. `tests/kernel/deterministic-scheduler.seed.test.ts` – Same seed ⇒ identical execution log.
3. `tests/kernel/deterministic-scheduler.constraints.test.ts` – Enforces `maxConcurrent`, denies batch exceeding
   memory budget.
4. `tests/kernel/deterministic-scheduler.replay.test.ts` – Recorded trace replays to identical outcome hash.

**Implementation Outline**:

- File: `packages/kernel/src/scheduler/deterministicScheduler.ts`
- Core steps: normalize tasks → stable sort → concurrent window executor → trace capture (ordered events) → produce
  `executionHash` (e.g. blake3 of canonical JSON).
- Expose: `schedule(tasks, opts)`, `executeWithSeed(tasks, seed)`, `replay(trace)`.

### Module B: Proof System (Execution Verifiability)

**Goal**: Cryptographically attest execution integrity + enable audit trail queries.

**Tests**:

1. `tests/governance/proof-system.generate.test.ts` – Produces hash + signature (Ed25519) + metadata.
2. `tests/governance/proof-system.tamper.test.ts` – Tampering invalidates proof.
3. `tests/governance/proof-system.audit.test.ts` – Filtering by time window returns expected proofs.

**Implementation**:

- Package: `packages/governance/src/proof/`
- Export: `generateProof(execution)`, `verifyProof(proof)`, `getAuditTrail(query)`.
- Hash canonicalization: deterministic key order JSON → blake3.
- Key mgmt: ephemeral dev keypair; prod expects KMS or sealed secret (documented placeholder).

### Module C: Hybrid Model Validation & Privacy Mode

**Goal**: Ensure required model set + enforced provider filtering.

**Tests**:

1. `tests/model-gateway/hybrid-models-validation.test.ts` – 7 required models present; missing list empty.
2. `tests/model-gateway/privacy-mode.test.ts` – When `CORTEX_PRIVACY_MODE=true` only MLX providers returned.
3. `tests/model-gateway/fallback-health.test.ts` – Simulated MLX down → fallback provider chosen; logs fallback flag.

**Implementation Notes**:

- Add `validateModels()` returning `{ valid, missing }`.
- Health injection via provider registry with overridable probe function.

### Module D: Policy Enforcement & Conflict Resolution

**Goal**: Guarantee local-first + deterministic policy resolution.

**Tests**:

1. `tests/policy/local-first-denial.test.ts` – Remote-only request rejected with explicit reason.
2. `tests/policy/conflict-resolution.test.ts` – Higher priority policy overrides lower without residual conflicts.
3. `tests/policy/capability-quota.test.ts` – Quota exhaustion produces governed denial event.

**Implementation**:

- Enhance `packages/policy/src/router.ts` with `explainDecision()` returning rule lineage.
- Maintain internal `appliedPolicies` array for audits.

### Module E: Event Reliability (Outbox + DLQ)

**Goal**: Zero-loss semantics under transient failures.

**Tests**:

1. `tests/events/outbox.retry.test.ts` – Publisher failure ⇒ outbox stored ⇒ retry drains on recovery.
2. `tests/events/dlq.escalation.test.ts` – N consecutive failures ⇒ DLQ entry + metrics increment.
3. `tests/events/outbox.idempotency.test.ts` – Duplicate publish attempt suppressed by idempotency key.

**Implementation**:

- Add `packages/a2a-services/src/outbox` (sqlite or in-memory pluggable adapter).
- Expose metrics counters: `events_outbox_pending`, `events_dlq_total`.

### Module F: Contract Evolution & Schema Governance

**Goal**: Safe additive change path + version diff assist.

**Tests**:

1. `tests/contracts/evolution.additive.test.ts` – Adding optional field keeps v1 consumers passing.
2. `tests/contracts/evolution.breaking-warning.test.ts` – Removing required field triggers advisory.
3. `tests/contracts/evolution.migration-path.test.ts` – `getEvolutionPath('X', '1.0.0','2.0.0')` returns migration steps.

**Implementation**:

- Extend registry to store `{version, schema, deprecated}`.
- Provide `diffSchemas(a,b)` summarizing removed / changed fields.

### Module G: Teaching & Replay Enhancements

**Goal**: Structured example capture + confidence signal.

**Tests**:

1. `tests/cerebrum/teaching.capture.test.ts` – Captures example with normalized step signatures.
2. `tests/cerebrum/teaching.pattern.test.ts` – Learns pattern returns confidence >= threshold.
3. `tests/cerebrum/teaching.replay-diff.test.ts` – Replay on variant input records adaptation list.

**Implementation**:

- Add `patternModel` deriving feature vector (steps, tool types, branching count).
- Confidence = (matched structural tokens / total) * weighting.

### Module H: Performance & Load Harness

**Goal**: Enforce p95/p99 latency budgets & error rate constraints.

**Tests (flagged, not default):**

1. `tests/performance/load.smoke.test.ts` – 20 concurrent short tasks < budget.
2. `tests/performance/load.sustained.test.ts` – Simulated 1m run collects metrics JSON.

**Implementation**:

- Harness: `scripts/perf/harness.mjs` invoking runtime via local API.
- Output JSON appended to `reports/perf/history.json` with median update command.

### Module I: Observability & Metrics Schema Guard

**Goal**: Prevent accidental metric name churn.

**Tests**:

1. `tests/monitoring/metrics.schema.test.ts` – Required metric names present.
2. `tests/monitoring/tracing.span-link.test.ts` – Planning span parent of execution span.

**Implementation**:

- Add static required list under `packages/observability/src/required-metrics.ts`.

### Module J: Deployment Orchestrator & Auto-Heal Simulation

**Goal**: Abstract container/service lifecycle & verify restart logic.

**Tests**:

1. `tests/deployment/orchestrator.restart.test.ts` – Simulated failure increments restartCount.
2. `tests/deployment/orchestrator.discovery.test.ts` – Service registry returns MCP / API / MLX endpoints.

**Implementation**:

- `packages/gateway/src/orchestrator/` with pluggable driver (compose shell adapter initially).

---

## 🧵 Phased Execution (Revised Sprints)

| Sprint | Focus | Modules | Exit Criteria |
|--------|-------|---------|---------------|
| 1 | Determinism & Proof Foundations | A, B, C (core tests green) | Scheduler + Proof tests pass; hybrid privacy enforced |
| 2 | Governance & Reliability | D, E, F | Policy denial + outbox retry + evolution tests passing |
| 3 | Intelligence & Replay | G + remaining hybrid fallback test polish | Teaching confidence >= threshold; replay diff stable |
| 4 | Performance & Observability | H, I | Perf harness JSON baseline committed; metrics schema guard passes |
| 5 | Deployment Resilience | J + health aggregation | Orchestrator restart & discovery tests pass |

All later refactors must remain additive—no breaking schema changes without dual-version strategy per contract rules.

---

## 🎯 Updated Acceptance Matrix (Additions)

| Criterion | Added Validation Mechanism |
|-----------|----------------------------|
| Deterministic execution reproducibility | Seed replay test (Module A) |
| Execution integrity & audit trail | Proof tamper test + audit query (Module B) |
| Hybrid model presence guarantee | Model validation test (Module C) |
| Privacy routing assurance | Privacy mode provider filter test (Module C) |
| Policy conflict determinism | Conflict resolution lineage test (Module D) |
| Reliable event delivery | Outbox retry + DLQ escalation tests (Module E) |
| Safe contract evolution | Evolution diff + migration test (Module F) |
| Teaching efficacy | Pattern confidence threshold test (Module G) |
| Latency budgets adherence | Load harness p95/p99 assertion (Module H) |
| Metrics stability | Required metrics schema guard (Module I) |
| Deployment resilience | Orchestrator restart simulation test (Module J) |

---

## 📄 Documentation Additions (To Be Authored with Modules)

| Doc File | Purpose | Module |
|----------|---------|--------|
| `docs/deterministic-scheduler.md` | Algorithm + reproducibility contract | A |
| `docs/proof-system.md` | Proof format, signing, verification flow | B |
| `docs/hybrid-routing.md` | 7-model matrix, fallback decision tree, privacy semantics | C |
| `docs/policy-conflicts.md` | Priority & resolution lineage semantics | D |
| `docs/event-reliability.md` | Outbox/Retry/DLQ patterns & metrics | E |
| `docs/schema-evolution.md` | Versioning & migration examples | F |
| `docs/teaching-replay.md` | Example capture, adaptation model | G |
| `docs/performance-harness.md` | Load harness usage & budgets | H |
| `docs/observability-metrics.md` | Canonical metric list & invariants | I |
| `docs/deployment-orchestrator.md` | Orchestrator abstraction + auto-heal | J |

Each document must include: Context, Contract (inputs/outputs), Invariants, Test References, Extension Points.

---

## 🧾 Definition of Done (Augmented)

An epic / module is complete only when:

1. All planned failing tests exist and pass (green) with mutation score ≥ threshold for new code.
2. Documentation file merged with cross-links to tests (list test filenames).
3. Coverage for new module ≥ 95% branches.
4. No function > 40 LOC (enforced) – verify via structure guard.
5. No default exports; all new exports named.
6. Security scan adds zero new high/critical findings (diff mode).
7. Performance-sensitive code has micro-benchmark or load guard if latency-critical.
8. Added metrics appear in metrics schema guard test; no removals without deprecation note.
9. All public APIs have Zod validation at boundary.
10. Memory snapshot (optional for heavy modules) shows <10% regression vs baseline.

---

## 🧠 Architectural Constraints Reaffirmed

- No cross-feature reach-through imports (event or contract boundary only).
- Dual-version contracts retained until all consumers migrated & validated.
- Deterministic scheduler must not depend on wall-clock ordering (time used only for metrics, not ordering keys).
- Proof generation MUST run post-execution before side-effect finalization visible to downstream systems.
- Hybrid routing decisions must be pure functions of (capability, contextSize, mode, privacy) for replayability.

---

## 🚦 Immediate Next Steps (Execution Kickoff)

1. Create tests for Modules A, B, C (failing) – commit.
2. Minimal scheduler implementation + proof generator skeleton – achieve green.
3. Add hybrid model presence + privacy enforcement test; wire into CI (quality gate).
4. Draft docs for scheduler & proof system referencing tests.
5. Open tracking issues referencing this updated plan (one per module) and link to acceptance matrix row.

---

_This appended plan segment operationalizes the earlier conceptual phases into concrete, enforceable,
test-first modules. It accelerates the path to a verifiable, deterministic ASBR runtime._
