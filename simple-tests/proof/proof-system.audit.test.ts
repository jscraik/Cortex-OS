import { describe, expect, it } from 'vitest';
import {
	createInMemoryProofStore,
	createProofSession,
	finalizeProof,
	queryProofs,
} from '../../packages/kernel/src/proof/proofSystem.js';

const make = async (seed: string, total: number, ts: number) => {
	const session = createProofSession({
		seed,
		executionHash: `h-${seed}`,
		records: [{ id: 'a', success: true, value: 1 }],
	});
	session.addClaim('core.totalTasks', String(total));
	return finalizeProof(session, { digestAlgo: 'fnv1a32' }).then((a) => ({ ...a, timestamp: ts }));
};

describe('Proof System Audit Query', () => {
	it('filters by time range and claim equality', async () => {
		const store = createInMemoryProofStore();
		const now = Date.now();
		const a = await make('s1', 1, now - 10_000);
		const b = await make('s2', 2, now - 5_000);
		const c = await make('s3', 3, now);
		store.save(a);
		store.save(b);
		store.save(c);

		const range = queryProofs(store, { from: now - 6_000, to: now + 1_000 });
		expect(range.map((r) => r.seed)).toEqual(['s2', 's3']);
		expect(range[0].version).toBe('1.0.0');
		expect(range[1].version).toBe('1.0.0');

		const withClaim = queryProofs(store, { claimEquals: { 'core.totalTasks': '2' } });
		expect(withClaim).toHaveLength(1);
		expect(withClaim[0].seed).toBe('s2');
	});
});
