/**
 * MCP Configuration Tests
 * Tests for environment-based configuration and validation
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	createMCPConfigSummary,
	DEFAULT_MCP_CONFIG,
	getMCPServerCapabilities,
	loadMCPConfig,
	loadMCPConfigWithProfile,
	MCP_ENVIRONMENT_PROFILES,
	type MCPConfig,
	validateMCPConfig,
} from '../../apps/cortex-os/src/config/mcp.js';

describe('MCP Configuration', () => {
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(() => {
		// Store original environment
		originalEnv = { ...process.env };
	});

	afterEach(() => {
		// Restore original environment
		process.env = originalEnv;
	});

	describe('Default Configuration', () => {
		it('should have sensible default values', () => {
			expect(DEFAULT_MCP_CONFIG.promptsListChanged).toBe(true);
			expect(DEFAULT_MCP_CONFIG.resourcesListChanged).toBe(true);
			expect(DEFAULT_MCP_CONFIG.resourcesSubscribe).toBe(true);
			expect(DEFAULT_MCP_CONFIG.toolsListChanged).toBe(true);

			expect(DEFAULT_MCP_CONFIG.toolsVersioning).toBe(false); // Experimental
			expect(DEFAULT_MCP_CONFIG.promptsVersioning).toBe(true);
			expect(DEFAULT_MCP_CONFIG.resourcesVersioning).toBe(true);

			expect(DEFAULT_MCP_CONFIG.fsWatcherEnabled).toBe(true);
			expect(DEFAULT_MCP_CONFIG.fsWatcherDebounceMs).toBe(250);

			expect(DEFAULT_MCP_CONFIG.manualRefreshEnabled).toBe(true);
			expect(DEFAULT_MCP_CONFIG.enableSecurityValidation).toBe(true);
		});
	});

	describe('Environment Variable Loading', () => {
		it('should load configuration from environment variables', () => {
			process.env.CORTEX_MCP_PROMPTS_LIST_CHANGED = 'false';
			process.env.CORTEX_MCP_TOOLS_VERSIONING = 'true';
			process.env.CORTEX_MCP_FS_WATCHER_DEBOUNCE_MS = '500';
			process.env.CORTEX_MCP_DEBUG_NOTIFICATIONS = 'true';

			const config = loadMCPConfig();

			expect(config.promptsListChanged).toBe(false);
			expect(config.toolsVersioning).toBe(true);
			expect(config.fsWatcherDebounceMs).toBe(500);
			expect(config.debugNotifications).toBe(true);
		});

		it('should use default values when environment variables are not set', () => {
			// Clear relevant environment variables
			delete process.env.CORTEX_MCP_PROMPTS_LIST_CHANGED;
			delete process.env.CORTEX_MCP_TOOLS_VERSIONING;
			delete process.env.CORTEX_MCP_FS_WATCHER_DEBOUNCE_MS;

			const config = loadMCPConfig();

			expect(config.promptsListChanged).toBe(DEFAULT_MCP_CONFIG.promptsListChanged);
			expect(config.toolsVersioning).toBe(DEFAULT_MCP_CONFIG.toolsVersioning);
			expect(config.fsWatcherDebounceMs).toBe(DEFAULT_MCP_CONFIG.fsWatcherDebounceMs);
		});

		it('should parse boolean environment variables correctly', () => {
			const booleanTestCases: [string, boolean][] = [
				['true', true],
				['1', true],
				['yes', true],
				['false', false],
				['0', false],
				['no', false],
				['', false],
				['invalid', false],
			];

			booleanTestCases.forEach(([value, expected]) => {
				process.env.CORTEX_MCP_PROMPTS_LIST_CHANGED = value;
				const config = loadMCPConfig();
				expect(config.promptsListChanged).toBe(expected);
			});
		});

		it('should parse number environment variables correctly', () => {
			process.env.CORTEX_MCP_FS_WATCHER_DEBOUNCE_MS = '1000';
			process.env.CORTEX_MCP_MAX_CONCURRENT_NOTIFICATIONS = '25';
			process.env.CORTEX_MCP_NOTIFICATION_TIMEOUT_MS = '15000';

			const config = loadMCPConfig();

			expect(config.fsWatcherDebounceMs).toBe(1000);
			expect(config.maxConcurrentNotifications).toBe(25);
			expect(config.notificationTimeoutMs).toBe(15000);
		});

		it('should handle invalid number environment variables', () => {
			process.env.CORTEX_MCP_FS_WATCHER_DEBOUNCE_MS = 'invalid-number';
			process.env.CORTEX_MCP_MAX_CONCURRENT_NOTIFICATIONS = 'not-a-number';

			const config = loadMCPConfig();

			// Should fall back to defaults
			expect(config.fsWatcherDebounceMs).toBe(DEFAULT_MCP_CONFIG.fsWatcherDebounceMs);
			expect(config.maxConcurrentNotifications).toBe(DEFAULT_MCP_CONFIG.maxConcurrentNotifications);
		});

		it('should load custom watch paths', () => {
			process.env.CORTEX_MCP_PROMPTS_PATH = '/custom/prompts';
			process.env.CORTEX_MCP_RESOURCES_PATH = '/custom/resources';
			process.env.CORTEX_MCP_TOOLS_PATH = '/custom/tools';

			const config = loadMCPConfig();

			expect(config.fsWatcherPaths.prompts).toBe('/custom/prompts');
			expect(config.fsWatcherPaths.resources).toBe('/custom/resources');
			expect(config.fsWatcherPaths.tools).toBe('/custom/tools');
		});
	});

	describe('Server Capabilities', () => {
		it('should generate server capabilities from configuration', () => {
			const config: MCPConfig = {
				...DEFAULT_MCP_CONFIG,
				promptsListChanged: true,
				resourcesListChanged: true,
				resourcesSubscribe: true,
				toolsListChanged: true,
			};

			const capabilities = getMCPServerCapabilities(config);

			expect(capabilities).toEqual({
				prompts: {
					listChanged: true,
				},
				resources: {
					subscribe: true,
					listChanged: true,
				},
				tools: {
					listChanged: true,
				},
			});
		});

		it('should reflect disabled capabilities in server config', () => {
			const config: MCPConfig = {
				...DEFAULT_MCP_CONFIG,
				promptsListChanged: false,
				resourcesSubscribe: false,
				toolsListChanged: false,
			};

			const capabilities = getMCPServerCapabilities(config);

			expect(capabilities).toEqual({
				prompts: {
					listChanged: false,
				},
				resources: {
					subscribe: false,
					listChanged: true, // Default value
				},
				tools: {
					listChanged: false,
				},
			});
		});
	});

	describe('Configuration Validation', () => {
		it('should validate correct configuration', () => {
			const config: MCPConfig = {
				...DEFAULT_MCP_CONFIG,
				fsWatcherDebounceMs: 500,
				notificationTimeoutMs: 10000,
				maxConcurrentNotifications: 50,
			};

			const validation = validateMCPConfig(config);

			expect(validation.valid).toBe(true);
			expect(validation.errors).toHaveLength(0);
		});

		it('should detect invalid debounce range', () => {
			const config: MCPConfig = {
				...DEFAULT_MCP_CONFIG,
				fsWatcherDebounceMs: 10, // Too low
			};

			const validation = validateMCPConfig(config);

			expect(validation.valid).toBe(false);
			expect(validation.errors).toContain(
				'CORTEX_MCP_FS_WATCHER_DEBOUNCE_MS must be between 50 and 5000ms',
			);
		});

		it('should detect invalid notification timeout', () => {
			const config: MCPConfig = {
				...DEFAULT_MCP_CONFIG,
				notificationTimeoutMs: 500, // Too low
			};

			const validation = validateMCPConfig(config);

			expect(validation.valid).toBe(false);
			expect(validation.errors).toContain(
				'CORTEX_MCP_NOTIFICATION_TIMEOUT_MS must be between 1000 and 30000ms',
			);
		});

		it('should detect invalid concurrent notifications', () => {
			const config: MCPConfig = {
				...DEFAULT_MCP_CONFIG,
				maxConcurrentNotifications: 150, // Too high
			};

			const validation = validateMCPConfig(config);

			expect(validation.valid).toBe(false);
			expect(validation.errors).toContain(
				'CORTEX_MCP_MAX_CONCURRENT_NOTIFICATIONS must be between 1 and 100',
			);
		});

		it('should detect missing watch paths when watcher is enabled', () => {
			const config: MCPConfig = {
				...DEFAULT_MCP_CONFIG,
				fsWatcherEnabled: true,
				fsWatcherPaths: {
					prompts: undefined,
					resources: undefined,
					tools: undefined,
				},
			};

			const validation = validateMCPConfig(config);

			expect(validation.valid).toBe(false);
			expect(validation.errors).toContain(
				'At least one watch path must be configured when fsWatcherEnabled is true',
			);
		});

		it('should allow disabled watcher with no paths', () => {
			const config: MCPConfig = {
				...DEFAULT_MCP_CONFIG,
				fsWatcherEnabled: false,
				fsWatcherPaths: {
					prompts: undefined,
					resources: undefined,
					tools: undefined,
				},
			};

			const validation = validateMCPConfig(config);

			expect(validation.valid).toBe(true);
			expect(validation.errors).toHaveLength(0);
		});
	});

	describe('Configuration Summary', () => {
		it('should create comprehensive configuration summary', () => {
			const config: MCPConfig = {
				...DEFAULT_MCP_CONFIG,
				promptsListChanged: true,
				resourcesSubscribe: true,
				toolsVersioning: false,
				fsWatcherDebounceMs: 300,
				debugNotifications: true,
			};

			const summary = createMCPConfigSummary(config);

			expect(summary).toHaveProperty('notifications');
			expect(summary).toHaveProperty('versioning');
			expect(summary).toHaveProperty('fileWatcher');
			expect(summary).toHaveProperty('refresh');
			expect(summary).toHaveProperty('security');
			expect(summary).toHaveProperty('debug');

			expect(summary.notifications).toEqual({
				promptsListChanged: true,
				resourcesListChanged: true,
				resourcesSubscribe: true,
				toolsListChanged: true,
			});

			expect(summary.versioning).toEqual({
				tools: false,
				prompts: true,
				resources: true,
			});
		});
	});

	describe('Environment Profiles', () => {
		it('should load development profile', () => {
			process.env.NODE_ENV = 'development';

			const config = loadMCPConfigWithProfile('development');

			expect(config.debugNotifications).toBe(true);
			expect(config.logNotificationPayloads).toBe(true);
			expect(config.fsWatcherDebounceMs).toBe(100);
			expect(config.toolsVersioning).toBe(true);
		});

		it('should load test profile', () => {
			process.env.NODE_ENV = 'test';

			const config = loadMCPConfigWithProfile('test');

			expect(config.fsWatcherEnabled).toBe(false);
			expect(config.enableSecurityValidation).toBe(false);
			expect(config.debugNotifications).toBe(true);
		});

		it('should load production profile', () => {
			process.env.NODE_ENV = 'production';

			const config = loadMCPConfigWithProfile('production');

			expect(config.debugNotifications).toBe(false);
			expect(config.logNotificationPayloads).toBe(false);
			expect(config.enableSecurityValidation).toBe(true);
			expect(config.fsWatcherDebounceMs).toBe(500);
			expect(config.notificationTimeoutMs).toBe(10000);
		});

		it('should handle unknown profile gracefully', () => {
			const config = loadMCPConfigWithProfile('unknown-profile');

			// Should use default configuration
			expect(config).toEqual(loadMCPConfig());
		});

		it('should load configuration without profile', () => {
			const config = loadMCPConfigWithProfile();

			// Should use default configuration
			expect(config).toEqual(loadMCPConfig());
		});

		it('should merge profile with environment variables', () => {
			process.env.NODE_ENV = 'development';
			process.env.CORTEX_MCP_DEBUG_NOTIFICATIONS = 'false'; // Override profile

			const config = loadMCPConfigWithProfile('development');

			// Environment variable should override profile
			expect(config.debugNotifications).toBe(false);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty environment', () => {
			// Clear all environment variables
			Object.keys(process.env).forEach((key) => {
				if (key.startsWith('CORTEX_MCP_')) {
					delete process.env[key];
				}
			});

			const config = loadMCPConfig();

			// Should use all defaults
			expect(config).toEqual(DEFAULT_MCP_CONFIG);
		});

		it('should handle malformed boolean values', () => {
			process.env.CORTEX_MCP_PROMPTS_LIST_CHANGED = 'maybe';
			process.env.CORTEX_MCP_TOOLS_VERSIONING = 'kinda';

			const config = loadMCPConfig();

			expect(config.promptsListChanged).toBe(false); // Should default to false
			expect(config.toolsVersioning).toBe(false); // Should default to false
		});

		it('should handle extreme numeric values', () => {
			process.env.CORTEX_MCP_FS_WATCHER_DEBOUNCE_MS = '999999';
			process.env.CORTEX_MCP_MAX_CONCURRENT_NOTIFICATIONS = '0';
			process.env.CORTEX_MCP_NOTIFICATION_TIMEOUT_MS = '-1000';

			const config = loadMCPConfig();

			// Should use defaults for invalid values
			expect(config.fsWatcherDebounceMs).toBe(DEFAULT_MCP_CONFIG.fsWatcherDebounceMs);
			expect(config.maxConcurrentNotifications).toBe(DEFAULT_MCP_CONFIG.maxConcurrentNotifications);
			expect(config.notificationTimeoutMs).toBe(DEFAULT_MCP_CONFIG.notificationTimeoutMs);
		});
	});

	describe('Profile Configuration Validation', () => {
		it('should have valid development profile', () => {
			const devConfig = { ...DEFAULT_MCP_CONFIG, ...MCP_ENVIRONMENT_PROFILES.development };
			const validation = validateMCPConfig(devConfig);

			expect(validation.valid).toBe(true);
			expect(validation.errors).toHaveLength(0);
		});

		it('should have valid test profile', () => {
			const testConfig = { ...DEFAULT_MCP_CONFIG, ...MCP_ENVIRONMENT_PROFILES.test };
			const validation = validateMCPConfig(testConfig);

			expect(validation.valid).toBe(true);
			expect(validation.errors).toHaveLength(0);
		});

		it('should have valid production profile', () => {
			const prodConfig = { ...DEFAULT_MCP_CONFIG, ...MCP_ENVIRONMENT_PROFILES.production };
			const validation = validateMCPConfig(prodConfig);

			expect(validation.valid).toBe(true);
			expect(validation.errors).toHaveLength(0);
		});
	});

	describe('Configuration Immutability', () => {
		it('should not modify default configuration', () => {
			const originalDefaults = { ...DEFAULT_MCP_CONFIG };

			// Load configuration with changes
			process.env.CORTEX_MCP_PROMPTS_LIST_CHANGED = 'false';
			loadMCPConfig();

			// Defaults should remain unchanged
			expect(DEFAULT_MCP_CONFIG.promptsListChanged).toBe(originalDefaults.promptsListChanged);
		});

		it('should not modify environment profiles', () => {
			const originalDevProfile = { ...MCP_ENVIRONMENT_PROFILES.development };

			// Load profile with environment override
			process.env.NODE_ENV = 'development';
			process.env.CORTEX_MCP_DEBUG_NOTIFICATIONS = 'false';
			loadMCPConfigWithProfile('development');

			// Profile should remain unchanged
			expect(MCP_ENVIRONMENT_PROFILES.development.debugNotifications).toBe(
				originalDevProfile.debugNotifications,
			);
		});
	});
});
