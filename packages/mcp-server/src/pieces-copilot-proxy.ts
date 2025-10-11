import { type RemoteTool, RemoteToolProxy } from '@cortex-os/mcp-bridge/runtime/remote-proxy';
import { setPiecesCopilotProxyStatus } from '@cortex-os/mcp-bridge/runtime/telemetry/metrics';
import type { Logger } from 'pino';

export interface PiecesCopilotMCPProxyConfig {
	endpoint: string;
	enabled: boolean;
	reconnectDelay?: number;
	logger: Logger;
}

export class PiecesCopilotMCPProxy {
	private readonly proxy: RemoteToolProxy;

	constructor(config: PiecesCopilotMCPProxyConfig) {
		this.proxy = new RemoteToolProxy({
			...config,
			serviceLabel: 'Pieces Copilot MCP',
			unavailableErrorName: 'PiecesCopilotServiceUnavailableError',
			unavailableErrorMessage: 'Pieces Copilot MCP proxy is temporarily unavailable',
			onAvailabilityChange: setPiecesCopilotProxyStatus,
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
