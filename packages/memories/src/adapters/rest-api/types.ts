import type { Memory } from '../../domain/types.js';
import type { TextQuery, VectorQuery } from '../../ports/MemoryStore.js';

/**
 * REST API adapter configuration
 */
export interface RestApiConfig {
	/** Base URL for the REST API */
	baseUrl: string;
	/** API key for authentication */
	apiKey?: string;
	/** Timeout for requests in milliseconds */
	timeoutMs?: number;
	/** Maximum number of retries for failed requests */
	maxRetries?: number;
	/** Retry delay in milliseconds (exponential backoff will be applied) */
	retryDelayMs?: number;
	/** Headers to include in all requests */
	headers?: Record<string, string>;
	/** Namespace prefix to prepend to all memory operations */
	namespacePrefix?: string;
	/** Whether to enable compression for requests */
	enableCompression?: boolean;
	/** Custom error handler */
	errorHandler?: (error: RestApiError) => void;
}

/**
 * Authentication methods supported by the REST API adapter
 */
export type AuthMethod = 'bearer' | 'header' | 'query' | 'none';

/**
 * REST API error details
 */
export interface RestApiError {
	/** HTTP status code */
	status: number;
	/** Error message */
	message: string;
	/** Error code (if provided by the API) */
	code?: string;
	/** Request ID for tracing */
	requestId?: string;
	/** Additional error details */
	details?: Record<string, unknown>;
	/** Whether the error is retryable */
	retryable: boolean;
}

/**
 * REST API request options
 */
export interface RequestOptions {
	/** HTTP method */
	method: 'GET' | 'POST' | 'PUT' | 'DELETE';
	/** Request path */
	path: string;
	/** Request body */
	body?: unknown;
	/** Query parameters */
	query?: Record<string, string | number | boolean>;
	/** Additional headers */
	headers?: Record<string, string>;
	/** Timeout override for this request */
	timeoutMs?: number;
	/** Whether to retry this request on failure */
	retry?: boolean;
	/** Expected response type */
	responseType?: 'json' | 'text' | 'blob';
}

/**
 * REST API response wrapper
 */
export interface ApiResponse<T = unknown> {
	/** Response data */
	data: T;
	/** HTTP status code */
	status: number;
	/** Response headers */
	headers: Record<string, string>;
	/** Request ID for tracing */
	requestId?: string;
	/** Timestamp of the response */
	timestamp: string;
}

/**
 * Memory-specific API request types
 */
export interface MemoryCreateRequest {
	/** Memory data (id optional; timestamps set by server) */
	memory: Omit<Memory, 'createdAt' | 'updatedAt'>;
	/** Namespace */
	namespace?: string;
}

export interface MemoryUpdateRequest {
	/** Memory data */
	memory: Partial<Memory>;
	/** Namespace */
	namespace?: string;
}

export interface MemoryGetRequest {
	/** Memory ID */
	id: string;
	/** Namespace */
	namespace?: string;
}

export interface MemoryDeleteRequest {
	/** Memory ID */
	id: string;
	/** Namespace */
	namespace?: string;
}

export interface MemorySearchRequest {
	/** Search query */
	query: TextQuery | VectorQuery;
	/** Namespace */
	namespace?: string;
}

export interface MemoryPurgeRequest {
	/** Timestamp for cutoff */
	nowISO: string;
	/** Namespace */
	namespace?: string;
}

/**
 * Memory-specific API response types
 */
export interface MemoryCreateResponse {
	/** Created memory */
	memory: Memory;
	/** Request ID */
	requestId: string;
}

export interface MemoryGetResponse {
	/** Memory data or null if not found */
	memory: Memory | null;
	/** Request ID */
	requestId: string;
}

export interface MemorySearchResponse {
	/** Search results */
	memories: Memory[];
	/** Total count (if available) */
	total?: number;
	/** Search metadata */
	metadata?: {
		queryTimeMs: number;
		resultCount: number;
		hasMore: boolean;
		cursor?: string;
	};
	/** Request ID */
	requestId: string;
}

export interface MemoryPurgeResponse {
	/** Number of memories purged */
	count: number;
	/** Request ID */
	requestId: string;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
	/** Service status */
	status: 'healthy' | 'degraded' | 'unhealthy';
	/** Service version */
	version: string;
	/** Uptime in seconds */
	uptime: number;
	/** Additional health metrics */
	metrics?: {
		database: 'connected' | 'disconnected';
		lastBackup?: string;
		memoryUsage?: number;
	};
}

/**
 * API rate limit information
 */
export interface RateLimitInfo {
	/** Maximum requests per window */
	limit: number;
	/** Remaining requests in current window */
	remaining: number;
	/** Time when window resets (ISO timestamp) */
	resetAt: string;
	/** Window duration in seconds */
	windowSize: number;
}

/**
 * REST API adapter interface
 */
export interface RestApiAdapter {
	/** Configuration */
	readonly config: RestApiConfig;

	/**
	 * Check if the API is healthy
	 */
	healthCheck(): Promise<HealthCheckResponse>;

	/**
	 * Create a new memory
	 */
	createMemory(request: MemoryCreateRequest): Promise<MemoryCreateResponse>;

	/**
	 * Get a memory by ID
	 */
	getMemory(request: MemoryGetRequest): Promise<MemoryGetResponse>;

	/**
	 * Update an existing memory
	 */
	updateMemory(request: MemoryUpdateRequest): Promise<MemoryCreateResponse>;

	/**
	 * Delete a memory
	 */
	deleteMemory(request: MemoryDeleteRequest): Promise<void>;

	/**
	 * Search memories
	 */
	searchMemories(request: MemorySearchRequest): Promise<MemorySearchResponse>;

	/**
	 * Purge expired memories
	 */
	purgeMemories(request: MemoryPurgeRequest): Promise<MemoryPurgeResponse>;

	/**
	 * Get current rate limit status
	 */
	getRateLimit(): Promise<RateLimitInfo>;

	/**
	 * Close the adapter and cleanup resources
	 */
	close(): Promise<void>;
}

/**
 * HTTP client interface for dependency injection
 */
export interface HttpClient {
	/**
	 * Make an HTTP request
	 */
	request<T>(options: RequestOptions): Promise<ApiResponse<T>>;

	/**
	 * Set default headers
	 */
	setDefaultHeaders(headers: Record<string, string>): void;

	/**
	 * Set authentication
	 */
	setAuth(method: AuthMethod, token: string): void;

	/**
	 * Close the client
	 */
	close(): Promise<void>;
}
