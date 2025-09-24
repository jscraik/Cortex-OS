import { describe, expect, it } from 'vitest';
import { proofArtifactSchema } from '../../libs/typescript/contracts/proof/proof-artifact.schema.js';

describe('contract: proof.artifact', () => {
	it('validates minimal valid artifact', () => {
		const sample = {
			id: 'proof_abc',
			version: '1.0.0',
			seed: 's',
			executionHash: 'deadbeef',
			claims: { 'core.totalTasks': '2', 'core.allSucceeded': 'true' },
			digest: { algo: 'fnv1a32', value: 'abcdef12', length: 8 },
			timestamp: Date.now(),
			records: [{ id: 't1', success: true, value: 1 }],
		};
		const parsed = proofArtifactSchema.parse(sample);
		expect(parsed.id).toBe('proof_abc');
	});

	it('rejects invalid claim key', () => {
		const bad = {
			id: 'proof_bad',
			version: '1.0.0',
			seed: 's',
			executionHash: 'deadbeef',
			claims: { TotalTasks: '2' },
			digest: { algo: 'fnv1a32', value: 'abcdef12', length: 8 },
			timestamp: Date.now(),
			records: [],
		};
		expect(() => proofArtifactSchema.parse(bad as unknown)).toThrow();
	});
});
