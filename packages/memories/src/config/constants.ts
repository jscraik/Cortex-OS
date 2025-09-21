/**
 * Environment variable constants for the memories package
 *
 * This file centralizes all environment variable names and provides
 * standardized naming with legacy fallbacks.
 */

// Store Configuration
export const ENV = {
	// Primary store adapter (standardized)
	STORE_ADAPTER: 'MEMORIES_STORE_ADAPTER',
	// Legacy fallbacks
	STORE_ADAPTER_LEGACY: 'MEMORIES_ADAPTER',
	STORE_ADAPTER_LEGACY2: 'MEMORY_STORE',

	// Store types
	SQLITE_PATH: 'MEMORIES_SQLITE_PATH',
	VECTOR_DIM: 'MEMORIES_VECTOR_DIM',

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
	MLX_EMBED_BASE_URL: 'MLX_EMBED_BASE_URL', // Standardized
	MLX_SERVICE_URL: 'MLX_SERVICE_URL', // Legacy fallback
	MLX_MODELS_DIR: 'MLX_MODELS_DIR',
	MLX_CACHE_DIR: 'MLX_CACHE_DIR',
	MLX_MAX_MEMORY: 'MLX_MAX_MEMORY',

	// Model paths (legacy - consider consolidating)
	MLX_MODEL_QWEN3_0_6B_PATH: 'MLX_MODEL_QWEN3_0_6B_PATH',
	MLX_MODEL_QWEN3_4B_PATH: 'MLX_MODEL_QWEN3_4B_PATH',
	MLX_MODEL_QWEN3_8B_PATH: 'MLX_MODEL_QWEN3_8B_PATH',

	// Python environment (standardized)
	PYTHON_EXECUTABLE: 'PYTHON_EXEC',
	PYTHON_MODULE_PATH: 'PYTHONPATH',

	// Legacy Python variables (deprecated)
	PYTHON_EXEC_LEGACY: 'PYTHON_PATH',
	MLX_PYTHON_PATH: 'MLX_PYTHON_PATH',
} as const;

// Ollama Configuration
export const OLLAMA_ENV = {
	BASE_URL: 'OLLAMA_BASE_URL',
	MODEL: 'OLLAMA_MODEL',
	// Legacy
	ENDPOINT: 'OLLAMA_ENDPOINT', // Documented but not used
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
				console.warn(
					`[DEPRECATED] Environment variable "${fallback}" is deprecated. ` +
						`Use "${primary}" instead.${context ? ` Context: ${context}` : ''}`,
				);
			}
			return process.env[fallback];
		}
	}

	return undefined;
}

/**
 * Get store adapter type with proper fallback handling
 */
export function getStoreAdapter(): string | undefined {
	return getEnvWithFallback(
		ENV.STORE_ADAPTER,
		[ENV.STORE_ADAPTER_LEGACY, ENV.STORE_ADAPTER_LEGACY2],
		{ context: 'store adapter selection' },
	);
}

/**
 * Get MLX service URL with proper fallback handling
 */
export function getMLXServiceURL(): string | undefined {
	return getEnvWithFallback(EMBEDDER_ENV.MLX_EMBED_BASE_URL, [EMBEDDER_ENV.MLX_SERVICE_URL], {
		context: 'MLX embedding service URL',
	});
}

/**
 * Get Python executable with proper fallback handling
 */
export function getPythonExecutable(): string | undefined {
	return getEnvWithFallback(
		EMBEDDER_ENV.PYTHON_EXECUTABLE,
		[EMBEDDER_ENV.PYTHON_EXEC_LEGACY, EMBEDDER_ENV.MLX_PYTHON_PATH],
		{ context: 'Python executable path' },
	);
}
