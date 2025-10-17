/**
 * MCP-based external knowledge provider for arXiv and other research databases.
 * Integrates with the MCP registry to dynamically load and invoke search tools.
 */
import type { ExternalCitation, ExternalCitationProvider, ExternalProviderConfig } from './ExternalKnowledge.js';
/**
 * MCP tool invocation options
 */
interface McpToolOptions {
    maxResults?: number;
    timeoutMs?: number;
}
/**
 * MCP arXiv citation provider implementation
 */
export declare class MCPKnowledgeProvider implements ExternalCitationProvider {
    readonly provider = "mcp";
    private config?;
    private client?;
    private serverInfo?;
    private isDisposed;
    private citationCache;
    private readonly CACHE_TTL;
    private readonly MAX_CACHE_SIZE;
    /**
     * Initialize the MCP provider with configuration
     */
    initialize(config: ExternalProviderConfig): Promise<void>;
    /**
     * Fetch citations using MCP tools with caching
     */
    fetchCitations(query: string, options?: McpToolOptions): Promise<ExternalCitation[]>;
    /**
     * Health check for the MCP provider
     */
    healthCheck(): Promise<boolean>;
    /**
     * Cleanup resources
     */
    dispose(): Promise<void>;
    /**
     * Transform MCP response data to external citations
     */
    private transformMcpResponse;
    /**
     * Validate arXiv item structure
     */
    private isValidArxivItem;
    /**
     * Normalize date to ISO-8601 format
     */
    private normalizeDate;
    /**
     * Calculate confidence score based on item metadata
     */
    private calculateConfidence;
    /**
     * Create a timeout promise
     */
    private createTimeoutPromise;
}
export {};
