import { describe, expect, it } from 'vitest';
import { proofGeneratedEventSchema } from '../../libs/typescript/contracts/proof/proof-generated-event.schema.js';

describe('contract: proof.generated event', () => {
	it('validates event shape', () => {
		const evt = {
			specversion: '1.0',
			type: 'proof.generated',
			source: 'urn:cortex:kernel:proof',
			id: 'proof_abc',
			time: new Date().toISOString(),
			data: {
				artifact: {
					id: 'proof_abc',
					version: '1.0.0',
					seed: 's',
					executionHash: 'hash',
					claims: { 'core.totalTasks': '1' },
					digest: { algo: 'fnv1a32', value: 'a1b2c3d4', length: 8 },
					timestamp: Date.now(),
					recordCount: 1,
				},
			},
		};
		const parsed = proofGeneratedEventSchema.parse(evt);
		expect(parsed.type).toBe('proof.generated');
	});

	it('rejects wrong type', () => {
		const bad = {
			specversion: '1.0',
			type: 'wrong',
			source: 'urn:cortex:kernel:proof',
			id: 'proof_x',
			time: new Date().toISOString(),
			data: {
				artifact: {
					id: 'proof_x',
					version: '1.0.0',
					seed: 's',
					executionHash: 'h',
					claims: {},
					digest: { algo: 'fnv1a32', value: 'ffffffff', length: 8 },
					timestamp: Date.now(),
					recordCount: 0,
				},
			},
		};
		expect(() => proofGeneratedEventSchema.parse(bad as unknown)).toThrow();
	});

	it('accepts sha256 digest with signature metadata', () => {
		const evt = {
			specversion: '1.0',
			type: 'proof.generated',
			source: 'urn:cortex:kernel:proof',
			id: 'proof_sha',
			time: new Date().toISOString(),
			data: {
				artifact: {
					id: 'proof_sha',
					version: '1.0.0',
					seed: 'sha-seed',
					executionHash: 'sha-hash',
					claims: { 'core.totalTasks': '1', 'core.allSucceeded': 'true' },
					digest: { algo: 'sha256', value: 'a'.repeat(64), length: 64 },
					timestamp: Date.now(),
					signature: 'hmac256:20250101:001:abcdef',
					signerId: 'key-registry',
					recordCount: 1,
				},
			},
		};
		const parsed = proofGeneratedEventSchema.parse(evt);
		expect(parsed.data.artifact.digest.algo).toBe('sha256');
		expect(parsed.data.artifact.signature).toBeDefined();
	});
});
