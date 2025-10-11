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
        if (entry.auth.type === 'none') {
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

const resolveRemoteTools = (entry: ConnectorEntry): ConnectorRemoteTool[] => {
        const metadata = entry.metadata as Record<string, unknown> | undefined;
        const candidates: ConnectorRemoteTool[] = [];

        const metadataTools = metadata?.remoteTools;
        if (Array.isArray(metadataTools)) {
                for (const tool of metadataTools) {
                        if (!tool || typeof tool !== 'object') continue;
                        const name = 'name' in tool && typeof tool.name === 'string' ? tool.name : undefined;
                        const description =
                                'description' in tool && typeof tool.description === 'string'
                                        ? tool.description
                                        : undefined;
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
        }

        const includesFactsScope = entry.scopes.some((scope) => scope.toLowerCase().includes('facts'));
        const isWikidataConnector =
                /wikidata/i.test(entry.id) ||
                entry.displayName.toLowerCase().includes('wikidata') ||
                entry.scopes.some((scope) => /wikidata/i.test(scope));

        if (isWikidataConnector) {
                const ensureTool = (name: string, description: string, tags: string[]): void => {
                        if (candidates.some((tool) => tool.name === name)) return;
                        candidates.push({ name, description, tags, scopes: ['facts', 'knowledge:facts'] });
                };

                ensureTool(
                        'wikidata.vector_search',
                        'Semantic vector retrieval over Wikidata facts, prioritising structured statements for grounding.',
                        ['connector:wikidata', 'vector'],
                );
                ensureTool(
                        'wikidata.get_claims',
                        'Return structured Wikidata claims for an entity, including QIDs and claim GUIDs for provenance.',
                        ['connector:wikidata', 'claims'],
                );
        }

        if (includesFactsScope && !isWikidataConnector) {
                const ensureFactsTool = (name: string, description: string) => {
                        if (candidates.some((tool) => tool.name === name)) return;
                        candidates.push({ name, description, tags: ['facts'], scopes: ['facts'] });
                };
                ensureFactsTool(
                        `${entry.id}.vector`,
                        `Vector retrieval tool for ${entry.displayName}, optimised for fact-checking scopes.`,
                );
        }

        return candidates;
};

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

                const result = await fetchConnectorServiceMap(this.options);
                this.expiresAtMs = result.expiresAtMs;
                this.connectors.clear();

                for (const entry of result.map.connectors) {
                        const headers = {
                                ...entry.headers,
                                ...resolveAuthHeader(entry, this.options.connectorsApiKey),
                        };

                        const definition: ConnectorDefinition = {
                                ...entry,
                                headers,
                                expiresAtMs: this.expiresAtMs,
                                remoteTools: resolveRemoteTools(entry),
                        };

                        this.connectors.set(entry.id, definition);
                        setConnectorAvailability(entry.id, entry.enabled);
                        recordConnectorTtl(entry.id, this.expiresAtMs);
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
