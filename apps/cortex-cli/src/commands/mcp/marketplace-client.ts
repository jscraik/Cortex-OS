/**
 * @file MCP Marketplace Client
 * @description Client for interacting with MCP marketplace registries
 */

import type { RegistryIndex, ServerManifest } from '@cortex-os/mcp-registry';
import { RegistryIndexSchema } from '@cortex-os/mcp-registry';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { getRegistryCacheFilePath, validateMarketplaceUrl } from './infra/marketplace-utils.js';

/**
 * Configuration for marketplace client
 */
export const MarketplaceConfigSchema = z.object({
	registries: z.record(z.string().url()),
	cacheDir: z.string(),
	cacheTtl: z.number().int().min(60000).default(300000), // 5 minutes default
	security: z
		.object({
			requireSignatures: z.boolean().default(true),
			allowedRiskLevels: z
				.array(z.enum(['low', 'medium', 'high']))
				.default(['low', 'medium']),
			trustedPublishers: z.array(z.string()).default([]),
		})
		.default({}),
});

export type MarketplaceConfig = z.infer<typeof MarketplaceConfigSchema>;

// Generic API response used by this client
export type ApiResponse<T> =
	| {
		success: true;
		data: T;
		meta?: { total?: number; offset?: number; limit?: number };
	}
	| {
		success: false;
		error: { code: string; message: string; details?: unknown };
	};

// ----------------------------------
// Internal helpers (kept local to avoid cross-boundary leakage)
// ----------------------------------
function errorMessage(err: unknown, fallback = DEFAULT_UNKNOWN_ERROR): string {
	if (err instanceof Error && typeof err.message === 'string') return err.message;
	return fallback;
}

function failure<T>(code: string, errOrMsg: unknown, fallback?: string, details?: unknown): ApiResponse<T> {
	const msg = typeof errOrMsg === 'string' ? errOrMsg : errorMessage(errOrMsg, fallback);
	return { success: false, error: { code, message: msg, ...(details ? { details } : {}) } };
}

function success<T>(
	data: T,
	meta?: { total?: number; offset?: number; limit?: number },
): ApiResponse<T> {
	return meta ? { success: true, data, meta } : { success: true, data };
}

// Simple search request accepted by this client
export const SearchRequestSchema = z.object({
	q: z.string().optional(),
	category: z.string().optional(),
	tags: z.array(z.string()).optional(),
	capabilities: z.array(z.string()).optional(),
	verified: z.boolean().optional(),
	riskLevel: z.enum(['low', 'medium', 'high']).optional(),
	limit: z.number().int().min(1).max(50).default(10),
	offset: z.number().int().min(0).default(0),
});
export type SearchRequest = z.infer<typeof SearchRequestSchema>;

// Simple search options used by CLI
export interface SearchOptions {
	category?: string;
	tags?: string[];
	riskLevel?: 'low' | 'medium' | 'high';
	verifiedOnly?: boolean;
	limit?: number;
	offset?: number;
	registryUrl?: string;
}

// ------------------------------
// Helper type guards and accessors to work with optional/extended fields
// ServerManifest from @cortex-os/mcp-registry only guarantees a minimal shape.
// Some registries may include additional fields like owner, category, security, etc.
// We guard accesses at runtime to keep type safety and avoid crashes.
// ------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null;
}

function asString(v: unknown): string | undefined {
	return typeof v === 'string' ? v : undefined;
}

function asStringArray(v: unknown): string[] | undefined {
	return Array.isArray(v) && v.every((x) => typeof x === 'string')
		? v
		: undefined;
}

interface ExtendedSecurity {
	riskLevel?: 'low' | 'medium' | 'high';
	verifiedPublisher?: boolean;
	sigstoreBundle?: string;
}

function getOwner(server: ServerManifest): string | undefined {
	return asString((server as unknown as Record<string, unknown>)['owner']);
}

function getCategory(server: ServerManifest): string | undefined {
	return asString((server as unknown as Record<string, unknown>)['category']);
}

function getSecurity(server: ServerManifest): ExtendedSecurity | undefined {
	const sec = (server as unknown as Record<string, unknown>)['security'];
	if (!isRecord(sec)) return undefined;
	const riskLevel = asString(sec['riskLevel']);
	const verifiedPublisher =
		typeof sec['verifiedPublisher'] === 'boolean'
			? sec['verifiedPublisher']
			: undefined;
	const sigstoreBundle = asString(sec['sigstoreBundle']);
	// Normalize riskLevel
	const rl =
		riskLevel === 'low' || riskLevel === 'medium' || riskLevel === 'high'
			? (riskLevel as ExtendedSecurity['riskLevel'])
			: undefined;
	return { riskLevel: rl, verifiedPublisher, sigstoreBundle };
}

type StdioTransport = {
	command?: string;
	args?: string[];
	env?: Record<string, string>;
};
type StreamableHttpTransport = {
	url?: string;
	headers?: Record<string, string>;
};

function getStdioTransport(server: ServerManifest): StdioTransport | undefined {
	const t = server.transports?.['stdio'];
	if (!isRecord(t)) return undefined;
	const command = asString(t['command']);
	const args = asStringArray(t['args']);
	const envRaw = t['env'];
	const env = isRecord(envRaw)
		? Object.fromEntries(
			Object.entries(envRaw).filter(
				([, v]) => typeof v === 'string',
			) as Array<[string, string]>,
		)
		: undefined;
	return { command, args, env };
}

function getStreamableHttpTransport(
	server: ServerManifest,
): StreamableHttpTransport | undefined {
	const t = server.transports?.['streamableHttp'];
	if (!isRecord(t)) return undefined;
	const url = asString(t['url']);
	const headersRaw = t['headers'];
	const headers = isRecord(headersRaw)
		? Object.fromEntries(
			Object.entries(headersRaw).filter(
				([, v]) => typeof v === 'string',
			) as Array<[string, string]>,
		)
		: undefined;
	return { url, headers };
}

function hasStdio(server: ServerManifest): boolean {
	const s = getStdioTransport(server);
	return !!s?.command;
}

function hasStreamableHttp(server: ServerManifest): boolean {
	const s = getStreamableHttpTransport(server);
	return !!s?.url;
}

// Security: Allowlisted domains now imported from infra util for reuse
const DEFAULT_UNKNOWN_ERROR = 'Unknown error';

// validateMarketplaceUrl now imported from infra utility

/**
 * Cache entry structure
 */
const CacheEntrySchema = z.object({
	data: RegistryIndexSchema,
	cachedAt: z.number(),
	registryUrl: z.string().url(),
});

type CacheEntry = z.infer<typeof CacheEntrySchema>;

/**
 * Installed server information
 */
export interface InstalledServer {
	id: string;
	name?: string;
	status: 'active' | 'inactive' | 'error';
	transport: 'stdio' | 'streamableHttp';
	source: 'marketplace' | 'manual';
	installedAt: string;
}

/**
 * Registry information
 */
export interface RegistryInfo {
	name: string;
	url: string;
	trusted: boolean;
	healthy?: boolean;
	lastChecked?: string;
}

/**
 * Server configuration type for type safety
 */
interface ServerConfigType {
	command?: string;
	metadata?: {
		installedAt?: string;
	};
}

/**
 * MCP configuration file structure
 */
interface McpConfigType {
	mcpServers: Record<string, unknown>;
}

/**
 * MCP Marketplace Client
 */
export class MarketplaceClient {
	private readonly registryCache = new Map<string, RegistryIndex>();
	private readonly cacheTimes = new Map<string, number>();

	constructor(private readonly config: MarketplaceConfig) {
		// Validate config
		MarketplaceConfigSchema.parse(config);
	}

	/**
	 * Initialize the client
	 */
	async initialize(): Promise<void> {
		// Ensure cache directory exists
		if (!existsSync(this.config.cacheDir)) {
			await mkdir(this.config.cacheDir, { recursive: true });
		}

		// Load cached registries
		await this.loadCachedRegistries();

		// Fetch fresh data for stale registries
		for (const [name, url] of Object.entries(this.config.registries)) {
			if (this.isCacheStale(url)) {
				try {
					await this.fetchRegistry(url);
				} catch (error) {
					console.warn('Failed to update registry', {
						name,
						error: error instanceof Error ? error.message : error,
					});
				}
			}
		}
	}

	/**
	 * Search servers across registries
	 * Overload A: simple query form returning an array (used by CLI)
	 * Overload B: structured request returning ApiResponse wrapper
	 */
	async search(
		query: string,
		options?: SearchOptions,
	): Promise<ServerManifest[]>;
	async search(
		request: SearchRequest,
		registryUrl?: string,
	): Promise<ApiResponse<ServerManifest[]>>;
	async search(
		requestOrQuery: SearchRequest | string,
		optionsOrRegistryUrl?: SearchOptions | string,
	): Promise<ApiResponse<ServerManifest[]> | ServerManifest[]> {
		if (typeof requestOrQuery === 'string') {
			const opts = (optionsOrRegistryUrl as SearchOptions) || {};
			const req: SearchRequest = {
				q: requestOrQuery,
				category: opts.category,
				tags: opts.tags,
				verified: opts.verifiedOnly,
				riskLevel: opts.riskLevel,
				limit: opts.limit ?? 10,
				offset: opts.offset ?? 0,
			};
			const res = await this.searchInternal(req, opts.registryUrl);
			if (!res.success) throw new Error(res.error.message);
			return res.data;
		}
		return this.searchInternal(requestOrQuery, optionsOrRegistryUrl as string);
	}

	private async searchInternal(
		request: SearchRequest,
		registryUrl?: string,
	): Promise<ApiResponse<ServerManifest[]>> {
		try {
			// Validate request
			const validatedRequest = SearchRequestSchema.parse(request);

			// Determine which registries to search
			const registriesToSearch = registryUrl
				? [registryUrl]
				: Object.values(this.config.registries);

			if (registriesToSearch.length === 0) {
				return {
					success: false,
					error: {
						code: 'REGISTRY_NOT_LOADED',
						message: 'No registries available',
					},
				};
			}

			const allServers: ServerManifest[] = [];

			// Collect servers from all registries
			for (const url of registriesToSearch) {
				const registry = this.registryCache.get(url);
				if (registry) {
					allServers.push(...registry.servers);
				}
			}

			if (allServers.length === 0) {
				return {
					success: false,
					error: {
						code: 'REGISTRY_NOT_LOADED',
						message: 'Registry data not available',
					},
				};
			}

			const predicates = this.buildSearchPredicates(validatedRequest);
			const filteredServers = predicates.length
				? allServers.filter((s) => predicates.every((p) => p(s)))
				: allServers;

			this.sortServers(filteredServers);

			// Apply pagination
			const total = filteredServers.length;
			const paginatedServers = filteredServers.slice(
				validatedRequest.offset,
				validatedRequest.offset + validatedRequest.limit,
			);

			return {
				success: true,
				data: paginatedServers,
				meta: {
					total,
					offset: validatedRequest.offset,
					limit: validatedRequest.limit,
				},
			};
		} catch (error) {
			if (error instanceof z.ZodError) {
				return {
					success: false,
					error: {
						code: 'INVALID_REQUEST',
						message: 'Invalid search parameters',
						details: error.errors,
					},
				};
			}

			throw error;
		}
	}

	private buildSearchPredicates(
		validatedRequest: SearchRequest,
	): Array<(s: ServerManifest) => boolean> {
		const preds: Array<(s: ServerManifest) => boolean> = [];
		if (validatedRequest.q) {
			const query = validatedRequest.q.toLowerCase();
			preds.push((server) => {
				const inTags = (server.tags || []).some((tag) =>
					tag.toLowerCase().includes(query),
				);
				const owner = getOwner(server);
				return (
					server.name.toLowerCase().includes(query) ||
					(server.description || '').toLowerCase().includes(query) ||
					inTags ||
					(!!owner && owner.toLowerCase().includes(query))
				);
			});
		}
		if (validatedRequest.category) {
			preds.push((server) => getCategory(server) === validatedRequest.category);
		}
		if (validatedRequest.tags && validatedRequest.tags.length > 0) {
			const reqTags = validatedRequest.tags;
			preds.push((server) => {
				const serverTags = server.tags || [];
				return reqTags.every((t) => serverTags.includes(t));
			});
		}
		if (validatedRequest.riskLevel) {
			const rl = validatedRequest.riskLevel;
			preds.push(
				(server) => (getSecurity(server)?.riskLevel ?? 'medium') === rl,
			);
		}
		if (validatedRequest.verified !== undefined) {
			const ver = validatedRequest.verified;
			preds.push(
				(server) => (getSecurity(server)?.verifiedPublisher ?? false) === ver,
			);
		}
		return preds;
	}

	private sortServers(servers: ServerManifest[]): void {
		servers.sort((a, b) => a.name.localeCompare(b.name));
	}

	/**
	 * Get server by ID
	 */
	async getServer(serverId: string): Promise<ServerManifest | null> {
		for (const registry of this.registryCache.values()) {
			const server = registry.servers.find((s) => s.id === serverId);
			if (server) {
				return server;
			}
		}
		return null;
	}

	/**
	 * Add server to local configuration
	 */
	async addServer(
		serverId: string,
		options: {
			transport?: 'stdio' | 'streamableHttp';
		} = {},
	): Promise<ApiResponse<{ installed: boolean; serverId: string }>> {
		try {
			// Find server in registry
			const server = await this.getServer(serverId);
			if (!server) {
				return failure('SERVER_NOT_FOUND', `Server not found in registry: ${serverId}`);
			}

			// Security validation
			const securityCheck = this.validateServerSecurity(server);
			if (!securityCheck.allowed) {
				const code = securityCheck.reason === 'risk' ? 'SECURITY_VIOLATION' : 'SIGNATURE_REQUIRED';
				return failure(code, securityCheck.message, undefined, { riskLevel: getSecurity(server)?.riskLevel });
			}

			// Determine transport to use
			const selection = this.selectTransport(server, options.transport);
			if (!selection.success) return selection.response;

			// Load existing configuration
			const configPath = path.join(this.config.cacheDir, '..', 'servers.json');
			const config = await this.loadConfig(configPath);

			// Add server configuration
			// Ensure container exists
			if (!config.mcpServers) config.mcpServers = {} as Record<string, unknown>;

			if (selection.transport === 'stdio') {
				const stdio = getStdioTransport(server);
				if (stdio?.command) {
					config.mcpServers[serverId] = {
						command: stdio.command,
						args: stdio.args || [],
						env: stdio.env || {},
					};
				}
			} else if (selection.transport === 'streamableHttp') {
				const http = getStreamableHttpTransport(server);
				if (http?.url) {
					config.mcpServers[serverId] = {
						serverUrl: http.url,
						headers: http.headers || {},
					};
				}
			}

			// Save configuration
			await this.saveConfig(configPath, config);

			return success({ installed: true, serverId });
		} catch (error) {
			return failure('INSTALLATION_FAILED', error);
		}
	}

	private async loadConfig(configPath: string): Promise<McpConfigType> {
		try {
			const configData = await readFile(configPath, 'utf-8');
			return JSON.parse(configData) as McpConfigType;
		} catch {
			return { mcpServers: {} };
		}
	}

	private async saveConfig(
		configPath: string,
		config: McpConfigType,
	): Promise<void> {
		await writeFile(configPath, JSON.stringify(config, null, 2));
	}

	private selectTransport(
		server: ServerManifest,
		requested?: 'stdio' | 'streamableHttp',
	):
		| { success: true; transport: 'stdio' | 'streamableHttp' }
		| {
			success: false;
			response: ApiResponse<{ installed: boolean; serverId: string }>;
		} {
		if (requested) {
			if (requested === 'stdio' && !hasStdio(server)) {
				return {
					success: false,
					response: {
						success: false,
						error: {
							code: 'TRANSPORT_UNAVAILABLE',
							message: 'stdio transport not available for this server',
						},
					},
				};
			}
			if (requested === 'streamableHttp' && !hasStreamableHttp(server)) {
				return {
					success: false,
					response: {
						success: false,
						error: {
							code: 'TRANSPORT_UNAVAILABLE',
							message: 'streamableHttp transport not available for this server',
						},
					},
				};
			}
			return { success: true, transport: requested };
		}
		if (hasStdio(server)) return { success: true, transport: 'stdio' };
		if (hasStreamableHttp(server))
			return { success: true, transport: 'streamableHttp' };
		return {
			success: false,
			response: {
				success: false,
				error: {
					code: 'TRANSPORT_UNAVAILABLE',
					message: 'No supported transport available for this server',
				},
			},
		};
	}

	/**
	 * Remove server from local configuration
	 */
	async removeServer(
		serverId: string,
	): Promise<ApiResponse<{ removed: boolean }>> {
		try {
			const configPath = path.join(this.config.cacheDir, '..', 'servers.json');

			let config: McpConfigType;
			try {
				const configData = await readFile(configPath, 'utf-8');
				config = JSON.parse(configData) as McpConfigType;
			} catch {
				return failure('NOT_FOUND', `Server not installed: ${serverId}`);
			}

			if (!config.mcpServers?.[serverId]) {
				return failure('NOT_FOUND', `Server not installed: ${serverId}`);
			}

			// Remove server
			delete config.mcpServers[serverId];

			// Save configuration
			await writeFile(configPath, JSON.stringify(config, null, 2));

			return success({ removed: true });
		} catch (error) {
			return failure('REMOVAL_FAILED', error);
		}
	}

	/**
	 * Determine server status based on configuration
	 */
	private determineServerStatus(
		serverConfig: unknown,
	): 'active' | 'inactive' | 'error' {
		try {
			const typedConfig = serverConfig as ServerConfigType;

			// Basic configuration check
			if (typedConfig?.command) {
				return 'active'; // Assume active if properly configured
			}
			return 'inactive';
		} catch {
			return 'error';
		}
	}

	/**
	 * Get installation time from server configuration
	 */
	private getInstallationTime(serverConfig: unknown): string {
		const typedConfig = serverConfig as ServerConfigType;
		return typedConfig?.metadata?.installedAt || new Date().toISOString();
	}

	/**
	 * Create installed server object from configuration
	 */
	private async createInstalledServer(
		id: string,
		serverConfig: unknown,
	): Promise<InstalledServer> {
		const manifest = await this.getServer(id);
		const status = this.determineServerStatus(serverConfig);
		const installedAt = this.getInstallationTime(serverConfig);
		const typedConfig = serverConfig as ServerConfigType;

		return {
			id,
			name: manifest?.name || id,
			status,
			transport: typedConfig?.command ? 'stdio' : 'streamableHttp',
			source: manifest ? 'marketplace' : 'manual',
			installedAt,
		};
	}

	/**
	 * List installed servers
	 */
	async listServers(): Promise<ApiResponse<InstalledServer[]>> {
		try {
			const configPath = path.join(this.config.cacheDir, '..', 'servers.json');

			let config: McpConfigType;
			try {
				const configData = await readFile(configPath, 'utf-8');
				config = JSON.parse(configData) as McpConfigType;
			} catch {
				return success<InstalledServer[]>([]);
			}

			const servers: InstalledServer[] = [];

			if (config.mcpServers) {
				for (const [id, serverConfig] of Object.entries(config.mcpServers)) {
					const server = await this.createInstalledServer(id, serverConfig);
					servers.push(server);
				}
			}

			return success(servers);
		} catch (error) {
			return failure('LIST_FAILED', error);
		}
	}

	/**
	 * Add custom registry
	 */
	async addRegistry(
		url: string,
		options: { name?: string } = {},
	): Promise<ApiResponse<{ added: boolean; registryUrl: string }>> {
		try {
			// Validate URL
			try {
				new URL(url);
			} catch {
				return failure('INVALID_URL', 'Invalid registry URL');
			}

			if (!url.startsWith('https://')) {
				return failure('INSECURE_URL', 'Registry URL must use HTTPS');
			}

			// Test connectivity
			try {
				await this.fetchRegistry(url);
			} catch (error) {
				return failure('REGISTRY_UNREACHABLE', `Cannot connect to registry: ${errorMessage(error)}`);
			}

			// Add to configuration (this would persist to config file in real implementation)
			const name = options.name || `custom-${Date.now()}`;
			this.config.registries[name] = url;

			return success({ added: true, registryUrl: url });
		} catch (error) {
			return failure('ADD_REGISTRY_FAILED', error);
		}
	}

	/**
	 * Remove registry
	 */
	async removeRegistry(
		nameOrUrl: string,
	): Promise<ApiResponse<{ removed: boolean }>> {
		const registryToRemove = Object.entries(this.config.registries).find(
			([name, url]) => name === nameOrUrl || url === nameOrUrl,
		);

		if (!registryToRemove) {
			return {
				success: false,
				error: {
					code: 'NOT_FOUND',
					message: `Registry not found: ${nameOrUrl}`,
				},
			};
		}

		const [name, url] = registryToRemove;
		delete this.config.registries[name];
		this.registryCache.delete(url);
		this.cacheTimes.delete(url);

		return {
			success: true,
			data: { removed: true },
		};
	}

	/**
	 * List configured registries
	 */
	async listRegistries(): Promise<ApiResponse<RegistryInfo[]>> {
		const registries: RegistryInfo[] = [];

		// Define trusted registry criteria
		const trustedRegistries = new Set(['default', 'official', 'cortex-os']);

		for (const [name, url] of Object.entries(this.config.registries)) {
			// Determine trust based on registry name and URL patterns
			const isTrusted =
				trustedRegistries.has(name) ||
				url.includes('cortex-os.org') ||
				url.includes('github.com/cortex-os');

			const lastCheckedTime = this.cacheTimes.get(url);

			registries.push({
				name,
				url,
				trusted: isTrusted,
				healthy: this.registryCache.has(url),
				lastChecked: lastCheckedTime
					? new Date(lastCheckedTime).toISOString()
					: undefined,
			});
		}

		return {
			success: true,
			data: registries,
		};
	}

	/**
	 * Check registry health
	 */
	async healthCheck(registryUrl: string): Promise<
		ApiResponse<{
			healthy: boolean;
			serverCount?: number;
			lastUpdated?: string;
			error?: string;
		}>
	> {
		try {
			const registry = await this.fetchRegistry(registryUrl);

			return {
				success: true,
				data: {
					healthy: true,
					serverCount: registry.servers.length,
					lastUpdated: registry.updatedAt,
				},
			};
		} catch (error) {
			return {
				success: true, // Health check itself succeeds, but registry is unhealthy
				data: {
					healthy: false,
					error: error instanceof Error ? error.message : 'Unknown error',
				},
			};
		}
	}

	/**
	 * Private methods
	 */
	private async fetchRegistry(url: string): Promise<RegistryIndex> {
		// Security: Validate URL to prevent SSRF attacks
		if (!validateMarketplaceUrl(url)) {
			throw new Error(`Invalid marketplace URL rejected for security: ${url}`);
		}

		// Use safeFetch - URL already validated above against allowlist
		const response = await fetch(url, {
			redirect: 'manual',
			referrerPolicy: 'no-referrer',
			signal: AbortSignal.timeout(30000),
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const data = await response.json();
		const registry = RegistryIndexSchema.parse(data);

		// Cache the registry
		this.registryCache.set(url, registry);
		this.cacheTimes.set(url, Date.now());

		// Save to disk cache
		await this.saveCacheEntry(url, registry);

		return registry;
	}

	private async loadCachedRegistries(): Promise<void> {
		for (const url of Object.values(this.config.registries)) {
			try {
				const cacheFile = this.getCacheFilePath(url);
				if (existsSync(cacheFile)) {
					const cacheData = await readFile(cacheFile, 'utf-8');
					const cacheEntry = CacheEntrySchema.parse(JSON.parse(cacheData));

					this.registryCache.set(url, cacheEntry.data);
					// Ensure cachedAt is a number (timestamp)
					const cachedAtTime =
						typeof cacheEntry.cachedAt === 'number'
							? cacheEntry.cachedAt
							: Date.now();
					this.cacheTimes.set(url, cachedAtTime);
				}
			} catch (error) {
				// Surface as warn (allowed) to satisfy no-ignored-exceptions without failing initialization
				console.warn('marketplace cache load failed', {
					url,
					error: error instanceof Error ? error.message : error,
				});
			}
		}
	}

	private async saveCacheEntry(
		url: string,
		registry: RegistryIndex,
	): Promise<void> {
		try {
			const cacheEntry: CacheEntry = {
				data: registry,
				cachedAt: Date.now(),
				registryUrl: url,
			};

			const cacheFile = this.getCacheFilePath(url);
			await writeFile(cacheFile, JSON.stringify(cacheEntry, null, 2));
		} catch (error) {
			console.warn('Failed to save cache', { url, error });
		}
	}

	private getCacheFilePath(url: string): string {
		return getRegistryCacheFilePath(this.config.cacheDir, url);
	}

	private isCacheStale(url: string): boolean {
		const cacheTime = this.cacheTimes.get(url);
		if (!cacheTime) return true;

		return Date.now() - cacheTime > this.config.cacheTtl;
	}

	private validateServerSecurity(server: ServerManifest): {
		allowed: boolean;
		reason?: 'risk' | 'signature' | 'publisher';
		message: string;
	} {
		// Check risk level
		const sec = getSecurity(server);
		if (
			sec?.riskLevel &&
			!this.config.security.allowedRiskLevels.includes(sec.riskLevel)
		) {
			return {
				allowed: false,
				reason: 'risk',
				message: `Risk level not allowed: ${sec.riskLevel}. Allowed levels: ${this.config.security.allowedRiskLevels.join(', ')}`,
			};
		}

		// Check signature requirement
		if (this.config.security.requireSignatures && !sec?.sigstoreBundle) {
			return {
				allowed: false,
				reason: 'signature',
				message: 'Server signature required but not provided',
			};
		}

		// Check trusted publishers (if configured)
		const owner = getOwner(server);
		if (
			this.config.security.trustedPublishers.length > 0 &&
			(!owner || !this.config.security.trustedPublishers.includes(owner))
		) {
			return {
				allowed: false,
				reason: 'publisher',
				message: `Publisher not in trusted list: ${owner ?? '<unknown>'}`,
			};
		}

		return { allowed: true, message: 'Security validation passed' };
	}
}

// Factory to construct a MarketplaceClient with sensible defaults
export function createMarketplaceClient(
	options: {
		registryUrl?: string;
		cacheDir?: string;
		security?: Partial<MarketplaceConfig['security']>;
	} = {},
) {
	const defaultRegistry =
		options.registryUrl || 'https://registry.cortex-os.dev/v1/registry.json';
	const cfg: MarketplaceConfig = MarketplaceConfigSchema.parse({
		registries: { default: defaultRegistry },
		cacheDir:
			options.cacheDir ||
			path.join(process.cwd(), '.cortex-cache', 'marketplace'),
		cacheTtl: 300000,
		security: { ...(options.security || {}) },
	});
	return new MarketplaceClient(cfg);
}
