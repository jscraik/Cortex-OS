/**
 * Shared interfaces and helpers for external knowledge graph providers.
 * Supports multiple backends including Neo4j and MCP-based services.
 */
import { z } from 'zod';
/**
 * Standardized citation structure returned by external knowledge providers.
 * All dates must be ISO-8601 compliant and paths must be unique.
 */
export interface ExternalCitation {
    /** Unique path identifier (e.g., "arxiv:2301.00001", "neo4j:node-123") */
    path: string;
    /** Citation title */
    title: string;
    /** Citation content or summary */
    content: string;
    /** ISO-8601 formatted publication date */
    published: string;
    /** Additional metadata about the source */
    metadata: {
        /** Provider identifier (e.g., "arxiv", "neo4j") */
        provider: string;
        /** Source-specific details */
        source?: Record<string, unknown>;
        /** Quality score or confidence (0-1) */
        confidence?: number;
        /** Source URL if available */
        url?: string;
    };
}
/**
 * Provider configuration interface
 */
export interface ExternalProviderConfig {
    /** Provider type identifier */
    provider: 'none' | 'neo4j' | 'mcp';
    /** Provider-specific settings */
    settings: Record<string, unknown>;
}
/**
 * External knowledge provider contract
 */
export interface ExternalCitationProvider {
    /** Provider identifier */
    readonly provider: string;
    /** Initialize the provider with configuration */
    initialize(config: ExternalProviderConfig): Promise<void>;
    /**
     * Fetch citations for a given research query
     * @param query Research question or topic
     * @param options Optional configuration (maxResults, timeout, etc.)
     * @returns Array of standardized citations
     */
    fetchCitations(query: string, options?: {
        maxResults?: number;
        timeoutMs?: number;
    }): Promise<ExternalCitation[]>;
    /** Health check for the provider */
    healthCheck(): Promise<boolean>;
    /** Cleanup resources */
    dispose?(): Promise<void>;
}
/**
 * Configuration schema for external knowledge providers
 */
export declare const ExternalProviderConfigSchema: z.ZodObject<{
    provider: z.ZodEnum<["none", "neo4j", "mcp"]>;
    settings: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    provider?: "none" | "neo4j" | "mcp";
    settings?: Record<string, unknown>;
}, {
    provider?: "none" | "neo4j" | "mcp";
    settings?: Record<string, unknown>;
}>;
/**
 * MCP-specific configuration schema
 */
export declare const McpProviderSettingsSchema: z.ZodObject<{
    /** MCP server slug for registry lookup */
    slug: z.ZodString;
    /** Tool name to invoke for citation search */
    tool: z.ZodString;
    /** Maximum results per request */
    maxResults: z.ZodDefault<z.ZodNumber>;
    /** Request timeout in milliseconds */
    requestTimeoutMs: z.ZodDefault<z.ZodNumber>;
    /** Optional static server info (overrides registry) */
    serverInfo: z.ZodOptional<z.ZodObject<{
        name: z.ZodString;
        host: z.ZodString;
        port: z.ZodNumber;
        protocol: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        port?: number;
        host?: string;
        protocol?: string;
    }, {
        name?: string;
        port?: number;
        host?: string;
        protocol?: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    maxResults?: number;
    slug?: string;
    tool?: string;
    requestTimeoutMs?: number;
    serverInfo?: {
        name?: string;
        port?: number;
        host?: string;
        protocol?: string;
    };
}, {
    maxResults?: number;
    slug?: string;
    tool?: string;
    requestTimeoutMs?: number;
    serverInfo?: {
        name?: string;
        port?: number;
        host?: string;
        protocol?: string;
    };
}>;
/**
 * Normalize and validate citation data
 */
export declare function normalizeCitation(citation: Partial<ExternalCitation>): ExternalCitation;
/**
 * Deduplicate citations by path
 */
export declare function deduplicateCitations(citations: ExternalCitation[]): ExternalCitation[];
/**
 * Validate provider configuration
 */
export declare function validateProviderConfig(config: ExternalProviderConfig): ExternalProviderConfig;
