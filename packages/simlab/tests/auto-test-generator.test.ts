import { describe, expect, it } from 'vitest';
import type { SimScenario } from '../src';
import { generateTests } from '../src/auto-test.js';

describe('Auto test generation', () => {
	it('creates test code for scenarios', () => {
		const scenarios: SimScenario[] = [
			{
				id: 'scn-auto',
				name: 'auto',
				description: '',
				goal: 'check',
				persona: { locale: 'en-US', tone: 'neutral', tech_fluency: 'med' },
				initial_context: {},
				sop_refs: [],
				kb_refs: [],
				success_criteria: ['ok'],
				difficulty: 'basic',
				category: 'support',
				tags: [],
			},
		];
		const code = generateTests(scenarios);
		expect(code).toContain('scn-auto');
		expect(code).toContain('describe');
	});
});
