import type { RealtimeMemoryMetricsEvent } from '@cortex-os/contracts';
import type { Memory } from '../domain/types.js';

/**
 * Memory-specific event types for A2A integration
 */
export interface MemoryEvent {
	/** Event type identifier */
	type: MemoryEventType;
	/** Memory ID */
	memoryId: string;
	/** Memory namespace */
	namespace: string;
	/** Event timestamp */
	timestamp: string;
	/** Event data */
	data: unknown;
	/** Optional CloudEvents subject override */
	subject?: string;
	/** Optional dataschema override */
	dataschema?: string;
	/** Optional TTL override */
	ttlMs?: number;
	/** Additional headers to merge into the envelope */
	headers?: Record<string, string>;
}

/**
 * Memory event types
 */
export type MemoryEventType =
	| 'memory.created'
	| 'memory.updated'
	| 'memory.deleted'
	| 'memory.searched'
	| 'memory.purged'
	| 'memory.error'
	| 'memory.realtime.metrics';

/**
 * Memory created event data
 */
export interface MemoryCreatedData {
	memory: Memory;
	embedding?: number[];
	similarity?: number;
}

/**
 * Memory updated event data
 */
export interface MemoryUpdatedData {
	memory: Memory;
	changes: {
		old: Partial<Memory>;
		new: Partial<Memory>;
	};
}

/**
 * Memory deleted event data
 */
export interface MemoryDeletedData {
	memoryId: string;
	reason: 'manual' | 'ttl' | 'purge';
}

/**
 * Memory searched event data
 */
export interface MemorySearchedData {
	query: {
		text?: string;
		vector?: number[];
		limit: number;
		filters?: Record<string, unknown>;
	};
	results: {
		count: number;
		memories: Memory[];
		executionTimeMs: number;
	};
}

/**
 * Memory purged event data
 */
export interface MemoryPurgedData {
	namespace: string;
	count: number;
	timestamp: string;
}

/**
 * Memory error event data
 */
export interface MemoryErrorData {
	error: {
		type: string;
		message: string;
		stack?: string;
	};
	operation: string;
	context?: Record<string, unknown>;
}

export type MemoryRealtimeMetricsData = RealtimeMemoryMetricsEvent;

/**
 * A2A event publisher configuration
 */
export interface A2AEventPublisherConfig {
	/** Event source identifier */
	source: string;
	/** Default topic for events */
	defaultTopic?: string;
	/** Enable event publishing */
	enabled?: boolean;
	/** Event batch size */
	batchSize?: number;
	/** Event batch timeout (ms) */
	batchTimeout?: number;
	/** Retry configuration */
	retry?: {
		maxAttempts: number;
		baseDelayMs: number;
		maxDelayMs: number;
	};
}

/**
 * A2A event publisher interface
 */
export interface A2AEventPublisher {
	/** Publish a memory event */
	publishEvent(event: MemoryEvent): Promise<void>;

	/** Publish multiple memory events */
	publishEvents(events: MemoryEvent[]): Promise<void>;

	/** Start the publisher */
	start(): Promise<void>;

	/** Stop the publisher */
	stop(): Promise<void>;

	/** Check if publisher is running */
	isRunning(): boolean;
}
