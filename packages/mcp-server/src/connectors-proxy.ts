import { type RemoteTool, RemoteToolProxy } from '@cortex-os/mcp-bridge/runtime/remote-proxy';
import { setConnectorProxyStatus } from '@cortex-os/mcp-bridge/runtime/telemetry/metrics';
import type { FastMCP } from 'fastmcp';
import type { Logger } from 'pino';
import type { ConnectorsManifest, ConnectorManifestEntry } from './config/connectors.js';

interface ConnectorsProxyOptions {
	manifest: ConnectorsManifest;
	logger: Logger;
	enabled: boolean;
	apiKey?: string;
}

interface ConnectorContext {
	entry: ConnectorManifestEntry;
	proxy: RemoteToolProxy;
	tools: RemoteTool[];
}

export class ConnectorsProxyManager {
	private readonly logger: Logger;
	private readonly apiKey?: string;
	private readonly enabled: boolean;
	private readonly connectors = new Map<string, ConnectorContext>();

	constructor(options: ConnectorsProxyOptions) {
		this.logger = options.logger;
		this.apiKey = options.apiKey;
		this.enabled = options.enabled;

		for (const entry of options.manifest.connectors) {
			if (!entry.enabled || !this.enabled) {
				setConnectorProxyStatus(entry.id, false);
				continue;
			}

			const proxy = this.createProxy(entry);
			this.connectors.set(entry.id, {
				entry,
				proxy,
				tools: [],
			});
		}
	}

	private createProxy(entry: ConnectorManifestEntry): RemoteToolProxy {
		const { endpoint, headers } = this.buildEndpoint(entry);
		return new RemoteToolProxy({
			enabled: true,
			endpoint,
			reconnectDelay: entry.timeouts?.connectMs,
			logger: this.logger.child({ connectorId: entry.id }),
			headers,
			serviceLabel: `connector:${entry.id}`,
			onAvailabilityChange: (up) => setConnectorProxyStatus(entry.id, up),
		});
	}

	private buildEndpoint(entry: ConnectorManifestEntry): {
		endpoint: string;
		headers?: Record<string, string>;
	} {
		const url = new URL(entry.endpoint);
		const headers: Record<string, string> = {};
		const apiKey = this.apiKey;
		if (!apiKey) {
			return { endpoint: url.toString() };
		}

		if (entry.auth?.queryParam) {
			url.searchParams.set(entry.auth.queryParam, apiKey);
		}

		if (entry.auth?.headerName) {
			const headerName = entry.auth.headerName;
			if (entry.auth.type === 'bearer' && headerName.toLowerCase() === 'authorization') {
				headers[headerName] = `Bearer ${apiKey}`;
			} else {
				headers[headerName] = entry.auth.type === 'bearer' ? `Bearer ${apiKey}` : apiKey;
			}
		} else if (entry.auth?.type === 'bearer') {
			headers.Authorization = `Bearer ${apiKey}`;
		} else if (entry.auth?.type === 'apiKey') {
			headers['X-API-Key'] = apiKey;
		}

		return {
			endpoint: url.toString(),
			headers: Object.keys(headers).length > 0 ? headers : undefined,
		};
	}

	async connectAll(): Promise<void> {
		await Promise.all(
			Array.from(this.connectors.values()).map(async (context) => {
				try {
					await context.proxy.connect();
					context.tools = context.proxy.getTools();
					setConnectorProxyStatus(context.entry.id, true);
					this.logger.info(
						{ connectorId: context.entry.id, toolCount: context.tools.length },
						'Connector proxy connected',
					);
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					setConnectorProxyStatus(context.entry.id, false);
					context.tools = [];
					this.logger.warn(
						{ connectorId: context.entry.id, error: message },
						'Failed to connect connector proxy',
					);
				}
			}),
		);
	}

	registerTools(server: FastMCP, logger: Logger): void {
		for (const [connectorId, context] of this.connectors.entries()) {
			if (context.tools.length === 0) {
				logger.info({ connectorId }, 'Skipping connector with no discovered tools');
				continue;
			}

			const entry = context.entry;
			for (const tool of context.tools) {
				server.addTool({
					name: `connector.${connectorId}.${tool.name}`,
					description: `[Connector:${entry.displayName}] ${tool.description ?? ''}`.trim(),
					parameters: tool.inputSchema as any,
					annotations: {
						readOnlyHint: true,
						title: `${entry.displayName}: ${tool.name}`,
					},
					async execute(args) {
						logger.info({ connectorId, tool: tool.name }, 'Proxying connector tool execution');
						const result = await context.proxy.callTool(tool.name, args);
						return JSON.stringify(result, null, 2);
					},
				});
			}
		}
	}

	async disconnectAll(): Promise<void> {
		await Promise.all(
			Array.from(this.connectors.values()).map(async (context) => {
				try {
					await context.proxy.disconnect();
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					this.logger.warn(
						{ connectorId: context.entry.id, error: message },
						'Error disconnecting connector proxy',
					);
				}
			}),
		);
	}

	hasConnectors(): boolean {
		return this.connectors.size > 0;
	}
}
