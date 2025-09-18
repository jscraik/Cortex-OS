/**
 * Subagent configuration loader for YAML and Markdown files
 *
 * This module handles loading subagent configurations from disk in both
 * YAML (.subagent.yml) and Markdown (.subagent.md) formats.
 */

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { createPinoLogger } from '@voltagent/logger';
import { parse as parseYaml } from 'yaml';
import {
	type MarkdownSubagentFile,
	type SubagentConfig,
	SubagentConfigSchema,
	type YamlSubagentFile,
} from './types';

const logger = createPinoLogger({ name: 'SubagentLoader' });

export interface LoaderConfig {
	/** Directory paths to search for subagent configurations */
	searchPaths: string[];
	/** File extensions to look for */
	extensions: string[];
	/** Maximum file size to load (bytes) */
	maxFileSize: number;
}

export class SubagentLoader {
	private readonly _config: LoaderConfig;
	private _reloadTimeout?: NodeJS.Timeout;

	constructor(config?: Partial<LoaderConfig>) {
		this._config = {
			searchPaths: [
				'./subagents',
				'./.cortex/subagents',
				'~/.cortex/subagents',
			],
			extensions: ['.subagent.yml', '.subagent.yaml', '.subagent.md'],
			maxFileSize: 1024 * 1024, // 1MB
			...config,
		};
	}

	get config(): LoaderConfig {
		return this._config;
	}

	/**
	 * Load all subagent configurations from disk
	 */
	async loadAll(): Promise<Map<string, SubagentConfig>> {
		const subagents = new Map<string, SubagentConfig>();

		for (const searchPath of this._config.searchPaths) {
			const resolvedPath = path.resolve(
				searchPath.replace(/^~\//, `${process.env.HOME}/`),
			);

			try {
				const configs = await this.loadFromDirectory(resolvedPath);
				for (const [name, config] of configs) {
					if (subagents.has(name)) {
						logger.warn(
							`Duplicate subagent name: ${name}. Using version from ${resolvedPath}`,
						);
					}
					subagents.set(name, config);
				}
			} catch (error) {
				const err = error as NodeJS.ErrnoException;
				if (err.code !== 'ENOENT') {
					logger.warn(`Failed to load subagents from ${resolvedPath}:`, err);
				}
			}
		}

		logger.info(`Loaded ${subagents.size} subagent configurations`);
		return subagents;
	}

	/**
	 * Load subagents from a specific directory
	 */
	private async loadFromDirectory(
		dirPath: string,
	): Promise<Map<string, SubagentConfig>> {
		const subagents = new Map<string, SubagentConfig>();
		const entries = await fsp.readdir(dirPath, { withFileTypes: true });

		for (const entry of entries) {
			if (!entry.isFile()) continue;

			const ext = path.extname(entry.name);
			if (!this._config.extensions.includes(ext)) continue;

			const filePath = path.join(dirPath, entry.name);
			const baseName = path.basename(entry.name, ext);

			try {
				const config = await this.loadFile(filePath);
				subagents.set(baseName, config);
			} catch (error) {
				logger.error(
					`Failed to load subagent from ${filePath}:`,
					error as Error,
				);
			}
		}

		return subagents;
	}

	/**
	 * Load a single subagent configuration file
	 */
	private async loadFile(filePath: string): Promise<SubagentConfig> {
		// Check file size
		const stats = await fsp.stat(filePath);
		if (stats.size > this._config.maxFileSize) {
			throw new Error(`File too large: ${filePath}`);
		}

		const content = await fsp.readFile(filePath, 'utf-8');
		const ext = path.extname(filePath);

		if (ext === '.md') {
			return this.parseMarkdownFile(content, filePath);
		}
		return this.parseYamlFile(content, filePath);
	}

	/**
	 * Parse YAML subagent file
	 */
	private parseYamlFile(content: string, filePath: string): SubagentConfig {
		try {
			const data = parseYaml(content) as YamlSubagentFile;

			if (data.version !== '1') {
				throw new Error(`Unsupported version: ${data.version}`);
			}

			const validated = SubagentConfigSchema.parse(data.subagent);
			logger.debug(`Loaded YAML subagent: ${validated.name} from ${filePath}`);
			return validated;
		} catch (error) {
			throw new Error(`Failed to parse YAML ${filePath}: ${error}`);
		}
	}

	/**
	 * Parse Markdown subagent file
	 */
	private parseMarkdownFile(content: string, filePath: string): SubagentConfig {
		try {
			// Extract front matter between --- delimiters
			const frontMatterMatch = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/.exec(
				content,
			);

			if (!frontMatterMatch) {
				throw new Error('No front matter found in markdown file');
			}

			const [, frontMatter] = frontMatterMatch;
			const data = parseYaml(frontMatter) as MarkdownSubagentFile;

			// Validate required fields
			if (!data.name) {
				throw new Error('Missing required field: name');
			}

			// Convert to SubagentConfig
			const config: SubagentConfig = {
				name: data.name,
				version: data.version || '1.0.0',
				description: data.description || `Subagent: ${data.name}`,
				scope: data.scope || 'project',
				allowed_tools: data.allowed_tools,
				blocked_tools: data.blocked_tools,
				model: data.model,
				model_provider: data.model_provider,
				model_config: data.model_config,
				parallel_fanout: data.parallel_fanout || false,
				auto_delegate: data.auto_delegate !== false,
				max_recursion: data.max_recursion || 3,
				context_isolation: data.context_isolation !== false,
				context_window: data.context_window,
				memory_enabled: data.memory_enabled !== false,
				timeout_ms: data.timeout_ms || 30000,
				max_tokens: data.max_tokens,
				tags: data.tags || [],
				author: data.author,
				created: data.created,
				modified: data.modified,
			};

			const validated = SubagentConfigSchema.parse(config);
			logger.debug(
				`Loaded Markdown subagent: ${validated.name} from ${filePath}`,
			);
			return validated;
		} catch (error) {
			throw new Error(`Failed to parse Markdown ${filePath}: ${error}`);
		}
	}

	/**
	 * Watch for changes in subagent directories
	 */
	async watch(
		_callback: (
			event: 'add' | 'change' | 'unlink',
			changedPath: string,
		) => void,
	): Promise<fs.FSWatcher> {
		// For now, we'll use a simple polling approach
		// In production, you might want to use chokidar or similar
		const watchers: fs.FSWatcher[] = [];

		for (const searchPath of this._config.searchPaths) {
			const resolvedPath = path.resolve(
				searchPath.replace(/^~\//, `${process.env.HOME}/`),
			);

			try {
				const watcher = fs.watch(
					resolvedPath,
					{ recursive: true },
					(_eventType: string, filename: string | null) => {
						if (!filename) return;

						if (filename.endsWith('.ts') || filename.endsWith('.js')) {
							logger.debug(`File change detected: ${filename}`);
							// Debounce file changes
							if (this._reloadTimeout) clearTimeout(this._reloadTimeout);
							this._reloadTimeout = setTimeout(() => {
								this.loadAll().catch(() => {});
							}, 500);
						}
					},
				);
				watchers.push(watcher);
			} catch (error) {
				const err = error as NodeJS.ErrnoException;
				if (err.code !== 'ENOENT') {
					logger.warn(`Failed to watch ${resolvedPath}:`, err);
				}
			}
		}

		// Return a composite watcher that closes all watchers
		return {
			close: () => {
				watchers.forEach((w) => {
					w.close();
				});
			},
		} as fs.FSWatcher;
	}
}
