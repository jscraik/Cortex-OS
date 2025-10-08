import * as Prompts from '@cortex-os/prompts';
import { describe, expect, it, vi } from 'vitest';
import { renderSubagentSystemPrompt } from '../../src/MasterAgent.js';

describe('renderSubagentSystemPrompt', () => {
	it('renders registered prompt with agent name', () => {
		const prompt = renderSubagentSystemPrompt('demo-agent');

		expect(prompt).toBe('You are brAInwav agent demo-agent.');
	});

	it('validates prompt usage via production guard', () => {
		const validateSpy = vi.spyOn(Prompts, 'validatePromptUsage');
		try {
			const prompt = renderSubagentSystemPrompt('guarded-agent');
			expect(validateSpy).toHaveBeenCalledWith(prompt, 'sys.agents.subagent-session');
		} finally {
			validateSpy.mockRestore();
		}
	});
});
