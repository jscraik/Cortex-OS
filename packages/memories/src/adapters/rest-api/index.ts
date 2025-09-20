// Types and interfaces
export type {
  RestApiConfig,
  AuthMethod,
  RestApiError,
  RequestOptions,
  ApiResponse,
  MemoryCreateRequest,
  MemoryCreateResponse,
  MemoryGetRequest,
  MemoryGetResponse,
  MemoryUpdateRequest,
  MemorySearchRequest,
  MemorySearchResponse,
  MemoryDeleteRequest,
  MemoryPurgeRequest,
  MemoryPurgeResponse,
  HealthCheckResponse,
  RateLimitInfo,
  HttpClient,
} from './types.js';

// Implementations
export { RestApiClient as RestApiAdapter } from './rest-adapter.js';
export { FetchHttpClient } from './http-client.js';
export { RestApiMemoryStore } from './store-adapter.js';

// Factory functions
export { createRestApiAdapter, createRestApiMemoryStore } from './factory.js';