// Types and interfaces

// Factory functions
export { createRestApiAdapter, createRestApiMemoryStore } from './factory.js';
export { FetchHttpClient } from './http-client.js';
// Implementations
export { RestApiClient as RestApiAdapter } from './rest-adapter.js';
export { RestApiMemoryStore } from './store-adapter.js';
export type {
	ApiResponse,
	AuthMethod,
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
	RequestOptions,
	RestApiConfig,
	RestApiError,
} from './types.js';
