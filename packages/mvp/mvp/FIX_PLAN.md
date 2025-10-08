# MVP Package Fix Plan

## Overview

This document outlines the specific fixes needed to address the critical issues identified in the MVP package audit and achieve ≥90% readiness.

## Priority 1: Critical Fixes (1-2 days)

### Fix 1: Type Safety Violations

#### Issues Identified:

1. MCP adapter creates Sub-agent objects with incomplete interface implementation
2. Missing execute method in Sub-agent objects
3. Interface mismatch with prp-runner

#### Implementation Steps:

1. **Update Sub-agent Interface** (`src/mcp/adapter.ts`):

```typescript
// Add missing properties to Sub-agent interface
interface Sub-agent {
  id: string;
  role: string;
  phase: 'strategy' | 'build' | 'evaluation';
  dependencies: string[];
  tools: string[];
  requiresLLM?: boolean;
  execute(state: any, context: any): Promise<NeuronResult>;
}
```

2. **Fix createNeuronFromTool Method**:

```typescript
createNeuronFromTool(tool: MCPTool, phase: 'strategy' | 'build' | 'evaluation'): Sub-agent {
  return {
    id: `mcp-${tool.name}`,
    role: `mcp-tool-${tool.name}`,
    phase,
    dependencies: [],
    tools: [tool.name],
    requiresLLM: false,
    execute: async (state: PRPState, context: any) => {
      // Proper implementation with error handling
      try {
        const mcpContext = this.createContext(state, {
          workingDirectory: context.workingDirectory,
        });

        const params = this.extractToolParams(state.blueprint, tool);
        const execution = await this.executeTool(tool.name, params, state.runId);

        return {
          output: {
            toolName: tool.name,
            result: execution.result,
            mcpIntegration: true,
          },
          evidence: [{
            id: `mcp-${tool.name}-${Date.now()}`,
            type: 'command',
            source: `mcp-${tool.name}`,
            content: JSON.stringify(execution.evidence),
            timestamp: new Date().toISOString(),
            phase,
          }],
          nextSteps: [`Review ${tool.name} output`],
          artifacts: [],
          metrics: {
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            duration: 0,
            toolsUsed: [tool.name],
            filesCreated: 0,
            filesModified: 0,
            commandsExecuted: 1,
          },
        };
      } catch (error) {
        throw new Error(`Sub-agent execution failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  };
}
```

### Fix 2: Deterministic Execution

#### Issues Identified:

1. Non-deterministic ID generation using Date.now()
2. Timing dependencies with setTimeout
3. Non-deterministic timestamps

#### Implementation Steps:

1. **Add Deterministic Flag to runPRPWorkflow** (`src/graph-simple.ts`):

```typescript
interface RunOptions {
  runId?: string;
  deterministic?: boolean;
}

async runPRPWorkflow(blueprint: Blueprint, options: RunOptions = {}): Promise<PRPState> {
  const runId = options.runId || (options.deterministic
    ? `prp-deterministic-${Math.abs(JSON.stringify(blueprint).split('').reduce((a,b) => ((a << 5) - a + b.charCodeAt(0))|0, 0))}`
    : nanoid());

  const deterministic = options.deterministic || false;
  const state = createInitialPRPState(blueprint, { runId, deterministic });

  // Rest of implementation...
}
```

2. **Update createInitialPRPState** (`src/state.ts`):

```typescript
export const createInitialPRPState = (
  blueprint: PRPState['blueprint'],
  options: {
    id?: string;
    runId?: string;
    deterministic?: boolean;
  } = {},
): PRPState => {
  const now = options.deterministic ? '2025-01-01T00:00:00.000Z' : new Date().toISOString();

  const id =
    options.id ??
    (options.deterministic
      ? `prp-${Math.abs(
          JSON.stringify(blueprint)
            .split('')
            .reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0),
        )}`
      : `prp-${nanoid()}`);

  const runId =
    options.runId ??
    (options.deterministic
      ? `run-${Math.abs(
          JSON.stringify(blueprint)
            .split('')
            .reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0),
        )}`
      : `run-${nanoid()}`);

  return {
    id,
    runId,
    phase: 'strategy',
    blueprint,
    outputs: {},
    validationResults: {},
    evidence: [],
    metadata: {
      startTime: now,
      llmConfig: options.llmConfig,
    },
  };
};
```

3. **Update simulateWork Method** (`src/graph-simple.ts`):

```typescript
private async simulateWork(ms: number, options?: { deterministic?: boolean }): Promise<void> {
  if (options?.deterministic) {
    return Promise.resolve(); // Skip timing in deterministic mode
  }
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Fix 3: Validation Logic Errors

#### Issues Identified:

1. Incorrect boolean logic in API validation
2. Incorrect cerebrum decision logic using "||" instead of "&&"

#### Implementation Steps:

1. **Fix API Validation Logic** (`src/nodes/build.ts`):

```typescript
private async validateAPISchema(state: PRPState): Promise<{ passed: boolean; details: any }> {
  const hasAPI = state.blueprint.requirements?.some(req =>
    req.toLowerCase().includes('api') ||
    req.toLowerCase().includes('endpoint')
  );

  if (!hasAPI) {
    return {
      passed: true,
      details: {
        schemaFormat: 'N/A',
        validation: 'skipped',
      },
    };
  }

  // Check if schema exists
  const hasSchema = state.outputs?.['api-schema'] !== undefined;

  return {
    passed: hasSchema, // Properly fail when schema is missing
    details: {
      schemaFormat: hasSchema ? 'OpenAPI 3.0' : 'missing',
      validation: hasSchema ? 'passed' : 'failed',
    },
  };
}
```

2. **Fix Cerebrum Decision Logic** (`src/nodes/evaluation.ts`):

```typescript
private checkPreCerebrumConditions(state: PRPState): boolean {
  const strategyPassed = state.validationResults.strategy?.passed ?? false;
  const buildPassed = state.validationResults.build?.passed ?? false;
  const evaluationPassed = state.validationResults.evaluation?.passed ?? false;

  // Use && instead of || to require ALL phases to pass
  return strategyPassed && buildPassed && evaluationPassed;
}
```

## Priority 2: Boundary and Configuration (2-3 days)

### Fix 4: Establish Proper Boundaries with MVP-Core

#### Issues Identified:

1. Package export path mismatch
2. Missing environment configuration schema
3. No safeguards against deep imports

#### Implementation Steps:

1. **Fix Package Export Paths** (`package.json`):

```json
{
  "name": "@cortex-os/mvp",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "test:ci": "vitest run --coverage --reporter=verbose"
  }
}
```

2. **Create Environment Configuration Schema** (`src/config/env.ts`):

```typescript
import { z } from 'zod';
import { loadEnv as loadCoreEnv } from '@cortex-os/mvp-core';

// MVP-specific environment variables
export const mvpEnvSchema = z.object({
  MVP_DETERMINISTIC_MODE: z.enum(['true', 'false']).default('false'),
  MVP_FEATURE_FLAGS: z.string().optional(),
  MVP_ERROR_BUDGET: z.number().min(0).max(100).default(5),
  MVP_TELEMETRY_ENABLED: z.enum(['true', 'false']).default('true'),
});

export type MvpEnv = z.infer<typeof mvpEnvSchema>;

export function loadMvpEnv(src: NodeJS.ProcessEnv = process.env) {
  const coreEnv = loadCoreEnv(src);
  const mvpEnv = mvpEnvSchema.parse(src);

  return {
    ...coreEnv,
    ...mvpEnv,
  };
}
```

3. **Add Deep Import Safeguards** (`src/index.ts`):

```typescript
// Export only public API
export {
  CortexKernel,
  type PRPState,
  type Evidence,
  type ValidationGate,
  type CerebrumDecision,
  PRPStateSchema,
  validateStateTransition,
  createInitialPRPState,
  StrategyNode,
  BuildNode,
  EvaluationNode,
  MCPAdapter,
  type MCPTool,
  type MCPContext,
  createDefaultMCPTools,
  ExampleCaptureSystem,
  type CapturedExample,
  type TeachingPattern,
  BehaviorExtensionManager,
  type BehaviorExtension,
  type ExtensionContext,
  type ExtensionResult,
} from './public-api.js'; // Create public-api.ts with only exported types
```

### Fix 5: Implement Feature Flags

#### Issues Identified:

1. No feature flag system
2. No runtime configuration management
3. No error budget implementation

#### Implementation Steps:

1. **Create FeatureFlagManager** (`src/config/feature-flags.ts`):

```typescript
export class FeatureFlagManager {
  private flags: Map<string, boolean>;
  private errorCounts: Map<string, number>;
  private errorBudgets: Map<string, number>;

  constructor(initialFlags: Record<string, boolean> = {}) {
    this.flags = new Map(Object.entries(initialFlags));
    this.errorCounts = new Map();
    this.errorBudgets = new Map();
  }

  isEnabled(flagName: string): boolean {
    // Fail closed on unknown flags
    return this.flags.get(flagName) ?? false;
  }

  updateFlag(flagName: string, enabled: boolean): void {
    this.flags.set(flagName, enabled);
  }

  trackError(flagName: string): void {
    const currentErrors = this.errorCounts.get(flagName) ?? 0;
    const newErrorCount = currentErrors + 1;
    this.errorCounts.set(flagName, newErrorCount);

    const budget = this.errorBudgets.get(flagName) ?? 5; // Default budget
    if (newErrorCount >= budget) {
      this.flags.set(flagName, false); // Disable feature when budget exceeded
    }
  }

  setErrorBudget(flagName: string, budget: number): void {
    this.errorBudgets.set(flagName, budget);
  }

  static fromEnv(env: NodeJS.ProcessEnv = process.env): FeatureFlagManager {
    const flags: Record<string, boolean> = {};

    // Parse feature flags from environment
    if (env.MVP_FEATURE_FLAGS) {
      env.MVP_FEATURE_FLAGS.split(',').forEach((flag) => {
        const [name, value] = flag.split('=');
        flags[name] = value === 'true';
      });
    }

    return new FeatureFlagManager(flags);
  }
}
```

2. **Integrate Feature Flags with Kernel** (`src/graph-simple.ts`):

```typescript
export class CortexKernel {
  private orchestrator: PRPOrchestrator;
  private executionHistory: Map<string, PRPState[]> = new Map();
  private featureFlags: FeatureFlagManager;

  constructor(orchestrator: PRPOrchestrator, featureFlags?: FeatureFlagManager) {
    this.orchestrator = orchestrator;
    this.featureFlags = featureFlags ?? FeatureFlagManager.fromEnv();
  }

  // Use feature flags in workflow execution
  async runPRPWorkflow(blueprint: Blueprint, options: RunOptions = {}): Promise<PRPState> {
    // Check if deterministic mode is enabled via feature flag
    const deterministic =
      options.deterministic || this.featureFlags.isEnabled('deterministic-mode');

    // Rest of implementation...
  }
}
```

### Fix 6: Enhance Telemetry

#### Issues Identified:

1. Missing OTEL spans
2. No metrics collection
3. Limited traceability

#### Implementation Steps:

1. **Add OTEL Integration** (`src/telemetry/tracer.ts`):

```typescript
import { trace, Span, SpanStatusCode } from '@opentelemetry/api';
import { loadEnv } from '@cortex-os/mvp-core';

const tracer = trace.getTracer('mvp-kernel');

export function createWorkflowSpan(name: string, attributes: Record<string, any> = {}): Span {
  const span = tracer.startSpan(name, { attributes });
  return span;
}

export function recordWorkflowMetrics(duration: number, phases: number, errors: number): void {
  // In a real implementation, this would send metrics to a monitoring system
  console.log(`Workflow Metrics: Duration=${duration}ms, Phases=${phases}, Errors=${errors}`);
}

export function recordError(span: Span, error: Error): void {
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error.message,
  });
  span.setAttribute('error.message', error.message);
  span.setAttribute('error.stack', error.stack || '');
}
```

2. **Integrate Telemetry with Kernel** (`src/graph-simple.ts`):

```typescript
import { createWorkflowSpan, recordWorkflowMetrics, recordError } from './telemetry/tracer.js';

async runPRPWorkflow(blueprint: Blueprint, options: RunOptions = {}): Promise<PRPState> {
  const startTime = Date.now();
  const workflowSpan = createWorkflowSpan('prp.workflow', {
    'workflow.runId': options.runId,
    'workflow.deterministic': options.deterministic,
  });

  try {
    // Existing implementation...

    const endTime = Date.now();
    const duration = endTime - startTime;

    workflowSpan.setAttribute('workflow.duration', duration);
    workflowSpan.setAttribute('workflow.phases', 3); // Strategy, Build, Evaluation
    workflowSpan.setAttribute('workflow.errors', 0);

    workflowSpan.end();
    recordWorkflowMetrics(duration, 3, 0);

    return finalState;
  } catch (error) {
    recordError(workflowSpan, error as Error);
    workflowSpan.setAttribute('workflow.errors', 1);
    workflowSpan.end();

    recordWorkflowMetrics(Date.now() - startTime, 0, 1);
    throw error;
  }
}
```

## Priority 3: Testing and Security (3-4 days)

### Fix 7: Enhance Test Coverage

#### Issues Identified:

1. Need comprehensive contract tests
2. Missing E2E tests
3. No CLI snapshot tests

#### Implementation Steps:

1. **Add Contract Tests** (`tests/contract-tests.test.ts`):

```typescript
import { describe, it, expect } from 'vitest';
import { CortexKernel, PRPStateSchema } from '../src/index.js';
import { loadEnv } from '@cortex-os/mvp-core';

describe('Contract Tests', () => {
  it('should maintain backward compatibility', () => {
    expect(typeof CortexKernel).toBe('function');
    expect(PRPStateSchema).toBeDefined();
  });

  it('should prevent leakage from core', async () => {
    await expect(import('@cortex-os/mvp-core/src/internal')).rejects.toThrow();
  });

  it('should use environment configuration correctly', () => {
    const env = loadEnv({
      NODE_ENV: 'test',
      LOG_LEVEL: 'debug',
    });

    expect(env.NODE_ENV).toBe('test');
    expect(env.LOG_LEVEL).toBe('debug');
  });
});
```

2. **Add E2E Tests** (`tests/e2e.test.ts`):

```typescript
import { describe, it, expect } from 'vitest';
import { CortexKernel } from '../src/graph-simple.js';

describe('E2E Tests', () => {
  it('should handle complex workflow with all phases', async () => {
    const mockOrchestrator = { getNeuronCount: () => 5 };
    const kernel = new CortexKernel(mockOrchestrator);

    const blueprint = {
      title: 'Complex Project',
      description: 'A project with multiple requirements',
      requirements: [
        'REST API with OpenAPI schema',
        'Frontend with React components',
        'Database integration with security',
        'Comprehensive documentation',
        'Automated testing suite',
      ],
    };

    const result = await kernel.runPRPWorkflow(blueprint);

    expect(result.phase).toBe('completed');
    expect(result.validationResults.strategy?.passed).toBe(true);
    expect(result.validationResults.build?.passed).toBe(true);
    expect(result.validationResults.evaluation?.passed).toBe(true);
    expect(result.cerebrum?.decision).toBe('promote');
  });

  it('should handle edge cases gracefully', async () => {
    const errorOrchestrator = {
      getNeuronCount: () => {
        throw new Error('Simulated orchestrator error');
      },
    };

    const errorKernel = new CortexKernel(errorOrchestrator);

    const blueprint = {
      title: 'Error Handling Test',
      description: 'Test graceful error handling',
      requirements: ['Error simulation'],
    };

    const result = await errorKernel.runPRPWorkflow(blueprint);

    // Should complete but may recycle due to error
    expect(['completed', 'recycled']).toContain(result.phase);
    expect(result.metadata.error).toBeDefined();
  });
});
```

### Fix 8: Security Enhancements

#### Issues Identified:

1. Need enhanced security policy enforcement
2. Missing data encryption
3. No audit logging

#### Implementation Steps:

1. **Enhance Security Policies** (`src/security/policy.ts`):

```typescript
export interface SecurityPolicy {
  allowFileSystem: boolean;
  allowNetwork: boolean;
  allowExecution: boolean;
  maxFileSize?: number;
  allowedPaths?: string[];
  encryptedEvidence?: boolean;
}

export class SecurityManager {
  private policy: SecurityPolicy;

  constructor(policy: Partial<SecurityPolicy> = {}) {
    this.policy = {
      allowFileSystem: true,
      allowNetwork: false,
      allowExecution: true,
      ...policy,
    };
  }

  enforceFileSystemAccess(path: string): void {
    if (!this.policy.allowFileSystem) {
      throw new Error('File system access not allowed by security policy');
    }

    if (this.policy.allowedPaths) {
      const isAllowed = this.policy.allowedPaths.some((allowedPath) =>
        path.startsWith(allowedPath),
      );

      if (!isAllowed) {
        throw new Error(`Access to path ${path} not allowed by security policy`);
      }
    }

    if (this.policy.maxFileSize) {
      // In a real implementation, check file size
    }
  }

  enforceNetworkAccess(url: string): void {
    if (!this.policy.allowNetwork) {
      throw new Error('Network access not allowed by security policy');
    }
  }

  enforceCodeExecution(): void {
    if (!this.policy.allowExecution) {
      throw new Error('Code execution not allowed by security policy');
    }
  }

  shouldEncryptEvidence(): boolean {
    return this.policy.encryptedEvidence ?? false;
  }
}
```

2. **Integrate Security with MCP Adapter** (`src/mcp/adapter.ts`):

```typescript
import { SecurityManager, SecurityPolicy } from '../security/policy.js';

export class MCPAdapter {
  private tools: Map<string, MCPTool> = new Map();
  private contexts: Map<string, MCPContext> = new Map();
  private securityManager: SecurityManager;

  constructor(securityPolicy?: Partial<SecurityPolicy>) {
    this.securityManager = new SecurityManager(securityPolicy);
  }

  async executeTool(
    toolName: string,
    params: any,
    runId: string,
  ): Promise<{
    result: any;
    evidence: {
      toolName: string;
      params: any;
      result: any;
      timestamp: string;
    };
  }> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`MCP tool not found: ${toolName}`);
    }

    const context = this.contexts.get(runId);
    if (!context) {
      throw new Error(`MCP context not found for run: ${runId}`);
    }

    if (!context.toolsEnabled.includes(toolName)) {
      throw new Error(`MCP tool enabled: ${toolName}`);
    }

    try {
      // Enforce security policies based on tool type
      if (tool.name.includes('file')) {
        this.securityManager.enforceFileSystemAccess(params.path);
      }

      if (tool.name.includes('network')) {
        this.securityManager.enforceNetworkAccess(params.url);
      }

      if (tool.name.includes('execute')) {
        this.securityManager.enforceCodeExecution();
      }

      const result = await tool.execute(params, context);

      let evidenceData = {
        toolName,
        params,
        result,
        timestamp: new Date().toISOString(),
      };

      // Encrypt sensitive evidence if required
      if (this.securityManager.shouldEncryptEvidence()) {
        evidenceData = this.encryptEvidence(evidenceData);
      }

      return { result, evidence: evidenceData };
    } catch (error) {
      throw new Error(
        `MCP tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private encryptEvidence(evidence: any): any {
    // In a real implementation, this would encrypt the evidence
    // For now, we'll just mark it as encrypted
    return {
      ...evidence,
      encrypted: true,
    };
  }
}
```

## Verification Plan

### Test Execution

1. Run all existing tests to ensure no regressions
2. Execute new contract tests
3. Run E2E tests with complex scenarios
4. Verify deterministic execution
5. Test security policy enforcement

### Code Review

1. Review all changes for type safety
2. Verify boundary contracts with mvp-core
3. Check feature flag implementation
4. Validate telemetry integration

### Performance Testing

1. Measure workflow execution time
2. Monitor memory usage
3. Test concurrent workflow execution
4. Verify deterministic mode performance

### Security Testing

1. Test security policy enforcement
2. Verify error handling
3. Check data encryption
4. Validate audit logging

By implementing these fixes, the MVP package should achieve the target ≥90% readiness for autonomous operation.
