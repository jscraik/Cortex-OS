import { describe, expect, it, vi } from 'vitest';

vi.mock(
	'@cortex-os/hooks',
	() => ({
		getHooksSingleton: () => undefined,
	}),
	{ virtual: true },
);

describe('MasterAgent coordinateWithN0', () => {
	it('returns agent and n0 snapshots with populated context', async () => {
		const { createMasterAgentGraph } = await import('../../src/MasterAgent.js');

		const master = createMasterAgentGraph({
			name: 'test-master',
			subAgents: [
				{
					name: 'analysis',
					description: 'Performs code analysis',
					capabilities: ['analysis'],
					model_targets: ['ollama-mock'],
					tools: [],
					specialization: 'code-analysis',
				},
			],
		});

		const { agent, n0 } = await master.coordinateWithN0('Review utils.ts for issues', {
			id: 'session-n0',
			model: 'brAInwav-sonnet',
			user: 'unit-test',
			cwd: '/workspace/repo',
		});

		expect(agent.currentAgent).toBe('analysis');
		expect(agent.messages.at(-1)?.content).toContain('analysis complete');
		expect(n0.input).toBe('Review utils.ts for issues');
		expect(n0.output).toContain('analysis complete');
		expect(n0.ctx).toMatchObject({ currentAgent: 'analysis', taskType: 'code-analysis' });
	});
});
