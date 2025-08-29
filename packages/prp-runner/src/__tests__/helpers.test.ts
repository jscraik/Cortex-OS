import { describe, it, expect, vi } from 'vitest';
import { createExecutionContext } from '../lib/create-execution-context.js';
import { executeNeuron } from '../lib/execute-neuron.js';
import type { Neuron, ExecutionState } from '../orchestrator.js';

describe('helper functions', () => {
  it('creates an execution context', () => {
    const context = createExecutionContext();
    expect(context).toHaveProperty('workingDirectory', process.cwd());
  });

  it('executes a neuron and returns its result', async () => {
    const neuron: Neuron = {
      id: 'n1',
      role: 'test',
      phase: 'strategy',
      dependencies: [],
      tools: [],
      execute: vi.fn(async () => ({
        output: { success: true },
        evidence: [],
        nextSteps: [],
        artifacts: [],
        metrics: {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 0,
          toolsUsed: [],
          filesCreated: 0,
          filesModified: 0,
          commandsExecuted: 0,
        },
      })),
    };

    const state: ExecutionState = {
      id: 's1',
      phase: 'strategy',
      blueprint: { title: '', description: '', requirements: [] },
      outputs: {},
    };

    const context = createExecutionContext();

    const result = await executeNeuron(neuron, state, context);

    expect(neuron.execute).toHaveBeenCalledWith(state, context);
    expect(result.output).toEqual({ success: true });
  });
});
