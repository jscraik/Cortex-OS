import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEngine, orchestrateTask } from '../src/prp-integration.js';
import type { Task } from '../src/types.js';
import { TaskStatus } from '../src/types.js';

const executePRPCycle = vi.fn();
const registerNeuron = vi.fn();
vi.mock('@cortex-os/prp-runner', () => ({
  PRPOrchestrator: class {
    registerNeuron = registerNeuron;
    executePRPCycle = executePRPCycle;
  },
}));

const baseTask: Task = {
  id: 't1',
  title: 'test',
  description: '',
  status: TaskStatus.PENDING,
  priority: 1,
  dependencies: [],
  requiredCapabilities: [],
  context: {},
  metadata: {},
  createdAt: new Date(),
};

afterEach(() => {
  executePRPCycle.mockReset();
});

describe('orchestrateTask', () => {
  it('orchestrates successfully', async () => {
    executePRPCycle.mockResolvedValue({
      phase: 'completed',
      outputs: { ok: true },
      validationResults: {},
      metadata: { cerebrum: { decision: 'd', reasoning: 'r' } },
    });
    const engine = createEngine();
    const result = await orchestrateTask(engine, baseTask, []);
    expect(result.success).toBe(true);
    expect(result.executionResults).toEqual({ ok: true });
  });

  it('propagates failure', async () => {
    executePRPCycle.mockRejectedValue(new Error('boom'));
    const engine = createEngine();
    await expect(orchestrateTask(engine, baseTask, [])).rejects.toThrow('boom');
  });

  it('limits concurrent orchestrations', async () => {
    const engine = createEngine({ maxConcurrentOrchestrations: 1 });
    let resolve: (v: any) => void = () => {};
    const pending = new Promise((pr) => {
      resolve = pr;
    });
    executePRPCycle.mockReturnValueOnce(pending);
    const first = orchestrateTask(engine, baseTask, []);
    await expect(orchestrateTask(engine, { ...baseTask, id: 't2' }, [])).rejects.toThrow(
      'Maximum concurrent orchestrations reached',
    );
    resolve({
      phase: 'completed',
      outputs: {},
      validationResults: {},
      metadata: { cerebrum: { decision: '', reasoning: '' } },
    });
    await first;
  });

  it('rejects removed fallbackStrategy option', () => {
    expect(() => createEngine({ fallbackStrategy: 'seq' } as any)).toThrow(
      'fallbackStrategy option was removed',
    );
  });
});
