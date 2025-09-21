import type { Span, Tracer } from '@opentelemetry/api';

/**
 * Observability configuration options
 */
export interface ObservabilityConfig {
	/** Enable tracing */
	tracing?: boolean;
	/** Enable metrics collection */
	metrics?: boolean;
	/** Enable logging */
	logging?: boolean;
	/** Sample rate for tracing (0-1) */
	sampleRate?: number;
	/** Custom service name */
	serviceName?: string;
	/** Custom tags/attributes */
	tags?: Record<string, string>;
}

/**
 * Memory operation metrics
 */
export interface MemoryMetrics {
	/** Operation name */
	operation: string;
	/** Duration in milliseconds */
	duration: number;
	/** Success status */
	success: boolean;
	/** Memory size in bytes */
	memorySize?: number;
	/** Namespace */
	namespace: string;
	/** Custom attributes */
	attributes?: Record<string, unknown>;
}

/**
 * Memory tracing span attributes
 */
export interface MemorySpanAttributes {
	/** Memory ID */
	'memory.id'?: string;
	/** Memory kind */
	'memory.kind'?: string;
	/** Memory namespace */
	'memory.namespace': string;
	/** Operation type */
	'operation.type': string;
	/** Query text for search operations */
	'query.text'?: string;
	/** Query limit */
	'query.limit'?: number;
	/** Result count */
	'result.count'?: number;
	/** Error type */
	'error.type'?: string;
	/** Error message */
	'error.message'?: string;
}

/**
 * Observability provider interface
 */
export interface ObservabilityProvider {
	/** Get tracer instance */
	getTracer(): Tracer;
	/** Create a span with attributes */
	createSpan<T>(
		name: string,
		fn: (span: Span) => Promise<T>,
		attributes?: MemorySpanAttributes,
	): Promise<T>;
	/** Record metrics */
	recordMetrics(metrics: MemoryMetrics): void;
	/** Check if observability is enabled */
	isEnabled(): boolean;
}

/**
 * Memory observability wrapper
 */
export interface MemoryObservability {
	/** Wrap memory store operations with observability */
	wrapStoreOperation<T>(
		operation: string,
		fn: () => Promise<T>,
		namespace: string,
		attributes?: MemorySpanAttributes,
	): Promise<T>;
	/** Record custom metrics */
	recordMetrics(metrics: MemoryMetrics): void;
	/** Get current observability provider */
	getProvider(): ObservabilityProvider | null;
}

/**
 * Observability event types
 */
export type ObservabilityEvent =
	| 'memory.created'
	| 'memory.updated'
	| 'memory.deleted'
	| 'memory.searched'
	| 'memory.purged'
	| 'error.occurred';

/**
 * Observability event data
 */
export interface ObservabilityEventData {
	/** Event type */
	type: ObservabilityEvent;
	/** Timestamp */
	timestamp: string;
	/** Namespace */
	namespace: string;
	/** Memory ID if applicable */
	memoryId?: string;
	/** Duration in milliseconds */
	duration?: number;
	/** Success status */
	success?: boolean;
	/** Error details */
	error?: {
		type: string;
		message: string;
		stack?: string;
	};
	/** Additional attributes */
	attributes?: Record<string, unknown>;
}
