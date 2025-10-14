/**
 * arXiv MCP Tools for brAInwav Cortex-OS Agents
 *
 * Provides arXiv paper search and download capabilities via MCP integration.
 * Tools are registered with LangGraph for agent orchestration.
 */

import { performance } from 'node:perf_hooks';

import { createEnhancedClient } from '@cortex-os/mcp-core/client';
import type { McpServerInfo } from '@cortex-os/mcp-core/types';
import { readAll } from '@cortex-os/mcp-registry/fs-store';
import { z } from 'zod';

import { observability } from '../lib/observability.js';

/**
 * Configuration interface for ArxivMCPTools
 */
export interface ArxivMCPToolsConfig {
        /** arXiv MCP server slug from registry */
        serverSlug?: string;
        /** Search tool name */
        searchToolName?: string;
        /** Download tool name */
        downloadToolName?: string;
        /** Default maximum results for searches */
        defaultMaxResults?: number;
        /** Request timeout in milliseconds */
        requestTimeoutMs?: number;
        /** Cache TTL in milliseconds */
        cacheTTLMs?: number;
        /** Maximum cache entries */
        maxCacheEntries?: number;
}

/**
 * Tool descriptor interface for LangGraph
 */
export interface ToolDescriptor {
        name: string;
        description: string;
        schema: z.ZodObject<any>;
        handler: (input: unknown) => Promise<unknown>;
}

type NormalizedSearchParams = {
        query: string;
        max_results: number;
        field: string;
        sort_by: string;
};

interface CacheEntry {
        value: unknown;
        expiresAt: number;
        createdAt: number;
        lastAccess: number;
}

/**
 * arXiv MCP Tools implementation
 */
export class ArxivMCPTools {
        private config: Required<ArxivMCPToolsConfig>;
        private client?: any;
        private serverInfo?: McpServerInfo;
        private isInitialized = false;
        private static searchCache: Map<string, CacheEntry> = new Map();
        private static cacheHits = 0;
        private static cacheMisses = 0;
        private static cacheEvictions = 0;

        constructor(config: ArxivMCPToolsConfig = {}) {
                const envTTL = Number.parseInt(process.env.ARXIV_CACHE_TTL_MS ?? '', 10);
                const envMax = Number.parseInt(process.env.ARXIV_CACHE_MAX_ENTRIES ?? '', 10);
                const normalizedTTL = Number.isFinite(envTTL) && envTTL > 0 ? envTTL : 300000;
                const normalizedMaxEntries = Number.isFinite(envMax) && envMax > 0 ? envMax : 200;

                this.config = {
                        serverSlug: config.serverSlug || 'arxiv-1',
                        searchToolName: config.searchToolName || 'search_papers',
                        downloadToolName: config.downloadToolName || 'download_paper',
                        defaultMaxResults: config.defaultMaxResults || 5,
                        requestTimeoutMs: config.requestTimeoutMs || 10000,
                        cacheTTLMs: config.cacheTTLMs ?? normalizedTTL,
                        maxCacheEntries: config.maxCacheEntries ?? normalizedMaxEntries,
                };
        }

        /** @internal Testing helper */
        static resetCache(): void {
                ArxivMCPTools.searchCache.clear();
                ArxivMCPTools.cacheHits = 0;
                ArxivMCPTools.cacheMisses = 0;
                ArxivMCPTools.cacheEvictions = 0;
                const labels = { tool: 'arxiv_search' } as const;
                observability.metrics.gauge('arxiv.cache.entries', 0, 'count', labels);
                observability.metrics.gauge('arxiv.cache.hit_ratio', 0, 'ratio', labels);
        }

	/**
	 * Initialize the MCP tools by resolving the arXiv server from registry
	 */
	async initialize(): Promise<void> {
		try {
			// Load server from registry
			const registry = await readAll();
			const server = registry.servers.find((s) => s.slug === this.config.serverSlug);

			if (!server) {
				throw new Error(`arXiv MCP server not found in registry: ${this.config.serverSlug}`);
			}

			this.serverInfo = {
				name: server.name,
				host: server.host,
				port: server.port,
				protocol: server.protocol,
			};

			// Create enhanced client
			this.client = createEnhancedClient(this.serverInfo);

			// Test connection by listing tools
			await this.client.listTools();

			this.isInitialized = true;

			console.log('brAInwav ArxivMCPTools initialized successfully', {
				component: 'agents',
				brand: 'brAInwav',
				server: this.serverInfo.name,
				slug: this.config.serverSlug,
			});
		} catch (error) {
			console.error('brAInwav ArxivMCPTools initialization failed', {
				component: 'agents',
				brand: 'brAInwav',
				slug: this.config.serverSlug,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Get all available tool descriptors for LangGraph
	 */
	getTools(): ToolDescriptor[] {
		if (!this.isInitialized) {
			throw new Error('ArxivMCPTools not initialized. Call initialize() first.');
		}

		return [this.getSearchTool(), this.getDownloadTool()];
	}

	/**
	 * Get the search tool descriptor
	 */
	private getSearchTool(): ToolDescriptor {
		return {
			name: 'arxiv_search',
			description: 'Search for academic papers on arXiv by query string',
			schema: z.object({
				query: z.string().min(1).describe('Search query for arXiv papers'),
				max_results: z
					.number()
					.int()
					.min(1)
					.max(20)
					.optional()
					.describe('Maximum number of results to return (default: 5)'),
				field: z
					.enum([
						'all',
						'title',
						'author',
						'abstract',
						'comments',
						'journal_ref',
						'acm_class',
						'msc_class',
						'report_num',
						'category',
						'id',
					])
					.optional()
					.describe('Field to search in (default: all)'),
				sort_by: z
					.enum(['relevance', 'lastUpdatedDate', 'submittedDate'])
					.optional()
					.describe('Sort order for results (default: relevance)'),
			}),
			handler: async (input: unknown) => {
				return this.handleSearch(input);
			},
		};
	}

	/**
	 * Get the download tool descriptor
	 */
        private getDownloadTool(): ToolDescriptor {
                return {
                        name: 'arxiv_download',
                        description: 'Download the full text or PDF of an arXiv paper',
                        schema: z.object({
				paper_id: z.string().min(1).describe('arXiv paper ID (e.g., "2301.00001")'),
				format: z
					.enum(['pdf', 'tex', 'source'])
					.optional()
					.describe('Download format (default: pdf)'),
			}),
			handler: async (input: unknown) => {
				return this.handleDownload(input);
			},
                };
        }

        /**
         * Handle arXiv search requests
         */
        private async handleSearch(input: unknown): Promise<unknown> {
                if (!this.client || !this.isInitialized) {
                        throw new Error('ArxivMCPTools not initialized');
                }

                const start = performance.now();
                let recordedMetrics = false;
                let loggedMiss = false;

                try {
                        const validated = this.getSearchTool().schema.parse(input);

                        const params = {
                                query: validated.query,
                                max_results: validated.max_results || this.config.defaultMaxResults,
                                ...(validated.field && { field: validated.field }),
                                ...(validated.sort_by && { sort_by: validated.sort_by }),
                        };

                        const normalized = this.normalizeSearchParams(params);
                        const cacheKey = this.buildCacheKey(normalized);

                        const cached = this.getCachedSearchResult(cacheKey);
                        if (cached) {
                                const duration = performance.now() - start;
                                this.recordCacheMetrics('hit', duration);
                                this.logCacheEvent('hit', { normalized });
                                return cached;
                        }

                        const result = await Promise.race([
                                this.client.callTool(this.config.searchToolName, params),
                                this.createTimeoutPromise(this.config.requestTimeoutMs),
                        ]);

                        if (!result?.success) {
                                this.recordCacheMetrics('miss', performance.now() - start, false);
                                recordedMetrics = true;
                                this.logCacheEvent('miss', { normalized, success: false, error: result?.error });
                                loggedMiss = true;
                                throw new Error(
                                        `Search tool returned unsuccessful result: ${result?.error || 'Unknown error'}`,
                                );
                        }

                        const response = {
                                success: true,
                                data: result.data,
                                source: 'arxiv_mcp',
                                server: this.serverInfo?.name,
                                timestamp: new Date().toISOString(),
                        };

                        this.setCacheEntry(cacheKey, response);
                        this.recordCacheMetrics('miss', performance.now() - start, true);
                        recordedMetrics = true;
                        this.logCacheEvent('miss', { normalized, success: true });
                        loggedMiss = true;

                        return response;
                } catch (error) {
                        if (!recordedMetrics) {
                                this.recordCacheMetrics('miss', performance.now() - start, false);
                                recordedMetrics = true;
                        }
                        if (!loggedMiss) {
                                this.logCacheEvent('miss', {
                                        error: error instanceof Error ? error.message : String(error),
                                        failure: true,
                                });
                                loggedMiss = true;
                        }
                        console.error('brAInwav arXiv search failed', {
                                component: 'agents',
                                brand: 'brAInwav',
                                tool: this.config.searchToolName,
                                input,
				error: error instanceof Error ? error.message : String(error),
			});

			return {
				success: false,
                                error: error instanceof Error ? error.message : 'Unknown error',
                                source: 'arxiv_mcp',
                                timestamp: new Date().toISOString(),
                        };
                }
        }

        private normalizeSearchParams(params: {
                query: string;
                max_results: number;
                field?: string;
                sort_by?: string;
        }): NormalizedSearchParams {
                return {
                        query: params.query.trim().replace(/\s+/g, ' ').toLowerCase(),
                        max_results: params.max_results,
                        field: (params.field || 'all').toLowerCase(),
                        sort_by: params.sort_by || 'relevance',
                };
        }

        private buildCacheKey(normalized: NormalizedSearchParams): string {
                return JSON.stringify(normalized);
        }

        private getCachedSearchResult(cacheKey: string): unknown | undefined {
                const entry = ArxivMCPTools.searchCache.get(cacheKey);
                if (!entry) {
                        return undefined;
                }

                if (Date.now() > entry.expiresAt) {
                        ArxivMCPTools.searchCache.delete(cacheKey);
                        this.recordCacheMetrics('eviction');
                        this.logCacheEvent('eviction', { cacheKey, reason: 'expired' });
                        return undefined;
                }

                entry.lastAccess = Date.now();
                return entry.value;
        }

        private setCacheEntry(cacheKey: string, value: unknown): void {
                const now = Date.now();
                ArxivMCPTools.searchCache.set(cacheKey, {
                        value,
                        expiresAt: now + this.config.cacheTTLMs,
                        createdAt: now,
                        lastAccess: now,
                });
                this.enforceCacheSizeLimit();
                this.updateCacheGauges();
        }

        private enforceCacheSizeLimit(): void {
                while (ArxivMCPTools.searchCache.size > this.config.maxCacheEntries) {
                        let oldestKey: string | null = null;
                        let oldestAccess = Number.POSITIVE_INFINITY;
                        for (const [key, entry] of ArxivMCPTools.searchCache.entries()) {
                                if (entry.lastAccess < oldestAccess) {
                                        oldestAccess = entry.lastAccess;
                                        oldestKey = key;
                                }
                        }

                        if (!oldestKey) {
                                break;
                        }

                        ArxivMCPTools.searchCache.delete(oldestKey);
                        this.recordCacheMetrics('eviction');
                        this.logCacheEvent('eviction', { cacheKey: oldestKey, reason: 'capacity' });
                }
        }

        private recordCacheMetrics(event: 'hit' | 'miss' | 'eviction', durationMs?: number, success?: boolean): void {
                const labels = { tool: 'arxiv_search' } as const;
                observability.metrics.counter('arxiv.cache.events', 1, { ...labels, event });

                if (event === 'hit') {
                        ArxivMCPTools.cacheHits++;
                } else if (event === 'miss') {
                        ArxivMCPTools.cacheMisses++;
                } else {
                        ArxivMCPTools.cacheEvictions++;
                }

                this.updateCacheGauges();

                if (event !== 'eviction' && durationMs !== undefined) {
                        observability.metrics.histogram(
                                'arxiv.tool.latency',
                                durationMs,
                                [5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000],
                                'ms',
                                {
                                        ...labels,
                                        cache: event,
                                        success: success === false ? 'false' : 'true',
                                },
                        );
                }
        }

        private updateCacheGauges(): void {
                const labels = { tool: 'arxiv_search' } as const;
                const totalLookups = ArxivMCPTools.cacheHits + ArxivMCPTools.cacheMisses;
                const ratio = totalLookups === 0 ? 0 : ArxivMCPTools.cacheHits / totalLookups;
                observability.metrics.gauge('arxiv.cache.hit_ratio', ratio, 'ratio', labels);
                observability.metrics.gauge('arxiv.cache.entries', ArxivMCPTools.searchCache.size, 'count', labels);
        }

        private logCacheEvent(
                event: 'hit' | 'miss' | 'eviction',
                details: Record<string, unknown> = {},
        ): void {
                const payload = {
                        component: 'agents',
                        brand: 'brAInwav',
                        cacheEvent: event,
                        ttlMs: this.config.cacheTTLMs,
                        maxEntries: this.config.maxCacheEntries,
                        cacheSize: ArxivMCPTools.searchCache.size,
                        ...details,
                };

                const message =
                        event === 'hit'
                                ? 'brAInwav ArxivMCPTools cache hit'
                                : event === 'miss'
                                        ? 'brAInwav ArxivMCPTools cache miss'
                                        : 'brAInwav ArxivMCPTools cache eviction';

                if (event === 'eviction') {
                        console.warn(message, payload);
                } else {
                        console.log(message, payload);
                }
        }

	/**
	 * Handle arXiv download requests
	 */
	private async handleDownload(input: unknown): Promise<unknown> {
		if (!this.client || !this.isInitialized) {
			throw new Error('ArxivMCPTools not initialized');
		}

		try {
			const validated = this.getDownloadTool().schema.parse(input);

			const params = {
				paper_id: validated.paper_id,
				format: validated.format || 'pdf',
			};

			const result = await Promise.race([
				this.client.callTool(this.config.downloadToolName, params),
				this.createTimeoutPromise(this.config.requestTimeoutMs * 2), // Download may take longer
			]);

			if (!result?.success) {
				throw new Error(
					`Download tool returned unsuccessful result: ${result?.error || 'Unknown error'}`,
				);
			}

			return {
				success: true,
				data: result.data,
				source: 'arxiv_mcp',
				server: this.serverInfo?.name,
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			console.error('brAInwav arXiv download failed', {
				component: 'agents',
				brand: 'brAInwav',
				tool: this.config.downloadToolName,
				input,
				error: error instanceof Error ? error.message : String(error),
			});

			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				source: 'arxiv_mcp',
				timestamp: new Date().toISOString(),
			};
		}
	}

	/**
	 * Create a timeout promise
	 */
	private createTimeoutPromise(timeoutMs: number): Promise<never> {
		return new Promise((_, reject) => {
			setTimeout(() => {
				reject(new Error(`arXiv MCP tool timeout after ${timeoutMs}ms`));
			}, timeoutMs);
		});
	}

	/**
	 * Health check for the MCP connection
	 */
	async healthCheck(): Promise<boolean> {
		if (!this.client || !this.isInitialized) {
			return false;
		}

		try {
			await this.client.listTools();
			return true;
		} catch (error) {
			console.warn('brAInwav ArxivMCPTools health check failed', {
				component: 'agents',
				brand: 'brAInwav',
				server: this.serverInfo?.name,
				error: error instanceof Error ? error.message : String(error),
			});
			return false;
		}
	}

	/**
	 * Cleanup resources
	 */
	async dispose(): Promise<void> {
		if (this.client) {
			try {
				await this.client.close();
			} catch (error) {
				console.warn('brAInwav ArxivMCPTools disposal error', {
					component: 'agents',
					brand: 'brAInwav',
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		this.client = undefined;
		this.serverInfo = undefined;
		this.isInitialized = false;
	}
}
