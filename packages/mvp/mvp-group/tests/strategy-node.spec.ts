import { describe, expect, it } from 'vitest';
import { executeStrategyNode } from '../src/lib/strategy-node.js';

function fixedTimestamp(label: string): string {
	const base = Date.parse('2025-08-21T00:00:00.000Z');
	let hash = 0;
	for (const char of label) {
		hash = (hash << 5) - hash + char.charCodeAt(0);
		hash |= 0;
	}
	const offset = Math.abs(hash % 1000);
	return new Date(base + offset * 1000).toISOString();
}

describe('executeStrategyNode', () => {
	it('uses deterministic timestamp when requested', async () => {
		const state = { validationResults: {} };
		const result = await executeStrategyNode(state, { deterministic: true });
		expect(result.validationResults.strategy.timestamp).toBe(fixedTimestamp('strategy-validation'));
	});
});
