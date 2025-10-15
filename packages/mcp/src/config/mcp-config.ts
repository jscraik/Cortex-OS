/**
 * MCP Configuration types and utilities for testing
 * This is a local copy to avoid importing from outside the package boundary
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
}

export const MCP_ENVIRONMENT_PROFILES = {
	development: 'development',
	production: 'production',
	test: 'test'
} as const;

export function loadMCPConfig(): MCPConfig {
	return {
		promptsListChanged: true,
		resourcesListChanged: true,
		resourcesSubscribe: true,
		toolsListChanged: true,
		toolsVersioning: false,
		promptsVersioning: false,
		resourcesVersioning: false,
		fsWatcherEnabled: true,
		fsWatcherDebounceMs: 100
	};
}

export function loadMCPConfigWithProfile(profile: string): MCPConfig {
	const baseConfig = loadMCPConfig();
	// Apply profile-specific overrides
	if (profile === 'test') {
		return {
			...baseConfig,
			fsWatcherDebounceMs: 10
		};
	}
	return baseConfig;
}

export function validateMCPConfig(config: MCPConfig): boolean {
	return typeof config.promptsListChanged === 'boolean' &&
		typeof config.resourcesListChanged === 'boolean' &&
		typeof config.resourcesSubscribe === 'boolean' &&
		typeof config.toolsListChanged === 'boolean';
}

export function getMCPServerCapabilities(): any {
	const config = loadMCPConfig();
	return {
		prompts: {
			listChanged: config.promptsListChanged
		},
		resources: {
			subscribe: config.resourcesSubscribe,
			listChanged: config.resourcesListChanged
		},
		tools: {
			listChanged: config.toolsListChanged
		}
	};
}