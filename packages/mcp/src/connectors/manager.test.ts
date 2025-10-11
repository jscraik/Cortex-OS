import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServiceMapSignature } from '@cortex-os/protocol';
import { ConnectorProxyManager } from './manager.js';
import { getConnectorMetricsRegistry } from './metrics.js';
import type { RemoteToolProxyOptions } from '@cortex-os/mcp-bridge/runtime/remote-proxy';
import type { RemoteTool } from '@cortex-os/mcp-bridge/runtime/remote-proxy';
import { createVersionedToolRegistry } from '../registry/toolRegistry.js';
import { Server } from '../server.js';

class StubProxy {
        private readonly options: RemoteToolProxyOptions;
        private readonly tools: RemoteTool[];

        constructor(options: RemoteToolProxyOptions, tools: RemoteTool[]) {
                this.options = options;
                this.tools = tools;
        }

        async connect(): Promise<void> {
                this.options.onAvailabilityChange?.(this.options.enabled);
        }

        getTools(): RemoteTool[] {
                return this.tools;
        }

        async callTool(): Promise<unknown> {
                return { ok: true };
        }
}

const createManifest = (signatureKey: string) => {
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
                        (metric) => metric.name === 'brAInwav_mcp_connector_proxy_up',
                );
                expect(availability?.values[0]?.value).toBe(1);
        });
});
