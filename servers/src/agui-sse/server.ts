import { createBus } from '@cortex-os/a2a-core/bus';
import { inproc } from '@cortex-os/a2a-transport/inproc';
import { createAGUIAdapter } from '@cortex-os/agui';
import { createAguiEvent } from '@cortex-os/contracts';
import { EventEmitter } from 'node:events';
import { createServer } from 'node:http';

const AGUI_PORT = Number.parseInt(process.env.AGUI_PORT || '3023', 10);

interface SSEConnection {
	id: string;
	response: import('node:http').ServerResponse;
	lastPing: number;
}

export class AGUISSEServer {
	private server: import('node:http').Server;
	private bus = createBus(inproc());
	private emitter = new EventEmitter();
	private aguiAdapter = createAGUIAdapter(this.emitter);
	private connections = new Map<string, SSEConnection>();
	private pingInterval?: NodeJS.Timeout;

	constructor() {
		this.server = createServer((req, res) => {
			this.handleRequest(req, res);
		});

		// Set up AGUI adapter to relay events to SSE
		this.emitter.on('agent_message', (payload) => {
			this.broadcastToSSE('agent_message', payload);
		});

		// Subscribe to AGUI events from the A2A bus
		this.setupA2ASubscriptions();

		// Start connection ping/cleanup
		this.startConnectionMaintenance();
	}

	private handleRequest(
		req: import('node:http').IncomingMessage,
		res: import('node:http').ServerResponse,
	): void {
		// Set CORS headers
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
		res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

		if (req.method === 'OPTIONS') {
			res.writeHead(204);
			res.end();
			return;
		}

		const url = new URL(req.url || '/', `http://${req.headers.host}`);

		if (url.pathname === '/agui/events') {
			this.handleSSEConnection(req, res);
		} else if (url.pathname === '/health') {
			this.handleHealthCheck(res);
		} else {
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('Not Found');
		}
	}

	private handleSSEConnection(
		req: import('node:http').IncomingMessage,
		res: import('node:http').ServerResponse,
	): void {
		const connectionId = `sse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

		// Set SSE headers
		res.writeHead(200, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'Access-Control-Allow-Origin': '*',
		});

		// Send initial connection event
		this.writeSSEMessage(res, 'connected', { connectionId, timestamp: new Date().toISOString() });

		// Store connection
		this.connections.set(connectionId, {
			id: connectionId,
			response: res,
			lastPing: Date.now(),
		});

		// Handle client disconnect
		req.on('close', () => {
			this.connections.delete(connectionId);
			console.log(`AGUI SSE client disconnected: ${connectionId}`);
		});

		req.on('error', (err) => {
			console.error(`AGUI SSE connection error: ${connectionId}`, err);
			this.connections.delete(connectionId);
		});

		console.log(`AGUI SSE client connected: ${connectionId}`);
	}

	private handleHealthCheck(res: import('node:http').ServerResponse): void {
		const health = {
			status: 'ok',
			timestamp: new Date().toISOString(),
			connections: this.connections.size,
			uptime: process.uptime(),
		};

		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify(health, null, 2));
	}

	private writeSSEMessage(
		res: import('node:http').ServerResponse,
		eventType: string,
		data: unknown,
	): void {
		const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
		res.write(message);
	}

	private broadcastToSSE(eventType: string, data: unknown): void {
		const message = {
			type: eventType,
			data,
			timestamp: new Date().toISOString(),
		};

		for (const connection of this.connections.values()) {
			try {
				this.writeSSEMessage(connection.response, eventType, message);
			} catch (error) {
				console.error(`Failed to send SSE message to ${connection.id}:`, error);
				this.connections.delete(connection.id);
			}
		}
	}

	private async setupA2ASubscriptions(): Promise<void> {
		try {
			await this.bus.bind([
				{
					type: 'agui.component.rendered',
					handle: async (envelope) => {
						this.broadcastToSSE('agui_component_rendered', envelope.data);
					},
				},
				{
					type: 'agui.user.interaction',
					handle: async (envelope) => {
						this.broadcastToSSE('agui_user_interaction', envelope.data);
					},
				},
				{
					type: 'agui.ai.recommendation',
					handle: async (envelope) => {
						this.broadcastToSSE('agui_ai_recommendation', envelope.data);
					},
				},
				{
					type: 'agui.state.changed',
					handle: async (envelope) => {
						this.broadcastToSSE('agui_state_changed', envelope.data);
					},
				},
			]);
			console.log('AGUI SSE server subscribed to A2A events');
		} catch (error) {
			console.error('Failed to subscribe to A2A events:', error);
		}
	}

	private startConnectionMaintenance(): void {
		this.pingInterval = setInterval(() => {
			const now = Date.now();
			const staleConnections: string[] = [];

			// Send ping and identify stale connections
			for (const [connectionId, connection] of this.connections.entries()) {
				try {
					// Send ping
					this.writeSSEMessage(connection.response, 'ping', { timestamp: now });
					connection.lastPing = now;
				} catch {
					console.log(`Removing stale SSE connection: ${connectionId}`);
					staleConnections.push(connectionId);
				}
			}

			// Clean up stale connections
			for (const connectionId of staleConnections) {
				this.connections.delete(connectionId);
			}

			if (this.connections.size > 0) {
				console.log(`AGUI SSE: ${this.connections.size} active connections`);
			}
		}, 30000); // Ping every 30 seconds
	}

	public start(): Promise<void> {
		return new Promise((resolve) => {
			this.server.listen(AGUI_PORT, () => {
				console.log(`AGUI SSE server listening on port ${AGUI_PORT}`);
				console.log(`SSE endpoint: http://localhost:${AGUI_PORT}/agui/events`);
				console.log(`Health check: http://localhost:${AGUI_PORT}/health`);
				resolve();
			});
		});
	}

	public stop(): Promise<void> {
		return new Promise((resolve) => {
			if (this.pingInterval) {
				clearInterval(this.pingInterval);
			}

			// Close all SSE connections
			for (const connection of this.connections.values()) {
				try {
					connection.response.end();
				} catch (error) {
					console.error(`Error closing SSE connection ${connection.id}:`, error);
				}
			}
			this.connections.clear();

			this.server.close(() => {
				console.log('AGUI SSE server stopped');
				resolve();
			});
		});
	}

	/**
	 * Publish a test AGUI event (for testing/demonstration)
	 */
	public async publishTestEvent(): Promise<void> {
		const testEvent = createAguiEvent('agui.component.rendered', {
			componentId: 'test-button-1',
			type: 'button',
			properties: {
				label: 'Test Button',
				disabled: false,
			},
			timestamp: new Date().toISOString(),
		});

		await this.bus.publish(testEvent);
		console.log('Published test AGUI event');
	}

	public getConnectionCount(): number {
		return this.connections.size;
	}
}

// If run directly, start the server
if (import.meta.url === `file://${process.argv[1]}`) {
	const server = new AGUISSEServer();

	process.on('SIGINT', async () => {
		console.log('Received SIGINT, shutting down gracefully...');
		await server.stop();
		process.exit(0);
	});

	process.on('SIGTERM', async () => {
		console.log('Received SIGTERM, shutting down gracefully...');
		await server.stop();
		process.exit(0);
	});

	server.start().catch((error) => {
		console.error('Failed to start AGUI SSE server:', error);
		process.exit(1);
	});
}

export { AGUISSEServer };
