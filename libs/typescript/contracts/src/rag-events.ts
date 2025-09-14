/**
 * RAG Event Contracts for A2A Communication
 * Contract-first definitions for RAG package events
 */

import { z } from 'zod';

// RAG Event Type Constants
export const RagEventTypes = {
	QueryExecuted: 'rag.query.executed',
	QueryCompleted: 'rag.query.completed',
	IngestStarted: 'rag.ingest.started',
	IngestCompleted: 'rag.ingest.completed',
	EmbeddingGenerated: 'rag.embedding.generated',
	IndexUpdated: 'rag.index.updated',
} as const;

// Event Data Schemas
export const ragQueryExecutedSchema = z.object({
	queryId: z.string().min(1),
	query: z.string().min(1),
	topK: z.number().int().positive().max(100),
	userId: z.string().optional(),
	timestamp: z.string().datetime(),
	metadata: z.record(z.unknown()).optional(),
});

export const ragQueryCompletedSchema = z.object({
	queryId: z.string().min(1),
	results: z.array(
		z.object({
			text: z.string(),
			score: z.number().min(0).max(1),
			source: z.string().optional(),
			metadata: z.record(z.unknown()).optional(),
		}),
	),
	provider: z.string(),
	duration: z.number().positive(),
	timestamp: z.string().datetime(),
});

export const ragIngestStartedSchema = z.object({
	ingestId: z.string().min(1),
	source: z.string().optional(),
	contentLength: z.number().int().positive(),
	expectedChunks: z.number().int().positive(),
	timestamp: z.string().datetime(),
});

export const ragIngestCompletedSchema = z.object({
	ingestId: z.string().min(1),
	success: z.boolean(),
	documentsProcessed: z.number().int().nonnegative(),
	embeddingsGenerated: z.number().int().nonnegative(),
	duration: z.number().positive(),
	timestamp: z.string().datetime(),
	error: z.string().optional(),
});

export const ragEmbeddingGeneratedSchema = z.object({
	embeddingId: z.string().min(1),
	text: z.string(),
	provider: z.string(),
	dimensions: z.number().int().positive(),
	timestamp: z.string().datetime(),
});

export const ragIndexUpdatedSchema = z.object({
	indexId: z.string().min(1),
	operation: z.enum(['add', 'update', 'delete']),
	affectedDocuments: z.number().int().nonnegative(),
	indexSize: z.number().int().nonnegative(),
	timestamp: z.string().datetime(),
});

// Type Exports
export type RagQueryExecutedEvent = z.infer<typeof ragQueryExecutedSchema>;
export type RagQueryCompletedEvent = z.infer<typeof ragQueryCompletedSchema>;
export type RagIngestStartedEvent = z.infer<typeof ragIngestStartedSchema>;
export type RagIngestCompletedEvent = z.infer<typeof ragIngestCompletedSchema>;
export type RagEmbeddingGeneratedEvent = z.infer<
	typeof ragEmbeddingGeneratedSchema
>;
export type RagIndexUpdatedEvent = z.infer<typeof ragIndexUpdatedSchema>;

// Event Schema Registry
export const RagEventSchemas = {
	[RagEventTypes.QueryExecuted]: ragQueryExecutedSchema,
	[RagEventTypes.QueryCompleted]: ragQueryCompletedSchema,
	[RagEventTypes.IngestStarted]: ragIngestStartedSchema,
	[RagEventTypes.IngestCompleted]: ragIngestCompletedSchema,
	[RagEventTypes.EmbeddingGenerated]: ragEmbeddingGeneratedSchema,
	[RagEventTypes.IndexUpdated]: ragIndexUpdatedSchema,
} as const;
