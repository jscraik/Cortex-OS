/**
 * A2A Event definitions for RAG package
 * Enables event-driven communication with other packages
 */

import { z } from 'zod';

// RAG Event Schemas
export const ragQueryEventSchema = z.object({
	queryId: z.string(),
	query: z.string(),
	topK: z.number().int().positive(),
	timestamp: z.string().datetime(),
	userId: z.string().optional(),
});

export const ragQueryResultEventSchema = z.object({
	queryId: z.string(),
	results: z.array(
		z.object({
			text: z.string(),
			score: z.number(),
			metadata: z.record(z.unknown()).optional(),
		}),
	),
	provider: z.string(),
	duration: z.number(),
	timestamp: z.string().datetime(),
});

export const ragIngestEventSchema = z.object({
	ingestId: z.string(),
	contentLength: z.number().int().positive(),
	source: z.string().optional(),
	chunkCount: z.number().int().positive(),
	timestamp: z.string().datetime(),
});

export const ragIngestCompleteEventSchema = z.object({
	ingestId: z.string(),
	success: z.boolean(),
	documentsProcessed: z.number().int(),
	embeddings: z.number().int(),
	duration: z.number(),
	timestamp: z.string().datetime(),
	error: z.string().optional(),
});

// Event type constants
export const RAGEventTypes = {
	QueryExecuted: 'rag.query.executed',
	QueryCompleted: 'rag.query.completed',
	IngestStarted: 'rag.ingest.started',
	IngestCompleted: 'rag.ingest.completed',
} as const;

// Type definitions
export type RAGQueryEvent = z.infer<typeof ragQueryEventSchema>;
export type RAGQueryResultEvent = z.infer<typeof ragQueryResultEventSchema>;
export type RAGIngestEvent = z.infer<typeof ragIngestEventSchema>;
export type RAGIngestCompleteEvent = z.infer<
	typeof ragIngestCompleteEventSchema
>;

// Event creation helpers
export function createRAGQueryEvent(data: RAGQueryEvent): Envelope {
	return createEnvelope({
		type: RAGEventTypes.QueryExecuted,
		source: 'urn:cortex:rag',
		data: ragQueryEventSchema.parse(data),
	});
}

export function createRAGQueryResultEvent(data: RAGQueryResultEvent): Envelope {
	return createEnvelope({
		type: RAGEventTypes.QueryCompleted,
		source: 'urn:cortex:rag',
		data: ragQueryResultEventSchema.parse(data),
	});
}

export function createRAGIngestEvent(data: RAGIngestEvent): Envelope {
	return createEnvelope({
		type: RAGEventTypes.IngestStarted,
		source: 'urn:cortex:rag',
		data: ragIngestEventSchema.parse(data),
	});
}

export function createRAGIngestCompleteEvent(
	data: RAGIngestCompleteEvent,
): Envelope {
	return createEnvelope({
		type: RAGEventTypes.IngestCompleted,
		source: 'urn:cortex:rag',
		data: ragIngestCompleteEventSchema.parse(data),
	});
}

// Event schemas registry (for validation)
export const RAGEventSchemas = {
	[RAGEventTypes.QueryExecuted]: ragQueryEventSchema,
	[RAGEventTypes.QueryCompleted]: ragQueryResultEventSchema,
	[RAGEventTypes.IngestStarted]: ragIngestEventSchema,
	[RAGEventTypes.IngestCompleted]: ragIngestCompleteEventSchema,
} as const;
