import { type RemoteTool, RemoteToolProxy } from '@cortex-os/mcp-bridge/runtime/remote-proxy';
import { setPiecesDriveProxyStatus } from '@cortex-os/mcp-bridge/runtime/telemetry/metrics';
import type { Logger } from 'pino';

export interface PiecesDriveMCPProxyConfig {
	endpoint: string;
	enabled: boolean;
	reconnectDelay?: number;
	logger: Logger;
}

export class PiecesDriveMCPProxy {
	private readonly proxy: RemoteToolProxy;

	constructor(config: PiecesDriveMCPProxyConfig) {
		this.proxy = new RemoteToolProxy({
			...config,
			serviceLabel: 'Pieces Drive MCP',
			unavailableErrorName: 'PiecesDriveServiceUnavailableError',
			unavailableErrorMessage: 'Pieces Drive MCP proxy is temporarily unavailable',
			onAvailabilityChange: setPiecesDriveProxyStatus,
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
