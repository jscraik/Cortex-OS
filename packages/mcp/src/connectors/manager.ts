import { RemoteToolProxy } from '@cortex-os/mcp-bridge/runtime/remote-proxy';
import { Agent } from 'undici';
import pLimit from 'p-limit';
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
import { normalizeWikidataToolName } from './normalization.js';
import { RefreshScheduler, type Clock } from './refresh-scheduler.js';
import { ManifestCache } from './cache.js';

export interface ConnectorFeatureFlags {
	asyncRefresh: boolean;
	refreshIntervalMs: number;
}

export const parseConnectorFeatureFlags = (): ConnectorFeatureFlags => {
	const asyncRefresh = process.env.MCP_CONNECTOR_REFRESH_SYNC !== 'true';
	const intervalValue = Number(process.env.MCP_CONNECTOR_REFRESH_INTERVAL_MS);
	const refreshIntervalMs = Number.isFinite(intervalValue) && intervalValue > 0 ? intervalValue : 300_000;

	return {
		asyncRefresh,
		refreshIntervalMs,
	};
};

const defaultClock: Clock = { now: () => Date.now() };

export interface ConnectorProxyManagerOptions extends ConnectorServiceMapOptions {
        connectorsApiKey: string;
        registry: VersionedToolRegistry;
        logger: ServerLogger;
        now?: () => number;
        createProxy?: (config: RemoteToolProxyOptions) => RemoteToolProxy;
        clock?: Clock;
        sleep?: (ms: number) => Promise<void>;
}

const MAX_REFRESH_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 50;
const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 3;
const CIRCUIT_BREAKER_DURATION_MS = 60_000;

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
	private readonly featureFlags: ConnectorFeatureFlags;
        private readonly manifestCache: ManifestCache<ServiceMapPayload>;
        private readonly clock: Clock;
        private readonly agent: Agent;
        private readonly scheduler?: RefreshScheduler;
        private readonly sleep: (ms: number) => Promise<void>;
        private readonly proxies = new Map<string, RemoteToolProxy>();
        private readonly registeredTools = new Set<string>();
        private manifest?: ServiceMapPayload;
        private expiresAtMs = 0;
        private consecutiveRefreshFailures = 0;
        private circuitOpenedAtMs?: number;

        constructor(options: ConnectorProxyManagerOptions) {
                this.options = options;
                this.featureFlags = parseConnectorFeatureFlags();
		this.clock =
			options.clock ??
			(options.now
				? {
						now: options.now,
				  }
				: defaultClock);
                this.manifestCache = new ManifestCache<ServiceMapPayload>(this.clock);
                this.agent = new Agent({ connections: 10, pipelining: 1 });
                this.sleep =
                        options.sleep ??
                        ((ms: number) =>
                                new Promise<void>((resolve) => {
                                        setTimeout(resolve, ms);
                                }));
                if (this.featureFlags.asyncRefresh) {
                        this.scheduler = new RefreshScheduler({
                                intervalMs: this.featureFlags.refreshIntervalMs,
                                onRefresh: () => this.syncInternal(true),
                                logger: this.options.logger,
				clock: this.clock,
			});
			this.scheduler.start();
		}
        }

        async sync(force = false): Promise<void> {
		await this.syncInternal(force);
        }

        private async syncInternal(force: boolean): Promise<void> {
                if (this.isCircuitOpen()) {
                        const cached = this.manifestCache.get();
                        if (cached) {
                                this.manifest = cached;
                        }

                        this.options.logger.error(
                                {
                                        brand: 'brAInwav',
                                        failureCount: this.consecutiveRefreshFailures,
                                },
                                'Connector manifest circuit open',
                        );

                        throw new ConnectorManifestError(
                                'Connector manifest refresh circuit is open after repeated failures',
                        );
                }

                if (!force) {
                        const cached = this.manifestCache.get();
                        if (cached) {
                                this.manifest = cached;
                                return;
                        }
                }

                try {
                        const result = await this.loadManifestWithRetry();
                        this.manifest = result.payload;
                        this.expiresAtMs = result.expiresAtMs;
                        const ttlMs = Math.max(0, result.expiresAtMs - this.clock.now());
                        this.manifestCache.set(result.payload, ttlMs);
                        await this.hydrateConnectors(result.payload);
			this.options.logger.info(
				{
					brand: 'brAInwav',
					connectorCount: result.payload.connectors.length,
					expiresAtMs: result.expiresAtMs,
                                },
                                'Loaded connectors manifest',
                        );
                        this.resetFailureState();
                } catch (error) {
                        this.recordRefreshFailure();
                        this.options.logger.warn(
                                {
                                        brand: 'brAInwav',
                                        error: error instanceof Error ? error.message : error,
                                        failureCount: this.consecutiveRefreshFailures,
                                },
                                'Manifest refresh failed',
                        );

                        const cached = this.manifestCache.get();
                        if (cached) {
                                this.manifest = cached;
                                if (this.isCircuitOpen()) {
                                        this.options.logger.error(
                                                {
                                                        brand: 'brAInwav',
                                                        failureCount: this.consecutiveRefreshFailures,
                                                },
                                                'Connector manifest circuit opened after retries',
                                        );

                                        throw new ConnectorManifestError(
                                                'Connector manifest refresh circuit is open after repeated failures',
                                        );
                                }

                                return;
                        }

                        throw error;
                }
        }

        private async loadManifestWithRetry(): Promise<{ payload: ServiceMapPayload; expiresAtMs: number }> {
                let attempt = 0;
                let lastError: unknown;

                while (attempt < MAX_REFRESH_ATTEMPTS) {
                        attempt += 1;
                        try {
                                return await loadConnectorServiceMap({ ...this.options, agent: this.agent });
                        } catch (error) {
                                lastError = error;
                                if (attempt >= MAX_REFRESH_ATTEMPTS) {
                                        break;
                                }

                                this.options.logger.debug(
                                        {
                                                brand: 'brAInwav',
                                                attempt,
                                        },
                                        'Retrying manifest refresh after failure',
                                );

                                await this.sleep(BASE_RETRY_DELAY_MS * attempt);
                        }
                }

                throw lastError ?? new ConnectorManifestError('Failed to load connector manifest');
        }

        private resetFailureState(): void {
                this.consecutiveRefreshFailures = 0;
                this.circuitOpenedAtMs = undefined;
        }

        private recordRefreshFailure(): void {
                this.consecutiveRefreshFailures += 1;
                if (this.consecutiveRefreshFailures >= CIRCUIT_BREAKER_FAILURE_THRESHOLD) {
                        this.circuitOpenedAtMs = this.clock.now();
                }
        }

        private isCircuitOpen(): boolean {
                if (this.circuitOpenedAtMs === undefined) {
                        return false;
                }

                const elapsed = this.clock.now() - this.circuitOpenedAtMs;
                if (elapsed >= CIRCUIT_BREAKER_DURATION_MS) {
                        this.circuitOpenedAtMs = undefined;
                        this.consecutiveRefreshFailures = 0;
                        return false;
                }

                return true;
        }

        private async hydrateConnectors(manifest: ServiceMapPayload): Promise<void> {
		for (const entry of manifest.connectors) {
			setConnectorAvailabilityGauge(entry.id, entry.status === 'enabled');
		}

		const enabled = manifest.connectors.filter((entry) => entry.status === 'enabled');
		if (!enabled.length) {
			return;
		}

		const limit = pLimit(4);
		const results = await Promise.allSettled(
			enabled.map((entry) =>
				limit(async () => {
					const proxy = await this.ensureProxy(entry);
					await this.registerRemoteTools(entry, proxy);
				}),
			),
		);

		results.forEach((result, index) => {
			if (result.status === 'rejected') {
				const entry = enabled[index];
				setConnectorAvailabilityGauge(entry.id, false);
				this.options.logger.warn(
					{
						brand: 'brAInwav',
						connectorId: entry.id,
						error: result.reason instanceof Error ? result.reason.message : result.reason,
					},
					'Connector sync failed',
				);
			}
		});
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
                        logger: this.options.logger as unknown as import('pino').Logger,
                        agent: this.agent,
                        connectorId: entry.id,
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
                        const normalized = normalizeWikidataToolName(tool.name, entry.id, entry);
                        const fullName = normalized.normalizedName;

                        if (this.registeredTools.has(fullName)) {
                                continue;
                        }

                        const metadataTags = Array.from(
                                new Set([
                                        ...(normalized.tags ?? []),
                                        ...(normalized.scopes ?? []).map((scope) => `scope:${scope}`),
                                        `connector:${entry.id}`,
                                        `connectorName:${entry.name}`,
                                        'brand:brAInwav',
                                ]),
                        );

                        const metadata =
                                metadataTags.length || entry.metadata?.brand
                                        ? {
                                                        tags: metadataTags.length ? metadataTags : undefined,
                                                        author: entry.metadata?.brand ?? undefined,
                                          }
                                        : undefined;

                        this.options.registry.registerTool({
                                name: fullName,
                                description: tool.description,
                                inputSchema: tool.inputSchema,
                                handler: async (args: Record<string, unknown>) =>
                                        proxy.callTool(normalized.originalName, args),
                                metadata,
                        });

                        this.registeredTools.add(fullName);
                }
        }

	async disconnect(): Promise<void> {
		this.scheduler?.stop();
		const disconnects = Array.from(this.proxies.values()).map(async (proxy) => {
			try {
				await proxy.disconnect();
			} catch (error) {
				this.options.logger.warn(
					{ brand: 'brAInwav', error: error instanceof Error ? error.message : error },
					'Failed to disconnect proxy',
				);
			}
		});

		await Promise.allSettled(disconnects);
		await this.agent.close();
	}
}
