import { describe, expect, it } from 'vitest';
import {
	AgenticDispatcher,
	createAgenticDispatcher,
	type Strategy,
} from '../../src/agent/dispatcher.js';

function strat(id: string, key: string): Strategy {
	return {
		id,
		matches(meta) {
			return (meta?.docType ?? meta?.category) === key;
		},
	};
}

describe('AgenticDispatcher', () => {
	it('selects strategy by learned weights (docType)', () => {
		const s1 = strat('s1', 'tech');
		const s2 = strat('s2', 'legal');
		const d = new AgenticDispatcher([s1, s2], { epsilon: 0, learningRate: 0.5 });

		// Initially neutral -> first wins ties
		expect(d.choose({ docType: 'tech' }).id).toBe('s1');

		// Provide negative feedback to s1 for tech
		d.recordFeedback({ docType: 'tech', strategyId: 's1', success: false });

		// Now s2 should be preferred for tech because s1 has negative weight
		const chosen = d.choose({ docType: 'tech' });
		expect(['s1', 's2']).toContain(chosen.id);
		expect(chosen.id).toBe('s2');
	});

	it('supports exploration via epsilon', () => {
		const s1 = strat('s1', 'tech');
		const s2 = strat('s2', 'tech');
		const d = createAgenticDispatcher([s1, s2], { epsilon: 1 });

		// With epsilon=1, always explore -> random among strategies
		const ids = new Set<string>();
		for (let i = 0; i < 10; i++) ids.add(d.choose({ docType: 'tech' }).id);
		expect(ids.size).toBeGreaterThan(1);
	});
});
