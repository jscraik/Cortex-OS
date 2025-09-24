import { describe, expect, it } from 'vitest';
import {
	createInMemoryKeyRegistry,
	createInMemoryProofStore,
	createRegistrySigner,
	produceProofFromScheduleResult,
} from '../../packages/kernel/src/index.js';

interface Emitted {
	type: string;
	id: string;
	relatedGenerated?: string;
}

describe('proof event chain', () => {
	it('emits proof.generated then proof.indexed with linkage', async () => {
		const emitted: Emitted[] = [];
		const store = createInMemoryProofStore();
		const registry = createInMemoryKeyRegistry();
		const signer = createRegistrySigner(registry);
		const scheduleResult = { seed: 's', executionHash: 'h', records: [] };
		await produceProofFromScheduleResult(scheduleResult, {
			signer,
			store,
			emit: (evt) => {
				if (evt.type === 'proof.generated') emitted.push({ type: evt.type, id: evt.id });
				if (evt.type === 'proof.indexed')
					emitted.push({
						type: evt.type,
						id: evt.id,
						relatedGenerated: evt.related.generatedEventId,
					});
			},
		});
		expect(emitted.map((e) => e.type)).toEqual(['proof.generated', 'proof.indexed']);
		expect(emitted[1].id).toBe(emitted[0].id); // same artifact id
		expect(emitted[1].relatedGenerated).toBe(emitted[0].id);
	});
});
