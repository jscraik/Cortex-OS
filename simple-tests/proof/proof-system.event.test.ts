import { describe, expect, it } from 'vitest';
import {
	createInMemoryProofStore,
	createProofGeneratedEvent,
	produceProofFromScheduleResult,
} from '../../packages/kernel/src/proof/proofSystem.js';

describe('Proof System Event Emission', () => {
	it('emits proof.generated CloudEvent with expected shape', async () => {
		const scheduleResult = {
			seed: 'evt-seed',
			executionHash: 'evt-hash',
			records: [{ id: 'r1', success: true, value: 1 }],
		};
		const store = createInMemoryProofStore();
		const events: any[] = [];
		const artifact = await produceProofFromScheduleResult(scheduleResult, {
			store,
			emit: (evt) => {
				events.push(evt);
			},
		});
		expect(events).toHaveLength(2); // Should emit both proof.generated and proof.indexed
		const generatedEvt = events.find((e) => e.type === 'proof.generated');
		const indexedEvt = events.find((e) => e.type === 'proof.indexed');
		expect(generatedEvt).toBeDefined();
		expect(indexedEvt).toBeDefined();
		expect(generatedEvt.data.artifact.id).toBe(artifact.id);
		expect(generatedEvt.data.artifact.recordCount).toBe(1);
		expect(generatedEvt.data.artifact.claims['core.totalTasks']).toBe('1');
		expect(generatedEvt.data.artifact.version).toBe('1.0.0');
		// Verify event chain linkage
		expect(indexedEvt.related.generatedEventId).toBe(generatedEvt.id);
	});

	it('createProofGeneratedEvent helper builds consistent event', async () => {
		const scheduleResult = {
			seed: 'evt2',
			executionHash: 'evt2-h',
			records: [
				{ id: 'r1', success: true, value: 1 },
				{ id: 'r2', success: true, value: 2 },
			],
		};
		const artifact = await produceProofFromScheduleResult(scheduleResult, {});
		const evt = createProofGeneratedEvent(artifact);
		expect(evt.data.artifact.recordCount).toBe(2);
		expect(evt.data.artifact.seed).toBe('evt2');
		expect(evt.data.artifact.version).toBe('1.0.0');
	});
});
