/**
 * MCP Configuration for Cortex-OS
 * Handles feature flags and settings for MCP versioned contracts and notifications
 */

export interface MCPConfig {
	// MCP Notification Capabilities
	promptsListChanged: boolean;
	resourcesListChanged: boolean;
	resourcesSubscribe: boolean;
	toolsListChanged: boolean;

	// Versioning Features
	toolsVersioning: boolean;
	promptsVersioning: boolean;
	resourcesVersioning: boolean;

	// File System Watching
	fsWatcherEnabled: boolean;
	fsWatcherDebounceMs: number;
	fsWatcherPaths: {
		prompts?: string;
		resources?: string;
		tools?: string;
	};

	// Refresh Tool
	manualRefreshEnabled: boolean;

	// Security and Performance
	enableSecurityValidation: boolean;
	maxConcurrentNotifications: number;
	notificationTimeoutMs: number;

	// Development and Debugging
	debugNotifications: boolean;
	logNotificationPayloads: boolean;
}

/**
 * Default MCP configuration
 */
export const DEFAULT_MCP_CONFIG: MCPConfig = {
	// Notification capabilities (enabled by default for MCP compliance)
	promptsListChanged: true,
	resourcesListChanged: true,
	resourcesSubscribe: true,
	toolsListChanged: true,

	// Versioning features (tools versioning disabled by default, experimental)
	toolsVersioning: false,
	promptsVersioning: true,
	resourcesVersioning: true,

	// File system watching
	fsWatcherEnabled: true,
	fsWatcherDebounceMs: 250,
	fsWatcherPaths: {
		prompts: 'prompts',
		resources: 'resources',
		tools: 'tools',
	},

	// Refresh tool (always enabled for compatibility)
	manualRefreshEnabled: true,

	// Security and performance
	enableSecurityValidation: true,
	maxConcurrentNotifications: 10,
	notificationTimeoutMs: 5000,

	// Development and debugging
	debugNotifications: false,
	logNotificationPayloads: false,
};

/**
 * Load MCP configuration from environment variables
 */
export function loadMCPConfig(): MCPConfig {
	const config: MCPConfig = { ...DEFAULT_MCP_CONFIG };

	// Notification capabilities
	config.promptsListChanged = parseEnvBoolean(
		'CORTEX_MCP_PROMPTS_LIST_CHANGED',
		config.promptsListChanged,
	);
	config.resourcesListChanged = parseEnvBoolean(
		'CORTEX_MCP_RESOURCES_LIST_CHANGED',
		config.resourcesListChanged,
	);
	config.resourcesSubscribe = parseEnvBoolean(
		'CORTEX_MCP_RESOURCES_SUBSCRIBE',
		config.resourcesSubscribe,
	);
	config.toolsListChanged = parseEnvBoolean(
		'CORTEX_MCP_TOOLS_LIST_CHANGED',
		config.toolsListChanged,
	);

	// Versioning features
	config.toolsVersioning = parseEnvBoolean('CORTEX_MCP_TOOLS_VERSIONING', config.toolsVersioning);
	config.promptsVersioning = parseEnvBoolean(
		'CORTEX_MCP_PROMPTS_VERSIONING',
		config.promptsVersioning,
	);
	config.resourcesVersioning = parseEnvBoolean(
		'CORTEX_MCP_RESOURCES_VERSIONING',
		config.resourcesVersioning,
	);

	// File system watching
	config.fsWatcherEnabled = parseEnvBoolean(
		'CORTEX_MCP_FS_WATCHER_ENABLED',
		config.fsWatcherEnabled,
	);
	config.fsWatcherDebounceMs = parseEnvNumber(
		'CORTEX_MCP_FS_WATCHER_DEBOUNCE_MS',
		config.fsWatcherDebounceMs,
	);
	config.fsWatcherPaths.prompts =
		process.env.CORTEX_MCP_PROMPTS_PATH || config.fsWatcherPaths.prompts;
	config.fsWatcherPaths.resources =
		process.env.CORTEX_MCP_RESOURCES_PATH || config.fsWatcherPaths.resources;
	config.fsWatcherPaths.tools = process.env.CORTEX_MCP_TOOLS_PATH || config.fsWatcherPaths.tools;

	// Refresh tool
	config.manualRefreshEnabled = parseEnvBoolean(
		'CORTEX_MCP_MANUAL_REFRESH_ENABLED',
		config.manualRefreshEnabled,
	);

	// Security and performance
	config.enableSecurityValidation = parseEnvBoolean(
		'CORTEX_MCP_ENABLE_SECURITY_VALIDATION',
		config.enableSecurityValidation,
	);
	config.maxConcurrentNotifications = parseEnvNumber(
		'CORTEX_MCP_MAX_CONCURRENT_NOTIFICATIONS',
		config.maxConcurrentNotifications,
	);
	config.notificationTimeoutMs = parseEnvNumber(
		'CORTEX_MCP_NOTIFICATION_TIMEOUT_MS',
		config.notificationTimeoutMs,
	);

	// Development and debugging
	config.debugNotifications = parseEnvBoolean(
		'CORTEX_MCP_DEBUG_NOTIFICATIONS',
		config.debugNotifications,
	);
	config.logNotificationPayloads = parseEnvBoolean(
		'CORTEX_MCP_LOG_NOTIFICATION_PAYLOADS',
		config.logNotificationPayloads,
	);

	return config;
}

/**
 * Get MCP server capabilities based on configuration
 */
export function getMCPServerCapabilities(config: MCPConfig) {
	return {
		prompts: {
			listChanged: config.promptsListChanged,
		},
		resources: {
			subscribe: config.resourcesSubscribe,
			listChanged: config.resourcesListChanged,
		},
		tools: {
			listChanged: config.toolsListChanged,
		},
	};
}

/**
 * Validate MCP configuration
 */
export function validateMCPConfig(config: MCPConfig): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	// Validate debouncing range
	if (config.fsWatcherDebounceMs < 50 || config.fsWatcherDebounceMs > 5000) {
		errors.push('CORTEX_MCP_FS_WATCHER_DEBOUNCE_MS must be between 50 and 5000ms');
	}

	// Validate notification timeout
	if (config.notificationTimeoutMs < 1000 || config.notificationTimeoutMs > 30000) {
		errors.push('CORTEX_MCP_NOTIFICATION_TIMEOUT_MS must be between 1000 and 30000ms');
	}

	// Validate concurrent notifications
	if (config.maxConcurrentNotifications < 1 || config.maxConcurrentNotifications > 100) {
		errors.push('CORTEX_MCP_MAX_CONCURRENT_NOTIFICATIONS must be between 1 and 100');
	}

	// Validate paths
	if (config.fsWatcherEnabled) {
		if (
			!config.fsWatcherPaths.prompts &&
			!config.fsWatcherPaths.resources &&
			!config.fsWatcherPaths.tools
		) {
			errors.push('At least one watch path must be configured when fsWatcherEnabled is true');
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Create MCP configuration summary for logging
 */
export function createMCPConfigSummary(config: MCPConfig): Record<string, any> {
	return {
		notifications: {
			promptsListChanged: config.promptsListChanged,
			resourcesListChanged: config.resourcesListChanged,
			resourcesSubscribe: config.resourcesSubscribe,
			toolsListChanged: config.toolsListChanged,
		},
		versioning: {
			tools: config.toolsVersioning,
			prompts: config.promptsVersioning,
			resources: config.resourcesVersioning,
		},
		fileWatcher: {
			enabled: config.fsWatcherEnabled,
			debounceMs: config.fsWatcherDebounceMs,
			paths: config.fsWatcherPaths,
		},
		refresh: {
			enabled: config.manualRefreshEnabled,
		},
		security: {
			validationEnabled: config.enableSecurityValidation,
			maxConcurrentNotifications: config.maxConcurrentNotifications,
			timeoutMs: config.notificationTimeoutMs,
		},
		debug: {
			notifications: config.debugNotifications,
			logPayloads: config.logNotificationPayloads,
		},
	};
}

/**
 * Parse boolean from environment variable
 */
function parseEnvBoolean(key: string, defaultValue: boolean): boolean {
	const value = process.env[key];
	if (value === undefined) {
		return defaultValue;
	}
	return value === 'true' || value === '1' || value === 'yes';
}

/**
 * Parse number from environment variable
 */
function parseEnvNumber(key: string, defaultValue: number): number {
	const value = process.env[key];
	if (value === undefined) {
		return defaultValue;
	}
	const parsed = parseInt(value, 10);
	if (Number.isNaN(parsed)) {
		return defaultValue;
	}
	return parsed;
}

/**
 * Configuration for specific environments
 */
export const MCP_ENVIRONMENT_PROFILES: Record<string, Partial<MCPConfig>> = {
	development: {
		debugNotifications: true,
		logNotificationPayloads: true,
		fsWatcherDebounceMs: 100, // Faster feedback in development
		toolsVersioning: true, // Enable experimental features in dev
	},
	test: {
		fsWatcherEnabled: false, // Disable in tests
		enableSecurityValidation: false, // Relax for testing
		debugNotifications: true,
	},
	production: {
		debugNotifications: false,
		logNotificationPayloads: false,
		enableSecurityValidation: true,
		fsWatcherDebounceMs: 500, // More conservative in production
		notificationTimeoutMs: 10000, // Longer timeout for production
	},
};

/**
 * Load configuration with environment profile
 */
export function loadMCPConfigWithProfile(profile?: string): MCPConfig {
	const baseConfig = loadMCPConfig();
	const profileConfig = profile ? MCP_ENVIRONMENT_PROFILES[profile] || {} : {};

	return { ...baseConfig, ...profileConfig };
}

/**
 * Export singleton instance
 */
export const mcpConfig = loadMCPConfig();
