import { describe, expect, it } from 'vitest';
import { proofArtifactSchema } from '../../libs/typescript/contracts/proof/proof-artifact.schema';
import { proofIndexedEventSchema } from '../../libs/typescript/contracts/proof/proof-indexed-event.schema';

// Round-trip creation helper replicating kernel emitted structure
function createIndexedEvent(sampleId: string) {
	const proof = {
		id: sampleId,
		version: '1.0.0' as const,
		seed: 'seed',
		executionHash: 'exec',
		claims: { 'core.totalTasks': '0' },
		digest: { algo: 'fnv1a32', value: 'deadbeef', length: 8 },
		timestamp: Date.now(),
		records: [],
		recordCount: 0,
	};
	// Validate base artifact shape (excluding recordCount) to mimic producer correctness
	proofArtifactSchema.parse({
		id: proof.id,
		version: proof.version,
		seed: proof.seed,
		executionHash: proof.executionHash,
		claims: proof.claims,
		digest: proof.digest,
		timestamp: proof.timestamp,
		records: proof.records,
	});
	const generatedEventId = proof.id;
	return {
		specversion: '1.0',
		type: 'proof.indexed',
		source: 'urn:cortex:kernel:proof',
		id: proof.id,
		time: new Date().toISOString(),
		data: { proofId: proof.id, digestAlgo: proof.digest.algo, signerId: undefined },
		related: { generatedEventId },
	} as const;
}

describe('proof.indexed event contract', () => {
	it('validates a well-formed event', () => {
		const evt = createIndexedEvent('proof_evt_1');
		const parsed = proofIndexedEventSchema.parse(evt);
		expect(parsed.data.proofId).toBe('proof_evt_1');
		expect(parsed.related.generatedEventId).toBe('proof_evt_1');
	});

	it('rejects wrong type', () => {
		const evt: unknown = { ...createIndexedEvent('proof_evt_2'), type: 'wrong.type' };
		expect(() => proofIndexedEventSchema.parse(evt)).toThrow();
	});

	it('rejects missing related link', () => {
		const evtBase = createIndexedEvent('proof_evt_3');
		const evt: unknown = { ...evtBase, related: undefined };
		expect(() => proofIndexedEventSchema.parse(evt)).toThrow();
	});
});
