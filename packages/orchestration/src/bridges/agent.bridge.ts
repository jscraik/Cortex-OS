import type { Agent, Executor } from '@cortex-os/agents';
import type { Step } from '../domain/types.js';

type ExecutorRunResult = Awaited<ReturnType<Executor['run']>>;

export type AgentBridge = {
        run: (step: Step, taskId: string, input: unknown) => Promise<ExecutorRunResult>;
};

export const createAgentBridge = (
	exec: Executor,
	getAgent: (id: string) => Agent | undefined,
): AgentBridge => ({
	run: async (step, taskId, input) => {
		const agent = getAgent(step.agentId!);
		if (!agent) throw new Error(`AGENT_NOT_FOUND:${step.agentId}`);
		return exec.run(agent, {
			id: taskId,
			kind: 'custom',
			input,
			budget: { wallClockMs: step.timeoutMs ?? 30_000, maxSteps: 16 },
		});
	},
});
