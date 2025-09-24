import { describe, expect, it } from 'vitest';
import { createProofSession, finalizeProof } from '../../packages/kernel/src/proof/proofSystem.js';

const makeRecords = () => [
	{ id: 'a', success: true, value: 1 },
	{ id: 'b', success: true, value: 2 },
];

describe('Proof System Digest Algorithms', () => {
	it('produces reproducible fnv1a32 digest for identical inputs', async () => {
		const session1 = createProofSession({ seed: 's', executionHash: 'h', records: makeRecords() });
		session1.addClaim('core.totalTasks', '2');
		const session2 = createProofSession({ seed: 's', executionHash: 'h', records: makeRecords() });
		session2.addClaim('core.totalTasks', '2');
		const a1 = await finalizeProof(session1, { digestAlgo: 'fnv1a32' });
		const a2 = await finalizeProof(session2, { digestAlgo: 'fnv1a32' });
		expect(a1.digest.value).toBe(a2.digest.value);
		expect(a1.digest.algo).toBe('fnv1a32');
		expect(a1.version).toBe('1.0.0');
	});

	it('produces different digests when claims change', async () => {
		const s1 = createProofSession({ seed: 's', executionHash: 'h', records: makeRecords() });
		s1.addClaim('core.totalTasks', '2');
		const s2 = createProofSession({ seed: 's', executionHash: 'h', records: makeRecords() });
		s2.addClaim('core.totalTasks', '3');
		const a1 = await finalizeProof(s1, { digestAlgo: 'fnv1a32' });
		const a2 = await finalizeProof(s2, { digestAlgo: 'fnv1a32' });
		expect(a1.digest.value).not.toBe(a2.digest.value);
	});

	it('supports sha256 digest option', async () => {
		const session = createProofSession({ seed: 's2', executionHash: 'h2', records: makeRecords() });
		session.addClaim('core.totalTasks', '2');
		const artifact = await finalizeProof(session, { digestAlgo: 'sha256' });
		expect(artifact.digest.algo).toBe('sha256');
		expect(artifact.digest.value).toMatch(/^[0-9a-f]{64}$/);
		expect(artifact.version).toBe('1.0.0');
	});
});
