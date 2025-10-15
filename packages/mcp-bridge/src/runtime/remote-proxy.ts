import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type { Logger } from 'pino';
import type { Agent } from 'undici';

export interface RemoteTool {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
}

type StructuredLogger = Pick<Logger, 'info' | 'warn' | 'error' | 'debug'>;

export interface RemoteToolProxyOptions {
        endpoint: string;
        enabled: boolean;
        logger: StructuredLogger;
        reconnectDelay?: number;
        serviceLabel?: string;
        unavailableErrorName?: string;
        unavailableErrorMessage?: string;
        onAvailabilityChange?: (up: boolean) => void;
        headers?: Record<string, string>;
	agent?: Agent;
	connectorId?: string;
}

const DEFAULT_RECONNECT_DELAY = 5_000;
type RemoteToolDescriptor = {
	name: string;
	description?: string;
	inputSchema: Record<string, unknown>;
};

export class RemoteToolProxy {
	private client: Client | null = null;
	private transport: SSEClientTransport | null = null;
	private readonly config: Required<RemoteToolProxyOptions>;
	private connected = false;
	private reconnectTimer: NodeJS.Timeout | null = null;
	private remoteTools: RemoteTool[] = [];
	private lastFailureLoggedAt: number | null = null;

        constructor(config: RemoteToolProxyOptions) {
                this.config = {
                        reconnectDelay: config.reconnectDelay ?? DEFAULT_RECONNECT_DELAY,
                        serviceLabel: config.serviceLabel ?? 'Remote MCP',
                        unavailableErrorName: config.unavailableErrorName ?? 'RemoteServiceUnavailableError',
                        unavailableErrorMessage:
                                config.unavailableErrorMessage ?? 'Remote MCP proxy is temporarily unavailable',
                        onAvailabilityChange: config.onAvailabilityChange ?? (() => {}),
                        headers: config.headers ?? {},
                        ...config,
                };
        }

	async connect(): Promise<void> {
		if (!this.config.enabled) {
			this.config.logger.info(
				{ brand: 'brAInwav', connectorId: this.config.connectorId },
				`${this.config.serviceLabel} proxy disabled - skipping connection`,
			);
			this.signalAvailability(false);
			return;
		}

		try {
			this.config.logger.info(
				{
					brand: 'brAInwav',
					connectorId: this.config.connectorId,
					endpoint: this.config.endpoint,
				},
				`Connecting to ${this.config.serviceLabel} MCP server...`,
			);

			const requestInit: RequestInit & { dispatcher?: Agent } = {
				headers: this.config.headers,
			};

			if (this.config.agent) {
				requestInit.dispatcher = this.config.agent;
			}

                        this.transport = new SSEClientTransport(new URL(this.config.endpoint), {
				requestInit,
                        });
			this.client = new Client(
				{
					name: 'cortex-mcp-remote-proxy',
					version: '1.0.0',
				},
				{
					capabilities: {
						tools: {},
					},
				},
			);

			await this.client.connect(this.transport);
			await this.discoverTools();

			this.connected = true;
			this.lastFailureLoggedAt = null;
			this.signalAvailability(true);
			this.config.logger.info(
				{
					brand: 'brAInwav',
					connectorId: this.config.connectorId,
					toolCount: this.remoteTools.length,
				},
				`Successfully connected to ${this.config.serviceLabel} MCP server`,
			);
		} catch (error) {
			this.connected = false;
			this.signalAvailability(false);
			this.config.logger.warn(
				{
					brand: 'brAInwav',
					connectorId: this.config.connectorId,
					error: (error as Error).message,
					endpoint: this.config.endpoint,
				},
				`Failed to connect to ${this.config.serviceLabel} MCP - will retry`,
			);

			this.scheduleReconnect();
		}
	}

	private async discoverTools(): Promise<void> {
		if (!this.client) {
			throw new Error('Client not initialized');
		}

		try {
			const response = await this.client.listTools();
			this.remoteTools = response.tools.map((tool: RemoteToolDescriptor) => ({
				name: tool.name,
				description: tool.description || '',
				inputSchema: tool.inputSchema,
			}));

			this.config.logger.info(
				{
					brand: 'brAInwav',
					connectorId: this.config.connectorId,
					tools: this.remoteTools.map((t) => t.name),
				},
				`Discovered ${this.config.serviceLabel} MCP tools`,
			);
		} catch (error) {
			this.config.logger.error(
				{
					brand: 'brAInwav',
					connectorId: this.config.connectorId,
					error: (error as Error).message,
				},
				`Failed to discover tools from ${this.config.serviceLabel}`,
			);
			throw error;
		}
	}

	private scheduleReconnect(): void {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
		}

		const jitterDelay = Math.floor(this.config.reconnectDelay * (0.5 + Math.random()));

		this.reconnectTimer = setTimeout(async () => {
			this.config.logger.info(
				{
					brand: 'brAInwav',
					connectorId: this.config.connectorId,
					delayMs: jitterDelay,
				},
				`Attempting to reconnect to ${this.config.serviceLabel} MCP...`,
			);
			await this.connect();
		}, jitterDelay);
	}

	getTools(): RemoteTool[] {
		return this.remoteTools;
	}

	isConnected(): boolean {
		return this.connected;
	}

	async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
		if (!this.client || !this.connected) {
			const now = Date.now();
			if (!this.lastFailureLoggedAt || now - this.lastFailureLoggedAt > 30_000) {
				this.config.logger.warn(
					{
						brand: 'brAInwav',
						connectorId: this.config.connectorId,
						tool: name,
					},
					`${this.config.serviceLabel} MCP proxy is offline; returning service unavailable error`,
				);
				this.lastFailureLoggedAt = now;
			}
			this.signalAvailability(false);
			const error = new Error(this.config.unavailableErrorMessage);
			error.name = this.config.unavailableErrorName;
			throw error;
		}

		try {
			this.config.logger.info(
				{
					brand: 'brAInwav',
					connectorId: this.config.connectorId,
					tool: name,
					args,
				},
				`Calling remote ${this.config.serviceLabel} tool`,
			);

			return await this.client.callTool({
				name,
				arguments: args,
			});
		} catch (error) {
			this.config.logger.error(
				{
					brand: 'brAInwav',
					connectorId: this.config.connectorId,
					tool: name,
					error: (error as Error).message,
				},
				`Failed to call remote ${this.config.serviceLabel} tool`,
			);
			this.connected = false;
			this.signalAvailability(false);
			this.scheduleReconnect();
			throw error;
		}
	}

	async disconnect(): Promise<void> {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}

		if (this.client) {
			try {
				await this.client.close();
			} catch (error) {
				this.config.logger.warn(
					{
						brand: 'brAInwav',
						connectorId: this.config.connectorId,
						error: (error as Error).message,
					},
					`Error closing ${this.config.serviceLabel} MCP client`,
				);
			}
			this.client = null;
		}

		this.transport = null;
		this.connected = false;
		this.signalAvailability(false);

		this.config.logger.info(
			{ brand: 'brAInwav', connectorId: this.config.connectorId },
			`Disconnected from ${this.config.serviceLabel} MCP server`,
		);
	}

	private signalAvailability(up: boolean) {
		this.config.onAvailabilityChange(up);
	}
}
