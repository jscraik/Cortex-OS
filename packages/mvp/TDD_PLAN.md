# MVP Package TDD Plan

## Goal

Achieve ≥90% readiness for the MVP package with focus on:

- Feature glue and minimal viable flows
- Public CLI/UI interfaces
- Runtime flags and configuration
- Proper boundaries with mvp-core
- Enhanced security and telemetry

## Phase 1: Critical Fixes (1-2 days)

### Task 1: Fix Type Safety Violations

**Objective**: Ensure all interfaces are properly implemented

#### Test Cases:

```typescript
// tests/type-safety.test.ts
describe('Type Safety Fixes', () => {
  it('should create valid Neuron objects from MCP tools', () => {
    const adapter = new MCPAdapter();
    const mockTool = {
      name: 'test-tool',
      description: 'Test tool',
      inputSchema: { type: 'object' },
    };

    const neuron = adapter.createNeuronFromTool(mockTool, 'strategy');

    // All required properties should exist
    expect(neuron).toHaveProperty('id');
    expect(neuron).toHaveProperty('role');
    expect(neuron).toHaveProperty('phase');
    expect(neuron).toHaveProperty('dependencies');
    expect(neuron).toHaveProperty('tools');
    expect(neuron).toHaveProperty('execute');
    expect(typeof neuron.execute).toBe('function');
  });

  it('should match PRPOrchestrator interface from prp-runner', async () => {
    const mockOrchestrator = {
      getNeuronCount: () => 3,
      executeNeuron: async () => ({}), // Add missing method
    };

    const kernel = new CortexKernel(mockOrchestrator);
    expect(kernel).toBeDefined();
  });
});
```

#### Implementation:

1. Update MCP adapter to properly implement Neuron interface
2. Add missing execute method to Neuron objects
3. Ensure compatibility with prp-runner interfaces

### Task 2: Implement Deterministic Execution

**Objective**: Ensure reproducible execution without timing dependencies

#### Test Cases:

```typescript
// tests/determinism-enhanced.test.ts
describe('Enhanced Determinism', () => {
  it('should produce identical results for identical inputs with deterministic mode', async () => {
    const mockOrchestrator = { getNeuronCount: () => 3 };
    const kernel = new CortexKernel(mockOrchestrator);

    const blueprint = {
      title: 'Determinism Test',
      description: 'Should be deterministic',
      requirements: ['Test determinism'],
    };

    // Run workflows with identical inputs and deterministic mode
    const result1 = await kernel.runPRPWorkflow(blueprint, {
      runId: 'deterministic-test',
      deterministic: true,
    });

    const result2 = await kernel.runPRPWorkflow(blueprint, {
      runId: 'deterministic-test',
      deterministic: true,
    });

    // Should produce identical results
    expect(result1).toEqual(result2);
  });

  it('should generate deterministic IDs when deterministic mode enabled', () => {
    const state1 = createInitialPRPState(
      { title: 'Test', description: 'Test', requirements: [] },
      { id: 'fixed-id', runId: 'fixed-run-id', deterministic: true },
    );

    const state2 = createInitialPRPState(
      { title: 'Test', description: 'Test', requirements: [] },
      { id: 'fixed-id', runId: 'fixed-run-id', deterministic: true },
    );

    // Should have identical IDs and timestamps
    expect(state1.id).toBe(state2.id);
    expect(state1.runId).toBe(state2.runId);
    expect(state1.metadata.startTime).toBe(state2.metadata.startTime);
  });
});
```

#### Implementation:

1. Add deterministic flag to runPRPWorkflow method
2. Replace Date.now() with fixed values in deterministic mode
3. Skip setTimeout in simulateWork when deterministic mode is enabled
4. Standardize timestamp generation

### Task 3: Correct Validation Logic

**Objective**: Fix incorrect validation logic

#### Test Cases:

```typescript
// tests/validation-logic.test.ts
describe('Validation Logic Fixes', () => {
  it('should fail API validation when schema is missing', () => {
    const buildNode = new BuildNode();

    // Mock state with API but no schema
    const mockState = {
      blueprint: {
        title: 'API Test',
        description: 'Has API',
        requirements: ['REST API'],
      },
      outputs: {
        'api-check': { hasAPI: true, hasSchema: false },
      },
    } as any;

    const result = buildNode.validateAPISchema(mockState);

    // Should properly fail when schema is missing
    expect(result.passed).toBe(false);
    expect(result.details.validation).toBe('failed');
  });

  it('should require ALL phases to pass for cerebrum promotion', () => {
    const evaluationNode = new EvaluationNode();

    // Mock state with mixed validation results
    const mockState = {
      validationResults: {
        strategy: { passed: true, blockers: [] },
        build: { passed: false, blockers: ['API schema missing'] }, // Failed!
        evaluation: { passed: true, blockers: [] },
      },
    } as any;

    const canPromote = evaluationNode.checkPreCerebrumConditions(mockState);

    // Should be false when any phase fails
    expect(canPromote).toBe(false);
  });
});
```

#### Implementation:

1. Fix API validation logic to properly fail when schema is missing
2. Correct cerebrum decision logic to use "&&" for all phases
3. Add comprehensive validation error handling

## Phase 2: Boundary and Configuration (2-3 days)

### Task 4: Establish Proper Boundaries with MVP-Core

**Objective**: Ensure clean separation between MVP and MVP-core packages

#### Test Cases:

```typescript
// tests/boundary-contract.test.ts
describe('MVP-Core Boundary Contract', () => {
  it('should successfully import env loader from mvp-core public API', async () => {
    const { loadEnv } = await import('@cortex-os/mvp-core');
    expect(typeof loadEnv).toBe('function');
  });

  it('should reject deep imports to mvp-core internals', async () => {
    await expect(import('@cortex-os/mvp-core/src/env.js')).rejects.toThrow(/Cannot find module/);
  });

  it('should use environment configuration schema', () => {
    const config = loadEnv({
      NODE_ENV: 'test',
      LOG_LEVEL: 'debug',
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4317',
    });

    expect(config.NODE_ENV).toBe('test');
    expect(config.LOG_LEVEL).toBe('debug');
    expect(config.OTEL_EXPORTER_OTLP_ENDPOINT).toBe('http://localhost:4317');
  });
});
```

#### Implementation:

1. Fix package export paths to match build structure
2. Implement proper environment variable schema
3. Add safeguards against deep imports
4. Create configuration management system

### Task 5: Implement Feature Flags

**Objective**: Add comprehensive feature flag system

#### Test Cases:

```typescript
// tests/feature-flags.test.ts
describe('Feature Flag System', () => {
  it('should manage feature flags through configuration', () => {
    const flags = new FeatureFlagManager({
      'mcp-integration': true,
      'deterministic-mode': false,
      'teaching-layer': true,
    });

    expect(flags.isEnabled('mcp-integration')).toBe(true);
    expect(flags.isEnabled('deterministic-mode')).toBe(false);
  });

  it('should fail closed on unknown flags', () => {
    const flags = new FeatureFlagManager({});

    // Unknown flags should default to false (fail closed)
    expect(flags.isEnabled('unknown-feature')).toBe(false);
  });

  it('should support runtime flag updates', () => {
    const flags = new FeatureFlagManager({
      'test-feature': false,
    });

    expect(flags.isEnabled('test-feature')).toBe(false);

    flags.updateFlag('test-feature', true);
    expect(flags.isEnabled('test-feature')).toBe(true);
  });

  it('should track error budgets per feature', () => {
    const flags = new FeatureFlagManager({
      'error-prone-feature': true,
    });

    // Track errors and disable feature when budget exceeded
    flags.trackError('error-prone-feature');
    flags.trackError('error-prone-feature');
    flags.trackError('error-prone-feature');

    // Should disable feature after 3 errors (default budget)
    expect(flags.isEnabled('error-prone-feature')).toBe(false);
  });
});
```

#### Implementation:

1. Create FeatureFlagManager class
2. Implement fail-closed behavior for unknown flags
3. Add runtime flag updates
4. Implement error budget tracking
5. Add configuration loading from environment

### Task 6: Enhance Telemetry

**Objective**: Implement proper OTEL spans and metrics

#### Test Cases:

```typescript
// tests/telemetry.test.ts
describe('Telemetry Implementation', () => {
  it('should create OTEL spans for each workflow phase', async () => {
    const mockOrchestrator = { getNeuronCount: () => 3 };
    const kernel = new CortexKernel(mockOrchestrator);

    const blueprint = {
      title: 'Telemetry Test',
      description: 'Test OTEL spans',
      requirements: ['Trace execution'],
    };

    const result = await kernel.runPRPWorkflow(blueprint);

    // Should have created spans for each phase
    expect(otelSpans).toContainEqual(
      expect.objectContaining({
        name: 'prp.strategy',
        status: 'OK',
      }),
    );

    expect(otelSpans).toContainEqual(
      expect.objectContaining({
        name: 'prp.build',
        status: 'OK',
      }),
    );

    expect(otelSpans).toContainEqual(
      expect.objectContaining({
        name: 'prp.evaluation',
        status: 'OK',
      }),
    );
  });

  it('should track execution metrics', async () => {
    const mockOrchestrator = { getNeuronCount: () => 3 };
    const kernel = new CortexKernel(mockOrchestrator);

    const blueprint = {
      title: 'Metrics Test',
      description: 'Test metrics tracking',
      requirements: ['Track performance'],
    };

    const result = await kernel.runPRPWorkflow(blueprint);

    // Should track key metrics
    expect(metrics).toContainEqual(
      expect.objectContaining({
        name: 'prp.duration',
        unit: 'milliseconds',
      }),
    );

    expect(metrics).toContainEqual(
      expect.objectContaining({
        name: 'prp.phases.completed',
        value: 3,
      }),
    );
  });

  it('should include error information in spans', async () => {
    const errorOrchestrator = {
      getNeuronCount: () => {
        throw new Error('Simulated error');
      },
    };

    const errorKernel = new CortexKernel(errorOrchestrator);

    const blueprint = {
      title: 'Error Test',
      description: 'Test error telemetry',
      requirements: ['Track errors'],
    };

    const result = await errorKernel.runPRPWorkflow(blueprint);

    // Should include error information in spans
    expect(otelSpans).toContainEqual(
      expect.objectContaining({
        name: 'prp.workflow',
        status: 'ERROR',
        attributes: expect.objectContaining({
          'error.message': 'Simulated error',
        }),
      }),
    );
  });
});
```

#### Implementation:

1. Add OTEL span creation for each workflow phase
2. Implement metrics collection for key performance indicators
3. Add error tracking and reporting
4. Include context information in spans
5. Add trace correlation between phases

## Phase 3: Testing and Security (3-4 days)

### Task 7: Enhance Test Coverage

**Objective**: Achieve comprehensive test coverage

#### Test Cases:

```typescript
// tests/contract-tests.test.ts
describe('Contract Tests', () => {
  it('should maintain backward compatibility', () => {
    // Test that existing API contracts are maintained
    const { CortexKernel, PRPStateSchema } = require('@cortex-os/mvp');
    expect(typeof CortexKernel).toBe('function');
    expect(PRPStateSchema).toBeDefined();
  });

  it('should prevent leakage from core', () => {
    // Ensure no direct access to mvp-core internals
    expect(() => require('@cortex-os/mvp-core/src/internal')).toThrow();
  });
});

// tests/e2e.test.ts
describe('E2E Happy Path + Edge Cases', () => {
  it('should handle complex workflow with all phases', async () => {
    // Test complete workflow with realistic blueprint
  });

  it('should handle edge cases gracefully', async () => {
    // Test error conditions, timeouts, etc.
  });

  it('should maintain state integrity', async () => {
    // Test that state is properly maintained throughout workflow
  });
});

// tests/cli-snapshot.test.ts
describe('CLI Snapshot Tests', () => {
  it('should produce consistent CLI output', async () => {
    // Test CLI commands produce consistent output
  });
});
```

#### Implementation:

1. Add contract tests for API compatibility
2. Implement E2E tests for happy path and edge cases
3. Add CLI snapshot tests
4. Enhance existing test coverage

### Task 8: Security Enhancements

**Objective**: Implement comprehensive security controls

#### Test Cases:

```typescript
// tests/security.test.ts
describe('Security Enhancements', () => {
  it('should enforce security policies', () => {
    const adapter = new MCPAdapter();
    const context = adapter.createContext(mockState, {
      securityPolicy: {
        allowFileSystem: false,
        allowNetwork: false,
        allowExecution: false,
      },
    });

    // Should enforce security policies
    expect(() =>
      adapter.executeTool('file_read', { path: '/etc/passwd' }, 'test-run'),
    ).rejects.toThrow('File system access not allowed');
  });

  it('should encrypt sensitive evidence', () => {
    // Test encryption of sensitive data in evidence
  });

  it('should audit security events', () => {
    // Test security event logging
  });
});
```

#### Implementation:

1. Enhance security policy enforcement
2. Add encryption for sensitive evidence
3. Implement audit logging
4. Add input validation and sanitization

## Success Criteria

### Test Coverage

- ✅ 95%+ code coverage
- ✅ All critical path tests passing
- ✅ Edge case handling verified
- ✅ Security tests implemented

### Reliability

- ✅ Deterministic execution confirmed
- ✅ Type safety verified
- ✅ Error handling validated
- ✅ Boundary contracts maintained

### Performance

- ✅ Workflow execution time < 5 seconds for typical cases
- ✅ Memory usage < 100MB
- ✅ No memory leaks detected

### Security

- ✅ All security policies enforced
- ✅ No unauthorized access paths
- ✅ Data encryption for sensitive information
- ✅ Audit logging implemented

By following this TDD plan, the MVP package should achieve ≥90% readiness for autonomous operation.
