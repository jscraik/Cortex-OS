import { EventEmitter } from 'node:events';
import type { LangGraphUpdate, WebSocketMessage } from './types';

interface WebSocketClientOptions {
	/** WebSocket URL */
	readonly url: string;
	/** Authentication token */
	readonly token: string;
	/** Reconnection settings */
	readonly reconnection?: {
		/** Maximum reconnection attempts */
		readonly maxAttempts?: number;
		/** Initial delay in milliseconds */
		readonly initialDelay?: number;
		/** Maximum delay in milliseconds */
		readonly maxDelay?: number;
		/** Backoff multiplier */
		readonly backoffMultiplier?: number;
	};
	/** Connection timeout in milliseconds */
	readonly connectionTimeout?: number;
	/** Auto-subscriptions on connect */
	readonly autoSubscriptions?: Array<{
		readonly type: string;
		readonly filter?: Record<string, unknown>;
	}>;
}

/**
 * WebSocket Client with automatic reconnection and subscription management
 */
export class WebSocketClient extends EventEmitter {
	private options: Required<WebSocketClientOptions>;
	private socket: WebSocket | null = null;
	private reconnectAttempts = 0;
	private reconnectTimeout?: NodeJS.Timeout;
	private isConnected = false;
	private explicitDisconnect = false;
	private subscriptions: Set<string> = new Set();
	private messageQueue: WebSocketMessage[] = [];

	constructor(options: WebSocketClientOptions) {
		super();

		this.options = {
			reconnection: {
				maxAttempts: 5,
				initialDelay: 1000,
				maxDelay: 30000,
				backoffMultiplier: 2,
			},
			connectionTimeout: 10000,
			autoSubscriptions: [],
			...options,
		};

		// Connect automatically
		this.connect();
	}

	/**
	 * Connect to WebSocket server
	 */
	connect(): void {
		if (this.socket && this.socket.readyState === WebSocket.OPEN) {
			return;
		}

		this.explicitDisconnect = false;
		this.socket = new WebSocket(`${this.options.url}?token=${this.options.token}`);

		// Set up connection timeout
		const timeout = setTimeout(() => {
			if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
				this.socket.close();
				this.emit('error', new Error('Connection timeout'));
			}
		}, this.options.connectionTimeout);

		this.socket.onopen = () => {
			clearTimeout(timeout);
			this.isConnected = true;
			this.reconnectAttempts = 0;
			this.emit('connect');

			// Resubscribe to previous subscriptions
			this.resubscribe();

			// Send queued messages
			this.flushMessageQueue();

			// Set up auto-subscriptions
			this.setupAutoSubscriptions();
		};

		this.socket.onmessage = (event) => {
			try {
				const message = JSON.parse(event.data.toString()) as WebSocketMessage;
				this.handleMessage(message);
			} catch {
				this.emit('error', new Error('Failed to parse message'));
			}
		};

		this.socket.onclose = (event) => {
			clearTimeout(timeout);
			this.isConnected = false;
			this.emit('disconnect', event.code, event.reason);

			// Attempt reconnection if not explicit disconnect
			if (
				!this.explicitDisconnect &&
				this.options.reconnection.maxAttempts &&
				this.reconnectAttempts < this.options.reconnection.maxAttempts
			) {
				this.scheduleReconnect();
			}
		};

		this.socket.onerror = (error) => {
			this.emit('error', new Error(`WebSocket error: ${error}`));
		};
	}

	/**
	 * Disconnect from server
	 */
	disconnect(code = 1000, reason = ''): void {
		this.explicitDisconnect = true;
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
		}
		if (this.socket) {
			this.socket.close(code, reason);
		}
	}

	/**
	 * Send message to server
	 */
	send(message: WebSocketMessage): void {
		if (this.isConnected && this.socket) {
			try {
				this.socket.send(JSON.stringify(message));
			} catch (error) {
				this.emit('error', error as Error);
			}
		} else {
			// Queue message for when connected
			this.messageQueue.push(message);
		}
	}

	/**
	 * Subscribe to updates
	 */
	subscribe(type: string, filter?: Record<string, unknown>): void {
		const subscriptionKey = this.createSubscriptionKey(type, filter);
		this.subscriptions.add(subscriptionKey);

		this.send({
			type: 'subscribe',
			payload: { subscriptionType: type, filter },
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Unsubscribe from updates
	 */
	unsubscribe(type: string, filter?: Record<string, unknown>): void {
		const subscriptionKey = this.createSubscriptionKey(type, filter);
		this.subscriptions.delete(subscriptionKey);

		this.send({
			type: 'unsubscribe',
			payload: { subscriptionType: type, filter },
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Subscribe to LangGraph execution updates
	 */
	subscribeToExecution(executionId: string): void {
		this.subscribe('langgraph', { executionId });
	}

	/**
	 * Unsubscribe from LangGraph execution updates
	 */
	unsubscribeFromExecution(executionId: string): void {
		this.unsubscribe('langgraph', { executionId });
	}

	/**
	 * Get connection status
	 */
	get connected(): boolean {
		return this.isConnected;
	}

	/**
	 * Handle incoming messages
	 */
	private handleMessage(message: WebSocketMessage): void {
		switch (message.type) {
			case 'connected':
				this.emit('connected', message.payload);
				break;
			case 'subscribed':
				this.emit('subscribed', message.payload);
				break;
			case 'unsubscribed':
				this.emit('unsubscribed', message.payload);
				break;
			case 'langgraph-update':
				this.emit('langgraph-update', message.payload as LangGraphUpdate);
				break;
			case 'error':
				this.emit('server-error', message.payload);
				break;
			case 'ping':
				// Respond to ping
				this.send({
					type: 'pong',
					payload: {
						pingTimestamp: (message.payload as any).timestamp,
						timestamp: new Date().toISOString(),
					},
					timestamp: new Date().toISOString(),
				});
				break;
			default:
				this.emit('message', message);
		}
	}

	/**
	 * Schedule reconnection attempt
	 */
	private scheduleReconnect(): void {
		const { reconnection } = this.options;
		const delay = Math.min(
			(reconnection.initialDelay || 1000) *
				(reconnection.backoffMultiplier || 2) ** this.reconnectAttempts,
			reconnection.maxDelay || 30000,
		);

		this.emit('reconnecting', {
			attempt: this.reconnectAttempts + 1,
			delay,
		});

		this.reconnectTimeout = setTimeout(() => {
			this.reconnectAttempts++;
			this.connect();
		}, delay);
	}

	/**
	 * Resubscribe to all subscriptions
	 */
	private resubscribe(): void {
		for (const subscription of this.subscriptions) {
			const [type, filterStr] = subscription.split(':');
			const filter = filterStr ? JSON.parse(filterStr) : undefined;
			this.send({
				type: 'subscribe',
				payload: { subscriptionType: type, filter },
				timestamp: new Date().toISOString(),
			});
		}
	}

	/**
	 * Send queued messages
	 */
	private flushMessageQueue(): void {
		while (this.messageQueue.length > 0) {
			const message = this.messageQueue.shift();
			if (message) {
				this.send(message);
			}
		}
	}

	/**
	 * Set up auto-subscriptions
	 */
	private setupAutoSubscriptions(): void {
		for (const subscription of this.options.autoSubscriptions) {
			this.subscribe(subscription.type, subscription.filter);
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
}
