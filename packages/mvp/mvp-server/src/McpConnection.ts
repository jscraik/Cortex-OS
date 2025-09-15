/** Minimal McpConnection implementation to satisfy tests. */
declare module 'ws' {
	export interface WebSocket {
		on(event: string, listener: Function): this;
		send(data: string): void;
		close(): void;
	}
}

import type { WebSocket } from 'ws';
import type { ToolRegistry } from './ToolRegistry.js';

type JsonRecord = Record<string, unknown>;

enum MsgType {
	Request = 'request',
}

type RequestMsg = {
	id: string;
	type: MsgType.Request;
	method: string;
	params?: JsonRecord;
};

export class McpConnection {
	private id: string;

	constructor(
		private ws: WebSocket,
		private tools: ToolRegistry,
	) {
		this.id = `conn-${Date.now()}`;
		this.send({
			type: 'notification',
			method: 'capabilities',
			params: {
				tools: this.tools
					.list()
					.map((t) => ({ name: t.name, description: t.description })),
			},
		});

		this.ws.on('message', (data: Buffer) => {
			try {
				const message = JSON.parse(data.toString()) as RequestMsg | JsonRecord;
				this.handleMessage(message);
			} catch {
				// ignore
			}
		});
	}

	getConnectionId() {
		return this.id;
	}

	private send(payload: JsonRecord) {
		this.ws.send(JSON.stringify(payload));
	}

	private handleMessage(msg: RequestMsg | JsonRecord) {
		if ((msg as RequestMsg)?.type === 'request') {
			const req = msg as RequestMsg;
			switch (req.method) {
				case 'initialize':
					this.send({
						id: req.id,
						type: 'response',
						result: {
							protocolVersion: '2024-11-05',
							serverInfo: { name: 'cortex-mcp-server', version: '0.1.0' },
						},
					});
					break;
				case 'tools/list':
					this.send({
						id: req.id,
						type: 'response',
						result: { tools: this.tools.list().map((t) => ({ name: t.name })) },
					});
					break;
				case 'ping':
					this.send({
						id: req.id,
						type: 'response',
						result: { pong: true, timestamp: Date.now() },
					});
					break;
				default:
					this.send({ id: req.id, type: 'error', error: 'unknown_method' });
			}
		}
	}
}
