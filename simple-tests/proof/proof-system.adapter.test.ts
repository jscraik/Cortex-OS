import { describe, expect, it } from 'vitest';
import {
	createInMemoryProofStore,
	type ProofSigner,
	produceProofFromScheduleResult,
	verifyProof,
} from '../../packages/kernel/src/proof/proofSystem.js';

const mockSigner: ProofSigner = {
	id: 'signer-1',
	sign: (digest: string) => `sig-${digest}`,
	verify: (digest: string, signature: string) => signature === `sig-${digest}`,
};

describe('Proof System Adapter', () => {
	it('produces and stores proof from schedule result', async () => {
		const scheduleResult = {
			seed: 's-1',
			executionHash: 'abc123',
			records: [
				{ id: 'a', success: true, value: 1 },
				{ id: 'b', success: true, value: 2 },
			],
		};
		const store = createInMemoryProofStore();
		const artifact = await produceProofFromScheduleResult(scheduleResult, {
			signer: mockSigner,
			store,
		});
		expect(artifact.signature).toBeDefined();
		expect(artifact.signerId).toBe('signer-1');
		expect(artifact.claims['core.totalTasks']).toBe('2');
		expect(artifact.claims['core.allSucceeded']).toBe('true');
		expect(['fnv1a32', 'sha256']).toContain(artifact.digest.algo);
		expect(artifact.version).toBe('1.0.0');
		const verification = verifyProof(artifact, mockSigner);
		expect(verification.valid).toBe(true);
		const listed = store.list();
		expect(listed.find((a) => a.id === artifact.id)).toBeDefined();
	});

	it('fails verification if signature altered', async () => {
		const scheduleResult = {
			seed: 's-2',
			executionHash: 'def456',
			records: [{ id: 'x', success: true, value: 9 }],
		};
		const artifact = await produceProofFromScheduleResult(scheduleResult, { signer: mockSigner });
		artifact.signature = 'sig-tampered';
		const verification = verifyProof(artifact, mockSigner);
		expect(verification.valid).toBe(false);
		expect(verification.issues).toContain('signature-invalid');
	});
});
