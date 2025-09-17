import { describe, expect, it } from 'vitest';

import {
	createRagBus,
	RAGEventTypes,
	type RagEventEnvelope,
} from '../src/events/rag-bus.js';

describe('RAG A2A bus', () => {
	it('delivers query events to subscribers', async () => {
		const bus = createRagBus({ source: 'urn:test:rag' });
		const received: RagEventEnvelope[] = [];

		const unsubscribe = await bus.bind([
			{
				type: RAGEventTypes.QueryExecuted,
				handle: async (event) => {
					received.push(event);
				},
			},
		]);

		await bus.publish(RAGEventTypes.QueryExecuted, {
			queryId: 'query-1',
			query: 'what is cortex?',
			topK: 3,
			timestamp: new Date().toISOString(),
			userId: 'user-123',
		});

		expect(received).toHaveLength(1);
		expect(received[0].data.query).toBe('what is cortex?');
		expect(received[0].type).toBe(RAGEventTypes.QueryExecuted);

		await unsubscribe();
	});

	it('throws when publishing invalid payloads', async () => {
		const bus = createRagBus();

		await expect(
			bus.publish(RAGEventTypes.IngestCompleted, {
				ingestId: 'ingest-1',
				success: true,
				documentsProcessed: 2,
				embeddings: 2,
				duration: 42,
				// Missing timestamp
			} as any),
		).rejects.toThrow();
	});
});
