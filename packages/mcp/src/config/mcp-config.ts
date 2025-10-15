/**
 * MCP Configuration types and utilities for testing.
 * Local copy to avoid cross-package imports.
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

	// Notifications
	debugNotifications: boolean;
	logNotificationPayloads: boolean;
	maxConcurrentNotifications: number;
	notificationTimeoutMs: number;

	// Refresh / Security
	manualRefreshEnabled: boolean;
	enableSecurityValidation: boolean;
}

export type MCPConfigValidation = {
	valid: boolean;
	errors: string[];
};

type MCPEnvironmentProfile = Partial<MCPConfig>;

const booleanTrueValues = new Set(['true', '1', 'yes', 'y', 'on']);
const booleanFalseValues = new Set(['false', '0', 'no', 'n', 'off']);

const DEFAULT_WATCH_PATHS = {
	prompts: './prompts',
	resources: './resources',
	tools: './tools',
} as const;

const DEFAULT_NOTIFICATION_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_CONCURRENT_NOTIFICATIONS = 10;

export const DEFAULT_MCP_CONFIG: MCPConfig = {
	promptsListChanged: true,
	resourcesListChanged: true,
	resourcesSubscribe: true,
	toolsListChanged: true,
	toolsVersioning: false,
	promptsVersioning: true,
	resourcesVersioning: true,
	fsWatcherEnabled: true,
	fsWatcherDebounceMs: 250,
	fsWatcherPaths: { ...DEFAULT_WATCH_PATHS },
	debugNotifications: false,
	logNotificationPayloads: false,
	maxConcurrentNotifications: DEFAULT_MAX_CONCURRENT_NOTIFICATIONS,
	notificationTimeoutMs: DEFAULT_NOTIFICATION_TIMEOUT_MS,
	manualRefreshEnabled: true,
	enableSecurityValidation: true,
};

export const MCP_ENVIRONMENT_PROFILES: Record<
	'development' | 'test' | 'production',
	MCPEnvironmentProfile
> = {
	development: {
		debugNotifications: true,
		logNotificationPayloads: true,
		fsWatcherDebounceMs: 100,
		toolsVersioning: true,
		promptsVersioning: true,
		resourcesVersioning: true,
	},
	test: {
		fsWatcherEnabled: false,
		enableSecurityValidation: false,
		debugNotifications: true,
		logNotificationPayloads: false,
	},
	production: {
		debugNotifications: false,
		logNotificationPayloads: false,
		enableSecurityValidation: true,
		fsWatcherDebounceMs: 500,
		notificationTimeoutMs: 10_000,
		maxConcurrentNotifications: 20,
	},
} as const;

const booleanFromEnv = (
	value: string | undefined,
	defaultValue: boolean,
	options?: { invalidFallback?: boolean },
): boolean => {
	if (value === undefined) {
		return defaultValue;
	}

	const normalized = value.trim().toLowerCase();
	if (booleanTrueValues.has(normalized)) {
		return true;
	}
	if (booleanFalseValues.has(normalized)) {
		return false;
	}

	return options?.invalidFallback ?? defaultValue;
};

const numberFromEnv = (
	value: string | undefined,
	defaultValue: number,
	options?: { min?: number; max?: number },
): number => {
	if (value === undefined) {
		return defaultValue;
}

	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return defaultValue;
	}

	if (options?.min !== undefined && parsed < options.min) {
		return defaultValue;
	}
	if (options?.max !== undefined && parsed > options.max) {
		return defaultValue;
	}

	return parsed;
};

const applyEnvironmentOverrides = (baseConfig: MCPConfig, env: NodeJS.ProcessEnv): MCPConfig => {
	const config: MCPConfig = {
		...baseConfig,
		fsWatcherPaths: { ...baseConfig.fsWatcherPaths },
	};

	config.promptsListChanged = booleanFromEnv(
		env.CORTEX_MCP_PROMPTS_LIST_CHANGED,
		config.promptsListChanged,
		{ invalidFallback: false },
	);
	config.resourcesListChanged = booleanFromEnv(
		env.CORTEX_MCP_RESOURCES_LIST_CHANGED,
		config.resourcesListChanged,
		{ invalidFallback: false },
	);
	config.resourcesSubscribe = booleanFromEnv(
		env.CORTEX_MCP_RESOURCES_SUBSCRIBE,
		config.resourcesSubscribe,
		{ invalidFallback: false },
	);
	config.toolsListChanged = booleanFromEnv(
		env.CORTEX_MCP_TOOLS_LIST_CHANGED,
		config.toolsListChanged,
		{ invalidFallback: false },
	);

	config.toolsVersioning = booleanFromEnv(
		env.CORTEX_MCP_TOOLS_VERSIONING,
		config.toolsVersioning,
		{ invalidFallback: false },
	);
	config.promptsVersioning = booleanFromEnv(
		env.CORTEX_MCP_PROMPTS_VERSIONING,
		config.promptsVersioning,
		{ invalidFallback: false },
	);
	config.resourcesVersioning = booleanFromEnv(
		env.CORTEX_MCP_RESOURCES_VERSIONING,
		config.resourcesVersioning,
		{ invalidFallback: false },
	);

	config.fsWatcherEnabled = booleanFromEnv(
		env.CORTEX_MCP_FS_WATCHER_ENABLED,
		config.fsWatcherEnabled,
	);
	config.fsWatcherDebounceMs = numberFromEnv(env.CORTEX_MCP_FS_WATCHER_DEBOUNCE_MS, config.fsWatcherDebounceMs, {
		min: 50,
		max: 5_000,
	});

	config.fsWatcherPaths.prompts =
		env.CORTEX_MCP_PROMPTS_PATH ?? config.fsWatcherPaths.prompts ?? undefined;
	config.fsWatcherPaths.resources =
		env.CORTEX_MCP_RESOURCES_PATH ?? config.fsWatcherPaths.resources ?? undefined;
	config.fsWatcherPaths.tools = env.CORTEX_MCP_TOOLS_PATH ?? config.fsWatcherPaths.tools ?? undefined;

	config.debugNotifications = booleanFromEnv(
		env.CORTEX_MCP_DEBUG_NOTIFICATIONS,
		config.debugNotifications,
	);
	config.logNotificationPayloads = booleanFromEnv(
		env.CORTEX_MCP_LOG_NOTIFICATION_PAYLOADS,
		config.logNotificationPayloads,
	);
	config.maxConcurrentNotifications = numberFromEnv(
		env.CORTEX_MCP_MAX_CONCURRENT_NOTIFICATIONS,
		config.maxConcurrentNotifications,
		{ min: 1, max: 100 },
	);
	config.notificationTimeoutMs = numberFromEnv(
		env.CORTEX_MCP_NOTIFICATION_TIMEOUT_MS,
		config.notificationTimeoutMs,
		{ min: 1_000, max: 30_000 },
	);

	config.manualRefreshEnabled = booleanFromEnv(
		env.CORTEX_MCP_MANUAL_REFRESH_ENABLED,
		config.manualRefreshEnabled,
	);
	config.enableSecurityValidation = booleanFromEnv(
		env.CORTEX_MCP_ENABLE_SECURITY_VALIDATION,
		config.enableSecurityValidation,
	);

	return config;
};

export function loadMCPConfig(): MCPConfig {
	const base = { ...DEFAULT_MCP_CONFIG, fsWatcherPaths: { ...DEFAULT_MCP_CONFIG.fsWatcherPaths } };
	const config = applyEnvironmentOverrides(base, process.env);
	return config;
}

export function loadMCPConfigWithProfile(profile?: string): MCPConfig {
	const profileOverrides =
		profile && profile in MCP_ENVIRONMENT_PROFILES
			? MCP_ENVIRONMENT_PROFILES[profile as keyof typeof MCP_ENVIRONMENT_PROFILES]
			: {};

	const base: MCPConfig = {
		...DEFAULT_MCP_CONFIG,
		...profileOverrides,
		fsWatcherPaths: {
			...DEFAULT_MCP_CONFIG.fsWatcherPaths,
			...(profileOverrides.fsWatcherPaths ?? {}),
		},
	};

	return applyEnvironmentOverrides(base, process.env);
}

export function validateMCPConfig(config: MCPConfig): MCPConfigValidation {
	const errors: string[] = [];

	if (config.fsWatcherDebounceMs < 50 || config.fsWatcherDebounceMs > 5_000) {
		errors.push('CORTEX_MCP_FS_WATCHER_DEBOUNCE_MS must be between 50 and 5000ms');
	}

	if (
		config.maxConcurrentNotifications < 1 ||
		config.maxConcurrentNotifications > 100
	) {
		errors.push('CORTEX_MCP_MAX_CONCURRENT_NOTIFICATIONS must be between 1 and 100');
	}

	if (config.notificationTimeoutMs < 1_000 || config.notificationTimeoutMs > 30_000) {
		errors.push('CORTEX_MCP_NOTIFICATION_TIMEOUT_MS must be between 1000 and 30000ms');
	}

	const hasWatcherPaths =
		Boolean(config.fsWatcherPaths.prompts) ||
		Boolean(config.fsWatcherPaths.resources) ||
		Boolean(config.fsWatcherPaths.tools);

	if (config.fsWatcherEnabled && !hasWatcherPaths) {
		errors.push('At least one watch path must be configured when fsWatcherEnabled is true');
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

export function getMCPServerCapabilities(config: MCPConfig = loadMCPConfig()): {
	prompts: { listChanged: boolean };
	resources: { subscribe: boolean; listChanged: boolean };
	tools: { listChanged: boolean };
} {
	return {
		prompts: {
			listChanged: Boolean(config.promptsListChanged),
		},
		resources: {
			subscribe: Boolean(config.resourcesSubscribe),
			listChanged: Boolean(config.resourcesListChanged),
		},
		tools: {
			listChanged: Boolean(config.toolsListChanged),
		},
	};
}

export function createMCPConfigSummary(config: MCPConfig): Record<string, unknown> {
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
			paths: { ...config.fsWatcherPaths },
		},
		refresh: {
			manualRefreshEnabled: config.manualRefreshEnabled,
		},
		security: {
			enableSecurityValidation: config.enableSecurityValidation,
		},
		debug: {
			debugNotifications: config.debugNotifications,
			logNotificationPayloads: config.logNotificationPayloads,
			maxConcurrentNotifications: config.maxConcurrentNotifications,
			notificationTimeoutMs: config.notificationTimeoutMs,
		},
	};
}
