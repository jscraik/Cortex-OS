import { describe, expect, it } from 'vitest';
import { topoSort, validateDAG } from '../dag.js';

describe('DAG utilities', () => {
	it('topologically sorts a simple workflow graph', () => {
		const edges = {
			plan: ['gather'],
			gather: ['critic'],
			critic: ['synthesize'],
			synthesize: ['verify'],
			verify: ['done'],
			done: [],
		} as const;

		const order = topoSort(edges);
		expect(order).toEqual(['plan', 'gather', 'critic', 'synthesize', 'verify', 'done']);
	});

	it('supports branching and converging', () => {
		const edges = {
			start: ['a', 'b'],
			a: ['end'],
			b: ['end'],
			end: [],
		} as const;

		const order = topoSort(edges);
		// start must come before a and b, and both before end
		expect(order.indexOf('start')).toBeLessThan(order.indexOf('a'));
		expect(order.indexOf('start')).toBeLessThan(order.indexOf('b'));
		expect(order.indexOf('a')).toBeLessThan(order.indexOf('end'));
		expect(order.indexOf('b')).toBeLessThan(order.indexOf('end'));
	});

	it('detects a cycle and throws a helpful error', () => {
		const edges = {
			a: ['b'],
			b: ['c'],
			c: ['a'],
		} as const;

		expect(() => validateDAG(edges)).toThrow(/cycle/i);
		expect(() => topoSort(edges)).toThrow(/cycle/i);
	});
});
