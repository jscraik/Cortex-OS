import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServiceMapSignature } from '@cortex-os/protocol';
import { ConnectorProxyManager, parseConnectorFeatureFlags } from './manager.js';
import * as serviceMapModule from './service-map.js';
import { Agent } from 'undici';
import { getConnectorMetricsRegistry } from './metrics.js';
import type { RemoteToolProxyOptions } from '@cortex-os/mcp-bridge/runtime/remote-proxy';
import type { RemoteTool } from '@cortex-os/mcp-bridge/runtime/remote-proxy';
import { createVersionedToolRegistry } from '../registry/toolRegistry.js';
import { Server } from '../server.js';

class StubProxy {
        public readonly config: RemoteToolProxyOptions;
        private readonly tools: RemoteTool[];
        public readonly callHistory: Array<{ tool: string; args: Record<string, unknown> }> = [];
	public disconnectCalls = 0;

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

	async disconnect(): Promise<void> {
		this.disconnectCalls += 1;
	}
}

const createLogger = () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
});

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
		connectors: connectors.map((entry) => ({
			id: entry.id,
			version: entry.version,
			name: entry.displayName,
			endpoint: entry.endpoint,
			auth: entry.auth,
			scopes: entry.scopes,
			status: entry.enabled ? ('enabled' as const) : ('disabled' as const),
			ttl: entry.ttlSeconds,
			metadata: entry.metadata ?? { brand: 'brAInwav' },
		})),
	};

	const signature = createServiceMapSignature(payload, signatureKey);
	return { ...payload, signature };
};

describe('ConnectorProxyManager', () => {
	beforeEach(() => {
		process.env.MCP_CONNECTOR_REFRESH_SYNC = 'true';
	});

        afterEach(() => {
                        vi.restoreAllMocks();
			delete process.env.MCP_CONNECTOR_REFRESH_SYNC;
			delete process.env.MCP_CONNECTOR_REFRESH_INTERVAL_MS;
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

	it('serves stale manifest when refresh fails after expiry', async () => {
		const signatureKey = 'stale-key';
		const manifest = createManifest(signatureKey);
		const logger = createLogger();
		const loadSpy = vi
			.spyOn(serviceMapModule, 'loadConnectorServiceMap')
			.mockResolvedValueOnce({
				payload: manifest,
				expiresAtMs: 5_000,
			})
			.mockRejectedValueOnce(new Error('network down'));

		let now = 0;
		const manager = new ConnectorProxyManager({
			serviceMapUrl: 'https://asbr.invalid/v1/connectors/service-map',
			apiKey: 'asbr-token',
			signatureKey,
			connectorsApiKey: 'connectors-token',
			registry: createVersionedToolRegistry(new Server()),
			logger,
			now: () => now,
			createProxy: (options) => new StubProxy(options, []),
		});

		await manager.sync(true);
		expect(manager.listConnectors()).toHaveLength(1);

		now = 10_000;
		await expect(manager.sync(true)).resolves.toBeUndefined();
		expect(manager.listConnectors().map((connector) => connector.id)).toContain('demo');
		expect(logger.warn).toHaveBeenCalledWith(
			expect.objectContaining({ brand: 'brAInwav' }),
			'Manifest refresh failed',
		);

		loadSpy.mockRestore();
	});

	it('forces refresh when force flag is true', async () => {
		const signatureKey = 'force-key';
		const manifestInitial = createManifest(signatureKey, [
			{ ...buildConnectorEntry(), id: 'first' },
		]);
		const manifestUpdated = createManifest(signatureKey, [
			{ ...buildConnectorEntry(), id: 'second' },
		]);
		const logger = createLogger();
		const loadSpy = vi
			.spyOn(serviceMapModule, 'loadConnectorServiceMap')
			.mockResolvedValueOnce({ payload: manifestInitial, expiresAtMs: 5_000 })
			.mockResolvedValueOnce({ payload: manifestUpdated, expiresAtMs: 10_000 });

		const manager = new ConnectorProxyManager({
			serviceMapUrl: 'https://example.invalid/connectors',
			apiKey: 'token',
			signatureKey,
			connectorsApiKey: 'connectors-token',
			registry: createVersionedToolRegistry(new Server()),
			logger,
			createProxy: (options) => new StubProxy(options, []),
		});

		await manager.sync(true);
		expect(manager.listConnectors().map((entry) => entry.id)).toContain('first');

		await manager.sync(true);
		expect(manager.listConnectors().map((entry) => entry.id)).toContain('second');
		expect(loadSpy).toHaveBeenCalledTimes(2);

		loadSpy.mockRestore();
	});

	it('limits concurrent proxy hydration to four connectors', async () => {
		const signatureKey = 'limit-key';
		const connectorEntries = Array.from({ length: 6 }, (_, index) => ({
			...buildConnectorEntry(),
			id: `connector-${index}`,
		}));
		const manifest = createManifest(signatureKey, connectorEntries);
		const logger = createLogger();
		const loadSpy = vi
			.spyOn(serviceMapModule, 'loadConnectorServiceMap')
			.mockResolvedValue({
				payload: manifest,
				expiresAtMs: 5_000,
			});

		const manager = new ConnectorProxyManager({
			serviceMapUrl: 'https://asbr.invalid/v1/connectors/service-map',
			apiKey: 'token',
			signatureKey,
			connectorsApiKey: 'connectors-token',
			registry: createVersionedToolRegistry(new Server()),
			logger,
			createProxy: (options) => new StubProxy(options, []),
		});

		const managerAny = manager as unknown as {
			ensureProxy: (entry: ReturnType<typeof buildConnectorEntry>) => Promise<StubProxy>;
		};

		const originalEnsure = managerAny.ensureProxy.bind(managerAny);
		let running = 0;
		let peak = 0;

		vi.spyOn(managerAny, 'ensureProxy').mockImplementation(async (entry) => {
			running += 1;
			peak = Math.max(peak, running);
			await new Promise((resolve) => setTimeout(resolve, 5));
			const result = await originalEnsure(entry);
			running -= 1;
			return result;
		});

		await manager.sync(true);

		expect(peak).toBeLessThanOrEqual(4);
		expect(peak).toBeGreaterThanOrEqual(2);
		expect(loadSpy).toHaveBeenCalledTimes(1);
		loadSpy.mockRestore();
	});

	it('continues syncing when a connector fails to hydrate', async () => {
		const signatureKey = 'failure-key';
		const connectorEntries = [
			{ ...buildConnectorEntry(), id: 'stable' },
			{ ...buildConnectorEntry(), id: 'flaky' },
			{ ...buildConnectorEntry(), id: 'follow-up' },
		];
		const manifest = createManifest(signatureKey, connectorEntries);
		const logger = createLogger();
		const loadSpy = vi
			.spyOn(serviceMapModule, 'loadConnectorServiceMap')
			.mockResolvedValue({
				payload: manifest,
				expiresAtMs: 5_000,
			});

		const server = new Server();
		const registry = createVersionedToolRegistry(server);

		const manager = new ConnectorProxyManager({
			serviceMapUrl: 'https://asbr.invalid/v1/connectors/service-map',
			apiKey: 'token',
			signatureKey,
			connectorsApiKey: 'connectors-token',
			registry,
			logger,
			createProxy: (options) => new StubProxy(options, [
				{
					name: 'ping',
					description: 'Ping connector',
					inputSchema: { type: 'object' },
				},
			]),
		});

		const managerAny = manager as unknown as {
			ensureProxy: (entry: ReturnType<typeof buildConnectorEntry>) => Promise<StubProxy>;
		};
		const originalEnsure = managerAny.ensureProxy.bind(managerAny);

		vi.spyOn(managerAny, 'ensureProxy').mockImplementation(async (entry) => {
			if (entry.id === 'flaky') {
				throw new Error('connector boom');
			}
			return originalEnsure(entry);
		});

		await expect(manager.sync(true)).resolves.toBeUndefined();

		const registered = registry.listTools();
		expect(registered.every((tool) => !tool.name.startsWith('flaky.'))).toBe(true);
		expect(registered.length).toBeGreaterThan(0);
		expect(logger.warn).toHaveBeenCalledWith(
			expect.objectContaining({ brand: 'brAInwav', connectorId: 'flaky' }),
			'Connector sync failed',
		);

		loadSpy.mockRestore();
	});

	it('disconnect stops proxies and closes the shared agent', async () => {
		vi.useFakeTimers();
		delete process.env.MCP_CONNECTOR_REFRESH_SYNC;
		const signatureKey = 'disconnect-key';
		const manifest = createManifest(signatureKey, [
			{ ...buildConnectorEntry(), id: 'stop-me' },
		]);
		const logger = createLogger();
		const loadSpy = vi
			.spyOn(serviceMapModule, 'loadConnectorServiceMap')
			.mockResolvedValue({ payload: manifest, expiresAtMs: 5_000 });
		const agentCloseSpy = vi
			.spyOn(Agent.prototype, 'close')
			.mockImplementation(async () => undefined);

		const proxies = new Map<string, StubProxy>();

		const manager = new ConnectorProxyManager({
			serviceMapUrl: 'https://example.invalid/connectors',
			apiKey: 'token',
			signatureKey,
			connectorsApiKey: 'connectors-token',
			registry: createVersionedToolRegistry(new Server()),
			logger,
			createProxy: (options) => {
				const proxy = new StubProxy(options, [
					{
						name: 'ping',
						description: 'Ping',
						inputSchema: { type: 'object' },
					},
				]);
				proxies.set(options.serviceLabel ?? 'unknown', proxy);
				return proxy;
			},
		});

		await manager.sync(true);
		await manager.disconnect();

		vi.runOnlyPendingTimers();
		vi.useRealTimers();

		expect(Array.from(proxies.values()).every((proxy) => proxy.disconnectCalls === 1)).toBe(true);
		expect(agentCloseSpy).toHaveBeenCalled();

		loadSpy.mockRestore();
		agentCloseSpy.mockRestore();
	});

	describe('Tool Name Normalization (Phase B.1)', () => {
		it('should normalize vector_search_items to wikidata.vector_search_items', async () => {
			const registry = createVersionedToolRegistry();
			const proxies = new Map();
			const tools = [
				{
					name: 'vector_search_items',
					description: 'Semantic vector search',
					inputSchema: { type: 'object' as const, properties: {} },
				},
			];

			const manager = new ConnectorProxyManager({
				manifestPath: null,
				fetchManifest: async () =>
					createManifest('secret-123', [
						{
							...buildConnectorEntry(),
							id: 'wikidata',
							name: 'Wikidata',
							displayName: 'Wikidata',
							endpoint: 'https://wd-mcp.wmcloud.org/mcp/',
							scopes: ['wikidata:vector-search'],
							remoteTools: [
								{
									name: 'vector_search_items',
									description: 'Semantic vector search',
									tags: ['vector', 'search', 'items'],
									scopes: ['wikidata:vector-search'],
								},
							],
						},
					]),
				connectorsApiKey: 'connectors-token',
				registry,
				logger: new Server().getLogger(),
				createProxy: (config) => {
					const proxy = new StubProxy(config, tools);
					proxies.set(config.serviceLabel, proxy);
					return proxy as never;
				},
			});

			await manager.sync(true);

			const registered = registry.listTools().filter((tool) => tool.name.includes('vector_search_items'));

			expect(registered).toHaveLength(1);
			expect(registered[0].name).toBe('wikidata.vector_search_items');
		});

		it('should normalize get_entity_claims to wikidata.get_claims', async () => {
			const registry = createVersionedToolRegistry();
			const proxies = new Map();
			const tools = [
				{
					name: 'get_entity_claims',
					description: 'Get claims',
					inputSchema: { type: 'object' as const, properties: {} },
				},
			];

			const manager = new ConnectorProxyManager({
				manifestPath: null,
				fetchManifest: async () =>
					createManifest('secret-123', [
						{
							...buildConnectorEntry(),
							id: 'wikidata',
							name: 'Wikidata',
							displayName: 'Wikidata',
							endpoint: 'https://wd-mcp.wmcloud.org/mcp/',
							scopes: ['wikidata:claims'],
							remoteTools: [
								{
									name: 'get_claims',
									description: 'Retrieve claims',
									tags: ['claims', 'entities'],
									scopes: ['wikidata:claims'],
								},
							],
						},
					]),
				connectorsApiKey: 'connectors-token',
				registry,
				logger: new Server().getLogger(),
				createProxy: (config) => {
					const proxy = new StubProxy(config, tools);
					proxies.set(config.serviceLabel, proxy);
					return proxy as never;
				},
			});

			await manager.sync(true);

			const registered = registry.listTools().filter((tool) => tool.name.includes('get_claims'));

			expect(registered).toHaveLength(1);
			expect(registered[0].name).toBe('wikidata.get_claims');
		});

		it('should attach correct tags from remoteTools', async () => {
			const registry = createVersionedToolRegistry();
			const proxies = new Map();
			const tools = [
				{
					name: 'sparql',
					description: 'SPARQL query',
					inputSchema: { type: 'object' as const, properties: {} },
				},
			];

			const manager = new ConnectorProxyManager({
				manifestPath: null,
				fetchManifest: async () =>
					createManifest('secret-123', [
						{
							...buildConnectorEntry(),
							id: 'wikidata',
							name: 'Wikidata',
							displayName: 'Wikidata',
							endpoint: 'https://wd-mcp.wmcloud.org/mcp/',
							scopes: ['wikidata:sparql'],
							remoteTools: [
								{
									name: 'sparql',
									description: 'Execute SPARQL',
									tags: ['sparql', 'graph', 'query'],
									scopes: ['wikidata:sparql'],
								},
							],
						},
					]),
				connectorsApiKey: 'connectors-token',
				registry,
				logger: new Server().getLogger(),
				createProxy: (config) => {
					const proxy = new StubProxy(config, tools);
					proxies.set(config.serviceLabel, proxy);
					return proxy as never;
				},
			});

			await manager.sync(true);

			const registered = registry.listTools().filter((tool) => tool.name === 'wikidata.sparql');

			expect(registered).toHaveLength(1);
			expect(registered[0].metadata?.tags).toEqual(['sparql', 'graph', 'query']);
		});

		it('should log normalization with brAInwav context', async () => {
			const registry = createVersionedToolRegistry();
			const proxies = new Map();
			const logger = new Server().getLogger();
			const logSpy = vi.spyOn(logger, 'info');
			const tools = [
				{
					name: 'vector_search_items',
					description: 'Vector search',
					inputSchema: { type: 'object' as const, properties: {} },
				},
			];

			const manager = new ConnectorProxyManager({
				manifestPath: null,
				fetchManifest: async () =>
					createManifest('secret-123', [
						{
							...buildConnectorEntry(),
							id: 'wikidata',
							name: 'Wikidata',
							displayName: 'Wikidata',
							endpoint: 'https://wd-mcp.wmcloud.org/mcp/',
							scopes: ['wikidata:vector-search'],
							remoteTools: [
								{
									name: 'vector_search_items',
									description: 'Semantic vector search',
									tags: ['vector'],
									scopes: ['wikidata:vector-search'],
								},
							],
						},
					]),
				connectorsApiKey: 'connectors-token',
				registry,
				logger,
				createProxy: (config) => {
					const proxy = new StubProxy(config, tools);
					proxies.set(config.serviceLabel, proxy);
					return proxy as never;
				},
			});

			await manager.sync(true);

			expect(logSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					connectorCount: 1,
				}),
				'Loaded connectors manifest',
			);
		});
	});
});

describe('parseConnectorFeatureFlags', () => {
	it('returns defaults when env vars are unset', () => {
		delete process.env.MCP_CONNECTOR_REFRESH_SYNC;
		delete process.env.MCP_CONNECTOR_REFRESH_INTERVAL_MS;

		expect(parseConnectorFeatureFlags()).toEqual({
			asyncRefresh: true,
			refreshIntervalMs: 300_000,
		});
	});

	it('respects explicit env overrides', () => {
		process.env.MCP_CONNECTOR_REFRESH_SYNC = 'true';
		process.env.MCP_CONNECTOR_REFRESH_INTERVAL_MS = '120000';

		expect(parseConnectorFeatureFlags()).toEqual({
			asyncRefresh: false,
			refreshIntervalMs: 120_000,
		});
	});

	it('ignores invalid interval values and falls back to default', () => {
		process.env.MCP_CONNECTOR_REFRESH_INTERVAL_MS = 'not-a-number';

		expect(parseConnectorFeatureFlags()).toEqual({
			asyncRefresh: true,
			refreshIntervalMs: 300_000,
		});
	});
});
