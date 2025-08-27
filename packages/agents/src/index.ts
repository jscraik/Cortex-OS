
// Basic agent types for orchestration integration
export interface Agent {
  id: string;
  name: string;
  capabilities: string[];
}

export interface Executor {
  run(agent: Agent, task: {
    id: string;
    kind: string;
    input: unknown;
    budget: { wallClockMs: number; maxSteps: number };
  }): Promise<unknown>;
}

// Minimal implementation for orchestration compatibility
export class BasicExecutor implements Executor {
  async run(agent: Agent, task: { id: string; kind: string; input: unknown; budget: { wallClockMs: number; maxSteps: number } }): Promise<unknown> {
    console.log(`Agent ${agent.id} executing task ${task.id}:`, task.input);
    return { status: 'completed', result: task.input, agent: agent.id };
  }
}

export const createExecutor = (): Executor => new BasicExecutor();
