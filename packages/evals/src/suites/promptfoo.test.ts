import { describe, expect, it, vi } from 'vitest';
import { PromptOptions, runPromptSuite } from './promptfoo.js';

describe('runPromptSuite', () => {
	it('passes when metrics meet thresholds', async () => {
		const deps = {
			run: vi.fn().mockResolvedValue({
				accuracy: 0.9,
				groundedness: 0.97,
				refusal: 0.99,
			}),
		};
		const options = PromptOptions.parse({ configs: ['assistant.yaml'] });
		const result = await runPromptSuite('prompt', options, deps);
		expect(result.pass).toBe(true);
		expect(result.metrics.accuracy).toBeCloseTo(0.9);
	});

	it('fails when accuracy is below the threshold', async () => {
		const deps = {
			run: vi.fn().mockResolvedValue({
				accuracy: 0.6,
				groundedness: 0.99,
				refusal: 1,
			}),
		};
		const options = PromptOptions.parse({
			configs: ['assistant.yaml'],
			thresholds: { accuracy: 0.8 },
		});
		const result = await runPromptSuite('prompt', options, deps);
		expect(result.pass).toBe(false);
		expect(result.metrics.accuracy).toBeCloseTo(0.6);
	});
});
