/**
 * @file MCP Marketplace Registry
 * @description Registry management for MCP marketplace servers
 */
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import Fuse from "fuse.js";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import type {
	ApiResponse,
	RegistryIndex,
	SearchRequest,
	ServerHealth,
	ServerManifest,
} from "./types.js";
import { RegistryIndexSchema, ServerManifestSchema } from "./types.js";

// Security: Allowlisted domains for marketplace registries
const ALLOWED_REGISTRY_DOMAINS = [
	"registry.cortex-os.dev",
	"marketplace.cortex-os.com",
	"api.cortex-os.com",
	"localhost",
	"127.0.0.1",
	"::1",
	// Add trusted registry domains here
];

/**
 * Security: Validate registry URL to prevent SSRF attacks
 */
export function validateRegistryUrl(url: string): boolean {
	try {
		const parsedUrl = new URL(url);

		// Only allow HTTP/HTTPS protocols
		if (!["http:", "https:"].includes(parsedUrl.protocol)) {
			return false;
		}

		// Check against allowlist
		const hostname = parsedUrl.hostname.toLowerCase();
		return ALLOWED_REGISTRY_DOMAINS.includes(hostname);
	} catch {
		return false;
	}
}

export class MarketplaceRegistry {
	private registry: RegistryIndex | null = null;
	private searchIndex: Fuse<ServerManifest> | null = null;
	private healthStatus = new Map<string, ServerHealth>();
	private lastUpdate: Date | null = null;

	constructor(
		private registryUrl: string = "https://registry.cortex-os.dev/v1/registry.json",
		private cacheDir: string = "./.cortex/registry/cache",
	) { }

	/**
	 * Initialize the registry by loading from cache or fetching
	 */
	async initialize(): Promise<void> {
		await this.ensureCacheDir();

		try {
			await this.loadFromCache();

			// Fetch updates if cache is stale
			if (this.isCacheStale()) {
				await this.fetchRegistry();
			}
		} catch (error) {
			// eslint-disable-next-line no-console
			console.warn(
				"Failed to load from cache, fetching fresh registry:",
				error,
			);
			await this.fetchRegistry();
		}

		this.buildSearchIndex();
	}

	/**
	 * Fetch registry from remote URL
	 */
	async fetchRegistry(): Promise<void> {
		try {
			// Security: Validate URL to prevent SSRF attacks
			if (!validateRegistryUrl(this.registryUrl)) {
				throw new Error(
					`Invalid registry URL rejected for security: ${this.registryUrl}`,
				);
			}

			const response = await fetch(this.registryUrl, {
				redirect: 'manual',
				referrerPolicy: 'no-referrer',
				signal: AbortSignal.timeout(30000),
			});
			if (!response.ok) {
				throw new Error(
					`Failed to fetch registry: ${response.status} ${response.statusText}`,
				);
			}

			const data: unknown = await response.json();
			const result = RegistryIndexSchema.safeParse(data);

			if (!result.success) {
				throw new Error(`Invalid registry format: ${result.error.message}`);
			}

			this.registry = result.data;
			this.lastUpdate = new Date();

			// Cache the registry
			await this.saveToCache();

			// eslint-disable-next-line no-console
			console.log(
				`✅ Registry updated: ${this.registry.serverCount} servers available`,
				` (checksum: ${this.getRegistryChecksum()})`,
			);
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Failed to fetch registry:", error);
			throw error;
		}
	}

	/**
	 * Get the full registry
	 */
	getRegistry(): RegistryIndex | null {
		return this.registry;
	}

	/**
	 * Get a specific server by ID
	 */
	getServer(id: string): ServerManifest | null {
		if (!this.registry) return null;

		return this.registry.servers.find((server) => server.id === id) || null;
	}

	/**
	 * Search servers with filters
	 */
	async searchServers(
		request: SearchRequest,
	): Promise<ApiResponse<ServerManifest[]>> {
		if (!this.registry) {
			return {
				success: false,
				error: {
					code: "REGISTRY_NOT_LOADED",
					message: "Registry not initialized",
				},
			};
		}

		let results = [...this.registry.servers];

		// Text search using Fuse.js
		if (request.q && this.searchIndex) {
			const searchResults = this.searchIndex.search(request.q);
			results = searchResults.map((result) => result.item);
		}

		// Category filter
		if (request.category) {
			results = results.filter(
				(server) => server.category === request.category,
			);
		}

		// Capabilities filter
		if (request.capabilities && request.capabilities.length > 0) {
			results = results.filter((server) =>
				request.capabilities?.every((cap) => server.capabilities[cap]),
			);
		}

		// Verified filter
		if (request.verified !== undefined) {
			results = results.filter(
				(server) => server.publisher.verified === request.verified,
			);
		}

		// Sort by featured first, then by downloads
		results.sort((a, b) => {
			if (a.featured && !b.featured) return -1;
			if (!a.featured && b.featured) return 1;
			return b.downloads - a.downloads;
		});

		// Pagination
		const total = results.length;
		const paginatedResults = results.slice(
			request.offset,
			request.offset + request.limit,
		);

		return {
			success: true,
			data: paginatedResults,
			meta: {
				total,
				offset: request.offset,
				limit: request.limit,
			},
		};
	}

	/**
	 * Get featured servers
	 */
	getFeaturedServers(): ServerManifest[] {
		if (!this.registry) return [];

		return this.registry.servers.filter((server) => server.featured);
	}

	/**
	 * Get servers by category
	 */
	getServersByCategory(category: string): ServerManifest[] {
		if (!this.registry) return [];

		return this.registry.servers.filter(
			(server) => server.category === category,
		);
	}

	/**
	 * Get server health status
	 */
	getServerHealth(serverId: string): ServerHealth | null {
		return this.healthStatus.get(serverId) || null;
	}

	/**
	 * Update server health status
	 */
	updateServerHealth(health: ServerHealth): void {
		this.healthStatus.set(health.serverId, health);
	}

	/**
	 * Validate a server manifest
	 */
	validateServer(manifest: unknown): { valid: boolean; errors: string[] } {
		const result = ServerManifestSchema.safeParse(manifest);

		if (result.success) {
			return { valid: true, errors: [] };
		}

		return {
			valid: false,
			errors: result.error.errors.map(
				(err) => `${err.path.join(".")}: ${err.message}`,
			),
		};
	}

	/**
	 * Get registry statistics
	 */
	getStatistics() {
		if (!this.registry) return null;

		const stats = {
			totalServers: this.registry.serverCount,
			categories: Object.keys(this.registry.categories).length,
			featuredServers: this.registry.featured.length,
			verifiedPublishers: this.registry.servers.filter(
				(s) => s.publisher.verified,
			).length,
			lastUpdated: this.lastUpdate?.toISOString(),
			capabilities: {
				tools: this.registry.servers.filter((s) => s.capabilities.tools).length,
				resources: this.registry.servers.filter((s) => s.capabilities.resources)
					.length,
				prompts: this.registry.servers.filter((s) => s.capabilities.prompts)
					.length,
			},
			riskLevels: {
				low: this.registry.servers.filter((s) => s.security.riskLevel === "low")
					.length,
				medium: this.registry.servers.filter(
					(s) => s.security.riskLevel === "medium",
				).length,
				high: this.registry.servers.filter(
					(s) => s.security.riskLevel === "high",
				).length,
			},
		};

		return stats;
	}

	/**
	 * Private methods
	 */
	private async ensureCacheDir(): Promise<void> {
		if (!existsSync(this.cacheDir)) {
			await mkdir(this.cacheDir, { recursive: true });
		}
	}

	private get cacheFile(): string {
		return path.join(this.cacheDir, "registry.json");
	}

	private get metaFile(): string {
		return path.join(this.cacheDir, "meta.json");
	}

	private async loadFromCache(): Promise<void> {
		if (!existsSync(this.cacheFile) || !existsSync(this.metaFile)) {
			throw new Error("Cache files not found");
		}

		const [registryData, metaData] = await Promise.all([
			readFile(this.cacheFile, "utf-8"),
			readFile(this.metaFile, "utf-8"),
		]);

		const registry: unknown = JSON.parse(registryData);
		const meta: unknown = JSON.parse(metaData);

		const result = RegistryIndexSchema.safeParse(registry);
		if (!result.success) {
			throw new Error("Invalid cached registry format");
		}

		this.registry = result.data;
		this.lastUpdate = new Date((meta as { lastUpdate: string }).lastUpdate);
	}

	private async saveToCache(): Promise<void> {
		if (!this.registry || !this.lastUpdate) return;

		const meta = {
			lastUpdate: this.lastUpdate.toISOString(),
			checksum: this.getRegistryChecksum(),
		};

		await Promise.all([
			writeFile(this.cacheFile, JSON.stringify(this.registry, null, 2)),
			writeFile(this.metaFile, JSON.stringify(meta, null, 2)),
		]);
	}

	private isCacheStale(): boolean {
		if (!this.lastUpdate) return true;

		const cacheAge = Date.now() - this.lastUpdate.getTime();
		const maxAge = 5 * 60 * 1000; // 5 minutes

		return cacheAge > maxAge;
	}

	private buildSearchIndex(): void {
		if (!this.registry) return;

		this.searchIndex = new Fuse(this.registry.servers, {
			keys: [
				{ name: "name", weight: 0.4 },
				{ name: "description", weight: 0.3 },
				{ name: "tags", weight: 0.2 },
				{ name: "publisher.name", weight: 0.1 },
			],
			threshold: 0.4,
			includeScore: true,
		});
	}

	private getRegistryChecksum(): string {
		if (!this.registry) return "";

		const content = JSON.stringify(this.registry);
		const hash = sha256(content);
		return bytesToHex(hash);
	}
}
