/**
 * Subagent system for Cortex-OS
 *
 * This module provides the complete subagent system that allows defining
 * specialized agents on disk and materializing them as tools in the main agent.
 */

import { createLogger } from '../mocks/voltagent-logger';
import type { IToolRegistry } from '../types';
import { SubagentLoader } from './loader';
import { SubagentRegistry } from './registry';
import { SubagentToolFactory } from './tools';

const logger = createLogger('SubagentSystem');

export interface SubagentSystemConfig {
	/** Tool registry for registering subagent tools */
	toolRegistry: IToolRegistry;
	/** Global tools available to subagents */
	globalTools: any[];
	/** Loader configuration */
	loader?: {
		searchPaths?: string[];
		extensions?: string[];
		maxFileSize?: number;
	};
	/** Enable delegation between subagents */
	enableDelegation?: boolean;
	/** Auto-reload on file changes */
	watch?: boolean;
}

/**
 * Main subagent system class
 */
export class SubagentSystem {
	private loader: SubagentLoader;
	private toolFactory: SubagentToolFactory;
	private registry: SubagentRegistry;
	private watcher?: any;

	constructor(private config: SubagentSystemConfig) {
		// Initialize loader
		this.loader = new SubagentLoader(config.loader);

		// Initialize tool factory
		this.toolFactory = new SubagentToolFactory(
			config.toolRegistry,
			config.globalTools,
		);

		// Initialize registry
		this.registry = new SubagentRegistry(this.toolFactory);

		// Enable delegation if requested
		if (config.enableDelegation) {
			this.toolFactory.enableDelegation();
		}
	}

	/**
	 * Initialize the subagent system
	 */
	async initialize(): Promise<void> {
		logger.info('Initializing subagent system...');

		// Load all subagent configurations
		const configs = await this.loader.loadAll();

		// Register all subagents
		for (const config of configs.values()) {
			try {
				await this.registry.register(config);
			} catch (error) {
				logger.error(`Failed to register subagent ${config.name}:`, error);
			}
		}

		logger.info(`Initialized with ${configs.size} subagents`);

		// Set up file watching if enabled
		if (this.config.watch) {
			await this.setupWatcher();
		}
	}

	/**
	 * Get the subagent registry
	 */
	getRegistry(): SubagentRegistry {
		return this.registry;
	}

	/**
	 * Get all subagent tool names
	 */
	getToolNames(): string[] {
		return this.registry.getToolNames();
	}

	/**
	 * Get system statistics
	 */
	getStats() {
		return {
			...this.registry.getStats(),
			loader: {
				searchPaths: this.loader.config.searchPaths,
				extensions: this.loader.config.extensions,
			},
			watching: !!this.watcher,
		};
	}

	/**
	 * Shut down the subagent system
	 */
	async shutdown(): Promise<void> {
		logger.info('Shutting down subagent system...');

		if (this.watcher) {
			this.watcher.close();
			this.watcher = undefined;
		}

		// Unregister all subagents
		const subagents = await this.registry.list();
		for (const subagent of subagents) {
			try {
				await this.registry.unregister(subagent.name);
			} catch (error) {
				logger.error(`Failed to unregister ${subagent.name}:`, error);
			}
		}

		logger.info('Subagent system shutdown complete');
	}

	/**
	 * Set up file watcher for auto-reload
	 */
	private async setupWatcher(): Promise<void> {
		this.watcher = await this.loader.watch(async (event, filePath) => {
			logger.info(`File ${event}: ${filePath}`);

			try {
				// Reload all subagents on any change
				await this.registry.reload(this.loader);
			} catch (error) {
				logger.error('Failed to reload subagents:', error);
			}
		});

		logger.info('Watching for subagent file changes...');
	}
}

/**
 * Helper function to create and initialize a subagent system
 */
export async function createSubagentSystem(
	config: SubagentSystemConfig,
): Promise<SubagentSystem> {
	const system = new SubagentSystem(config);
	await system.initialize();
	return system;
}
