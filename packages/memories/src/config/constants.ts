/**
 * Environment variable constants for the memories package
 *
 * This file centralizes all environment variable names and provides
 * standardized naming with legacy fallbacks.
 */

// Store Configuration
export const ENV = {
	// Store adapter
	STORE_ADAPTER: 'MEMORIES_STORE_ADAPTER',
	STORE_ADAPTER_LEGACY: 'MEMORIES_ADAPTER',
	STORE_ADAPTER_LEGACY2: 'MEMORY_STORE',
	SHORT_STORE: 'MEMORIES_SHORT_STORE',
	FALLBACK_STORE: 'MEMORIES_FALLBACK_STORE',

	// Store types
	SQLITE_PATH: 'MEMORIES_SQLITE_PATH',
	VECTOR_DIM: 'MEMORIES_VECTOR_DIM',
	QDRANT_COLLECTION: 'MEMORIES_QDRANT_COLLECTION',
	QDRANT_DISTANCE: 'MEMORIES_QDRANT_DISTANCE',
	QDRANT_ON_DISK: 'MEMORIES_QDRANT_ON_DISK',
	QDRANT_HNSW_M: 'MEMORIES_QDRANT_HNSW_M',
	QDRANT_HNSW_EF_CONSTRUCT: 'MEMORIES_QDRANT_HNSW_EF_CONSTRUCT',

	// Local Memory Service
	LOCAL_MEMORY_BASE_URL: 'LOCAL_MEMORY_BASE_URL',
	LOCAL_MEMORY_API_KEY: 'LOCAL_MEMORY_API_KEY',
	LOCAL_MEMORY_NAMESPACE: 'LOCAL_MEMORY_NAMESPACE',

	// Database
	DATABASE_URL: 'DATABASE_URL',

	// Encryption
	ENCRYPTION_SECRET: 'MEMORIES_ENCRYPTION_SECRET',
	ENCRYPTION_NAMESPACES: 'MEMORIES_ENCRYPTION_NAMESPACES',
	ENCRYPTION_REGEX: 'MEMORIES_ENCRYPTION_REGEX',
	ENCRYPT_VECTORS: 'MEMORIES_ENCRYPT_VECTORS',
	ENCRYPT_TAGS: 'MEMORIES_ENCRYPT_TAGS',
} as const;

// Embedder Configuration
export const EMBEDDER_ENV = {
	// Embedder selection
	EMBEDDER: 'MEMORIES_EMBEDDER',

	// MLX Configuration
	MLX_MODEL: 'MLX_MODEL',
	MLX_EMBED_BASE_URL: 'MLX_EMBED_BASE_URL',
	MLX_MODELS_DIR: 'MLX_MODELS_DIR',
	MLX_CACHE_DIR: 'MLX_CACHE_DIR',
	MLX_MAX_MEMORY: 'MLX_MAX_MEMORY',

	// Python environment
	PYTHON_EXECUTABLE: 'PYTHON_EXEC',
	PYTHON_MODULE_PATH: 'PYTHONPATH',
} as const;

// Ollama Configuration
export const OLLAMA_ENV = {
	BASE_URL: 'OLLAMA_BASE_URL',
	MODEL: 'OLLAMA_MODEL',
} as const;

// Observability Configuration
export const OTEL_ENV = {
	TRACING_ENABLED: 'OTEL_TRACING_ENABLED',
	METRICS_ENABLED: 'OTEL_METRICS_ENABLED',
	LOGGING_ENABLED: 'OTEL_LOGGING_ENABLED',
	SAMPLE_RATE: 'OTEL_SAMPLE_RATE',
	SERVICE_NAME: 'OTEL_SERVICE_NAME',
	RESOURCE_ATTRIBUTES: 'OTEL_RESOURCE_ATTRIBUTES',
} as const;

// External Service Configuration
export const EXTERNAL_ENV = {
	// Vector DBs
	NEO4J_URI: 'NEO4J_URI',
	NEO4J_USERNAME: 'NEO4J_USERNAME',
	NEO4J_PASSWORD: 'NEO4J_PASSWORD',
	QDRANT_URL: 'QDRANT_URL',
	QDRANT_API_KEY: 'QDRANT_API_KEY',

	// Model APIs
	OPENAI_API_KEY: 'OPENAI_API_KEY',
	ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY',

	// Services
	MODEL_GATEWAY_URL: 'MODEL_GATEWAY_URL',

	// Decay Configuration
	DECAY_ENABLED: 'MEMORIES_DECAY_ENABLED',
	DECAY_HALFLIFE_MS: 'MEMORIES_DECAY_HALFLIFE_MS',
} as const;

// Development/Testing
export const DEV_ENV = {
	VECTOR_SIZE: 'VECTOR_SIZE',
	RERANK_ENABLED: 'MEMORIES_RERANK_ENABLED',
} as const;

/**
 * Helper functions for environment variable access with deprecation warnings
 */
export function getEnvWithFallback(
	primary: string,
	fallbacks: string[],
	options: {
		deprecationWarning?: boolean;
		context?: string;
	} = {},
): string | undefined {
	const { deprecationWarning = true, context = '' } = options;

	// Check primary first
	if (process.env[primary]) {
		return process.env[primary];
	}

	// Check fallbacks
	for (const fallback of fallbacks) {
		if (process.env[fallback]) {
			if (deprecationWarning) {
				const contextSuffix = context ? ` Context: ${context}` : '';
				console.warn(
					`[DEPRECATED] Environment variable "${fallback}" is deprecated. Use "${primary}" instead.${contextSuffix}`,
				);
			}
			return process.env[fallback];
		}
	}

	return undefined;
}

/**
 * Get store adapter type
 */
export function getStoreAdapter(): string | undefined {
	return process.env[ENV.STORE_ADAPTER];
}

/**
 * Get MLX service URL
 */
export function getMLXServiceURL(): string | undefined {
	return process.env[EMBEDDER_ENV.MLX_EMBED_BASE_URL];
}

/**
 * Get Python executable
 */
export function getPythonExecutable(): string | undefined {
	return process.env[EMBEDDER_ENV.PYTHON_EXECUTABLE];
}
