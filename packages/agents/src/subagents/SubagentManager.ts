/**
 * Subagent Manager
 *
 * Manages the lifecycle, configuration, and hot-reload of subagents.
 * Handles loading from disk, watching for changes, and providing access to subagents.
 */

import { EventEmitter } from 'node:events';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import * as path from 'node:path';
import { type FSWatcher, watch } from 'chokidar';
import * as yaml from 'yaml';
import type { SubagentConfig } from '../lib/types.js';
import type { BaseSubagent } from './BaseSubagent.js';

export type SubagentFactory = (config: SubagentConfig) => BaseSubagent | Promise<BaseSubagent>;

type SubagentSource = { path: string; scope: 'user' | 'project' };

export interface SubagentLoadOptions {
        watch?: boolean;
        reloadOnChange?: boolean;
        configDir?: string;
        projectDir?: string;
        userDir?: string;
}

export class SubagentManager extends EventEmitter {
        private subagents: Map<
                string,
                {
                        config: SubagentConfig;
                        factory: SubagentFactory;
                        instance?: BaseSubagent;
                        source?: SubagentSource;
                }
        > = new Map();
        private watchers: Map<string, FSWatcher> = new Map();
        private configDir: string;
        private configSources: Array<{ dir: string; scope: 'user' | 'project' }> = [];
        private initialized = false;

        constructor(configDir = './subagents') {
                super();
                this.configDir = path.resolve(configDir);
        }

        private async prepareConfigSources(options: SubagentLoadOptions): Promise<void> {
                if (options.configDir) {
                        const dir = path.resolve(options.configDir);
                        await this.ensureDir(dir);
                        this.configSources = [{ dir, scope: 'project' }];
                        this.configDir = dir;
                        return;
                }

                const projectRoot = options.projectDir ? path.resolve(options.projectDir) : process.cwd();
                const userRoot = options.userDir
                        ? path.resolve(options.userDir)
                        : path.join(os.homedir(), '.cortex', 'agents');
                const projectAgentsDir = path.join(projectRoot, '.cortex', 'agents');

                await this.ensureDir(userRoot);
                await this.ensureDir(projectAgentsDir);

                this.configSources = [
                        { dir: userRoot, scope: 'user' },
                        { dir: projectAgentsDir, scope: 'project' },
                ];
                this.configDir = projectAgentsDir;
        }

        private async ensureDir(dir: string): Promise<void> {
                try {
                        await fs.mkdir(dir, { recursive: true });
                } catch (error) {
                        const err = error as NodeJS.ErrnoException;
                        if (err?.code !== 'EEXIST') {
                                console.warn('[brAInwav/subagents] failed to create directory', dir, err?.message ?? err);
                        }
                }
        }

        /**
         * Initialize the subagent manager
         */
        async initialize(options: SubagentLoadOptions = {}): Promise<void> {
                if (this.initialized) {
			return;
		}

                try {
                        await this.prepareConfigSources(options);

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
                                configDirs: this.configSources.map((c) => c.dir),
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
                // Check if already registered
                if (this.subagents.has(name)) {
                        throw new Error(`Subagent '${name}' is already registered`);
                }

                const normalized: SubagentConfig = {
                        ...config,
                        name,
                        scope: config.scope ?? 'project',
                        path: config.path ? path.resolve(config.path) : config.path,
                };

                // Validate configuration
                this.validateSubagentConfig(normalized);

                // Create and store subagent
                const subagentEntry = {
                        config: normalized,
                        factory,
                        source:
                                normalized.path && normalized.scope
                                        ? { path: normalized.path, scope: normalized.scope }
                                        : undefined,
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
                const sources = this.configSources.length
                        ? this.configSources
                        : [{ dir: this.configDir, scope: 'project' as const }];
                const loadedNames = new Set<string>();

                for (const source of sources) {
                        const files = await this.listConfigFiles(source.dir);
                        for (const file of files) {
                                const name = await this.loadConfigFile(file, source.scope);
                                if (name) {
                                        loadedNames.add(name);
                                }
                        }
                }

                for (const [name, entry] of this.subagents.entries()) {
                        if (entry.source && !loadedNames.has(name)) {
                                this.subagents.delete(name);
                        }
                }
        }

        private async listConfigFiles(dir: string): Promise<string[]> {
                try {
                        const entries = await fs.readdir(dir, { withFileTypes: true });
                        const files: string[] = [];
                        for (const entry of entries) {
                                if (!entry.isFile()) continue;
                                const full = path.join(dir, entry.name);
                                if (this.isConfigFile(full)) {
                                        files.push(full);
                                }
                        }
                        return files.sort();
                } catch (error) {
                        const err = error as NodeJS.ErrnoException;
                        if (err?.code === 'ENOENT') {
                                return [];
                        }
                        throw error;
                }
        }

        private isConfigFile(filePath: string): boolean {
                const ext = path.extname(filePath).toLowerCase();
                return ['.yaml', '.yml', '.json', '.md', '.markdown'].includes(ext);
        }

	/**
	 * Load a single configuration file
	 */
        private async loadConfigFile(filePath: string, scope: 'user' | 'project'): Promise<string | null> {
                try {
                        const config = await this.parseConfigFile(filePath, scope);
                        this.validateSubagentConfig(config);

                        const existing = this.subagents.get(config.name);
                        const instance = existing?.source?.path === filePath ? existing.instance : undefined;
                        const factory = existing?.factory ?? this.createDefaultFactory(config);

                        this.subagents.set(config.name, {
                                config,
                                factory,
                                instance,
                                source: { path: filePath, scope },
                        });

                        this.emit('subagentManagerConfigLoaded', {
                                name: config.name,
                                config,
                                filePath,
                                timestamp: new Date().toISOString(),
                        });

                        return config.name;
                } catch (error) {
                        this.emit('subagentManagerConfigLoadFailed', {
                                filePath,
                                error: error instanceof Error ? error.message : String(error),
                                timestamp: new Date().toISOString(),
                        });
                        return null;
                }
        }

        private async parseConfigFile(filePath: string, scope: 'user' | 'project'): Promise<SubagentConfig> {
                const ext = path.extname(filePath).toLowerCase();
                if (ext === '.md' || ext === '.markdown') {
                        const { data, body } = await this.parseMarkdownConfig(filePath);
                        return this.normalizeSubagentConfig(data, scope, filePath, body);
                }

                const raw = await fs.readFile(filePath, 'utf8');
                let parsed: Record<string, unknown>;
                if (ext === '.json') {
                        parsed = JSON.parse(raw) as Record<string, unknown>;
                } else {
                        parsed = (yaml.parse(raw) as Record<string, unknown>) ?? {};
                }
                return this.normalizeSubagentConfig(parsed, scope, filePath, '');
        }

        private async parseMarkdownConfig(
                filePath: string,
        ): Promise<{ data: Record<string, unknown>; body: string }> {
                const raw = await fs.readFile(filePath, 'utf8');
                const match = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/m.exec(raw);
                if (!match) {
                        return { data: {}, body: raw.trim() };
                }
                const [, frontMatter, body] = match;
                const data = (yaml.parse(frontMatter) as Record<string, unknown>) ?? {};
                return { data, body: (body ?? '').trim() };
        }

        private normalizeSubagentConfig(
                raw: Record<string, unknown>,
                scope: 'user' | 'project',
                filePath: string,
                body: string,
        ): SubagentConfig {
                const name = typeof raw.name === 'string' && raw.name.trim().length
                        ? raw.name.trim()
                        : path.basename(filePath, path.extname(filePath));
                const description = typeof raw.description === 'string' ? raw.description : `${name} subagent`;
                const capabilities = this.extractStringArray(
                        raw.capabilities ?? raw.tags ?? ['general'],
                );
                const maxConcurrency = this.toPositiveInteger(raw.maxConcurrency ?? raw.max_concurrency, 1);
                const timeout = this.toPositiveInteger(raw.timeout ?? raw.timeout_ms, 60_000);
                const tools = this.extractStringArray(raw.tools ?? raw.allowed_tools ?? raw['allowed-tools']);
                const modelConfig = (raw.model_config as Record<string, unknown> | undefined) ?? {};
                const prompt = this.pickString(raw.systemPrompt, body) ?? '';

                const config: SubagentConfig = {
                        name,
                        description,
                        capabilities: capabilities.length ? capabilities : ['general'],
                        path: path.resolve(filePath),
                        maxConcurrency,
                        timeout,
                        systemPrompt: prompt,
                        scope,
                        model: this.pickString(raw.model),
                        tools: tools.length ? tools : undefined,
                        maxTokens: this.toNumber(
                                raw.maxTokens ?? raw.max_tokens ?? (modelConfig as Record<string, unknown>)['max_tokens'],
                        ),
                        temperature: this.toNumber(
                                raw.temperature ?? (modelConfig as Record<string, unknown>)['temperature'],
                        ),
                };

                return config;
        }

        private extractStringArray(value: unknown): string[] {
                if (Array.isArray(value)) {
                        return value.map((v) => String(v).trim()).filter((v) => v.length > 0);
                }
                if (typeof value === 'string') {
                        return value
                                .split(',')
                                .map((v) => v.trim())
                                .filter((v) => v.length > 0);
                }
                return [];
        }

        private pickString(value: unknown, fallback = ''): string | undefined {
                if (typeof value === 'string' && value.trim().length > 0) {
                        return value.trim();
                }
                if (fallback.trim().length > 0) {
                        return fallback.trim();
                }
                return undefined;
        }

        private toPositiveInteger(value: unknown, defaultValue: number): number {
                const num = Number(value);
                if (Number.isFinite(num) && num > 0) {
                        return Math.floor(num);
                }
                return defaultValue;
        }

        private toNumber(value: unknown): number | undefined {
                if (typeof value === 'number' && Number.isFinite(value)) {
                        return value;
                }
                if (typeof value === 'string') {
                        const num = Number(value);
                        if (Number.isFinite(num)) {
                                return num;
                        }
                }
                return undefined;
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
                const sources = this.configSources.length
                        ? this.configSources
                        : [{ dir: this.configDir, scope: 'project' as const }];

                const shouldIgnore = (filePath: string) => {
                        const segments = filePath.split(path.sep);
                        return segments.some((segment) => {
                                if (!segment.startsWith('.')) return false;
                                return !['.cortex', '.'].includes(segment) && segment !== '..';
                        });
                };

                for (const source of sources) {
                        const watcher = watch(source.dir, {
                                ignored: shouldIgnore,
                                persistent: true,
                                ignoreInitial: true,
                                depth: 3,
                        });

                        const handleAddOrChange = async (filePath: string, event: 'add' | 'change') => {
                                const absolute = path.resolve(filePath);
                                if (!this.isConfigFile(absolute)) return;
                                if (event === 'change' && !reloadOnChange) {
                                        this.emit('subagentManagerConfigChanged', {
                                                subagentName: path.basename(absolute, path.extname(absolute)),
                                                filePath: absolute,
                                                timestamp: new Date().toISOString(),
                                        });
                                        return;
                                }

                                if (event === 'change' && reloadOnChange) {
                                        const name = path.basename(absolute, path.extname(absolute));
                                        const existing = this.subagents.get(name);
                                        if (existing?.instance && typeof existing.instance.removeAllListeners === 'function') {
                                                existing.instance.removeAllListeners();
                                        }
                                        if (existing) {
                                                existing.instance = undefined;
                                        }
                                }

                                const name = await this.loadConfigFile(absolute, source.scope);
                                if (!name) return;
                                if (event === 'change' && reloadOnChange) {
                                        this.emit('subagentManagerSubagentReloaded', {
                                                name,
                                                timestamp: new Date().toISOString(),
                                        });
                                }
                        };

                        watcher.on('add', (filePath) => {
                                void handleAddOrChange(filePath, 'add');
                        });
                        watcher.on('change', (filePath) => {
                                void handleAddOrChange(filePath, 'change');
                        });
                        watcher.on('unlink', async (filePath) => {
                                const absolute = path.resolve(filePath);
                                if (!this.isConfigFile(absolute)) return;
                                const subagentName = path.basename(absolute, path.extname(absolute));
                                await this.unregisterSubagent(subagentName);
                        });

                        this.watchers.set(source.dir, watcher);
                }
        }

	/**
	 * Reload a subagent
	 */
        private async reloadSubagent(name: string): Promise<void> {
                const subagent = this.subagents.get(name);
                if (!subagent || !subagent.source) {
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
                        try {
                                await fs.access(subagent.source.path);
                                const loadedName = await this.loadConfigFile(subagent.source.path, subagent.source.scope);
                                if (!loadedName) {
                                        await this.unregisterSubagent(name);
                                        return;
                                }
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
