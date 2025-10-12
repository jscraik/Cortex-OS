import type { ConnectorEntry } from '@cortex-os/protocol';
import {
        ConnectorServiceMapError,
        type ConnectorServiceMapClientOptions,
        fetchConnectorServiceMap,
} from './service-map-client.js';
import { recordConnectorTtl, setConnectorAvailability } from './telemetry.js';

export interface ConnectorRegistryOptions extends ConnectorServiceMapClientOptions {
        connectorsApiKey?: string;
        now?: () => number;
}

export interface ConnectorRemoteTool {
        name: string;
        description: string;
        tags?: string[];
        scopes?: string[];
}

export interface ConnectorDefinition extends ConnectorEntry {
        headers: Record<string, string>;
        expiresAtMs: number;
        remoteTools?: ConnectorRemoteTool[];
}

const resolveAuthHeader = (entry: ConnectorEntry, apiKey?: string): Record<string, string> => {
        if (!entry.auth || entry.auth.type === 'none') {
                return {};
        }

        if (!apiKey) {
                throw new ConnectorServiceMapError(
                        `Connector "${entry.id}" requires CONNECTORS_API_KEY to establish MCP proxy`,
                );
        }

        if (entry.auth.type === 'bearer') {
                return { Authorization: `Bearer ${apiKey}` };
        }

        const headerName = entry.auth.headerName ?? 'Authorization';
        if (headerName.toLowerCase() === 'authorization') {
                return { Authorization: `Bearer ${apiKey}` };
        }

        return { [headerName]: apiKey };
};

// Extract service-map tools (highest precedence)
function extractServiceMapTools(entry: ConnectorEntry): ConnectorRemoteTool[] | null {
	if (!entry.remoteTools || !Array.isArray(entry.remoteTools) || entry.remoteTools.length === 0) {
		return null;
	}
	return entry.remoteTools.map((tool) => ({
		name: tool.name,
		description: tool.description ?? '',
		tags: tool.tags,
		scopes: tool.scopes,
	}));
}

// Extract metadata tools (legacy fallback)
function extractMetadataTools(entry: ConnectorEntry): ConnectorRemoteTool[] {
	const candidates: ConnectorRemoteTool[] = [];
	const metadata = entry.metadata as Record<string, unknown> | undefined;
	const metadataTools = metadata?.remoteTools;

	if (!Array.isArray(metadataTools)) {
		return candidates;
	}

	for (const tool of metadataTools) {
		if (!tool || typeof tool !== 'object') continue;
		const name = 'name' in tool && typeof tool.name === 'string' ? tool.name : undefined;
		const description =
			'description' in tool && typeof tool.description === 'string' ? tool.description : undefined;
		if (!name || !description) continue;

		const tags = Array.isArray((tool as { tags?: unknown }).tags)
			? ((tool as { tags?: unknown[] }).tags ?? [])
					.map((value) => (typeof value === 'string' ? value : undefined))
					.filter((value): value is string => Boolean(value))
			: undefined;
		const scopes = Array.isArray((tool as { scopes?: unknown }).scopes)
			? ((tool as { scopes?: unknown[] }).scopes ?? [])
					.map((value) => (typeof value === 'string' ? value : undefined))
					.filter((value): value is string => Boolean(value))
			: undefined;

		candidates.push({ name, description, tags, scopes });
	}
	return candidates;
}

// Synthesize Wikidata canonical tools
function synthesizeWikidataTools(entry: ConnectorEntry): ConnectorRemoteTool[] {
	const isWikidataConnector =
		/wikidata/i.test(entry.id) ||
		entry.displayName.toLowerCase().includes('wikidata') ||
		entry.scopes.some((scope) => /wikidata/i.test(scope));

	if (!isWikidataConnector) {
		return [];
	}

	return [
		{
			name: 'wikidata.vector_search',
			description:
				'Semantic vector retrieval over Wikidata facts, prioritising structured statements for grounding.',
			tags: ['connector:wikidata', 'vector'],
			scopes: ['facts', 'knowledge:facts'],
		},
		{
			name: 'wikidata.get_claims',
			description:
				'Return structured Wikidata claims for an entity, including QIDs and claim GUIDs for provenance.',
			tags: ['connector:wikidata', 'claims'],
			scopes: ['facts', 'knowledge:facts'],
		},
	];
}

// Synthesize generic facts tools
function synthesizeFactsTools(entry: ConnectorEntry): ConnectorRemoteTool[] {
	const includesFactsScope = entry.scopes.some((scope) => scope.toLowerCase().includes('facts'));
	const isWikidataConnector = /wikidata/i.test(entry.id);

	if (!includesFactsScope || isWikidataConnector) {
		return [];
	}

	return [
		{
			name: `${entry.id}.vector`,
			description: `Vector retrieval tool for ${entry.displayName}, optimised for fact-checking scopes.`,
			tags: ['facts'],
			scopes: ['facts'],
		},
	];
}

// Main function orchestrates helpers
const resolveRemoteTools = (entry: ConnectorEntry): ConnectorRemoteTool[] => {
	try {
		// Precedence: service-map > metadata > synthesis
		const serviceMapTools = extractServiceMapTools(entry);
		if (serviceMapTools) {
			return serviceMapTools;
		}

		const metadataTools = extractMetadataTools(entry);
		if (metadataTools.length > 0) {
			return metadataTools;
		}

		// Synthesis fallback
		return [...synthesizeWikidataTools(entry), ...synthesizeFactsTools(entry)];
	} catch (error) {
		// brAInwav policy: Use structured logging with correlation IDs for better tracing
		const correlationId = `cortex_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

		console.warn('brAInwav connector registry: Remote tools resolution failed', {
			component: 'connectors',
			brand: 'brAInwav',
			correlationId,
			connectorId: entry.id,
			connectorName: entry.displayName,
			error: error instanceof Error ? {
				name: error.name,
				message: error.message,
				stack: error.stack
			} : String(error),
			severity: 'warning',
			action: 'returning_empty_tools_array',
			timestamp: new Date().toISOString(),
		});

		// Return empty array to prevent failures, but log the issue
		return [];
	}
};

// Phase B.2: Filtering helpers
export function filterToolsByTags(tools: ConnectorRemoteTool[], tags: string[]): ConnectorRemoteTool[] {
	if (tags.length === 0) return tools;
	return tools.filter((tool) => {
		if (!tool.tags || tool.tags.length === 0) return false;
		return tags.some((tag) => tool.tags?.includes(tag));
	});
}

export function filterToolsByScopes(tools: ConnectorRemoteTool[], scopes: string[]): ConnectorRemoteTool[] {
	if (scopes.length === 0) return tools;
	return tools.filter((tool) => {
		if (!tool.scopes || tool.scopes.length === 0) return false;
		return scopes.some((scope) => tool.scopes?.includes(scope));
	});
}

export class ConnectorRegistry {
        private readonly options: ConnectorRegistryOptions;
        private readonly connectors = new Map<string, ConnectorDefinition>();
        private expiresAtMs = 0;

        constructor(options: ConnectorRegistryOptions) {
                this.options = options;
        }

        async refresh(force = false): Promise<void> {
                const now = this.options.now?.() ?? Date.now();
                if (!force && now < this.expiresAtMs) {
                        return;
                }

                try {
                        const result = await fetchConnectorServiceMap(this.options);
                        this.expiresAtMs = result.expiresAtMs;
                        this.connectors.clear();

                        for (const entry of result.map.connectors) {
                                try {
                                        const headers = resolveAuthHeader(entry, this.options.connectorsApiKey);

                                        const definition: ConnectorDefinition = {
                                                ...entry,
                                                headers,
                                                expiresAtMs: this.expiresAtMs,
                                                remoteTools: resolveRemoteTools(entry),
                                        };

                                        this.connectors.set(entry.id, definition);
                                        setConnectorAvailability(entry.id, entry.status === 'enabled');
                                        recordConnectorTtl(entry.id, this.expiresAtMs);
                                } catch (error) {
                                        // brAInwav policy: Use structured logging with correlation IDs for better tracing
                                        const correlationId = `cortex_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

                                        console.warn('brAInwav connector registry: Connector processing failed', {
                                                component: 'connectors',
                                                brand: 'brAInwav',
                                                correlationId,
                                                connectorId: entry.id,
                                                connectorName: entry.displayName,
                                                error: error instanceof Error ? {
                                                        name: error.name,
                                                        message: error.message,
                                                        stack: error.stack
                                                } : String(error),
                                                severity: 'warning',
                                                action: 'setting_availability_false',
                                                timestamp: new Date().toISOString(),
                                        });

                                        // Set availability to false for problematic connectors
                                        setConnectorAvailability(entry.id, false);
                                }
                        }
                } catch (error) {
                        // Handle service map fetch errors gracefully
                        if (error instanceof ConnectorServiceMapError) {
                                console.error(`brAInwav connector registry: Service map error - ${error.message}`);
                        } else {
                                console.error('brAInwav connector registry: Unexpected error during refresh:', error);
                        }
                        // Don't update connectors if fetch failed, keep existing configuration
                        throw error; // Re-throw to allow caller to handle
                }
        }

        list(): ConnectorDefinition[] {
                return Array.from(this.connectors.values());
        }

        get(id: string): ConnectorDefinition | undefined {
                return this.connectors.get(id);
        }

        getExpiry(): number {
                return this.expiresAtMs;
        }
}
