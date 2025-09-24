import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import type {
	ClientConnection,
	ConnectionStats,
	ErrorMessage,
	LangGraphUpdate,
	SubscriptionMessage,
	WebSocketMessage,
	WebSocketServerOptions,
} from './types.js';

/**
 * WebSocket Server for real-time communication with LangGraph streaming
 */
export class WebSocketServer extends EventEmitter {
	private options: Required<WebSocketServerOptions>;
	private connections: Map<string, ClientConnection> = new Map();
	private userConnections: Map<string, Set<string>> = new Map();
	private subscriptions: Map<string, Set<string>> = new Map();
	private pingInterval?: NodeJS.Timeout;
	private startTime: number = Date.now();
	private messageCount = { sent: 0, received: 0 };

	constructor(options: WebSocketServerOptions) {
		super();

		this.options = {
			maxConnectionsPerUser: 5,
			maxMessageSize: 1024 * 1024, // 1MB
			pingInterval: 30000, // 30 seconds
			connectionTimeout: 10000, // 10 seconds
			reconnection: {
				maxAttempts: 5,
				initialDelay: 1000,
				maxDelay: 30000,
				backoffMultiplier: 2,
			},
			pubSub: {
				enabled: false,
				channelPrefix: 'ws:',
			},
			...options,
		};

		this.setupPingInterval();
	}

	/**
	 * Handle new WebSocket connection
	 */
	async handleConnection(socket: WebSocket, request: Request): Promise<void> {
		try {
			const url = new URL(request.url);

			// Validate path
			if (url.pathname !== this.options.path) {
				this.closeConnection(socket, 4000, 'Invalid path');
				return;
			}

			// Extract and validate authentication token
			const token = url.searchParams.get('token');
			if (!token) {
				this.closeConnection(socket, 4001, 'Authentication required');
				return;
			}

			// Authenticate user
			const user = await this.options.authenticate(token);

			// Check connection limits
			const userConnCount = this.getUserConnectionCount(user.userId);
			if (userConnCount >= this.options.maxConnectionsPerUser) {
				this.closeConnection(socket, 4003, 'Too many connections');
				return;
			}

			// Create client connection
			const connection: ClientConnection = {
				id: randomUUID(),
				socket,
				user,
				connectedAt: new Date().toISOString(),
				lastActivityAt: new Date().toISOString(),
				subscriptions: new Set(),
			};

			// Store connection
			this.connections.set(connection.id, connection);
			this.addUserConnection(user.userId, connection.id);

			// Set up socket handlers
			this.setupSocketHandlers(connection);

			// Send welcome message
			this.sendMessage(connection, {
				type: 'connected',
				payload: {
					connectionId: connection.id,
					user: { userId: user.userId, permissions: user.permissions },
				},
				timestamp: new Date().toISOString(),
			});

			this.emit('connection', connection);
		} catch (error) {
			this.emit('error', error as Error);
			this.closeConnection(socket, 4001, 'Authentication failed');
		}
	}

	/**
	 * Set up WebSocket event handlers
	 */
	private setupSocketHandlers(connection: ClientConnection): void {
		const { socket } = connection;

		socket.onmessage = async (event) => {
			try {
				this.messageCount.received++;
				connection.lastActivityAt = new Date().toISOString();

				// Validate message size
				if (event.data.size > this.options.maxMessageSize) {
					this.sendError(connection, 'MESSAGE_TOO_LARGE', 'Message exceeds size limit');
					return;
				}

				// Parse message
				const message = JSON.parse(event.data.toString());

				// Validate basic message structure
				if (!message.type || typeof message.type !== 'string') {
					this.sendError(connection, 'INVALID_MESSAGE', 'Message must have a type');
					return;
				}

				// Handle different message types
				switch (message.type) {
					case 'subscribe':
						await this.handleSubscribe(connection, message as SubscriptionMessage);
						break;
					case 'unsubscribe':
						await this.handleUnsubscribe(connection, message as SubscriptionMessage);
						break;
					case 'ping':
						this.handlePing(connection);
						break;
					default:
						// Forward to application handlers
						this.emit('message', connection, message);
				}
			} catch (error) {
				this.emit('error', error as Error, connection);
				this.sendError(connection, 'INTERNAL_ERROR', 'Failed to process message');
			}
		};

		socket.onclose = (event) => {
			this.handleDisconnection(connection, event.code, event.reason);
		};

		socket.onerror = (error) => {
			this.emit('error', new Error(`WebSocket error: ${error}`), connection);
		};
	}

	/**
	 * Handle subscription request
	 */
	private async handleSubscribe(
		connection: ClientConnection,
		message: SubscriptionMessage,
	): Promise<void> {
		try {
			const { subscriptionType, filter } = message.payload;

			// Create subscription key
			const subscriptionKey = this.createSubscriptionKey(subscriptionType, filter);

			// Add to client subscriptions
			connection.subscriptions.add(subscriptionKey);

			// Add to global subscriptions
			if (!this.subscriptions.has(subscriptionKey)) {
				this.subscriptions.set(subscriptionKey, new Set());
			}
			this.subscriptions.get(subscriptionKey)?.add(connection.id);

			this.emit('subscription', connection, 'subscribe', subscriptionKey);

			// Confirm subscription
			this.sendMessage(connection, {
				type: 'subscribed',
				payload: { subscriptionType, filter },
				timestamp: new Date().toISOString(),
			});
		} catch (_error) {
			this.sendError(connection, 'SUBSCRIPTION_FAILED', 'Failed to subscribe');
		}
	}

	/**
	 * Handle unsubscribe request
	 */
	private async handleUnsubscribe(
		connection: ClientConnection,
		message: SubscriptionMessage,
	): Promise<void> {
		try {
			const { subscriptionType, filter } = message.payload;
			const subscriptionKey = this.createSubscriptionKey(subscriptionType, filter);

			// Remove from client subscriptions
			connection.subscriptions.delete(subscriptionKey);

			// Remove from global subscriptions
			const subscribers = this.subscriptions.get(subscriptionKey);
			if (subscribers) {
				subscribers.delete(connection.id);
				if (subscribers.size === 0) {
					this.subscriptions.delete(subscriptionKey);
				}
			}

			this.emit('subscription', connection, 'unsubscribe', subscriptionKey);

			// Confirm unsubscription
			this.sendMessage(connection, {
				type: 'unsubscribed',
				payload: { subscriptionType, filter },
				timestamp: new Date().toISOString(),
			});
		} catch (_error) {
			this.sendError(connection, 'UNSUBSCRIBE_FAILED', 'Failed to unsubscribe');
		}
	}

	/**
	 * Handle ping message
	 */
	private handlePing(connection: ClientConnection): void {
		this.sendMessage(connection, {
			type: 'pong',
			payload: {
				pingTimestamp: new Date().toISOString(),
				timestamp: new Date().toISOString(),
			},
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Handle disconnection
	 */
	private handleDisconnection(connection: ClientConnection, code: number, reason: string): void {
		// Remove from connections
		this.connections.delete(connection.id);

		// Remove from user connections
		this.removeUserConnection(connection.user.userId, connection.id);

		// Clean up subscriptions
		for (const subscription of connection.subscriptions) {
			const subscribers = this.subscriptions.get(subscription);
			if (subscribers) {
				subscribers.delete(connection.id);
				if (subscribers.size === 0) {
					this.subscriptions.delete(subscription);
				}
			}
		}

		this.emit('disconnection', connection, code, reason);
	}

	/**
	 * Publish LangGraph update to subscribed clients
	 */
	async publishLangGraphUpdate(update: LangGraphUpdate): Promise<void> {
		this.emit('langgraph-update', update);

		const subscriptionKey = this.createSubscriptionKey('langgraph', {
			executionId: update.executionId,
		});
		const subscribers = this.subscriptions.get(subscriptionKey);

		if (subscribers) {
			const message: WebSocketMessage = {
				type: 'langgraph-update',
				payload: update,
				timestamp: new Date().toISOString(),
			};

			for (const connectionId of subscribers) {
				const connection = this.connections.get(connectionId);
				if (connection) {
					this.sendMessage(connection, message);
				}
			}
		}
	}

	/**
	 * Send message to specific client
	 */
	sendMessage(connection: ClientConnection, message: WebSocketMessage): void {
		try {
			if (connection.socket.readyState === WebSocket.OPEN) {
				connection.socket.send(JSON.stringify(message));
				this.messageCount.sent++;
				connection.lastActivityAt = new Date().toISOString();
			}
		} catch (error) {
			this.emit('error', error as Error, connection);
		}
	}

	/**
	 * Send error message to client
	 */
	sendError(connection: ClientConnection, code: string, message: string, details?: unknown): void {
		const errorMessage: ErrorMessage = {
			type: 'error',
			payload: { code, message, details },
			timestamp: new Date().toISOString(),
		};
		this.sendMessage(connection, errorMessage);
	}

	/**
	 * Broadcast message to all connections
	 */
	broadcast(message: WebSocketMessage, filter?: (conn: ClientConnection) => boolean): void {
		for (const connection of this.connections.values()) {
			if (!filter || filter(connection)) {
				this.sendMessage(connection, message);
			}
		}
	}

	/**
	 * Get connection statistics
	 */
	getStats(): ConnectionStats {
		const connectionsByUser: Record<string, number> = {};
		for (const [userId, connectionIds] of this.userConnections) {
			connectionsByUser[userId] = connectionIds.size;
		}

		let totalSubscriptions = 0;
		for (const subscribers of this.subscriptions.values()) {
			totalSubscriptions += subscribers.size;
		}

		return {
			totalConnections: this.connections.size,
			connectionsByUser,
			totalSubscriptions,
			messageCount: this.messageCount,
			uptime: Math.floor((Date.now() - this.startTime) / 1000),
		};
	}

	/**
	 * Close connection with code and reason
	 */
	private closeConnection(socket: WebSocket, code: number, reason: string): void {
		try {
			if (socket.readyState === WebSocket.OPEN) {
				socket.close(code, reason);
			}
		} catch (error) {
			this.emit('error', error as Error);
		}
	}

	/**
	 * Get user connection count
	 */
	private getUserConnectionCount(userId: string): number {
		return this.userConnections.get(userId)?.size || 0;
	}

	/**
	 * Add user connection
	 */
	private addUserConnection(userId: string, connectionId: string): void {
		if (!this.userConnections.has(userId)) {
			this.userConnections.set(userId, new Set());
		}
		this.userConnections.get(userId)?.add(connectionId);
	}

	/**
	 * Remove user connection
	 */
	private removeUserConnection(userId: string, connectionId: string): void {
		const connections = this.userConnections.get(userId);
		if (connections) {
			connections.delete(connectionId);
			if (connections.size === 0) {
				this.userConnections.delete(userId);
			}
		}
	}

	/**
	 * Create subscription key
	 */
	private createSubscriptionKey(type: string, filter?: Record<string, unknown>): string {
		if (!filter || Object.keys(filter).length === 0) {
			return type;
		}
		return `${type}:${JSON.stringify(filter)}`;
	}

	/**
	 * Set up ping interval
	 */
	private setupPingInterval(): void {
		// Only set up ping interval if it's greater than 0
		if (this.options.pingInterval > 0) {
			this.pingInterval = setInterval(() => {
				const pingMessage: WebSocketMessage = {
					type: 'ping',
					payload: { timestamp: new Date().toISOString() },
					timestamp: new Date().toISOString(),
				};

				this.broadcast(pingMessage);
			}, this.options.pingInterval);
		}
	}

	/**
	 * Close all connections and shutdown server
	 */
	close(): void {
		// Clear ping interval
		if (this.pingInterval) {
			clearInterval(this.pingInterval);
		}

		// Close all connections
		for (const connection of this.connections.values()) {
			this.closeConnection(connection.socket, 1001, 'Server shutting down');
		}

		// Clear collections
		this.connections.clear();
		this.userConnections.clear();
		this.subscriptions.clear();

		this.emit('close');
	}

	/**
	 * Get all active connections
	 */
	getConnections(): ClientConnection[] {
		return Array.from(this.connections.values());
	}

	/**
	 * Get connection by ID
	 */
	getConnection(id: string): ClientConnection | undefined {
		return this.connections.get(id);
	}
}
