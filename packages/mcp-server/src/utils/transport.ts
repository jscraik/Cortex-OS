/**
 * Transport Resolution
 *
 * MCP transport configuration and resolution logic
 * extracted from the main index file for better modularity.
 */

export interface TransportDecision {
	selected: 'stdio' | 'http';
	warnings: string[];
}

/**
 * Resolve transport based on environment variables and defaults
 */
export function resolveTransport(override?: string): TransportDecision {
	const rawTransportOverride = override?.trim().toLowerCase();
	const warnings: string[] = [];

	// Handle explicit overrides
	if (rawTransportOverride) {
		switch (rawTransportOverride) {
			case 'stdio':
				return { selected: 'stdio', warnings: [] };
			case 'http':
			case 'sse':
				return { selected: 'http', warnings: [] };
			case 'all':
				warnings.push(
					'MCP_TRANSPORT=all requested; FastMCP supports one transport per process. Defaulting to HTTP/SSE and suggest launching a dedicated STDIO instance.',
				);
				return { selected: 'http', warnings };
			default:
				warnings.push(
					`Unknown MCP_TRANSPORT override "${rawTransportOverride}"; defaulting to HTTP/SSE transport`,
				);
				return { selected: 'http', warnings };
		}
	}

	// Default to HTTP/SSE for compatibility with existing setup
	return { selected: 'http', warnings };
}
