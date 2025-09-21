import { EventEmitter } from 'node:events';
import * as WebSocketLib from 'ws';
import type { ChangeEvent, StreamingMemoryStore } from './store.streaming.js';

export interface ServerConfig {
	port?: number;
	host?: string;
	enableAuth?: boolean;
	authToken?: string;
	maxConnections?: number;
	connectionTimeout?: number;
	pingInterval?: number;
	messageQueueTimeout?: number;
	maxQueueSize?: number;
	enableCompression?: boolean;
	perMessageDeflate?: boolean;
}

export interface ConnectionInfo {
	id: string;
	ws: WebSocket;
	subscriptions: Set<string>;
	lastActivity: number;
	connectedAt: number;
	userAgent?: string;
	remoteAddress?: string;
}

export interface ConnectionMetrics {
	totalConnections: number;
	activeConnections: number;
	reconnections: number;
	messagesSent: number;
	messagesReceived: number;
	bytesSent: number;
	bytesReceived: number;
	lastActivity?: number;
	connectionTimestamps: number[];
}

export interface QueuedMessage {
	type: string;
	data: any;
	namespace: string;
	timestamp: string;
	expires?: number;
}

export class RealtimeMemoryServer extends EventEmitter {
	private wss?: any;
	private connections = new Map<string, ConnectionInfo>();
	private clientQueues = new Map<string, QueuedMessage[]>();
	private pingInterval?: NodeJS.Timeout;
	private metrics: ConnectionMetrics = {
		totalConnections: 0,
		activeConnections: 0,
		reconnections: 0,
		messagesSent: 0,
		messagesReceived: 0,
		bytesSent: 0,
		bytesReceived: 0,
		connectionTimestamps: [],
	};
	private isShuttingDown = false;

	constructor(
		private readonly streamingStore: StreamingMemoryStore,
		private readonly config: ServerConfig = {},
	) {
		super();

		this.config = {
			port: 3000,
			host: 'localhost',
			enableAuth: false,
			maxConnections: 1000,
			connectionTimeout: 300000, // 5 minutes
			pingInterval: 30000, // 30 seconds
			messageQueueTimeout: 300000, // 5 minutes
			maxQueueSize: 1000,
			enableCompression: true,
			perMessageDeflate: {
				zlibDeflateOptions: {
					level: 3,
				},
				zlibInflateOptions: {
					chunkSize: 10 * 1024,
				},
				threshold: 1024,
			},
			...config,
		};
	}

	async start(port?: number): Promise<void> {
		const serverPort = port || this.config.port!;

		this.wss = new WebSocketLib.Server({
			port: serverPort,
			host: this.config.host,
			maxPayload: 16 * 1024 * 1024, // 16MB
			...this.config.perMessageDeflate,
		});

		this.wss.on('connection', this.handleConnection.bind(this));
		this.wss.on('error', this.handleServerError.bind(this));

		// Start ping interval
		this.pingInterval = setInterval(() => {
			this.pingConnections();
		}, this.config.pingInterval);

		// Subscribe to store changes
		this.streamingStore.subscribeToChanges('*', this.handleStoreChange.bind(this));

		this.emit('started', { port: serverPort });
	}

	async stop(): Promise<void> {
		this.isShuttingDown = true;

		// Stop ping interval
		if (this.pingInterval) {
			clearInterval(this.pingInterval);
		}

		// Close all connections
		const closePromises = Array.from(this.connections.values()).map((conn) => {
			return new Promise<void>((resolve) => {
				if (conn.ws.readyState === WebSocket.OPEN) {
					conn.ws.close(1000, 'Server shutting down');
				}
				conn.ws.on('close', () => resolve());
			});
		});

		await Promise.all(closePromises);

		// Close server
		if (this.wss) {
			await new Promise<void>((resolve) => {
				this.wss?.close(() => {
					this.wss = undefined;
					resolve();
				});
			});
		}

		this.connections.clear();
		this.clientQueues.clear();
		this.emit('stopped');
	}

	private handleConnection(ws: WebSocket, req: any): void {
		if (this.isShuttingDown) {
			ws.close(1013, 'Server shutting down');
			return;
		}

		// Check connection limit
		if (this.connections.size >= this.config.maxConnections!) {
			ws.close(1008, 'Connection limit reached');
			this.metrics.totalConnections++;
			return;
		}

		// Parse query parameters
		const url = new URL(req.url, `http://${req.headers.host}`);
		const clientId = url.searchParams.get('id') || this.generateClientId();
		const token = url.searchParams.get('token');

		// Check authentication if enabled
		if (this.config.enableAuth && token !== this.config.authToken) {
			ws.close(1008, 'Authentication required');
			this.metrics.totalConnections++;
			return;
		}

		// Check for reconnection
		const existingConnection = this.connections.get(clientId);
		if (existingConnection) {
			this.handleReconnection(clientId, ws);
			return;
		}

		// Create new connection
		const connection: ConnectionInfo = {
			id: clientId,
			ws,
			subscriptions: new Set(),
			lastActivity: Date.now(),
			connectedAt: Date.now(),
			userAgent: req.headers['user-agent'],
			remoteAddress: req.socket.remoteAddress,
		};

		this.connections.set(clientId, connection);
		this.metrics.totalConnections++;
		this.metrics.activeConnections++;
		this.metrics.connectionTimestamps.push(Date.now());

		// Send welcome message
		this.sendMessage(ws, {
			type: 'connected',
			message: 'Connected to RealtimeMemoryServer',
			timestamp: new Date().toISOString(),
		});

		// Setup event handlers
		ws.on('message', (data) => this.handleMessage(clientId, data));
		ws.on('close', (code, reason) => this.handleDisconnection(clientId, code, reason));
		ws.on('error', (error) => this.handleConnectionError(clientId, error));
		ws.on('pong', () => {
			connection.lastActivity = Date.now();
			this.metrics.lastActivity = Date.now();
		});

		this.emit('connection', connection);
	}

	private handleReconnection(clientId: string, ws: WebSocket): void {
		const oldConnection = this.connections.get(clientId)!;

		// Close old connection
		if (oldConnection.ws.readyState === WebSocket.OPEN) {
			oldConnection.ws.close(1000, 'Replaced by new connection');
		}

		// Create new connection with old subscriptions
		const connection: ConnectionInfo = {
			...oldConnection,
			ws,
			lastActivity: Date.now(),
			connectedAt: Date.now(),
		};

		this.connections.set(clientId, connection);
		this.metrics.reconnections++;
		this.metrics.activeConnections++;

		// Restore subscriptions
		const subscriptions = Array.from(connection.subscriptions);
		this.sendMessage(ws, {
			type: 'subscriptions_restored',
			subscriptions,
			timestamp: new Date().toISOString(),
		});

		// Send queued messages
		this.sendQueuedMessages(clientId);

		// Setup event handlers
		ws.on('message', (data) => this.handleMessage(clientId, data));
		ws.on('close', (code, reason) => this.handleDisconnection(clientId, code, reason));
		ws.on('error', (error) => this.handleConnectionError(clientId, error));
		ws.on('pong', () => {
			connection.lastActivity = Date.now();
			this.metrics.lastActivity = Date.now();
		});

		this.emit('reconnection', connection);
	}

	private handleMessage(clientId: string, data: any): void {
		const connection = this.connections.get(clientId);
		if (!connection) return;

		connection.lastActivity = Date.now();
		this.metrics.lastActivity = Date.now();
		this.metrics.messagesReceived++;
		this.metrics.bytesReceived += data.length;

		try {
			const message = JSON.parse(data);
			this.handleMessageContent(clientId, message);
		} catch {
			this.sendMessage(connection.ws, {
				type: 'error',
				message: 'Invalid message format',
				timestamp: new Date().toISOString(),
			});
		}
	}

	private handleMessageContent(clientId: string, message: any): void {
		const connection = this.connections.get(clientId)!;

		switch (message.type) {
			case 'subscribe':
				this.handleSubscribe(clientId, message);
				break;

			case 'unsubscribe':
				this.handleUnsubscribe(clientId, message);
				break;

			case 'ping':
				this.sendMessage(connection.ws, {
					type: 'pong',
					timestamp: new Date().toISOString(),
				});
				break;

			default:
				this.sendMessage(connection.ws, {
					type: 'error',
					message: 'Unknown message type',
					timestamp: new Date().toISOString(),
				});
		}
	}

	private handleSubscribe(clientId: string, message: any): void {
		const connection = this.connections.get(clientId)!;
		const { namespace, eventTypes } = message;

		if (!namespace || typeof namespace !== 'string') {
			this.sendMessage(connection.ws, {
				type: 'error',
				message: 'Invalid subscription format',
				timestamp: new Date().toISOString(),
			});
			return;
		}

		// Validate namespace format
		if (!this.isValidNamespace(namespace)) {
			this.sendMessage(connection.ws, {
				type: 'error',
				message: 'Invalid namespace format',
				timestamp: new Date().toISOString(),
			});
			return;
		}

		// Check for duplicate subscription
		if (connection.subscriptions.has(namespace)) {
			this.sendMessage(connection.ws, {
				type: 'warning',
				message: 'Already subscribed to namespace',
				timestamp: new Date().toISOString(),
			});
			return;
		}

		// Add subscription
		connection.subscriptions.add(namespace);

		// Subscribe to store changes
		this.streamingStore.subscribeToChanges(namespace, (change) => {
			this.broadcastToConnection(clientId, change, eventTypes);
		});

		this.sendMessage(connection.ws, {
			type: 'subscribed',
			namespace,
			timestamp: new Date().toISOString(),
		});

		this.emit('subscribe', { clientId, namespace, connection });
	}

	private handleUnsubscribe(clientId: string, message: any): void {
		const connection = this.connections.get(clientId)!;
		const { namespace } = message;

		if (!connection.subscriptions.has(namespace)) {
			this.sendMessage(connection.ws, {
				type: 'warning',
				message: 'Not subscribed to namespace',
				timestamp: new Date().toISOString(),
			});
			return;
		}

		connection.subscriptions.delete(namespace);
		this.sendMessage(connection.ws, {
			type: 'unsubscribed',
			namespace,
			timestamp: new Date().toISOString(),
		});

		this.emit('unsubscribe', { clientId, namespace, connection });
	}

	private handleDisconnection(clientId: string, code: number, reason: string): void {
		const connection = this.connections.get(clientId);
		if (!connection) return;

		this.connections.delete(clientId);
		this.metrics.activeConnections--;

		// Don't remove queue immediately - allow for reconnection
		setTimeout(() => {
			if (!this.connections.has(clientId)) {
				this.clientQueues.delete(clientId);
			}
		}, this.config.messageQueueTimeout);

		this.emit('disconnection', { clientId, connection, code, reason });
	}

	private handleConnectionError(clientId: string, error: Error): void {
		const connection = this.connections.get(clientId);
		if (!connection) return;

		this.emit('connectionError', { clientId, connection, error });

		// Close connection on error
		if (connection.ws.readyState === WebSocket.OPEN) {
			connection.ws.close(1011, 'Internal error');
		}
	}

	private handleServerError(error: Error): void {
		this.emit('error', error);
	}

	private handleStoreChange(change: ChangeEvent): void {
		// Broadcast to all relevant subscribers
		for (const [clientId, connection] of this.connections) {
			if (connection.subscriptions.has(change.namespace)) {
				this.broadcastToConnection(clientId, change);
			}
		}
	}

	private broadcastToConnection(
		clientId: string,
		change: ChangeEvent,
		eventTypes?: string[],
	): void {
		const connection = this.connections.get(clientId);
		if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
			// Queue message for disconnected clients
			this.queueMessage(clientId, change);
			return;
		}

		// Check event type filter
		if (eventTypes && !eventTypes.includes(change.type)) {
			return;
		}

		this.sendMessage(connection.ws, {
			type: 'change',
			event: change,
			timestamp: new Date().toISOString(),
		});
	}

	private queueMessage(clientId: string, change: ChangeEvent): void {
		if (!this.clientQueues.has(clientId)) {
			this.clientQueues.set(clientId, []);
		}

		const queue = this.clientQueues.get(clientId)!;

		// Add message
		const message: QueuedMessage = {
			type: 'change',
			data: change,
			namespace: change.namespace,
			timestamp: new Date().toISOString(),
			expires: Date.now() + this.config.messageQueueTimeout!,
		};

		queue.push(message);

		// Limit queue size
		if (queue.length > this.config.maxQueueSize!) {
			queue.shift(); // Remove oldest message
		}

		// Clean up expired messages
		const now = Date.now();
		while (queue.length > 0 && queue[0].expires! < now) {
			queue.shift();
		}
	}

	private sendQueuedMessages(clientId: string): void {
		const queue = this.clientQueues.get(clientId);
		if (!queue || queue.length === 0) return;

		const connection = this.connections.get(clientId);
		if (!connection || connection.ws.readyState !== WebSocket.OPEN) return;

		// Send all queued messages
		for (const message of queue) {
			this.sendMessage(connection.ws, {
				type: message.type,
				data: message.data,
				timestamp: message.timestamp,
			});
		}

		// Clear queue
		queue.length = 0;
	}

	private sendMessage(ws: WebSocket, message: any): void {
		if (ws.readyState !== WebSocket.OPEN) return;

		try {
			const data = JSON.stringify(message);
			ws.send(data);
			this.metrics.messagesSent++;
			this.metrics.bytesSent += data.length;
		} catch (error) {
			this.emit('sendError', { ws, message, error });
		}
	}

	private pingConnections(): void {
		const now = Date.now();
		const timeout = this.config.connectionTimeout!;

		for (const connection of this.connections.values()) {
			if (now - connection.lastActivity > timeout) {
				// Close stale connection
				connection.ws.close(1000, 'Connection timeout');
				continue;
			}

			// Send ping
			if (connection.ws.readyState === WebSocket.OPEN) {
				connection.ws.ping();
			}
		}
	}

	private generateClientId(): string {
		return `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;
	}

	private isValidNamespace(namespace: string): boolean {
		// Basic namespace validation
		return /^[a-zA-Z0-9_-]+$/.test(namespace);
	}

	// Public API methods
	getConnectionCount(): number {
		return this.connections.size;
	}

	getConnectionMetrics(): ConnectionMetrics {
		return { ...this.metrics };
	}

	getSubscriptions(ws: WebSocket): string[] {
		for (const connection of this.connections.values()) {
			if (connection.ws === ws) {
				return Array.from(connection.subscriptions);
			}
		}
		return [];
	}

	getConnection(clientId: string): ConnectionInfo | undefined {
		return this.connections.get(clientId);
	}

	broadcastToNamespace(namespace: string, message: any): void {
		for (const connection of this.connections.values()) {
			if (connection.subscriptions.has(namespace)) {
				this.sendMessage(connection.ws, message);
			}
		}
	}

	broadcastToAll(message: any): void {
		for (const connection of this.connections.values()) {
			this.sendMessage(connection.ws, message);
		}
	}

	disconnectClient(clientId: string, reason?: string): void {
		const connection = this.connections.get(clientId);
		if (connection) {
			connection.ws.close(1000, reason || 'Disconnected by server');
		}
	}

	isRunning(): boolean {
		return this.wss !== undefined;
	}
}
