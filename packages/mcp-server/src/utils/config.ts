/**
 * Configuration Utilities
 *
 * Environment variable parsing and configuration
 * validation with proper type safety and defaults.
 */

/**
 * Parse boolean environment variable with fallback
 */
export function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
	if (value === undefined) {
		return defaultValue;
	}
	const normalized = value.trim().toLowerCase();
	if (['1', 'true', 'yes', 'on'].includes(normalized)) {
		return true;
	}
	if (['0', 'false', 'no', 'off'].includes(normalized)) {
		return false;
	}
	return defaultValue;
}

/**
 * Parse number environment variable with fallback
 */
export function parseNumberEnv(value: string | undefined, defaultValue: number): number {
	if (value === undefined) {
		return defaultValue;
	}
	const parsed = Number.parseInt(value, 10);
	return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse port environment variable with validation
 */
export function parsePortEnv(value: string | undefined, defaultPort: number): number {
	const port = parseNumberEnv(value, defaultPort);
	if (port < 1 || port > 65535) {
		throw new Error(`Invalid port number: ${port}. Must be between 1 and 65535.`);
	}
	return port;
}

/**
 * Server configuration interface
 */
export interface ServerConfig {
	// Server settings
	port: number;
	host: string;
	httpEndpoint: string;
	sseEndpoint: string;

	// Feature flags
	metricsEnabled: boolean;
	piecesEnabled: boolean;
	codebaseSearchEnabled: boolean;

	// Logging
	logLevel: string;

	// Ollama
	ollamaHost: string;
	ollamaEnabled: boolean;

	// MCP 2025-06-18 features
	promptsEnabled: boolean;
	resourcesEnabled: boolean;
}

/**
 * Load and validate server configuration from environment
 */
export function loadServerConfig(): ServerConfig {
	return {
		// Server settings
		port: parsePortEnv(process.env.PORT, 3024),
		host: process.env.MCP_HOST ?? '0.0.0.0',
		httpEndpoint: process.env.MCP_HTTP_ENDPOINT ?? '/mcp',
		sseEndpoint: process.env.MCP_SSE_ENDPOINT ?? '/sse',

		// Feature flags
		metricsEnabled: parseBooleanEnv(process.env.MCP_METRICS_ENABLED, false),
		piecesEnabled: parseBooleanEnv(process.env.PIECES_MCP_ENABLED, true),
		codebaseSearchEnabled: parseBooleanEnv(process.env.CODEBASE_SEARCH_ENABLED, true),

		// Logging
		logLevel: process.env.MCP_LOG_LEVEL ?? 'info',

		// Ollama
		ollamaHost: process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434',
		ollamaEnabled: parseBooleanEnv(process.env.OLLAMA_ENABLED, false),

		// MCP 2025-06-18 features
		promptsEnabled: parseBooleanEnv(process.env.MCP_PROMPTS_ENABLED, true),
		resourcesEnabled: parseBooleanEnv(process.env.MCP_RESOURCES_ENABLED, true),
	};
}
