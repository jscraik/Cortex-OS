import type { RemoteTool } from '@cortex-os/mcp-bridge/runtime/remote-proxy';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectorsRegistry } from '../../src/connectors/registry.js';

const mockConnect = vi.fn<[], Promise<void>>();
const mockDisconnect = vi.fn<[], Promise<void>>();
const mockCallTool = vi.fn<[], Promise<unknown>>();
const remoteInstances: Array<{ options: Record<string, unknown> }> = [];
let remoteTools: RemoteTool[] = [];

vi.mock('@cortex-os/mcp-bridge/runtime/remote-proxy', () => {
	class MockRemoteToolProxy {
		public options: Record<string, unknown>;

		constructor(options: Record<string, unknown>) {
			this.options = options;
			remoteInstances.push(this);
		}

		async connect(): Promise<void> {
			await mockConnect();
		}

		async disconnect(): Promise<void> {
			await mockDisconnect();
		}

		getTools(): RemoteTool[] {
			return remoteTools;
		}

		async callTool(): Promise<unknown> {
			return mockCallTool();
		}
	}
	return { RemoteToolProxy: MockRemoteToolProxy };
});

const createServiceMapResponse = () => ({
	id: '01J9Z6Q8300000000000000000',
	brand: 'brAInwav',
	generatedAt: new Date().toISOString(),
	ttlSeconds: 1,
	connectors: [
		{
			id: 'memory-hybrid',
			displayName: 'Memory Hybrid',
			version: '2025-10-10',
			endpoint: 'https://connectors.local/memory',
			auth: {
				type: 'bearer',
				headerName: 'Authorization',
			},
			scopes: ['memory.read'],
			quotas: { perMinute: 60, perHour: 300 },
			enabled: true,
			metadata: { brand: 'brAInwav' },
			tags: ['core'],
			status: 'online',
			ttlSeconds: 60,
			expiresAt: new Date(Date.now() + 60_000).toISOString(),
		},
		{
			id: 'tasks',
			displayName: 'Task Lifecycle',
			version: '2025-10-10',
			endpoint: 'https://connectors.local/tasks',
			auth: {
				type: 'apiKey',
				headerName: 'X-API-Key',
			},
			scopes: ['tasks.write'],
			quotas: { perMinute: 30, perHour: 100 },
			enabled: false,
			metadata: { brand: 'brAInwav' },
			tags: ['core'],
			status: 'offline',
			ttlSeconds: 60,
			expiresAt: new Date(Date.now() + 60_000).toISOString(),
		},
	],
	signature: 'abc123',
});

describe('ConnectorsRegistry', () => {
	const originalFetch = global.fetch;
	const originalEnv = { ...process.env };

	beforeEach(() => {
		vi.useFakeTimers();
		remoteInstances.length = 0;
		remoteTools = [{ name: 'memory.search', description: 'Hybrid search', inputSchema: {} }];
		mockConnect.mockResolvedValue();
		mockDisconnect.mockResolvedValue();
		mockCallTool.mockResolvedValue({ ok: true });
		process.env.CONNECTORS_API_KEY = 'test-api-key';
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => createServiceMapResponse(),
		}) as unknown as typeof fetch;
	});

	afterEach(() => {
		vi.useRealTimers();
		global.fetch = originalFetch;
		process.env = { ...originalEnv };
		vi.resetAllMocks();
	});

	it('fetches connectors and caches responses', async () => {
		const registry = new ConnectorsRegistry({ asbrBaseUrl: 'https://asbr.local' });
		const connectors = await registry.listConnectors();
		expect(connectors).toHaveLength(1);
		expect(remoteInstances).toHaveLength(1);
		expect(mockConnect).toHaveBeenCalledTimes(1);

		await registry.listConnectors();
		expect(mockConnect).toHaveBeenCalledTimes(1);
		expect((global.fetch as unknown as vi.Mock).mock.calls).toHaveLength(1);

		vi.advanceTimersByTime(1_500);
		(global.fetch as unknown as vi.Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => createServiceMapResponse(),
		});
		await registry.listConnectors();
		expect((global.fetch as unknown as vi.Mock).mock.calls).toHaveLength(2);
	});

	it('injects auth headers and executes tools', async () => {
		const registry = new ConnectorsRegistry({ asbrBaseUrl: 'https://asbr.local' });
		await registry.listConnectors();
		const proxy = remoteInstances[0];
		expect(proxy.options).toMatchObject({
			headers: {
				Authorization: 'Bearer test-api-key',
			},
		});
		await registry.executeTool('memory-hybrid', 'memory.search', { query: 'hello' });
		expect(mockCallTool).toHaveBeenCalledTimes(1);
	});

	it('disconnects disabled connectors', async () => {
		const registry = new ConnectorsRegistry({ asbrBaseUrl: 'https://asbr.local' });
		await registry.listConnectors();
		expect(remoteInstances).toHaveLength(1);

		(global.fetch as unknown as vi.Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				...createServiceMapResponse(),
				connectors: createServiceMapResponse().connectors.map((connector) => ({
					...connector,
					enabled: false,
				})),
			}),
		});
		vi.advanceTimersByTime(2_000);
		await registry.listConnectors({ includeDisabled: true });
		expect(mockDisconnect).toHaveBeenCalled();
	});

	it('throws when executing missing connector', async () => {
		const registry = new ConnectorsRegistry({ asbrBaseUrl: 'https://asbr.local' });
		await expect(registry.executeTool('unknown', 'tool', {})).rejects.toThrow(
			'Connector unknown is not available',
		);
	});
});

describe('Phase B.2: Agent Registry Tool Filtering', () => {
	it('should prefer remoteTools from service-map over synthesis', async () => {
		const registry = new ConnectorsRegistry({
			serviceMapUrl: 'https://connectors.local',
			fetch: async () =>
				Promise.resolve({
					ok: true,
					status: 200,
					json: async () => ({
						...createServiceMapResponse(),
						connectors: [
							{
								id: 'wikidata',
								displayName: 'Wikidata',
								version: '2024.09.18',
								endpoint: 'https://wd-mcp.wmcloud.org/mcp/',
								auth: { type: 'none' },
								scopes: ['wikidata:vector-search', 'wikidata:claims'],
								quotas: { perMinute: 60 },
								enabled: true,
								metadata: { brand: 'brAInwav' },
								tags: ['knowledge'],
								status: 'online',
								ttlSeconds: 1800,
								expiresAt: new Date(Date.now() + 1800_000).toISOString(),
								remoteTools: [
									{
										name: 'vector_search_items',
										description: 'Semantic vector search over items',
										tags: ['vector', 'search', 'items'],
										scopes: ['wikidata:vector-search'],
									},
									{
										name: 'get_claims',
										description: 'Retrieve entity claims',
										tags: ['claims', 'entities'],
										scopes: ['wikidata:claims'],
									},
								],
							},
						],
					}),
				} as Response),
		});

		await registry.refresh(true);
		const wikidata = registry.get('wikidata');

		expect(wikidata?.remoteTools).toHaveLength(2);
		expect(wikidata?.remoteTools?.map((t) => t.name)).toEqual([
			'vector_search_items',
			'get_claims',
		]);
	});

	it('should synthesize canonical tools when remoteTools absent (Wikidata only)', async () => {
		const registry = new ConnectorsRegistry({
			serviceMapUrl: 'https://connectors.local',
			fetch: async () =>
				Promise.resolve({
					ok: true,
					status: 200,
					json: async () => ({
						...createServiceMapResponse(),
						connectors: [
							{
								id: 'wikidata',
								displayName: 'Wikidata',
								version: '2024.09.18',
								endpoint: 'https://wd-mcp.wmcloud.org/mcp/',
								auth: { type: 'none' },
								scopes: ['wikidata:vector-search'],
								quotas: { perMinute: 60 },
								enabled: true,
								metadata: { brand: 'brAInwav' },
								tags: ['knowledge'],
								status: 'online',
								ttlSeconds: 1800,
								expiresAt: new Date(Date.now() + 1800_000).toISOString(),
							},
						],
					}),
				} as Response),
		});

		await registry.refresh(true);
		const wikidata = registry.get('wikidata');

		expect(wikidata?.remoteTools).toHaveLength(2);
		expect(wikidata?.remoteTools?.map((t) => t.name)).toEqual([
			'wikidata.vector_search',
			'wikidata.get_claims',
		]);
	});

	it('should leave other connectors unchanged (no synthesis)', async () => {
		const registry = new ConnectorsRegistry({
			serviceMapUrl: 'https://connectors.local',
			fetch: async () =>
				Promise.resolve({
					ok: true,
					status: 200,
					json: async () => ({
						...createServiceMapResponse(),
						connectors: [
							{
								id: 'perplexity',
								displayName: 'Perplexity Search',
								version: '1.2.0',
								endpoint: 'https://connectors.local/perplexity',
								auth: { type: 'bearer', headerName: 'Authorization' },
								scopes: ['search:query'],
								quotas: { perMinute: 30 },
								enabled: true,
								metadata: { brand: 'brAInwav' },
								tags: ['search'],
								status: 'online',
								ttlSeconds: 3600,
								expiresAt: new Date(Date.now() + 3600_000).toISOString(),
							},
						],
					}),
				} as Response),
		});

		await registry.refresh(true);
		const perplexity = registry.get('perplexity');

		expect(perplexity?.remoteTools).toEqual([]);
	});
});

describe('Phase B.2: Tool Filtering Helpers', () => {
	it('should filter tools by tags', async () => {
		const { filterToolsByTags } = await import('../../src/connectors/registry.js');

		const tools = [
			{
				name: 'tool1',
				description: 'Tool 1',
				tags: ['vector', 'search'],
				scopes: ['scope1'],
			},
			{
				name: 'tool2',
				description: 'Tool 2',
				tags: ['claims', 'entities'],
				scopes: ['scope2'],
			},
			{ name: 'tool3', description: 'Tool 3', tags: ['vector'], scopes: ['scope3'] },
		];

		const filtered = filterToolsByTags(tools, ['vector']);

		expect(filtered).toHaveLength(2);
		expect(filtered.map((t) => t.name)).toEqual(['tool1', 'tool3']);
	});

	it('should filter tools by scopes', async () => {
		const { filterToolsByScopes } = await import('../../src/connectors/registry.js');

		const tools = [
			{
				name: 'tool1',
				description: 'Tool 1',
				tags: ['vector'],
				scopes: ['wikidata:vector-search'],
			},
			{
				name: 'tool2',
				description: 'Tool 2',
				tags: ['claims'],
				scopes: ['wikidata:claims'],
			},
			{
				name: 'tool3',
				description: 'Tool 3',
				tags: ['sparql'],
				scopes: ['wikidata:sparql'],
			},
		];

		const filtered = filterToolsByScopes(tools, ['wikidata:claims', 'wikidata:sparql']);

		expect(filtered).toHaveLength(2);
		expect(filtered.map((t) => t.name)).toEqual(['tool2', 'tool3']);
	});
});
