/**
 * Subagent Manager
 *
 * Manages the lifecycle, configuration, and hot-reload of subagents.
 * Handles loading from disk, watching for changes, and providing access to subagents.
 */

import { EventEmitter } from 'node:events';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { type FSWatcher, watch } from 'chokidar';
import * as yaml from 'yaml';
import type { SubagentConfig } from '../lib/types.js';
import type { BaseSubagent } from './BaseSubagent.js';

export type SubagentFactory = (config: SubagentConfig) => BaseSubagent | Promise<BaseSubagent>;

export interface SubagentLoadOptions {
	watch?: boolean;
	reloadOnChange?: boolean;
	configDir?: string;
}

export class SubagentManager extends EventEmitter {
	private subagents: Map<
		string,
		{ config: SubagentConfig; factory: SubagentFactory; instance?: BaseSubagent }
	> = new Map();
	private watchers: Map<string, FSWatcher> = new Map();
	private configDir: string;
	private initialized = false;

	constructor(configDir = './subagents') {
		super();
		this.configDir = path.resolve(configDir);
	}

	/**
	 * Initialize the subagent manager
	 */
	async initialize(options: SubagentLoadOptions = {}): Promise<void> {
		if (this.initialized) {
			return;
		}

		this.configDir = options.configDir ? path.resolve(options.configDir) : this.configDir;

		try {
			// Ensure config directory exists
			await fs.mkdir(this.configDir, { recursive: true });

			// Load subagent configurations
			await this.loadSubagentConfigs();

			// Set up file watching if enabled
			if (options.watch || options.reloadOnChange) {
				await this.setupFileWatching(options.reloadOnChange ?? false);
			}

			this.initialized = true;
			this.emit('subagentManagerInitialized', {
				subagentsLoaded: this.subagents.size,
				configDir: this.configDir,
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			this.emit('subagentManagerInitializationFailed', {
				error: error instanceof Error ? error.message : String(error),
				configDir: this.configDir,
				timestamp: new Date().toISOString(),
			});
			throw error;
		}
	}

	/**
	 * Register a subagent with the manager
	 */
	async registerSubagent(
		name: string,
		config: SubagentConfig,
		factory: SubagentFactory,
	): Promise<void> {
		// Validate configuration
		this.validateSubagentConfig(config);

		// Check if already registered
		if (this.subagents.has(name)) {
			throw new Error(`Subagent '${name}' is already registered`);
		}

		// Create and store subagent
		const subagentEntry = {
			config: { ...config, name },
			factory,
		};

		this.subagents.set(name, subagentEntry);

		this.emit('subagentManagerSubagentRegistered', {
			name,
			config: subagentEntry.config,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Unregister a subagent
	 */
	async unregisterSubagent(name: string): Promise<void> {
		const subagent = this.subagents.get(name);
		if (!subagent) {
			return;
		}

		// Stop watching if necessary
		const watcher = this.watchers.get(name);
		if (watcher) {
			await watcher.close();
			this.watchers.delete(name);
		}

		// Cleanup subagent instance
		if (subagent.instance) {
			if (typeof subagent.instance.removeAllListeners === 'function') {
				subagent.instance.removeAllListeners();
			}
		}

		this.subagents.delete(name);
		this.emit('subagentManagerSubagentUnregistered', {
			name,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Get a subagent by name
	 */
	getSubagent(name: string): BaseSubagent | undefined {
		const subagent = this.subagents.get(name);
		return subagent?.instance;
	}

	/**
	 * Get subagent configuration
	 */
	getSubagentConfig(name: string): SubagentConfig | undefined {
		return this.subagents.get(name)?.config;
	}

	/**
	 * List all registered subagents
	 */
	listSubagents(): string[] {
		return Array.from(this.subagents.keys());
	}

	/**
	 * Get subagents with specific capability
	 */
	getSubagentsByCapability(capability: string): string[] {
		return Array.from(this.subagents.entries())
			.filter(([, entry]) => entry.config.capabilities?.includes(capability))
			.map(([name]) => name);
	}

	/**
	 * Load subagent configurations from disk
	 */
	private async loadSubagentConfigs(): Promise<void> {
		try {
			const files = await fs.readdir(this.configDir);
			const configFiles = files.filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'));

			for (const file of configFiles) {
				const filePath = path.join(this.configDir, file);
				await this.loadConfigFile(filePath);
			}
		} catch (error) {
			if ((error as any).code !== 'ENOENT') {
				throw error;
			}
			// Directory doesn't exist yet, that's okay
		}
	}

	/**
	 * Load a single configuration file
	 */
	private async loadConfigFile(filePath: string): Promise<void> {
		try {
			const content = await fs.readFile(filePath, 'utf8');
			const config = yaml.parse(content) as SubagentConfig;

			if (!config.name) {
				config.name = path.basename(filePath, path.extname(filePath));
			}

			// Store config without factory for now
			this.subagents.set(config.name, {
				config,
				factory: this.createDefaultFactory(config),
			});

			this.emit('subagentManagerConfigLoaded', {
				name: config.name,
				config,
				filePath,
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			this.emit('subagentManagerConfigLoadFailed', {
				filePath,
				error: error instanceof Error ? error.message : String(error),
				timestamp: new Date().toISOString(),
			});
		}
	}

	/**
	 * Create a default factory for config-based subagents
	 */
	private createDefaultFactory(config: SubagentConfig): SubagentFactory {
		return () => {
			throw new Error(
				`No factory provided for subagent '${config.name}'. Please register one explicitly.`,
			);
		};
	}

	/**
	 * Set up file watching for hot reload
	 */
	private async setupFileWatching(reloadOnChange: boolean): Promise<void> {
		const watcher = watch(this.configDir, {
			ignored: /(\/|^)\../, // Ignore dot files
			persistent: true,
		});

		watcher.on('change', async (filePath) => {
			const subagentName = path.basename(filePath, path.extname(filePath));

			if (reloadOnChange) {
				await this.reloadSubagent(subagentName);
			} else {
				this.emit('subagentManagerConfigChanged', {
					subagentName,
					filePath,
					timestamp: new Date().toISOString(),
				});
			}
		});

		watcher.on('add', async (filePath) => {
			if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
				await this.loadConfigFile(filePath);
			}
		});

		watcher.on('unlink', async (filePath) => {
			const subagentName = path.basename(filePath, path.extname(filePath));
			await this.unregisterSubagent(subagentName);
		});

		this.watchers.set('main', watcher);
	}

	/**
	 * Reload a subagent
	 */
	private async reloadSubagent(name: string): Promise<void> {
		const subagent = this.subagents.get(name);
		if (!subagent) {
			return;
		}

		this.emit('subagentManagerSubagentReloading', {
			name,
			timestamp: new Date().toISOString(),
		});

		try {
			// Cleanup old instance
			if (subagent.instance) {
				if (typeof subagent.instance.removeAllListeners === 'function') {
					subagent.instance.removeAllListeners();
				}
				subagent.instance = undefined;
			}

			// Load new config
			const configPath = path.join(this.configDir, `${name}.yaml`);
			try {
				await fs.access(configPath);
				await this.loadConfigFile(configPath);
			} catch {
				// Config file removed, unregister subagent
				await this.unregisterSubagent(name);
				return;
			}

			this.emit('subagentManagerSubagentReloaded', {
				name,
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			this.emit('subagentManagerSubagentReloadFailed', {
				name,
				error: error instanceof Error ? error.message : String(error),
				timestamp: new Date().toISOString(),
			});
		}
	}

	/**
	 * Validate subagent configuration
	 */
	private validateSubagentConfig(config: SubagentConfig): void {
		if (!config.name || typeof config.name !== 'string') {
			throw new Error('Subagent configuration must include a valid name');
		}

		if (!config.capabilities || !Array.isArray(config.capabilities)) {
			throw new Error('Subagent configuration must include capabilities array');
		}

		if (
			config.maxConcurrency &&
			(typeof config.maxConcurrency !== 'number' || config.maxConcurrency < 1)
		) {
			throw new Error('maxConcurrency must be a positive number');
		}

		if (config.timeout && (typeof config.timeout !== 'number' || config.timeout < 0)) {
			throw new Error('timeout must be a positive number');
		}
	}

	/**
	 * Load all subagents (creates instances)
	 */
	async loadSubagents(): Promise<Map<string, BaseSubagent>> {
		const instances = new Map<string, BaseSubagent>();

		for (const [name, entry] of this.subagents) {
			try {
				if (!entry.instance) {
					entry.instance = await entry.factory(entry.config);
				}
				instances.set(name, entry.instance);
			} catch (error) {
				this.emit('subagentManagerSubagentLoadFailed', {
					name,
					error: error instanceof Error ? error.message : String(error),
					timestamp: new Date().toISOString(),
				});
			}
		}

		return instances;
	}

	/**
	 * Shutdown the subagent manager
	 */
	async shutdown(): Promise<void> {
		// Close all file watchers
		for (const watcher of this.watchers.values()) {
			await watcher.close();
		}
		this.watchers.clear();

		// Cleanup all subagents
		for (const [, subagent] of this.subagents) {
			if (subagent.instance) {
				if (typeof subagent.instance.removeAllListeners === 'function') {
					subagent.instance.removeAllListeners();
				}
			}
		}

		this.subagents.clear();
		this.initialized = false;
		this.emit('subagentManagerShutdown', {
			timestamp: new Date().toISOString(),
			success: true,
		});
	}
}
