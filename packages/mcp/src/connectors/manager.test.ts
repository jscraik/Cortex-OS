import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServiceMapSignature } from '@cortex-os/protocol';
import { ConnectorProxyManager } from './manager.js';
import { getConnectorMetricsRegistry } from './metrics.js';
import type { RemoteToolProxyOptions } from '@cortex-os/mcp-bridge/runtime/remote-proxy';
import type { RemoteTool } from '@cortex-os/mcp-bridge/runtime/remote-proxy';
import { createVersionedToolRegistry } from '../registry/toolRegistry.js';
import { Server } from '../server.js';

class StubProxy {
        public readonly config: RemoteToolProxyOptions;
        private readonly tools: RemoteTool[];
        public readonly callHistory: Array<{ tool: string; args: Record<string, unknown> }> = [];

        constructor(options: RemoteToolProxyOptions, tools: RemoteTool[]) {
                this.config = options;
                this.tools = tools;
        }

        async connect(): Promise<void> {
                this.config.onAvailabilityChange?.(this.config.enabled);
        }

        getTools(): RemoteTool[] {
                return this.tools;
        }

        async callTool(tool: string, args: Record<string, unknown>): Promise<unknown> {
                this.callHistory.push({ tool, args });
                return { ok: true };
        }
}

const buildConnectorEntry = () => ({
        id: 'demo',
        version: '1.0.0',
        displayName: 'Demo Connector',
        endpoint: 'https://connectors.invalid/v1/mcp',
        auth: { type: 'apiKey', headerName: 'X-Api-Key' as const },
        scopes: ['demo:read'],
        ttlSeconds: 120,
        enabled: true,
        metadata: { brand: 'brAInwav' as const },
        headers: { 'X-Trace': 'allowed' },
});

const createManifest = (
        signatureKey: string,
        connectors: Array<ReturnType<typeof buildConnectorEntry>> = [buildConnectorEntry()],
) => {
        const payload = {
                id: '01HZ7ZWJ5XJ8W4T7N6MZ2V1PQB',
                brand: 'brAInwav' as const,
                generatedAt: new Date('2025-10-12T12:00:00.000Z').toISOString(),
                ttlSeconds: 120,
                connectors: [
                        {
                                id: 'demo',
                                version: '1.0.0',
                                name: 'Demo Connector',
                                endpoint: 'https://connectors.invalid/v1/mcp',
                                auth: { type: 'apiKey', headerName: 'X-Api-Key' },
                                scopes: ['demo:read'],
                                status: 'enabled' as const,
                                ttl: 1760270520,
                                metadata: { brand: 'brAInwav' },
                        },
                ],
        };

        const signature = createServiceMapSignature(payload, signatureKey);
        return { ...payload, signature };
};

describe('ConnectorProxyManager', () => {
        afterEach(() => {
                        vi.restoreAllMocks();
        });

        it('registers remote tools from manifest entries and updates metrics', async () => {
                const signatureKey = 'test-key';
                const manifest = createManifest(signatureKey);
                const fetchMock = vi.fn().mockResolvedValue(
                        new Response(JSON.stringify(manifest), { status: 200 }),
                );

                const server = new Server();
                const registry = createVersionedToolRegistry(server);
                const tools: RemoteTool[] = [
                        {
                                name: 'ping',
                                description: 'Ping connector',
                                inputSchema: { type: 'object' },
                        },
                ];

                const manager = new ConnectorProxyManager({
                        serviceMapUrl: 'https://asbr.invalid/v1/connectors/service-map',
                        apiKey: 'asbr-token',
                        signatureKey,
                        connectorsApiKey: 'connectors-token',
                        fetchImpl: fetchMock,
                        registry,
                        logger: server.getLogger(),
                        createProxy: (options) => new StubProxy(options, tools),
                });

                await manager.sync(true);

                const registered = registry.listTools();
                expect(registered).toHaveLength(1);
                expect(registered[0]?.name).toBe('demo.ping');
                expect(registered[0]?.metadata?.connectorId).toBe('demo');

		const metrics = await getConnectorMetricsRegistry().getMetricsAsJSON();
		const availability = metrics.find(
			(metric) => metric.name === 'brainwav_mcp_connector_proxy_up',
		);
                expect(availability?.values[0]?.value).toBe(1);
        });

        it('registers wikidata tools from the service map and proxies fact lookups', async () => {
                const signatureKey = 'test-key';
                const connectors = [
                        buildConnectorEntry(),
                        {
                                id: 'wikidata',
                                version: '0.2.0',
                                displayName: 'Wikidata Connector',
                                endpoint: 'https://connectors.invalid/v1/wikidata',
                                auth: { type: 'bearer' as const },
                                scopes: ['wikidata:read', 'wikidata:query'],
                                ttlSeconds: 600,
                                enabled: true,
                                metadata: {
                                        brand: 'brAInwav' as const,
                                        category: 'knowledge-graph',
                                        tools: [
                                                { name: 'vector_search', description: 'Semantic entity lookup' },
                                                { name: 'sparql', description: 'Wikidata SPARQL execution' },
                                        ],
                                },
                        },
                ];
                const manifest = createManifest(signatureKey, connectors);
                const fetchMock = vi.fn().mockResolvedValue(
                        new Response(JSON.stringify(manifest), { status: 200 }),
                );

                const server = new Server();
                const registry = createVersionedToolRegistry(server);

                const toolCatalog = new Map<string, RemoteTool[]>([
                        [
                                'demo',
                                [
                                        {
                                                name: 'ping',
                                                description: 'Ping connector',
                                                inputSchema: { type: 'object' },
                                        },
                                ],
                        ],
                        [
                                'wikidata',
                                [
                                        {
                                                name: 'vector_search',
                                                description: 'Semantic search',
                                                inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
                                        },
                                        {
                                                name: 'sparql',
                                                description: 'SPARQL query',
                                                inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
                                        },
                                ],
                        ],
                ]);

                const proxies = new Map<string, StubProxy>();

                const manager = new ConnectorProxyManager({
                        serviceMapUrl: 'https://asbr.invalid/v1/connectors/service-map',
                        apiKey: 'asbr-token',
                        signatureKey,
                        connectorsApiKey: 'connectors-token',
                        fetchImpl: fetchMock,
                        registry,
                        logger: server.getLogger(),
                        createProxy: (options) => {
                                const connectorId = options.unavailableErrorName.replace(
                                        'ConnectorUnavailableError',
                                        '',
                                );
                                const proxy = new StubProxy(options, toolCatalog.get(connectorId) ?? []);
                                proxies.set(connectorId, proxy);
                                return proxy;
                        },
                });

                await manager.sync(true);

                const registered = registry
                        .listTools()
                        .filter((tool) => tool.name.startsWith('wikidata.'))
                        .map((tool) => ({
                                name: tool.name,
                                metadata: tool.metadata,
                                handler: tool.handler,
                        }));

                expect(registered.map((tool) => tool.name).sort()).toEqual([
                        'wikidata.sparql',
                        'wikidata.vector_search',
                ]);

                const proxy = proxies.get('wikidata');
                expect(proxy?.config.headers?.Authorization).toBe('Bearer connectors-token');

                const vectorSearch = registered.find((tool) => tool.name === 'wikidata.vector_search');
                const sparql = registered.find((tool) => tool.name === 'wikidata.sparql');

                const vectorResult = await vectorSearch?.handler({ query: 'Ada Lovelace', limit: 3 });
                expect(vectorResult).toEqual({ ok: true });

                const sparqlResult = await sparql?.handler({ query: 'SELECT ?place WHERE { ... }' });
                expect(sparqlResult).toEqual({ ok: true });

                expect(proxy?.callHistory).toEqual([
                        { tool: 'vector_search', args: { query: 'Ada Lovelace', limit: 3 } },
                        { tool: 'sparql', args: { query: 'SELECT ?place WHERE { ... }' } },
                ]);

                const manifestEntries = manager.listConnectors();
                const wikidataEntry = manifestEntries.find((entry) => entry.id === 'wikidata');
                const wikidataMetadata = wikidataEntry?.metadata as
                        | { tools?: Array<{ name: string; description: string }> }
                        | undefined;
                expect(wikidataMetadata?.tools).toEqual([
                        { name: 'vector_search', description: 'Semantic entity lookup' },
                        { name: 'sparql', description: 'Wikidata SPARQL execution' },
                ]);
        });
});
