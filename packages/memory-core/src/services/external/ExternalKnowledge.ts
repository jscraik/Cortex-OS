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
	fetchCitations(
		query: string,
		options?: {
			maxResults?: number;
			timeoutMs?: number;
		},
	): Promise<ExternalCitation[]>;
	/** Health check for the provider */
	healthCheck(): Promise<boolean>;
	/** Cleanup resources */
	dispose?(): Promise<void>;
}

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
export function normalizeCitation(citation: Partial<ExternalCitation>): ExternalCitation {
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
		if (isNaN(date.getTime())) {
			throw new Error(`Invalid ISO-8601 date: ${citation.published}`);
		}
	} else {
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
export function deduplicateCitations(citations: ExternalCitation[]): ExternalCitation[] {
	const seen = new Set<string>();
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
export function validateProviderConfig(config: ExternalProviderConfig): ExternalProviderConfig {
	return ExternalProviderConfigSchema.parse(config);
}
