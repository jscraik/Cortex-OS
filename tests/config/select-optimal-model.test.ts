import { describe, expect, it } from 'vitest';
import { selectOptimalModel } from '../../config/model-integration-strategy.js';

describe('selectOptimalModel', () => {
	const base = {
		complexity: 'low',
		latency: 'fast',
		accuracy: 'sufficient',
		resource_constraint: 'moderate',
		modality: 'text',
	} as const;

	it('prefers fallback for realtime tasks', () => {
		const model = selectOptimalModel('agents', 'codeIntelligence', {
			...base,
			latency: 'realtime',
			modality: 'code',
		});
		expect(model).toBe('deepseek-coder:6.7b');
	});

	it('uses premium when accuracy demanded', () => {
		const model = selectOptimalModel('a2a', 'embedding', {
			...base,
			accuracy: 'premium',
		});
		expect(model).toBe('qwen3-8b');
	});

	it('returns primary for high complexity', () => {
		const model = selectOptimalModel('a2a', 'embedding', {
			...base,
			complexity: 'high',
		});
		expect(model).toBe('qwen3-4b');
	});

	it('falls back under strict resources', () => {
		const model = selectOptimalModel('a2a', 'embedding', {
			...base,
			resource_constraint: 'strict',
		});
		expect(model).toBe('qwen3-0.6b');
	});

	it('defaults to primary', () => {
		const model = selectOptimalModel('orchestration', 'planning', {
			...base,
			modality: 'text',
		});
		expect(model).toBe('phi4-mini-reasoning:latest');
	});

	it('throws on unknown category', () => {
		expect(() => selectOptimalModel('agents', 'unknown', base as unknown)).toThrow(
			/Unknown model category/,
		);
	});
});
