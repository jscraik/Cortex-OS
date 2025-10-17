/**
 * Shared interfaces and helpers for external knowledge graph providers.
 * Supports multiple backends including Neo4j and MCP-based services.
 */
import { z } from 'zod';
/**
 * Configuration schema for external knowledge providers
 */
export const ExternalProviderConfigSchema = z.object({
    provider: z.enum(['none', 'neo4j', 'mcp']),
    settings: z.record(z.unknown()).optional().default({}),
});
/**
 * MCP-specific configuration schema
 */
export const McpProviderSettingsSchema = z.object({
    /** MCP server slug for registry lookup */
    slug: z.string(),
    /** Tool name to invoke for citation search */
    tool: z.string(),
    /** Maximum results per request */
    maxResults: z.number().min(1).max(50).default(5),
    /** Request timeout in milliseconds */
    requestTimeoutMs: z.number().min(1000).max(30000).default(10000),
    /** Optional static server info (overrides registry) */
    serverInfo: z
        .object({
        name: z.string(),
        host: z.string(),
        port: z.number().min(1).max(65535),
        protocol: z.string(),
    })
        .optional(),
});
/**
 * Normalize and validate citation data
 */
export function normalizeCitation(citation) {
    if (!citation.path) {
        throw new Error('Citation path is required');
    }
    if (!citation.title) {
        throw new Error('Citation title is required');
    }
    if (!citation.content) {
        throw new Error('Citation content is required');
    }
    // Validate ISO-8601 date format
    if (citation.published) {
        const date = new Date(citation.published);
        if (Number.isNaN(date.getTime())) {
            throw new Error(`Invalid ISO-8601 date: ${citation.published}`);
        }
    }
    else {
        // Default to current date if not provided
        citation.published = new Date().toISOString();
    }
    return {
        path: citation.path,
        title: citation.title,
        content: citation.content,
        published: citation.published,
        metadata: {
            provider: citation.metadata?.provider || 'unknown',
            source: citation.metadata?.source || {},
            confidence: citation.metadata?.confidence || 0.5,
            url: citation.metadata?.url,
        },
    };
}
/**
 * Deduplicate citations by path
 */
export function deduplicateCitations(citations) {
    const seen = new Set();
    return citations.filter((citation) => {
        if (seen.has(citation.path)) {
            return false;
        }
        seen.add(citation.path);
        return true;
    });
}
/**
 * Validate provider configuration
 */
export function validateProviderConfig(config) {
    return ExternalProviderConfigSchema.parse(config);
}
