/**
 * RAG Event Types - Shared contracts for RAG event bus
 * @package @cortex-os/rag-contracts
 * @author brAInwav Team
 */

import type { Envelope } from '@cortex-os/a2a-contracts';

// RAG Event Type Enumeration
export enum RAGEventTypes {
	QueryExecuted = 'rag.query.executed',
	QueryCompleted = 'rag.query.completed',
	IngestStarted = 'rag.ingest.started',
	IngestCompleted = 'rag.ingest.completed',
}

export type RAGEventType = RAGEventTypes;

// Type definitions for payload mapping
export type RagEventPayloadMap = {
	[RAGEventTypes.QueryExecuted]: {
		queryId: string;
		query: string;
		topK: number;
		timestamp: string;
		userId?: string;
	};
	[RAGEventTypes.QueryCompleted]: {
		queryId: string;
		results: Array<{
			text: string;
			score: number;
			metadata?: Record<string, unknown>;
		}>;
		provider: string;
		duration: number;
		timestamp: string;
	};
	[RAGEventTypes.IngestStarted]: {
		ingestId: string;
		contentLength: number;
		source?: string;
		chunkCount: number;
		timestamp: string;
	};
	[RAGEventTypes.IngestCompleted]: {
		ingestId: string;
		success: boolean;
		documentsProcessed: number;
		embeddings: number;
		duration: number;
		timestamp: string;
		error?: string;
	};
};

/**
 * RAG event envelope extending base A2A envelope
 */
export type RagEventEnvelope<TType extends RAGEventType = RAGEventType> = Envelope & {
	type: TType;
	data: RagEventPayloadMap[TType];
};

/**
 * RAG event handler interface
 */
export type RagEventHandler<TType extends RAGEventType = RAGEventType> = {
	type: TType;
	handle: (event: RagEventEnvelope<TType>) => Promise<void> | void;
};

/**
 * Options for publishing RAG events
 */
export interface RagPublishOptions {
	subject?: string;
	correlationId?: string;
	causationId?: string;
	ttlMs?: number;
	headers?: Record<string, string>;
	datacontenttype?: string;
	dataschema?: string;
	traceparent?: string;
	tracestate?: string;
	baggage?: string;
}

/**
 * RAG Bus interface for event publishing and subscription
 */
export interface RagBus {
	publish<TType extends RAGEventType>(
		type: TType,
		payload: RagEventPayloadMap[TType],
		options?: RagPublishOptions,
	): Promise<void>;
	publishEnvelope(envelope: RagEventEnvelope): Promise<void>;
	bind(handlers: RagEventHandler[]): Promise<() => Promise<void>>;
}
