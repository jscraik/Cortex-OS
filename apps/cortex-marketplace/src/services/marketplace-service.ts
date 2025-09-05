/**
 * @file Marketplace Service
 * @description Core business logic for marketplace operations
 */

import type { ServerManifest } from "@cortex-os/mcp-registry";
import { z } from "zod";
import { DEFAULT_LIMIT, MAX_LIMIT } from "../constants.js";
import type { RegistryService } from "./registry-service.js";

// Enhanced search with AI-powered capabilities
export interface SearchRequest {
	q?: string;
	category?: string;
	riskLevel?: "low" | "medium" | "high";
	featured?: boolean;
	publisher?: string;
	minRating?: number;
	tags?: string[];
	capabilities?: Array<"tools" | "resources" | "prompts">;
	limit?: number;
	offset?: number;
	sortBy?: "relevance" | "downloads" | "rating" | "updated";
	sortOrder?: "asc" | "desc";
}

export interface SearchResult {
	servers: ServerManifest[];
	total: number;
	offset: number;
	limit: number;
	facets?: {
		categories: Record<string, number>;
		riskLevels: Record<string, number>;
		publishers: Record<string, number>;
	};
}

export interface MarketplaceStats {
	totalServers: number;
	totalDownloads: number;
	totalPublishers: number;
	featuredCount: number;
	categoryBreakdown: Record<string, number>;
	riskLevelBreakdown: Record<string, number>;
	averageRating: number;
	recentlyUpdated: number;
}

const SearchRequestSchema = z.object({
	q: z.string().optional(),
	category: z.string().optional(),
	riskLevel: z.enum(["low", "medium", "high"]).optional(),
	featured: z.boolean().optional(),
	publisher: z.string().optional(),
	minRating: z.number().min(0).max(5).optional(),
	tags: z.array(z.string()).optional(),
	capabilities: z.array(z.enum(["tools", "resources", "prompts"])).optional(),
	limit: z.number().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
	offset: z.number().min(0).default(0),
	sortBy: z
		.enum(["relevance", "downloads", "rating", "updated"])
		.default("relevance"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Marketplace Service
 * Handles server discovery, search, and metadata operations
 */
export class MarketplaceService {
	private registryService: RegistryService;
	private searchCache = new Map<
		string,
		{ result: SearchResult; timestamp: number }
	>();
	private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

	constructor(registryService: RegistryService) {
		this.registryService = registryService;
	}

	/**
	 * Search for MCP servers with optional AI enhancement
	 */
	async search(rawRequest: SearchRequest): Promise<SearchResult> {
		const request = SearchRequestSchema.parse(rawRequest);

		// Check cache first
		const cacheKey = JSON.stringify(request);
		const cached = this.searchCache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
			return cached.result;
		}

                const registries = await this.registryService.listRegistries();
                const filteredServers: ServerManifest[] = [];
                const facets = {
                        categories: {} as Record<string, number>,
                        riskLevels: {} as Record<string, number>,
                        publishers: {} as Record<string, number>,
                };
                const query = request.q?.toLowerCase();

                for (const registry of registries) {
                        try {
                                const data = await this.registryService.getRegistry(registry.name);
                                for (const server of data?.servers || []) {
                                        const matchesQuery =
                                                !query ||
                                                server.name.toLowerCase().includes(query) ||
                                                server.description.toLowerCase().includes(query) ||
                                                server.id.toLowerCase().includes(query) ||
                                                server.tags?.some((tag) =>
                                                        tag.toLowerCase().includes(query),
                                                );

                                        if (matchesQuery) {
                                                if (server.category) {
                                                        facets.categories[server.category] =
                                                                (facets.categories[server.category] || 0) + 1;
                                                }
                                                if (server.security?.riskLevel) {
                                                        const risk = server.security.riskLevel;
                                                        facets.riskLevels[risk] =
                                                                (facets.riskLevels[risk] || 0) + 1;
                                                }
                                                if (server.publisher?.name) {
                                                        const pub = server.publisher.name;
                                                        facets.publishers[pub] =
                                                                (facets.publishers[pub] || 0) + 1;
                                                }
                                        }

                                        if (this.passesFilters(server, request)) {
                                                filteredServers.push(server);
                                        }
                                }
                        } catch (error) {
                                console.warn(`Failed to load registry ${registry.name}:`, error);
                        }
                }

                const seen = new Set<string>();
                const uniqueServers = filteredServers.filter((server) => {
                        if (seen.has(server.id)) return false;
                        seen.add(server.id);
                        return true;
                });

                const sortedServers = this.sortResults(uniqueServers, request);

                const total = sortedServers.length;
                const paginatedServers = sortedServers.slice(
                        request.offset,
                        request.offset + request.limit,
                );

                const result: SearchResult = {
                        servers: paginatedServers,
                        total,
                        offset: request.offset,
                        limit: request.limit,
                        facets,
                };

		// Cache result
		this.searchCache.set(cacheKey, { result, timestamp: Date.now() });

		return result;
	}

	/**
	 * Get server by ID
	 */
	async getServer(id: string): Promise<ServerManifest | null> {
		const allServers = await this.getAllServers();
		return allServers.find((server) => server.id === id) || null;
	}

	/**
	 * Get marketplace statistics
	 */
	async getStats(): Promise<MarketplaceStats> {
		const allServers = await this.getAllServers();

		const totalDownloads = allServers.reduce(
			(sum, server) => sum + (server.downloads || 0),
			0,
		);
		const publishers = new Set(allServers.map((s) => s.publisher?.name)).size;
		const featuredCount = allServers.filter((s) => s.featured).length;

		const categoryBreakdown: Record<string, number> = {};
		const riskLevelBreakdown: Record<string, number> = {};
		let totalRating = 0;
		let ratingCount = 0;

		for (const server of allServers) {
			// Category breakdown
			if (server.category) {
				categoryBreakdown[server.category] =
					(categoryBreakdown[server.category] || 0) + 1;
			}

			// Risk level breakdown
			if (server.security?.riskLevel) {
				const risk = server.security.riskLevel;
				riskLevelBreakdown[risk] = (riskLevelBreakdown[risk] || 0) + 1;
			}

			// Average rating
			if (server.rating) {
				totalRating += server.rating;
				ratingCount++;
			}
		}

		const recentlyUpdated = allServers.filter((server) => {
			if (!server.updatedAt) return false;
			const updated = new Date(server.updatedAt);
			const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
			return updated > weekAgo;
		}).length;

		return {
			totalServers: allServers.length,
			totalDownloads,
			totalPublishers: publishers,
			featuredCount,
			categoryBreakdown,
			riskLevelBreakdown,
			averageRating: ratingCount > 0 ? totalRating / ratingCount : 0,
			recentlyUpdated,
		};
	}

	/**
	 * Get all categories with server counts
	 */
	async getCategories(): Promise<
		Record<string, { name: string; count: number; description?: string }>
	> {
		const allServers = await this.getAllServers();
		const categories: Record<
			string,
			{ name: string; count: number; description?: string }
		> = {};

		for (const server of allServers) {
			if (server.category) {
				if (!categories[server.category]) {
					categories[server.category] = {
						name: this.formatCategoryName(server.category),
						count: 0,
						description: this.getCategoryDescription(server.category),
					};
				}
				categories[server.category].count++;
			}
		}

		return categories;
	}

	/**
	 * Get all servers from all registries
	 */
	private async getAllServers(): Promise<ServerManifest[]> {
		const registries = await this.registryService.listRegistries();
		const allServers: ServerManifest[] = [];

		for (const registry of registries) {
			try {
				const data = await this.registryService.getRegistry(registry.name);
				if (data?.servers) {
					allServers.push(...data.servers);
				}
			} catch (error) {
				console.warn(`Failed to load registry ${registry.name}:`, error);
			}
		}

		// Remove duplicates by ID (prefer first occurrence)
		const seen = new Set<string>();
		return allServers.filter((server) => {
			if (seen.has(server.id)) return false;
			seen.add(server.id);
			return true;
		});
	}

        private passesFilters(
                server: ServerManifest,
                request: SearchRequest,
        ): boolean {
                if (request.q) {
                        const query = request.q.toLowerCase();
                        const matches =
                                server.name.toLowerCase().includes(query) ||
                                server.description.toLowerCase().includes(query) ||
                                server.id.toLowerCase().includes(query) ||
                                server.tags?.some((tag) => tag.toLowerCase().includes(query));
                        if (!matches) {
                                return false;
                        }
                }

                if (request.category && server.category !== request.category) {
                        return false;
                }

                if (
                        request.riskLevel &&
                        server.security?.riskLevel !== request.riskLevel
                ) {
                        return false;
                }

                if (
                        request.featured !== undefined &&
                        Boolean(server.featured) !== request.featured
                ) {
                        return false;
                }

                if (
                        request.publisher &&
                        !server.publisher?.name
                                .toLowerCase()
                                .includes(request.publisher.toLowerCase())
                ) {
                        return false;
                }

                if (request.minRating !== undefined) {
                        if (server.rating === undefined || server.rating < request.minRating) {
                                return false;
                        }
                }

                if (request.tags && request.tags.length > 0) {
                        if (
                                !(
                                        server.tags &&
                                        request.tags.some((tag) =>
                                                server.tags?.some((serverTag) =>
                                                        serverTag.toLowerCase().includes(tag.toLowerCase()),
                                                ),
                                        )
                                )
                        ) {
                                return false;
                        }
                }

                if (request.capabilities && request.capabilities.length > 0) {
                        if (
                                !request.capabilities.every(
                                        (cap) => server.capabilities[cap] === true,
                                )
                        ) {
                                return false;
                        }
                }

                return true;
        }

        /**
         * Sort search results
         */
        private sortResults(
		servers: ServerManifest[],
		request: SearchRequest,
	): ServerManifest[] {
		const { sortBy, sortOrder } = request;

		return servers.sort((a, b) => {
			let comparison = 0;

			switch (sortBy) {
				case "downloads":
					comparison = (a.downloads || 0) - (b.downloads || 0);
					break;
				case "rating":
					comparison = (a.rating || 0) - (b.rating || 0);
					break;
				case "updated": {
					const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
					const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
					comparison = aDate - bDate;
					break;
				}
				default: {
					// Relevance scoring: featured > downloads > rating
					const aScore =
						(a.featured ? 1000 : 0) +
						(a.downloads || 0) * 0.001 +
						(a.rating || 0) * 100;
					const bScore =
						(b.featured ? 1000 : 0) +
						(b.downloads || 0) * 0.001 +
						(b.rating || 0) * 100;
					comparison = aScore - bScore;
					break;
				}
			}

			return sortOrder === "asc" ? comparison : -comparison;
		});
	}

        /**
         * Format category name for display
         */
	private formatCategoryName(category: string): string {
		return category
			.split("-")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	}

	/**
	 * Get category description
	 */
	private getCategoryDescription(category: string): string {
		const descriptions: Record<string, string> = {
			development: "Developer tools and integrations",
			productivity: "Productivity and workflow tools",
			data: "Data sources and databases",
			communication: "Chat and communication platforms",
			"ai-ml": "AI and machine learning tools",
			integration: "Third-party service integrations",
			utility: "General utility tools",
			security: "Security and compliance tools",
			finance: "Financial services and tools",
			media: "Media processing and management",
		};

		return descriptions[category] || "Miscellaneous tools";
	}
}
