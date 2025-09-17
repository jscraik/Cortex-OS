/**
 * Subagent registry implementation
 *
 * This module manages the registration and lookup of subagent configurations,
 * providing a centralized store for all available subagents.
 */

import { EventEmitter } from 'node:events';
import { createLogger } from '../mocks/voltagent-logger';
import type { SubagentToolFactory } from './tools';
import {
	type ISubagentRegistry,
	type SubagentConfig,
	SubagentEvents,
} from './types';

const logger = createLogger('SubagentRegistry');

export class SubagentRegistry
	extends EventEmitter
	implements ISubagentRegistry
{
	private subagents = new Map<string, SubagentConfig>();
	private toolFactory: SubagentToolFactory;

	constructor(toolFactory: SubagentToolFactory) {
		super();
		this.toolFactory = toolFactory;
	}

	/**
	 * Register a new subagent
	 */
	async register(config: SubagentConfig): Promise<void> {
		// Validate configuration
		if (this.subagents.has(config.name)) {
			throw new Error(`Subagent already registered: ${config.name}`);
		}

		// Store configuration
		this.subagents.set(config.name, config);

		// Create and register the tool
		this.toolFactory.createTool(config);

		// Emit event
		this.emit(SubagentEvents.REGISTERED, config);

		logger.info(`Registered subagent: ${config.name}`);
	}

	/**
	 * Unregister a subagent
	 */
	async unregister(name: string): Promise<void> {
		const config = this.subagents.get(name);
		if (!config) {
			throw new Error(`Subagent not found: ${name}`);
		}

		// Remove tool
		this.toolFactory.removeTool(name);

		// Remove from registry
		this.subagents.delete(name);

		// Emit event
		this.emit(SubagentEvents.UNREGISTERED, config);

		logger.info(`Unregistered subagent: ${name}`);
	}

	/**
	 * Get a subagent by name
	 */
	async get(name: string): Promise<SubagentConfig | null> {
		return this.subagents.get(name) || null;
	}

	/**
	 * List all registered subagents
	 */
	async list(filter?: {
		scope?: 'project' | 'user';
		tags?: string[];
	}): Promise<SubagentConfig[]> {
		let subagents = Array.from(this.subagents.values());

		if (filter) {
			if (filter.scope) {
				subagents = subagents.filter((s) => s.scope === filter.scope);
			}

			if (filter.tags && filter.tags.length > 0) {
				subagents = subagents.filter((s) =>
					filter.tags?.some((tag) => s.tags.includes(tag)),
				);
			}
		}

		return subagents;
	}

	/**
	 * Check if a subagent exists
	 */
	async exists(name: string): Promise<boolean> {
		return this.subagents.has(name);
	}

	/**
	 * Get all subagent tool names
	 */
	getToolNames(): string[] {
		return Array.from(this.subagents.keys()).map((name) => `agent.${name}`);
	}

	/**
	 * Reload subagents from directory
	 */
	async reload(loader: any): Promise<void> {
		logger.info('Reloading subagents...');

		// Get current subagents
		const current = new Set(this.subagents.keys());

		// Load new configurations
		const loaded = await loader.loadAll();

		// Find new and removed subagents
		const loadedNames = new Set(loaded.keys());
		const toAdd = Array.from(loadedNames).filter((name) => !current.has(name));
		const toRemove = Array.from(current).filter(
			(name) => !loadedNames.has(name),
		);

		// Remove old subagents
		for (const name of toRemove) {
			try {
				await this.unregister(name);
			} catch (error) {
				logger.error(`Failed to unregister subagent ${name}:`, error);
			}
		}

		// Add new subagents
		for (const name of toAdd) {
			try {
				await this.register(loaded.get(name)!);
			} catch (error) {
				logger.error(`Failed to register subagent ${name}:`, error);
			}
		}

		logger.info(`Reloaded: added ${toAdd.length}, removed ${toRemove.length}`);
	}

	/**
	 * Get registry statistics
	 */
	getStats() {
		const stats = {
			totalSubagents: this.subagents.size,
			byScope: {
				project: 0,
				user: 0,
			},
			byProvider: {} as Record<string, number>,
			totalTools: this.toolFactory.runners.size,
		};

		for (const config of this.subagents.values()) {
			stats.byScope[config.scope]++;
			const provider = config.model_provider || 'default';
			stats.byProvider[provider] = (stats.byProvider[provider] || 0) + 1;
		}

		return stats;
	}
}
