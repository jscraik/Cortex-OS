import { describe, expect, it, vi } from 'vitest';

import { AgentHandler } from '../src/server/handlers/agent.handler.js';

const logAgentResultSpy = vi.fn();

vi.mock('../src/MasterAgent.js', () => {
	const coordinate = vi.fn().mockResolvedValue({
		currentAgent: 'code-analysis-agent',
		result: 'ok',
		taskType: 'analysis',
		error: undefined,
		messages: [],
	});
	return {
		createMasterAgentGraph: () => ({ coordinate }),
	};
});

vi.mock('@cortex-os/observability/logging', () => ({
	logAgentResult: logAgentResultSpy,
}));

describe('AgentHandler metadata', () => {
	it('includes prompt_id in execution meta', async () => {
		const handler = new AgentHandler();
		const response = await handler.execute({} as any, {
			agentId: 'test-agent',
			input: 'hello',
		});
		expect(response.result.meta.prompt_id).toMatch(/^cortex\.master-agent\.system\./);
		expect(response.timestamp).toBe(response.result.meta.ts);
		expect(logAgentResultSpy).toHaveBeenCalledTimes(1);
		expect(logAgentResultSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'code-analysis-agent',
				result: expect.objectContaining({
					meta: expect.objectContaining({
						prompt_id: expect.stringMatching(/^cortex\.master-agent\.system\./),
					}),
				}),
			}),
		);
	});
});
