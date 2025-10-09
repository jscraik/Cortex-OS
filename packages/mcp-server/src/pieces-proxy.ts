import { type RemoteTool, RemoteToolProxy } from '@cortex-os/mcp-bridge/runtime/remote-proxy';
import { setPiecesProxyStatus } from '@cortex-os/mcp-bridge/runtime/telemetry/metrics';
import type { Logger } from 'pino';

export interface PiecesMCPProxyConfig {
	endpoint: string;
	enabled: boolean;
	reconnectDelay?: number;
	logger: Logger;
}

export class PiecesMCPProxy {
	private readonly proxy: RemoteToolProxy;

	constructor(config: PiecesMCPProxyConfig) {
		this.proxy = new RemoteToolProxy({
			...config,
			serviceLabel: 'Pieces MCP',
			unavailableErrorName: 'PiecesServiceUnavailableError',
			unavailableErrorMessage: 'Pieces MCP proxy is temporarily unavailable',
			onAvailabilityChange: setPiecesProxyStatus,
		});
	}

	async connect(): Promise<void> {
		await this.proxy.connect();
	}

	getTools(): RemoteTool[] {
		return this.proxy.getTools();
	}

	isConnected(): boolean {
		return this.proxy.isConnected();
	}

	async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
		return this.proxy.callTool(name, args);
	}

	async disconnect(): Promise<void> {
		await this.proxy.disconnect();
	}
}
