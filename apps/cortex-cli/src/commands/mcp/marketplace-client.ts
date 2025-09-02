/**
 * @file MCP Marketplace Client
 * @description Client for interacting with MCP marketplace registries
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RegistryIndex, ServerManifest } from "@cortex-os/mcp-registry";
import { RegistryIndexSchema } from "@cortex-os/mcp-registry";
import { z } from "zod";

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
				.array(z.enum(["low", "medium", "high"]))
				.default(["low", "medium"]),
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

// Simple search request accepted by this client
export const SearchRequestSchema = z.object({
	q: z.string().optional(),
	category: z.string().optional(),
	tags: z.array(z.string()).optional(),
	capabilities: z.array(z.string()).optional(),
	verified: z.boolean().optional(),
	riskLevel: z.enum(["low", "medium", "high"]).optional(),
	limit: z.number().int().min(1).max(50).default(10),
	offset: z.number().int().min(0).default(0),
});
export type SearchRequest = z.infer<typeof SearchRequestSchema>;

// Simple search options used by CLI
export interface SearchOptions {
	category?: string;
	tags?: string[];
	riskLevel?: "low" | "medium" | "high";
	verifiedOnly?: boolean;
	limit?: number;
	offset?: number;
	registryUrl?: string;
}

// Security: Allowlisted domains for marketplace registries
const ALLOWED_MARKETPLACE_DOMAINS = [
	"marketplace.cortex-os.com",
	"marketplace.cortex-os.dev",
	"registry.cortex-os.com",
	"registry.cortex-os.dev",
	"api.cortex-os.com",
	"localhost",
	"127.0.0.1",
	"::1",
	// Add trusted marketplace domains here
];

/**
 * Security: Validate marketplace URL to prevent SSRF attacks
 */
function validateMarketplaceUrl(url: string): boolean {
	try {
		const parsedUrl = new URL(url);

		// Only allow HTTP/HTTPS protocols
		if (!["http:", "https:"].includes(parsedUrl.protocol)) {
			return false;
		}

		// Check against allowlist
		const hostname = parsedUrl.hostname.toLowerCase();
		return ALLOWED_MARKETPLACE_DOMAINS.includes(hostname);
	} catch {
		return false;
	}
}

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
	status: "active" | "inactive" | "error";
	transport: "stdio" | "streamableHttp";
	source: "marketplace" | "manual";
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
					console.warn(
						`Failed to update registry ${name}:`,
						error instanceof Error ? error.message : error,
					);
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
		if (typeof requestOrQuery === "string") {
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
						code: "REGISTRY_NOT_LOADED",
						message: "No registries available",
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
						code: "REGISTRY_NOT_LOADED",
						message: "Registry data not available",
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
						code: "INVALID_REQUEST",
						message: "Invalid search parameters",
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
				return (
					server.name.toLowerCase().includes(query) ||
					(server.description || "").toLowerCase().includes(query) ||
					inTags ||
					server.owner.toLowerCase().includes(query)
				);
			});
		}
		if (validatedRequest.category) {
			preds.push((server) => server.category === validatedRequest.category);
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
			preds.push((server) => (server.security?.riskLevel ?? "medium") === rl);
		}
		if (validatedRequest.verified !== undefined) {
			const ver = validatedRequest.verified;
			preds.push(
				(server) => (server.security?.verifiedPublisher ?? false) === ver,
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
			transport?: "stdio" | "streamableHttp";
		} = {},
	): Promise<ApiResponse<{ installed: boolean; serverId: string }>> {
		try {
			// Find server in registry
			const server = await this.getServer(serverId);
			if (!server) {
				return {
					success: false,
					error: {
						code: "SERVER_NOT_FOUND",
						message: `Server not found in registry: ${serverId}`,
					},
				};
			}

			// Security validation
			const securityCheck = this.validateServerSecurity(server);
			if (!securityCheck.allowed) {
				return {
					success: false,
					error: {
						code:
							securityCheck.reason === "risk"
								? "SECURITY_VIOLATION"
								: "SIGNATURE_REQUIRED",
						message: securityCheck.message,
						details: { riskLevel: server.security?.riskLevel },
					},
				};
			}

			// Determine transport to use
			const selection = this.selectTransport(server, options.transport);
			if (!selection.success) return selection.response;

			// Load existing configuration
			const configPath = path.join(this.config.cacheDir, "..", "servers.json");
			const config = await this.loadConfig(configPath);

			// Add server configuration
			// Ensure container exists
			if (!config.mcpServers) config.mcpServers = {} as Record<string, unknown>;

			if (selection.transport === "stdio" && server.transports.stdio) {
				config.mcpServers[serverId] = {
					command: server.transports.stdio.command,
					args: server.transports.stdio.args || [],
					env: server.transports.stdio.env || {},
				};
			} else if (
				selection.transport === "streamableHttp" &&
				server.transports.streamableHttp
			) {
				config.mcpServers[serverId] = {
					serverUrl: server.transports.streamableHttp.url,
					headers: server.transports.streamableHttp.headers || {},
				};
			}

			// Save configuration
			await this.saveConfig(configPath, config);

			return {
				success: true,
				data: { installed: true, serverId },
			};
		} catch (error) {
			return {
				success: false,
				error: {
					code: "INSTALLATION_FAILED",
					message: error instanceof Error ? error.message : "Unknown error",
				},
			};
		}
	}

	private async loadConfig(configPath: string): Promise<McpConfigType> {
		try {
			const configData = await readFile(configPath, "utf-8");
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
		requested?: "stdio" | "streamableHttp",
	):
		| { success: true; transport: "stdio" | "streamableHttp" }
		| {
				success: false;
				response: ApiResponse<{ installed: boolean; serverId: string }>;
		  } {
		if (requested) {
			if (requested === "stdio" && !server.transports.stdio) {
				return {
					success: false,
					response: {
						success: false,
						error: {
							code: "TRANSPORT_UNAVAILABLE",
							message: "stdio transport not available for this server",
						},
					},
				};
			}
			if (requested === "streamableHttp" && !server.transports.streamableHttp) {
				return {
					success: false,
					response: {
						success: false,
						error: {
							code: "TRANSPORT_UNAVAILABLE",
							message: "streamableHttp transport not available for this server",
						},
					},
				};
			}
			return { success: true, transport: requested };
		}
		return {
			success: true,
			transport: server.transports.stdio ? "stdio" : "streamableHttp",
		};
	}

	/**
	 * Remove server from local configuration
	 */
	async removeServer(
		serverId: string,
	): Promise<ApiResponse<{ removed: boolean }>> {
		try {
			const configPath = path.join(this.config.cacheDir, "..", "servers.json");

			let config: McpConfigType;
			try {
				const configData = await readFile(configPath, "utf-8");
				config = JSON.parse(configData) as McpConfigType;
			} catch {
				return {
					success: false,
					error: {
						code: "NOT_FOUND",
						message: `Server not installed: ${serverId}`,
					},
				};
			}

			if (!config.mcpServers?.[serverId]) {
				return {
					success: false,
					error: {
						code: "NOT_FOUND",
						message: `Server not installed: ${serverId}`,
					},
				};
			}

			// Remove server
			delete config.mcpServers[serverId];

			// Save configuration
			await writeFile(configPath, JSON.stringify(config, null, 2));

			return {
				success: true,
				data: { removed: true },
			};
		} catch (error) {
			return {
				success: false,
				error: {
					code: "REMOVAL_FAILED",
					message: error instanceof Error ? error.message : "Unknown error",
				},
			};
		}
	}

	/**
	 * Determine server status based on configuration
	 */
	private determineServerStatus(
		serverConfig: unknown,
	): "active" | "inactive" | "error" {
		try {
			const typedConfig = serverConfig as ServerConfigType;

			// Basic configuration check
			if (typedConfig?.command) {
				return "active"; // Assume active if properly configured
			}
			return "inactive";
		} catch {
			return "error";
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
			transport: typedConfig?.command ? "stdio" : "streamableHttp",
			source: manifest ? "marketplace" : "manual",
			installedAt,
		};
	}

	/**
	 * List installed servers
	 */
	async listServers(): Promise<ApiResponse<InstalledServer[]>> {
		try {
			const configPath = path.join(this.config.cacheDir, "..", "servers.json");

			let config: McpConfigType;
			try {
				const configData = await readFile(configPath, "utf-8");
				config = JSON.parse(configData) as McpConfigType;
			} catch {
				// File doesn't exist or is invalid, return empty list
				return {
					success: true,
					data: [],
				};
			}

			const servers: InstalledServer[] = [];

			if (config.mcpServers) {
				for (const [id, serverConfig] of Object.entries(config.mcpServers)) {
					const server = await this.createInstalledServer(id, serverConfig);
					servers.push(server);
				}
			}

			return {
				success: true,
				data: servers,
			};
		} catch (error) {
			return {
				success: false,
				error: {
					code: "LIST_FAILED",
					message: error instanceof Error ? error.message : "Unknown error",
				},
			};
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
				return {
					success: false,
					error: { code: "INVALID_URL", message: "Invalid registry URL" },
				};
			}

			if (!url.startsWith("https://")) {
				return {
					success: false,
					error: {
						code: "INSECURE_URL",
						message: "Registry URL must use HTTPS",
					},
				};
			}

			// Test connectivity
			try {
				await this.fetchRegistry(url);
			} catch (error) {
				return {
					success: false,
					error: {
						code: "REGISTRY_UNREACHABLE",
						message: `Cannot connect to registry: ${error instanceof Error ? error.message : "Unknown error"}`,
					},
				};
			}

			// Add to configuration (this would persist to config file in real implementation)
			const name = options.name || `custom-${Date.now()}`;
			this.config.registries[name] = url;

			return {
				success: true,
				data: { added: true, registryUrl: url },
			};
		} catch (error) {
			return {
				success: false,
				error: {
					code: "ADD_REGISTRY_FAILED",
					message: error instanceof Error ? error.message : "Unknown error",
				},
			};
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
					code: "NOT_FOUND",
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
		const trustedRegistries = new Set(["default", "official", "cortex-os"]);

		for (const [name, url] of Object.entries(this.config.registries)) {
			// Determine trust based on registry name and URL patterns
			const isTrusted =
				trustedRegistries.has(name) ||
				url.includes("cortex-os.org") ||
				url.includes("github.com/cortex-os");

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
					serverCount: registry.metadata.serverCount,
					lastUpdated: registry.metadata.updatedAt,
				},
			};
		} catch (error) {
			return {
				success: true, // Health check itself succeeds, but registry is unhealthy
				data: {
					healthy: false,
					error: error instanceof Error ? error.message : "Unknown error",
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

		const response = await fetch(url);

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
					const cacheData = await readFile(cacheFile, "utf-8");
					const cacheEntry = CacheEntrySchema.parse(JSON.parse(cacheData));

					this.registryCache.set(url, cacheEntry.data);
					// Ensure cachedAt is a number (timestamp)
					const cachedAtTime =
						typeof cacheEntry.cachedAt === "number"
							? cacheEntry.cachedAt
							: Date.now();
					this.cacheTimes.set(url, cachedAtTime);
				}
			} catch (error) {
				// Ignore cache errors, will fetch fresh data
				console.debug(`Failed to load cache for ${url}:`, error);
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
			console.warn(`Failed to save cache for ${url}:`, error);
		}
	}

	private getCacheFilePath(url: string): string {
		// Create a safe filename from URL
		const urlHash = Buffer.from(url).toString("base64url");
		return path.join(this.config.cacheDir, `registry-${urlHash}.json`);
	}

	private isCacheStale(url: string): boolean {
		const cacheTime = this.cacheTimes.get(url);
		if (!cacheTime) return true;

		return Date.now() - cacheTime > this.config.cacheTtl;
	}

	private validateServerSecurity(server: ServerManifest): {
		allowed: boolean;
		reason?: "risk" | "signature" | "publisher";
		message: string;
	} {
		// Check risk level
		if (
			server.security &&
			!this.config.security.allowedRiskLevels.includes(
				server.security.riskLevel,
			)
		) {
			return {
				allowed: false,
				reason: "risk",
				message: `Risk level not allowed: ${server.security.riskLevel}. Allowed levels: ${this.config.security.allowedRiskLevels.join(", ")}`,
			};
		}

		// Check signature requirement
		if (
			this.config.security.requireSignatures &&
			!server.security?.sigstoreBundle
		) {
			return {
				allowed: false,
				reason: "signature",
				message: "Server signature required but not provided",
			};
		}

		// Check trusted publishers (if configured)
		if (
			this.config.security.trustedPublishers.length > 0 &&
			!this.config.security.trustedPublishers.includes(server.owner)
		) {
			return {
				allowed: false,
				reason: "publisher",
				message: `Publisher not in trusted list: ${server.owner}`,
			};
		}

		return { allowed: true, message: "Security validation passed" };
	}
}

// Factory to construct a MarketplaceClient with sensible defaults
export function createMarketplaceClient(
	options: {
		registryUrl?: string;
		cacheDir?: string;
		security?: Partial<MarketplaceConfig["security"]>;
	} = {},
) {
	const defaultRegistry =
		options.registryUrl || "https://registry.cortex-os.dev/v1/registry.json";
	const cfg: MarketplaceConfig = MarketplaceConfigSchema.parse({
		registries: { default: defaultRegistry },
		cacheDir:
			options.cacheDir ||
			path.join(process.cwd(), ".cortex-cache", "marketplace"),
		cacheTtl: 300000,
		security: { ...(options.security || {}) },
	});
	return new MarketplaceClient(cfg);
}
