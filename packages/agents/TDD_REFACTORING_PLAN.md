# TDD Implementation Plan: packages/agents Refactoring

## Executive Summary

This document outlines a comprehensive TDD approach to fix critical issues in the packages/agents codebase, focusing on removing broken dependencies, eliminating backward-compatibility code, and implementing proper MLX integration.

## Critical Issues Identified

### 1. **Broken Dependencies (Blocker)**
- `CortexAgent.ts` imports 15+ non-existent modules
- MLX source files missing (only exist in `dist/`)
- `tools/`, `subagents/`, and `utils/` directories missing from source

### 2. **Backward-Compatibility Code to Remove**
- Duplicate type definitions in `types.ts` and `lib/types.ts`
- Placeholder implementations in `CortexAgent.ts`
- Mock A2A implementation in `a2a.ts`
- Hardcoded model configurations

### 3. **Missing MLX Implementation**
- Source files for MLX provider missing
- No actual MLX model execution logic
- Only configuration references, no real integration

## TDD Implementation Strategy

### Phase 1: Fix Broken Dependencies (Critical)

#### 1.1 Create Failing Tests for Broken Imports

```typescript
// __tests__/CortexAgent.imports.test.ts
describe('CortexAgent Dependencies', () => {
  it('should import without errors', () => {
    expect(() => import('../src/CortexAgent')).not.toThrow();
  });

  it('should export expected interface', async () => {
    const { CortexAgent } = await import('../src/CortexAgent');
    expect(typeof CortexAgent).toBe('function');
  });
});
```

#### 1.2 Minimal Viable CortexAgent Implementation

```typescript
// src/CortexAgent.ts (Refactored)
export interface CortexAgentConfig {
  name: string;
  model?: string;
  enableMLX?: boolean;
  memoryConfig?: MemoryConfig;
}

export class CortexAgent {
  private config: CortexAgentConfig;
  private memory?: MemoryStore;

  constructor(config: CortexAgentConfig) {
    this.config = config;
  }

  async execute(input: string): Promise<{ result: string; success: boolean }> {
    try {
      // Minimal implementation for now
      return {
        result: `Processed: ${input}`,
        success: true,
      };
    } catch (error) {
      throw new AgentError(
        `Execution failed: ${error instanceof Error ? error.message : String(error)}`,
        'EXECUTION_ERROR',
        true
      );
    }
  }
}
```

#### 1.3 Create Missing MLX Source Files

```typescript
// src/utils/mlxConfig.ts
export interface MLXConfig {
  model: string;
  thermalThreshold?: number;
  maxTokens?: number;
}

export function loadMLXConfig(): MLXConfig {
  return {
    model: process.env.MLX_MODEL || 'glm-4.5-mlx',
    thermalThreshold: Number(process.env.MLX_THERMAL_THRESHOLD) || 80,
    maxTokens: Number(process.env.MLX_MAX_TOKENS) || 4096,
  };
}
```

### Phase 2: Remove Backward-Compatibility Code

#### 2.1 Consolidate Type Definitions

```typescript
// src/lib/types.ts (Consolidated)
export interface AgentConfig {
  name: string;
  model: string;
  model_targets?: string[];
  enableMLX?: boolean;
}

export interface MemoryConfig {
  store: 'memory' | 'sqlite' | 'local';
  namespace?: string;
}

export interface ToolConfig {
  name: string;
  schema: Record<string, unknown>;
  handler: (params: unknown) => Promise<unknown>;
}

// Remove duplicate types from types.ts
```

#### 2.2 Remove Mock Implementations

```typescript
// src/a2a.ts (Real Implementation)
import { createEventBus, type EventBus } from '@cortex-os/a2a-core';

export const bus = createEventBus({
  serviceName: 'agents',
  eventStore: 'memory',
});

export { bus as agentsBus };
```

#### 2.3 Replace Hardcoded Configurations

```typescript
// src/config/agents.ts
export const DEFAULT_AGENTS = [
  {
    id: 'code-analysis',
    name: 'Code Analysis Agent',
    model: process.env.CODE_ANALYSIS_MODEL || 'glm-4.5-mlx',
    skills: ['analyze_code', 'security_scan'],
  },
  // Move other agents to config
];
```

### Phase 3: Implement Proper Error Handling

#### 3.1 Global Error Handlers

```typescript
// src/errors/globalHandlers.ts
export function setupGlobalErrorHandlers(): void {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', { reason, promise });
    process.exit(1);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
}
```

#### 3.2 Error Boundary for Event Handlers

```typescript
// src/a2a/EventBoundary.ts
export class EventBoundary {
  private handlers: Map<string, Function[]> = new Map();

  on(event: string, handler: Function): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  async emit(event: string, data: unknown): Promise<void> {
    const eventHandlers = this.handlers.get(event) || [];
    const errors: Error[] = [];

    for (const handler of eventHandlers) {
      try {
        await handler(data);
      } catch (error) {
        errors.push(error as Error);
        logger.error(`Error in ${event} handler:`, error);
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(errors, `Multiple errors in ${event} handlers`);
    }
  }
}
```

### Phase 4: Simplify Complex Classes

#### 4.1 Split AgentsAgent Class

```typescript
// src/agents/AgentCardBuilder.ts
export class AgentCardBuilder {
  buildAgentCard(agent: AgentConfig): A2ACard {
    return {
      id: agent.id,
      name: agent.name,
      capabilities: agent.skills.map(skill => ({
        name: skill,
        input: this.getSchemaForSkill(skill),
        output: { type: 'object' }
      }))
    };
  }

  private getSchemaForSkill(skill: string): Record<string, unknown> {
    // Return schema based on skill
  }
}
```

```typescript
// src/agents/AgentCoordinator.ts
export class AgentCoordinator {
  private agents: Map<string, Agent> = new Map();

  async coordinate(request: CoordinationRequest): Promise<CoordinationResponse> {
    const agents = this.selectAgentsForTask(request.task);
    const results = await Promise.allSettled(
      agents.map(agent => agent.execute(request.input))
    );

    return this.aggregateResults(results);
  }
}
```

#### 4.2 Implement Registry Pattern

```typescript
// src/handlers/MessageHandlerRegistry.ts
export class MessageHandlerRegistry {
  private handlers = new Map<string, (params: unknown) => Promise<unknown>>();

  register(action: string, handler: (params: unknown) => Promise<unknown>): void {
    this.handlers.set(action, handler);
  }

  async handle(action: string, params: unknown): Promise<unknown> {
    const handler = this.handlers.get(action);
    if (!handler) {
      throw new AgentError(`Unknown action: ${action}`, 'UNKNOWN_ACTION', false);
    }
    return handler(params);
  }
}
```

### Phase 5: Implement Real MLX Integration

#### 5.1 MLX Provider Implementation

```typescript
// src/providers/MLXProvider.ts
export class MLXProvider {
  private config: MLXConfig;
  private thermalMonitor: ThermalMonitor;

  constructor(config: MLXConfig) {
    this.config = config;
    this.thermalMonitor = new ThermalMonitor(config.thermalThreshold);
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    if (!await this.thermalMonitor.checkTemperature()) {
      throw new AgentError('Thermal threshold exceeded', 'THERMAL_LIMIT', true);
    }

    // Real MLX implementation here
    const response = await this.callMLXModel(prompt, options);
    return response;
  }

  private async callMLXModel(prompt: string, options?: GenerateOptions): Promise<string> {
    // Actual MLX model call implementation
  }
}
```

#### 5.2 Model Router with Fallback

```typescript
// src/utils/modelRouter.ts
export async function routeRequest(
  config: AgentConfig,
  prompt: string
): Promise<string> {
  // Try MLX first if enabled
  if (config.enableMLX && config.model?.includes('mlx')) {
    try {
      const mlxProvider = new MLXProvider(loadMLXConfig());
      return await mlxProvider.generate(prompt);
    } catch (error) {
      logger.warn('MLX failed, falling back to cloud model', error);
    }
  }

  // Fallback to cloud models
  return await callCloudModel(config.model || 'gpt-4o-mini', prompt);
}
```

## Test Implementation Plan

### 1. Unit Tests for Each Component
```typescript
// __tests__/CortexAgent.test.ts
describe('CortexAgent', () => {
  let agent: CortexAgent;

  beforeEach(() => {
    agent = new CortexAgent({ name: 'test-agent' });
  });

  describe('execute', () => {
    it('should process input successfully', async () => {
      const result = await agent.execute('test input');
      expect(result.success).toBe(true);
      expect(result.result).toContain('test input');
    });

    it('should handle execution errors', async () => {
      // Mock failure scenario
      jest.spyOn(agent, 'execute').mockRejectedValue(new Error('Test error'));

      await expect(agent.execute('test')).rejects.toThrow(AgentError);
    });
  });
});
```

### 2. Integration Tests for MLX
```typescript
// __tests__/MLXProvider.integration.test.ts
describe('MLXProvider Integration', () => {
  let provider: MLXProvider;

  beforeAll(() => {
    provider = new MLXProvider({
      model: 'glm-4.5-mlx',
      thermalThreshold: 90
    });
  });

  it('should generate response from MLX model', async () => {
    const response = await provider.generate('Hello, world!');
    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(0);
  }, 30000);
});
```

### 3. Error Handling Tests
```typescript
// __tests__/errors/ErrorHandler.test.ts
describe('Error Handling', () => {
  it('should wrap unknown errors properly', () => {
    const error = wrapUnknownError('Unknown error');
    expect(error).toBeInstanceOf(AgentError);
    expect(error.code).toBe('UNKNOWN_ERROR');
  });

  it('should handle unhandled rejections', (done) => {
    const mockListener = jest.fn();
    process.on('unhandledRejection', mockListener);

    // Trigger unhandled rejection
    Promise.reject(new Error('Test error'));

    setTimeout(() => {
      expect(mockListener).toHaveBeenCalled();
      done();
    }, 100);
  });
});
```

## Implementation Order

1. **Week 1**: Fix broken dependencies and create minimal working implementation
2. **Week 2**: Remove backward-compatibility code and consolidate types
3. **Week 3**: Implement proper error handling and global boundaries
4. **Week 4**: Simplify complex classes and implement registry patterns
5. **Week 5**: Implement real MLX integration with proper tests

## Success Criteria

1. All tests pass with 90% coverage
2. No broken imports or missing dependencies
3. MLX integration works end-to-end
4. Error handling prevents crashes
5. Code follows Single Responsibility Principle
6. No backward-compatibility code remains

## Rollback Plan

1. Keep `dist/` directory untouched during refactoring
2. Create feature branch for each phase
3. Maintain backward-compatibility at API level
4. Document breaking changes in release notes