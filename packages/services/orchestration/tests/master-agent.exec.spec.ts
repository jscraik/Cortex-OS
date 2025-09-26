import { describe, expect, it } from 'vitest';
import { createMasterAgentGraph, type SubAgentConfig } from '@cortex-os/agents';

describe('brAInwav master agent LangGraph execution', () => {
	it('should never return placeholder adapter responses', async () => {
		const subAgents: SubAgentConfig[] = [
			{
				name: 'test-generation-agent',
				description: 'Generates unit tests for TDD enforcement',
				capabilities: ['test', 'spec', 'unit'],
				model_targets: ['glm-4.5-mlx'],
				tools: ['generate_tests'],
				specialization: 'test-generation',
			},
		];

		const masterAgent = createMasterAgentGraph({
			name: 'brAInwav-MasterAgent-TDD',
			subAgents,
		});

		const result = await masterAgent.coordinate('Generate integration tests for LangGraph execution');
		const response =
			typeof result.result === 'string' ? result.result : JSON.stringify(result.result);

		expect(response).not.toContain('Mock adapter response - adapters not yet implemented');
	});
});
