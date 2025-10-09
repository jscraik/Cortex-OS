import { describe, expect, it } from 'vitest';
import {
	proofArtifactAnyVersionSchema,
	proofArtifactSchema,
	proofArtifactV110Schema,
	proofEnvelopeV020Schema,
} from '../../libs/typescript/contracts/proof/proof-artifact.schema';

const base = {
	id: 'proof_abc',
	seed: 's',
	executionHash: 'h',
	claims: { 'core.totalTasks': '0' },
	digest: { algo: 'fnv1a32', value: 'deadbeef', length: 8 },
	timestamp: Date.now(),
	records: [],
};

describe('proof artifact version union', () => {
	it('validates v1.0.0 artifact', () => {
		const v1 = { ...base, version: '1.0.0' as const };
		const parsed = proofArtifactSchema.parse(v1);
		expect(parsed.version).toBe('1.0.0');
		const anyParsed = proofArtifactAnyVersionSchema.parse(v1);
		expect(anyParsed.version).toBe('1.0.0');
	});

	it('validates v1.1.0 artifact with meta', () => {
		const v110 = { ...base, version: '1.1.0' as const, meta: { notes: 'test', tags: ['a'] } };
		const parsed = proofArtifactV110Schema.parse(v110);
		expect(parsed.version).toBe('1.1.0');
		const anyParsed = proofArtifactAnyVersionSchema.parse(v110);
		expect(anyParsed.version).toBe('1.1.0');
	});

	it('rejects v1.1.0 artifact with invalid meta constraint', () => {
		const bad: unknown = {
			...base,
			version: '1.1.0' as const,
			meta: { tags: new Array(25).fill('x') },
		}; // >20 tags
		expect(() => proofArtifactV110Schema.parse(bad)).toThrow();
	});

	it('rejects unknown version', () => {
		const bad: unknown = { ...base, version: '2.0.0' };
		expect(() => proofArtifactAnyVersionSchema.parse(bad)).toThrow();
	});

	it('validates proof envelope v0.2.0', () => {
		const envelope = {
			proofSpec: 'cortex-os/proof-artifact',
			specVersion: '0.2.0',
			id: '01J8Z0VJ5W1QNA0R1QK2J4ZK7D',
			issuedAt: new Date().toISOString(),
			actor: { agent: 'codex', role: 'reviewer' },
			artifact: {
				uri: 'file:///tmp/report.md',
				mime: 'text/markdown',
				contentHash: { alg: 'sha256', hex: 'a'.repeat(64) },
			},
			context: { public: { instruction: 'demo' } },
			evidence: [],
			runtime: { model: 'gpt-5-codex' },
		};
		expect(() => proofEnvelopeV020Schema.parse(envelope)).not.toThrow();
	});
});
