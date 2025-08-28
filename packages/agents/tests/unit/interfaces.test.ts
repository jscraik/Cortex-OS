import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent, Executor, BasicExecutor, createExecutor } from '@/index.js';
import { mockAgent, mockTask } from '@tests/fixtures/agents.js';
import { MockFactory } from '@tests/utils/test-helpers.js';

describe('Agent Interface', () => {
  it('should have required properties', () => {
    expect(mockAgent).toHaveProperty('id');
    expect(mockAgent).toHaveProperty('name');
    expect(mockAgent).toHaveProperty('capabilities');
    expect(typeof mockAgent.id).toBe('string');
    expect(typeof mockAgent.name).toBe('string');
    expect(Array.isArray(mockAgent.capabilities)).toBe(true);
  });

  it('should validate agent id format', () => {
    expect(mockAgent.id).toMatch(/^[a-zA-Z0-9-]+$/);
    expect(mockAgent.id.length).toBeGreaterThan(0);
  });

  it('should validate capabilities array', () => {
    expect(mockAgent.capabilities.length).toBeGreaterThan(0);
    mockAgent.capabilities.forEach(capability => {
      expect(typeof capability).toBe('string');
      expect(capability.length).toBeGreaterThan(0);
    });
  });

  it('should handle edge cases', () => {
    const emptyCapabilitiesAgent: Agent = {
      id: 'test-agent',
      name: 'Test Agent',
      capabilities: []
    };
    expect(emptyCapabilitiesAgent.capabilities).toEqual([]);
  });
});

describe('Executor Interface', () => {
  let executor: Executor;

  beforeEach(() => {
    executor = new BasicExecutor();
  });

  it('should implement run method', () => {
    expect(executor).toHaveProperty('run');
    expect(typeof executor.run).toBe('function');
  });

  it('should accept correct parameters', async () => {
    const result = await executor.run(mockAgent, mockTask);
    expect(result).toBeDefined();
  });

  it('should validate task structure', () => {
    expect(mockTask).toHaveProperty('id');
    expect(mockTask).toHaveProperty('kind');
    expect(mockTask).toHaveProperty('input');
    expect(mockTask).toHaveProperty('budget');
    expect(mockTask.budget).toHaveProperty('wallClockMs');
    expect(mockTask.budget).toHaveProperty('maxSteps');
  });

  it('should handle missing task properties gracefully', async () => {
    const incompleteTask = { id: 'test', kind: 'test' };
    // Should not throw, but handle gracefully
    const result = await executor.run(mockAgent, incompleteTask as any);
    expect(result).toBeDefined();
  });
});

describe('BasicExecutor', () => {
  let executor: BasicExecutor;

  beforeEach(() => {
    executor = new BasicExecutor();
    vi.clearAllMocks();
  });

  it('should create instance successfully', () => {
    expect(executor).toBeInstanceOf(BasicExecutor);
  });

  it('should execute task and return result', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const result = await executor.run(mockAgent, mockTask);

    expect(result).toEqual({
      status: 'completed',
      result: mockTask.input,
      agent: mockAgent.id
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      `Agent ${mockAgent.id} executing task ${mockTask.id}:`,
      mockTask.input
    );
  });

  it('should handle different task types', async () => {
    const tasks = [
      { id: 'task-1', kind: 'analysis', input: 'test', budget: { wallClockMs: 1000, maxSteps: 5 } },
      { id: 'task-2', kind: 'processing', input: { data: 'complex' }, budget: { wallClockMs: 2000, maxSteps: 10 } },
      { id: 'task-3', kind: 'validation', input: null, budget: { wallClockMs: 500, maxSteps: 3 } }
    ];

    for (const task of tasks) {
      const result = await executor.run(mockAgent, task);
      expect(result.status).toBe('completed');
      expect(result.result).toEqual(task.input);
      expect(result.agent).toBe(mockAgent.id);
    }
  });

  it('should handle agent variations', async () => {
    const agents = [
      { id: 'agent-1', name: 'Agent One', capabilities: ['cap1'] },
      { id: 'agent-2', name: 'Agent Two', capabilities: ['cap1', 'cap2'] },
      { id: 'agent-3', name: 'Agent Three', capabilities: [] }
    ];

    for (const agent of agents) {
      const result = await executor.run(agent, mockTask);
      expect(result.agent).toBe(agent.id);
    }
  });

  it('should preserve task input exactly', async () => {
    const complexInput = {
      nested: { data: 'value' },
      array: [1, 2, 3],
      boolean: true,
      nullValue: null,
      undefinedValue: undefined
    };

    const task = { ...mockTask, input: complexInput };
    const result = await executor.run(mockAgent, task);

    expect(result.result).toEqual(complexInput);
  });

  it('should handle execution timing', async () => {
    const startTime = Date.now();
    await executor.run(mockAgent, mockTask);
    const executionTime = Date.now() - startTime;

    // Execution should be fast (< 100ms for simple task)
    expect(executionTime).toBeLessThan(100);
  });

  it('should handle concurrent executions', async () => {
    const tasks = Array.from({ length: 5 }, (_, i) => ({
      id: `concurrent-task-${i}`,
      kind: 'concurrent',
      input: `data-${i}`,
      budget: { wallClockMs: 1000, maxSteps: 5 }
    }));

    const promises = tasks.map(task => executor.run(mockAgent, task));
    const results = await Promise.all(promises);

    expect(results).toHaveLength(5);
    results.forEach((result, index) => {
      expect(result.status).toBe('completed');
      expect(result.result).toBe(`data-${index}`);
    });
  });

  it('should work with mocked dependencies', async () => {
    const mockExecutor = MockFactory.createFetchMock({ success: true });
    
    // Test that our executor works independently of external dependencies
    const result = await executor.run(mockAgent, mockTask);
    expect(result).toBeDefined();
    expect(result.status).toBe('completed');
  });

  it('should handle budget constraints validation', async () => {
    const budgetedTask = {
      ...mockTask,
      budget: { wallClockMs: 10000, maxSteps: 100 }
    };

    const result = await executor.run(mockAgent, budgetedTask);
    expect(result).toBeDefined();
    
    // Should complete within budget (simple implementation doesn't enforce budget)
    expect(result.status).toBe('completed');
  });

  it('should maintain consistent output format', async () => {
    const result = await executor.run(mockAgent, mockTask);

    // Verify output schema
    expect(result).toMatchObject({
      status: expect.any(String),
      result: expect.anything(),
      agent: expect.any(String)
    });

    expect(['completed', 'failed', 'timeout'].includes(result.status)).toBe(true);
  });
});

describe('createExecutor Factory', () => {
  it('should create BasicExecutor instance', () => {
    const executor = createExecutor();
    expect(executor).toBeInstanceOf(BasicExecutor);
  });

  it('should create independent instances', () => {
    const executor1 = createExecutor();
    const executor2 = createExecutor();
    
    expect(executor1).not.toBe(executor2);
    expect(executor1).toBeInstanceOf(BasicExecutor);
    expect(executor2).toBeInstanceOf(BasicExecutor);
  });

  it('should create functional executors', async () => {
    const executor = createExecutor();
    const result = await executor.run(mockAgent, mockTask);
    
    expect(result.status).toBe('completed');
    expect(result.agent).toBe(mockAgent.id);
  });
});

describe('Interface Compliance', () => {
  it('should ensure Agent interface compliance', () => {
    const agent: Agent = mockAgent;
    
    // TypeScript compile-time check
    expect(agent.id).toBeDefined();
    expect(agent.name).toBeDefined();
    expect(agent.capabilities).toBeDefined();
  });

  it('should ensure Executor interface compliance', async () => {
    const executor: Executor = new BasicExecutor();
    
    // TypeScript compile-time check - run method exists and works
    const result = await executor.run(mockAgent, mockTask);
    expect(result).toBeDefined();
  });

  it('should validate return types', async () => {
    const executor = new BasicExecutor();
    const result = await executor.run(mockAgent, mockTask);
    
    // Ensure return type matches expected structure
    expect(typeof result).toBe('object');
    expect(result).not.toBeNull();
    expect('status' in result).toBe(true);
    expect('result' in result).toBe(true);
    expect('agent' in result).toBe(true);
  });
});