import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	createProofSession,
	finalizeProof,
	verifyProof,
	verifyProofAuto,
} from '../../packages/kernel/src/proof/proofSystem.js';

describe('verifyProofAuto sha256 mode', () => {
	let originalDigestEnv: string | undefined;

	beforeEach(() => {
		originalDigestEnv = process.env.CORTEX_PROOF_DIGEST_ALGO;
		process.env.CORTEX_PROOF_DIGEST_ALGO = 'sha256';
	});

	afterEach(() => {
		if (originalDigestEnv === undefined) delete process.env.CORTEX_PROOF_DIGEST_ALGO;
		else process.env.CORTEX_PROOF_DIGEST_ALGO = originalDigestEnv;
	});

	it('delegates to async verification for sha256 artifacts', async () => {
		const session = createProofSession({
			seed: 'sha-auto',
			executionHash: 'hash-auto',
			records: [{ id: 'task', success: true, value: 1 }],
		});
		session.addClaim('core.totalTasks', '1');
		session.addClaim('core.allSucceeded', 'true');

		const artifact = await finalizeProof(session);
		expect(artifact.digest.algo).toBe('sha256');

		const syncVerification = verifyProof(artifact);
		expect(syncVerification.valid).toBe(false);
		expect(syncVerification.issues).toContain('sha256-unverified');

		const autoVerification = await verifyProofAuto(artifact);
		expect(autoVerification.valid).toBe(true);
		expect(autoVerification.issues).toHaveLength(0);
	});
});
