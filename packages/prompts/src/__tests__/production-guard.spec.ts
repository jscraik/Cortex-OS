import { describe, expect, it } from 'vitest';
import { ProductionPromptGuard, promptGuard, registerPrompt } from '../index.js';

const TEST_PROMPT_ID = 'test.guard.prompt';

registerPrompt({
	id: TEST_PROMPT_ID,
	name: 'Test Guard Prompt',
	version: '1.0.0',
	role: 'system',
	template: 'You are brAInwav prompt guard verification.',
	variables: [],
	riskLevel: 'L1',
	owners: ['qa@brainwav.ai'],
});

describe('ProductionPromptGuard', () => {
	it('requires prompt id when guard enabled in production environment', () => {
		const guard = new ProductionPromptGuard({
			enabled: true,
			allowedAdHocEnvironments: [],
		});

		expect(() => guard.validatePromptUsage('You are an assistant.')).toThrow(
			/Prompt ID is required/,
		);
	});

	it('allows registered prompts when referenced by id', () => {
		const guard = new ProductionPromptGuard({
			enabled: true,
			allowedAdHocEnvironments: [],
		});

		expect(() => guard.validatePromptUsage('', TEST_PROMPT_ID)).not.toThrow();
	});

	it('does not block ad-hoc prompts when guard disabled', () => {
		const guard = new ProductionPromptGuard({ enabled: false });

		expect(() => guard.validatePromptUsage('You are an assistant.')).not.toThrow();
	});

	it('global promptGuard rejects inline prompts when force-enabled', () => {
		const originalEnv = process.env.NODE_ENV;
		promptGuard.setEnabled(true);
		process.env.NODE_ENV = 'production';

		try {
			expect(() => promptGuard.validatePromptUsage('You are an unsafe prompt.')).toThrow(
				/Prompt ID is required/,
			);
		} finally {
			process.env.NODE_ENV = originalEnv;
			promptGuard.setEnabled(originalEnv === 'production');
		}
	});
});
