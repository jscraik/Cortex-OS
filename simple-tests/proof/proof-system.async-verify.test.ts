import { describe, expect, it } from 'vitest';
import {
	createProofSession,
	finalizeProof,
	verifyProofAsync,
} from '../../packages/kernel/src/proof/proofSystem.js';

describe('verifyProofAsync', () => {
	it('verifies sha256 artifact successfully', async () => {
		const session = createProofSession({
			seed: 'sha',
			executionHash: 'hash',
			records: [{ id: 'a', success: true, value: 1 }],
		});
		session.addClaim('core.totalTasks', '1');
		const artifact = await finalizeProof(session, { digestAlgo: 'sha256' });
		const verification = await verifyProofAsync(artifact);
		expect(verification.valid).toBe(true);
	});

	it('detects mismatch after tamper (sha256)', async () => {
		const session = createProofSession({
			seed: 'sha2',
			executionHash: 'hash2',
			records: [{ id: 'a', success: true, value: 1 }],
		});
		session.addClaim('core.totalTasks', '1');
		const artifact = await finalizeProof(session, { digestAlgo: 'sha256' });
		// tamper
		// @ts-expect-error forcing mutation for test
		artifact.claims = { ...artifact.claims, 'core.totalTasks': '2' };
		const verification = await verifyProofAsync(artifact);
		expect(verification.valid).toBe(false);
		expect(verification.issues).toContain('digest-mismatch');
	});
});
