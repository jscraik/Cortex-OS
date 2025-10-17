/**
 * MCP-based external knowledge provider for arXiv and other research databases.
 * Integrates with the MCP registry to dynamically load and invoke search tools.
 */
import { createEnhancedClient } from '@cortex-os/mcp-core/client';
import { readAll } from '@cortex-os/mcp-registry/fs-store';
import { normalizeCitation } from './ExternalKnowledge.js';
/**
 * MCP arXiv citation provider implementation
 */
export class MCPKnowledgeProvider {
    provider = 'mcp';
    config;
    client;
    serverInfo;
    isDisposed = false;
    citationCache = new Map();
    CACHE_TTL = 1800000; // 30 minutes for external citations
    MAX_CACHE_SIZE = 200;
    /**
     * Initialize the MCP provider with configuration
     */
    async initialize(config) {
        if (this.isDisposed) {
            throw new Error('Provider has been disposed');
        }
        this.config = config;
        if (config.provider !== 'mcp') {
            throw new Error(`Invalid provider type: ${config.provider}`);
        }
        const settings = McpProviderSettingsSchema.parse(config.settings);
        // Load server info from registry or use static config
        if (settings.serverInfo) {
            this.serverInfo = {
                name: settings.serverInfo.name,
                host: settings.serverInfo.host,
                port: settings.serverInfo.port,
                protocol: settings.serverInfo.protocol,
            };
        }
        else {
            // Look up server in registry
            const registry = await readAll();
            const server = registry.servers.find((s) => s.slug === settings.slug);
            if (!server) {
                throw new Error(`MCP server not found in registry: ${settings.slug}`);
            }
            this.serverInfo = {
                name: server.name,
                host: server.host,
                port: server.port,
                protocol: server.protocol,
            };
        }
        // Create enhanced client
        this.client = createEnhancedClient(this.serverInfo);
        // Test connection
        await this.healthCheck();
    }
    /**
     * Fetch citations using MCP tools with caching
     */
    async fetchCitations(query, options = {}) {
        if (!this.config || !this.client || !this.serverInfo) {
            throw new Error('Provider not initialized');
        }
        if (this.isDisposed) {
            throw new Error('Provider has been disposed');
        }
        const settings = McpProviderSettingsSchema.parse(this.config.settings);
        const maxResults = options.maxResults ?? settings.maxResults;
        const timeoutMs = options.timeoutMs ?? settings.requestTimeoutMs;
        // Check cache first
        const cacheKey = Buffer.from([query.toLowerCase().trim(), maxResults.toString(), settings.slug].join('|')).toString('base64');
        const cached = this.citationCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            console.log('brAInwav GraphRAG MCP citation cache hit', {
                component: 'memory-core',
                brand: 'brAInwav',
                cacheKey,
                age: Date.now() - cached.timestamp,
                server: this.serverInfo.name,
            });
            return cached.citations;
        }
        const startTime = Date.now();
        try {
            // Invoke the search tool with timeout and circuit breaker
            const result = await Promise.race([
                this.client.callTool(settings.tool, {
                    query,
                    max_results: Math.min(maxResults, 10), // Cap for performance
                }),
                this.createTimeoutPromise(Math.min(timeoutMs, 15000)), // Cap timeout for performance
            ]);
            if (!result?.success || !result?.data) {
                console.warn('MCP tool returned unsuccessful result', {
                    component: 'memory-core',
                    brand: 'brAInwav',
                    tool: settings.tool,
                    server: this.serverInfo.name,
                    result,
                });
                return [];
            }
            // Transform MCP response to standardized citations
            const citations = this.transformMcpResponse(result.data, settings.slug);
            const normalizedCitations = citations.map(normalizeCitation);
            // Cache results if cache isn't full
            if (this.citationCache.size < this.MAX_CACHE_SIZE) {
                this.citationCache.set(cacheKey, {
                    citations: normalizedCitations,
                    timestamp: Date.now(),
                });
            }
            else {
                // Evict oldest entry
                const oldestKey = this.citationCache.keys().next().value;
                this.citationCache.delete(oldestKey);
                this.citationCache.set(cacheKey, {
                    citations: normalizedCitations,
                    timestamp: Date.now(),
                });
            }
            console.log('brAInwav GraphRAG MCP citation fetch completed', {
                component: 'memory-core',
                brand: 'brAInwav',
                server: this.serverInfo.name,
                tool: settings.tool,
                queryLength: query.length,
                citationCount: normalizedCitations.length,
                durationMs: Date.now() - startTime,
                cacheSize: this.citationCache.size,
            });
            return normalizedCitations;
        }
        catch (error) {
            console.error('MCP citation fetch failed', {
                component: 'memory-core',
                brand: 'brAInwav',
                provider: this.provider,
                server: this.serverInfo.name,
                tool: settings.tool,
                query,
                durationMs: Date.now() - startTime,
                error: error instanceof Error ? error.message : String(error),
            });
            // Return empty array on error to maintain system stability
            return [];
        }
    }
    /**
     * Health check for the MCP provider
     */
    async healthCheck() {
        if (!this.client || this.isDisposed) {
            return false;
        }
        try {
            // Try to list available tools as a basic connectivity test
            await this.client.listTools();
            return true;
        }
        catch (error) {
            console.warn('MCP provider health check failed', {
                component: 'memory-core',
                brand: 'brAInwav',
                provider: this.provider,
                server: this.serverInfo?.name,
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }
    /**
     * Cleanup resources
     */
    async dispose() {
        // Clean up cache
        this.citationCache.clear();
        if (this.client && !this.isDisposed) {
            try {
                await this.client.close();
            }
            catch (error) {
                console.warn('Error closing MCP client', {
                    component: 'memory-core',
                    brand: 'brAInwav',
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        this.client = undefined;
        this.serverInfo = undefined;
        this.isDisposed = true;
        console.log('brAInwav GraphRAG MCP provider disposed', {
            component: 'memory-core',
            brand: 'brAInwav',
            cacheSize: 0,
        });
    }
    /**
     * Transform MCP response data to external citations
     */
    transformMcpResponse(data, _serverSlug) {
        if (!Array.isArray(data)) {
            return [];
        }
        return data
            .filter((item) => this.isValidArxivItem(item))
            .map((item) => ({
            path: `arxiv:${item.id}`,
            title: item.title || 'Untitled',
            content: item.summary || item.abstract || '',
            published: this.normalizeDate(item.published),
            metadata: {
                provider: 'arxiv',
                source: {
                    authors: item.authors,
                    categories: item.categories,
                    doi: item.doi,
                    journal_ref: item.journal_ref,
                },
                confidence: this.calculateConfidence(item),
                url: item.url || `https://arxiv.org/abs/${item.id}`,
            },
        }));
    }
    /**
     * Validate arXiv item structure
     */
    isValidArxivItem(item) {
        return item && typeof item === 'object' && 'id' in item && typeof item.id === 'string';
    }
    /**
     * Normalize date to ISO-8601 format
     */
    normalizeDate(dateInput) {
        if (!dateInput) {
            return new Date().toISOString();
        }
        const date = new Date(dateInput);
        if (Number.isNaN(date.getTime())) {
            return new Date().toISOString();
        }
        return date.toISOString();
    }
    /**
     * Calculate confidence score based on item metadata
     */
    calculateConfidence(item) {
        let confidence = 0.5; // Base confidence
        // Boost confidence for items with more metadata
        if (item.authors && Array.isArray(item.authors) && item.authors.length > 0) {
            confidence += 0.1;
        }
        if (item.categories && Array.isArray(item.categories) && item.categories.length > 0) {
            confidence += 0.1;
        }
        if (item.doi) {
            confidence += 0.1;
        }
        if (item.journal_ref) {
            confidence += 0.1;
        }
        if (item.summary && item.summary.length > 100) {
            confidence += 0.1;
        }
        return Math.min(confidence, 1.0);
    }
    /**
     * Create a timeout promise
     */
    createTimeoutPromise(timeoutMs) {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`MCP tool timeout after ${timeoutMs}ms`));
            }, timeoutMs);
        });
    }
}
