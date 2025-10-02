import { FetchHttpClient } from './http-client.js';
import type {
	HealthCheckResponse,
	HttpClient,
	MemoryCreateRequest,
	MemoryCreateResponse,
	MemoryDeleteRequest,
	MemoryGetRequest,
	MemoryGetResponse,
	MemoryPurgeRequest,
	MemoryPurgeResponse,
	MemorySearchRequest,
	MemorySearchResponse,
	MemoryUpdateRequest,
	RateLimitInfo,
	RestApiAdapter,
	RestApiConfig,
	RestApiError,
} from './types.js';

/**
 * REST API client implementing the RestApiAdapter interface
 */
type RestApiConfigResolved = Omit<
	Required<RestApiConfig>,
	'apiKey' | 'headers' | 'namespacePrefix' | 'errorHandler'
> &
	Pick<RestApiConfig, 'apiKey' | 'headers' | 'namespacePrefix' | 'errorHandler'>;

export class RestApiClient implements RestApiAdapter {
	readonly config: RestApiConfigResolved;
	private readonly client: HttpClient;
	private closed = false;

	constructor(config: RestApiConfig) {
		this.config = {
			timeoutMs: 30000,
			maxRetries: 3,
			retryDelayMs: 1000,
			enableCompression: true,
			namespacePrefix: '',
			...config,
		};

		this.client = new FetchHttpClient(this.config.baseUrl);
		this.setupClient();
	}

	/**
	 * Get the HTTP client (for testing purposes)
	 */
	getHttpClient(): HttpClient {
		return this.client;
	}

	/**
	 * Check if the API is healthy with brAInwav branding
	 */
	async healthCheck(): Promise<HealthCheckResponse> {
		const resp = await this.makeRequest<HealthCheckResponse>({
			method: 'GET',
			path: '/health',
		});

		// Add brAInwav branding to health response
		return {
			...resp.data,
			status: `brAInwav memory-core: ${resp.data.status || 'healthy'}`,
		};
	}

	/**
	 * Create a new memory with brAInwav branding
	 */
	async createMemory(request: MemoryCreateRequest): Promise<MemoryCreateResponse> {
		const namespace = this.resolveNamespace(request.namespace);
		const response = await this.makeRequest<{
			memory: MemoryCreateResponse['memory'];
			requestId: string;
		}>({
			method: 'POST',
			path: `/api/v1/memories`,
			body: {
				memory: {
					...request.memory,
					// Add brAInwav provenance tracking
					provenance: {
						...request.memory.provenance,
						source: request.memory.provenance?.source || 'system',
						actor: request.memory.provenance?.actor || 'brAInwav-memory-core',
					},
				},
				namespace,
			},
		});

		// Return the memory with proper timestamps and brAInwav branding
		return {
			memory: {
				...response.data.memory,
				createdAt: response.data.memory.createdAt || new Date().toISOString(),
				updatedAt: response.data.memory.updatedAt || new Date().toISOString(),
			},
			requestId: response.data.requestId,
		};
	}

	/**
	 * Get a memory by ID
	 */
	async getMemory(request: MemoryGetRequest): Promise<MemoryGetResponse> {
		const namespace = this.resolveNamespace(request.namespace);
		const resp = await this.makeRequest<MemoryGetResponse>({
			method: 'GET',
			path: `/api/v1/memories/${encodeURIComponent(request.id)}`,
			query: namespace ? { namespace } : undefined,
		});
		return resp.data;
	}

	/**
	 * Update an existing memory
	 */
	async updateMemory(request: MemoryUpdateRequest): Promise<MemoryCreateResponse> {
		const namespace = this.resolveNamespace(request.namespace);

		// Extract the memory ID
		if (!request.memory.id) {
			throw new Error('Memory ID is required for update');
		}

		const response = await this.makeRequest<{
			memory: MemoryCreateResponse['memory'];
			requestId: string;
		}>({
			method: 'PUT',
			path: `/api/v1/memories/${encodeURIComponent(request.memory.id)}`,
			body: {
				memory: request.memory,
				namespace,
			},
		});

		return {
			memory: {
				...response.data.memory,
				updatedAt: response.data.memory.updatedAt || new Date().toISOString(),
			},
			requestId: response.data.requestId,
		};
	}

	/**
	 * Delete a memory
	 */
	async deleteMemory(request: MemoryDeleteRequest): Promise<void> {
		const namespace = this.resolveNamespace(request.namespace);
		await this.makeRequest<void>({
			method: 'DELETE',
			path: `/api/v1/memories/${encodeURIComponent(request.id)}`,
			query: namespace ? { namespace } : undefined,
		});
	}

	/**
	 * Search memories
	 */
	async searchMemories(request: MemorySearchRequest): Promise<MemorySearchResponse> {
		const namespace = this.resolveNamespace(request.namespace);
		const isVectorQuery = 'vector' in request.query;

		const body: Record<string, unknown> = {
			query: request.query,
			namespace,
		};

		const response = await this.makeRequest<MemorySearchResponse>({
			method: 'POST',
			path: isVectorQuery ? '/api/v1/memories/search/vector' : '/api/v1/memories/search/text',
			body,
		});

		return response.data;
	}

	/**
	 * Purge expired memories
	 */
	async purgeMemories(request: MemoryPurgeRequest): Promise<MemoryPurgeResponse> {
		const namespace = this.resolveNamespace(request.namespace);
		const resp = await this.makeRequest<MemoryPurgeResponse>({
			method: 'DELETE',
			path: '/api/v1/memories/expired',
			query: {
				now: request.nowISO,
				...(namespace ? { namespace } : {}),
			},
		});
		return resp.data;
	}

	/**
	 * Get current rate limit status
	 */
	async getRateLimit(): Promise<RateLimitInfo> {
		const resp = await this.makeRequest<RateLimitInfo>({
			method: 'GET',
			path: '/api/v1/rate-limit',
		});
		return resp.data;
	}

	/**
	 * Close the adapter and cleanup resources
	 */
	async close(): Promise<void> {
		if (!this.closed) {
			this.closed = true;
			await this.client.close();
		}
	}

	/**
	 * Setup the HTTP client with authentication and default headers
	 */
	private setupClient(): void {
		// Set default headers
		const defaultHeaders: Record<string, string> = {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			'User-Agent': 'brAInwav-cortex-os-memories/1.0.0',
			'X-brAInwav-Source': 'memory-adapter',
		};

		if (this.config.enableCompression) {
			defaultHeaders['Accept-Encoding'] = 'gzip, deflate';
		}

		if (this.config.headers) {
			Object.assign(defaultHeaders, this.config.headers);
		}

		this.client.setDefaultHeaders(defaultHeaders);

		// Set authentication
		if (this.config.apiKey) {
			this.client.setAuth('header', this.config.apiKey);
		}
	}

	/**
	 * Make a request with retry logic
	 */
	private async makeRequest<T>(
		options: Omit<Parameters<HttpClient['request']>[0], 'retry'>,
	): Promise<{ data: T; headers: Record<string, string>; status: number }> {
		if (this.closed) {
			throw new Error('Adapter is closed');
		}

		let lastError: RestApiError | undefined;
		let delay = this.config.retryDelayMs;

		for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
			try {
				const response = await this.client.request<T>({
					...options,
					retry: attempt < this.config.maxRetries,
				});

				// Check rate limit headers
				const rateLimitHeaders = this.parseRateLimitHeaders(response.headers);
				if (rateLimitHeaders.remaining === 0 && attempt < this.config.maxRetries) {
					// Wait until rate limit resets
					const resetTime = new Date(rateLimitHeaders.resetAt).getTime();
					const waitTime = Math.max(0, resetTime - Date.now());
					await this.sleep(waitTime);
					continue;
				}

				return response;
			} catch (error) {
				lastError = error as RestApiError;

				if (!this.shouldRetry(lastError, attempt)) break;

				// Call error handler if provided
				if (this.config.errorHandler) {
					try {
						this.config.errorHandler(lastError);
					} catch {
						// Ignore error handler errors
					}
				}

				// Exponential backoff with jitter
				const jitter = Math.random() * 0.1 * delay;
				await this.sleep(delay + jitter);
				delay *= 2;
			}
		}

		throw lastError || new Error('Unknown error occurred');
	}

	/** Determine whether we should retry based on error and attempt */
	private shouldRetry(err: RestApiError, attempt: number): boolean {
		if (!err.retryable) return false;
		return attempt < this.config.maxRetries;
	}

	/**
	 * Parse rate limit headers
	 */
	private parseRateLimitHeaders(headers: Record<string, string>): RateLimitInfo {
		const limit = parseInt(headers['x-ratelimit-limit'] || '1000', 10);
		const remaining = parseInt(headers['x-ratelimit-remaining'] || '1000', 10);
		const resetAt = headers['x-ratelimit-reset'] || new Date(Date.now() + 3600000).toISOString();
		const windowSize = parseInt(headers['x-ratelimit-window'] || '3600', 10);

		return {
			limit,
			remaining,
			resetAt,
			windowSize,
		};
	}

	/**
	 * Resolve namespace with prefix
	 */
	private resolveNamespace(namespace?: string): string | undefined {
		if (!namespace) {
			return undefined;
		}
		return this.config.namespacePrefix ? `${this.config.namespacePrefix}${namespace}` : namespace;
	}

	/**
	 * Sleep for a specified duration
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
