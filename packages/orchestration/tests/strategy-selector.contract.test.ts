import { describe, expect, it } from 'vitest';

// Intentionally import a yet-to-be-implemented module to start RED
import { StrategySelector } from '../src/intelligence/strategy-selector.js';

describe('StrategySelector', () => {
	it('selects parallel-coordinated for complex, parallelizable tasks', () => {
		const selector = new StrategySelector();
		const complexTask = {
			description: 'Large codebase refactor with multiple independent modules',
			complexity: 0.85, // 0..1 scale
			canParallelize: true,
			estimatedBranches: 4,
			dataSize: 200_000, // lines of code or size unit
		};

		expect(selector.selectStrategy(complexTask)).toEqual('parallel-coordinated');
	});

	it('selects sequential-safe for simple or high-risk tasks', () => {
		const selector = new StrategySelector();
		const simpleTask = {
			description: 'Small one-off script change',
			complexity: 0.2,
			canParallelize: false,
			estimatedBranches: 1,
			dataSize: 500,
		};

		expect(selector.selectStrategy(simpleTask)).toEqual('sequential-safe');
	});
});
