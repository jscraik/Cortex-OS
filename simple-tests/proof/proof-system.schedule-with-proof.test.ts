import { describe, expect, it } from 'vitest';
import { scheduleWithProof } from '../../packages/kernel/src/index.js';

describe('scheduleWithProof integration', () => {
	it('produces schedule result and matching proof', async () => {
		const tasks = [
			{ id: 't1', priority: 1, execute: () => 1 },
			{ id: 't2', priority: 2, execute: () => 2 },
		];
		const result = await scheduleWithProof(tasks, { seed: 'swp-seed', digestAlgo: 'fnv1a32' });
		expect(result.records).toHaveLength(2);
		expect(result.proof.executionHash).toBe(result.executionHash);
		expect(result.proof.claims['core.totalTasks']).toBe('2');
		expect(result.proof.version).toBe('1.0.0');
	});
});
