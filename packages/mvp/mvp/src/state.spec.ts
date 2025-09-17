import { describe, expect, it } from 'vitest';

import {
	createInitialPRPState,
	generateDeterministicHash,
	PRPStateSchema,
	validateStateTransition,
} from './state.js';

describe('state utilities', () => {
	const blueprint = {
		title: 'Test Blueprint',
		description: 'Validates deterministic helpers',
		requirements: ['deterministic ids', 'valid transitions'],
	};

	it('produces stable deterministic hashes', () => {
		const first = generateDeterministicHash({
			foo: 'bar',
			nested: { value: 1, tags: ['a', 'b'] },
		});
		const second = generateDeterministicHash({
			foo: 'bar',
			nested: { value: 1, tags: ['a', 'b'] },
		});
		const different = generateDeterministicHash({
			foo: 'bar',
			nested: { value: 2, tags: ['a', 'b'] },
		});

		expect(first).toBe(second);
		expect(first).not.toBe(different);
	});

	it('creates deterministic initial state when requested', () => {
		const state = createInitialPRPState(blueprint, { deterministic: true });
		const expectedHash = generateDeterministicHash(blueprint);

		expect(state.id).toBe(`prp-${expectedHash}`);
		expect(state.runId).toBe(`run-${expectedHash}`);
		expect(state.metadata.startTime).toBe('2025-01-01T00:00:00.000Z');
		expect(state.phase).toBe('strategy');

		expect(() => PRPStateSchema.parse(state)).not.toThrow();
	});

	it('allows only declared state transitions', () => {
		const current = createInitialPRPState(blueprint);
		const toBuild = { ...current, phase: 'build' as const };
		const toEvaluation = { ...toBuild, phase: 'evaluation' as const };
		const recycled = { ...toEvaluation, phase: 'recycled' as const };
		const backToStrategy = { ...recycled, phase: 'strategy' as const };

		expect(validateStateTransition(current, toBuild)).toBe(true);
		expect(validateStateTransition(toBuild, toEvaluation)).toBe(true);
		expect(validateStateTransition(toEvaluation, recycled)).toBe(true);
		expect(validateStateTransition(recycled, backToStrategy)).toBe(true);

		const invalid = { ...toBuild, phase: 'strategy' as const };
		expect(validateStateTransition(toBuild, invalid)).toBe(false);
	});
});
