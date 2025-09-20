import { RestApiClient } from './rest-adapter.js';
import { RestApiMemoryStore } from './store-adapter.js';
import type { RestApiAdapter, RestApiConfig } from './types.js';

/**
 * Create a REST API adapter with the given configuration
 */
export function createRestApiAdapter(config: RestApiConfig): RestApiAdapter {
  return new RestApiClient(config);
}

/**
 * Create a REST API memory store with the given configuration
 */
export function createRestApiMemoryStore(
  config: RestApiConfig,
  namespace = 'default',
): RestApiMemoryStore {
  const adapter = createRestApiAdapter(config);
  return new RestApiMemoryStore(adapter, namespace);
}
