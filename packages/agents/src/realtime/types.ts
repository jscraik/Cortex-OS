/**
 * Core types for the WebSocket system
 */

export interface WebSocketMessage {
	/** Message type identifier */
	readonly type: string;
	/** Message payload */
	readonly payload: unknown;
	/** Message timestamp */
	readonly timestamp?: string;
	/** Message ID for correlation */
	readonly id?: string;
}

export interface AuthenticatedUser {
	/** Unique user identifier */
	readonly userId: string;
	/** User permissions */
	readonly permissions: string[];
	/** Additional user attributes */
	readonly attributes?: Record<string, unknown>;
	/** Session expiration time */
	readonly expiresAt?: string;
}

export interface WebSocketServerOptions {
	/** Port to listen on */
	readonly port: number;
	/** WebSocket path */
	readonly path: string;
	/** Authentication function */
	readonly authenticate: (token: string) => Promise<AuthenticatedUser>;
	/** Maximum connections per user */
	readonly maxConnectionsPerUser?: number;
	/** Message size limit in bytes */
	readonly maxMessageSize?: number;
	/** Ping interval in milliseconds */
	readonly pingInterval?: number;
	/** Connection timeout in milliseconds */
	readonly connectionTimeout?: number;
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
	/** Pub/Sub settings */
	readonly pubSub?: {
		/** Enable Redis-backed pub/sub for scaling */
		readonly enabled?: boolean;
		/** Redis connection string */
		readonly redisUrl?: string;
		/** Channel prefix */
		readonly channelPrefix?: string;
	};
}

export interface ClientConnection {
	/** WebSocket instance */
	readonly socket: WebSocket;
	/** Authenticated user info */
	readonly user: AuthenticatedUser;
	/** Connection ID */
	readonly id: string;
	/** Connected timestamp */
	readonly connectedAt: string;
	/** Last activity timestamp */
	lastActivityAt: string; // Made mutable for internal updates
	/** Active subscriptions */
	readonly subscriptions: Set<string>;
	/** Client metadata */
	readonly metadata?: Record<string, unknown>;
}

export interface LangGraphUpdate {
	/** Execution ID */
	readonly executionId: string;
	/** Node ID */
	readonly nodeId?: string;
	/** Execution status */
	readonly status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
	/** Node output if any */
	readonly output?: unknown;
	/** Error if any */
	readonly error?: string;
	/** Progress percentage */
	readonly progress?: number;
	/** Timestamp */
	readonly timestamp: string;
}

export interface SubscriptionMessage extends WebSocketMessage {
	readonly type: 'subscribe' | 'unsubscribe';
	readonly payload: {
		/** Subscription type */
		readonly subscriptionType: string;
		/** Subscription filter */
		readonly filter?: Record<string, unknown>;
	};
}

export interface ErrorMessage extends WebSocketMessage {
	readonly type: 'error';
	readonly payload: {
		/** Error code */
		readonly code: string;
		/** Error message */
		readonly message: string;
		/** Error details */
		readonly details?: unknown;
	};
}

export interface PingMessage extends WebSocketMessage {
	readonly type: 'ping';
	readonly payload: {
		/** Timestamp */
		readonly timestamp: string;
	};
}

export interface PongMessage extends WebSocketMessage {
	readonly type: 'pong';
	readonly payload: {
		/** Original ping timestamp */
		readonly pingTimestamp: string;
		/** Current timestamp */
		readonly timestamp: string;
	};
}

export interface ConnectionStats {
	/** Total connected clients */
	readonly totalConnections: number;
	/** Connections by user */
	readonly connectionsByUser: Record<string, number>;
	/** Total subscriptions */
	readonly totalSubscriptions: number;
	/** Messages sent/received */
	readonly messageCount: {
		readonly sent: number;
		readonly received: number;
	};
	/** Uptime in seconds */
	readonly uptime: number;
}

export interface WebSocketEventMap {
	/** New client connected */
	connection: (client: ClientConnection) => void;
	/** Client disconnected */
	disconnection: (client: ClientConnection, code: number, reason: string) => void;
	/** Message received */
	message: (client: ClientConnection, message: WebSocketMessage) => void;
	/** Error occurred */
	error: (error: Error, client?: ClientConnection) => void;
	/** LangGraph update published */
	'langgraph-update': (update: LangGraphUpdate) => void;
	/** Subscription changed */
	subscription: (
		client: ClientConnection,
		action: 'subscribe' | 'unsubscribe',
		subscription: string,
	) => void;
}

export type WebSocketEventType = keyof WebSocketEventMap;
