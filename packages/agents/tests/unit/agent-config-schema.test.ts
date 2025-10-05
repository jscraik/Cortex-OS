import { describe, expect, it } from 'vitest';
import { AgentConfigSchema } from '../../src/persistence/agent-state.js';

describe('AgentConfigSchema prompt enforcement', () => {
	it('accepts configs that reference registered prompt ids', () => {
		const parsed = AgentConfigSchema.parse({
			model: 'gpt-test',
			maxTokens: 512,
			systemPromptId: 'sys.agents.test.prompt',
			tools: ['shell.exec'],
		});

		expect(parsed.systemPromptId).toBe('sys.agents.test.prompt');
	});

	it('rejects inline systemPrompt strings', () => {
		expect(() =>
			AgentConfigSchema.parse({
				systemPrompt: 'You are unsafe.',
			}),
		).toThrow(/inline system prompts are blocked/i);
	});
});
