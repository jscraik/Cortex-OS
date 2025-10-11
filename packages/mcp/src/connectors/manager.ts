import { RemoteToolProxy } from '@cortex-os/mcp-bridge/runtime/remote-proxy';
import type {
        RemoteTool,
        RemoteToolProxyOptions,
} from '@cortex-os/mcp-bridge/runtime/remote-proxy';
import type { ConnectorEntry, ServiceMapPayload } from '@cortex-os/protocol';
import type { ServerLogger } from '../server.js';
import type { VersionedToolRegistry } from '../registry/toolRegistry.js';
import { setConnectorAvailabilityGauge } from './metrics.js';
import {
        ConnectorManifestError,
        type ConnectorServiceMapOptions,
        loadConnectorServiceMap,
} from './service-map.js';

export interface ConnectorProxyManagerOptions extends ConnectorServiceMapOptions {
        connectorsApiKey: string;
        registry: VersionedToolRegistry;
        logger: ServerLogger;
        now?: () => number;
        createProxy?: (config: RemoteToolProxyOptions) => RemoteToolProxy;
}

const buildAuthHeaders = (entry: ConnectorEntry, apiKey: string): Record<string, string> => {
        const headers: Record<string, string> = {};

        if (!entry.auth || entry.auth.type === 'none') {
                return headers;
        }

        if (!apiKey) {
                throw new ConnectorManifestError(`Missing CONNECTORS_API_KEY for connector ${entry.id}`);
        }

        if (entry.auth.type === 'bearer') {
                headers.Authorization = `Bearer ${apiKey}`;
                return headers;
        }

        const headerName = entry.auth.headerName ?? 'Authorization';
        if (headerName.toLowerCase() === 'authorization') {
                headers.Authorization = `Bearer ${apiKey}`;
                return headers;
        }

        headers[headerName] = apiKey;
        return headers;
};

export class ConnectorProxyManager {
        private readonly options: ConnectorProxyManagerOptions;
        private readonly proxies = new Map<string, RemoteToolProxy>();
        private readonly registeredTools = new Set<string>();
        private manifest?: ServiceMapPayload;
        private expiresAtMs = 0;

        constructor(options: ConnectorProxyManagerOptions) {
                this.options = options;
        }

        async sync(force = false): Promise<void> {
                const now = this.options.now?.() ?? Date.now();
                if (!force && now < this.expiresAtMs) {
                        return;
                }

                const result = await loadConnectorServiceMap(this.options);
                this.manifest = result.payload;
                this.expiresAtMs = result.expiresAtMs;
                this.options.logger.info(
                        {
                                connectorCount: result.payload.connectors.length,
                                expiresAtMs: result.expiresAtMs,
                        },
                        'Loaded connectors manifest',
                );

                for (const entry of result.payload.connectors) {
                        const enabled = entry.status === 'enabled';
                        setConnectorAvailabilityGauge(entry.id, enabled);
                        if (!enabled) {
                                continue;
                        }

                        const proxy = await this.ensureProxy(entry);
                        await this.registerRemoteTools(entry, proxy);
                }
        }

        listConnectors(): ConnectorEntry[] {
                return this.manifest?.connectors ?? [];
        }

        private async ensureProxy(entry: ConnectorEntry): Promise<RemoteToolProxy> {
                const existing = this.proxies.get(entry.id);
                if (existing) {
                        return existing;
                }

                const proxyFactory =
                        this.options.createProxy ?? ((config: RemoteToolProxyOptions) => new RemoteToolProxy(config));
                const proxy = proxyFactory({
                        endpoint: entry.endpoint,
                        enabled: entry.status === 'enabled',
                        logger: this.options.logger,
                        headers: buildAuthHeaders(entry, this.options.connectorsApiKey),
                        serviceLabel: entry.name,
                        unavailableErrorName: `${entry.id}ConnectorUnavailableError`,
                        unavailableErrorMessage: `${entry.name} connector is temporarily unavailable`,
                        onAvailabilityChange: (up) => setConnectorAvailabilityGauge(entry.id, up),
                });

                this.proxies.set(entry.id, proxy);
                await proxy.connect();
                return proxy;
        }

        private async registerRemoteTools(entry: ConnectorEntry, proxy: RemoteToolProxy): Promise<void> {
                const tools: RemoteTool[] = proxy.getTools();
                if (!tools.length) {
                        return;
                }

                for (const tool of tools) {
                        const fullName = `${entry.id}.${tool.name}`;
                        if (this.registeredTools.has(fullName)) {
                                continue;
                        }

                        this.options.registry.registerTool({
                                name: fullName,
                                description: tool.description,
                                inputSchema: tool.inputSchema,
                                handler: async (args: Record<string, unknown>) => proxy.callTool(tool.name, args),
                                metadata: {
                                        connectorId: entry.id,
                                        connectorName: entry.name,
                                        scopes: entry.scopes,
                                        brand: 'brAInwav',
                                },
                        });

                        this.registeredTools.add(fullName);
                }
        }
}
