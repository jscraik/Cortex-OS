import { z } from 'zod';

// Define schemas locally until contracts package integration is fixed
const isoTimestamp = z.string().datetime({ offset: true });

const RealtimeMemoryNamespaceSchema = z
	.string()
	.min(1)
	.max(64)
	.regex(/^[a-zA-Z0-9_-]+$/, 'Namespaces must be alphanumeric plus dash/underscore.');

const RealtimeMemoryEventTypeSchema = z
	.string()
	.min(1)
	.max(128)
	.regex(/^[a-zA-Z0-9_.:-]+$/, 'Event types must be namespaced identifiers.');

const RealtimeMemoryChangeEventSchema = z.object({
	type: z.enum(['create', 'update', 'delete']),
	memory: z.record(z.unknown()).optional(),
	previousMemory: z.record(z.unknown()).optional(),
	memoryId: z.string().optional(),
	timestamp: isoTimestamp,
	namespace: RealtimeMemoryNamespaceSchema,
	version: z.string().optional(),
});

const RealtimeMemoryInboundMessageSchema = z.discriminatedUnion('type', [
	z.object({ 
		type: z.literal('subscribe'), 
		namespace: RealtimeMemoryNamespaceSchema,
		eventTypes: z.array(RealtimeMemoryEventTypeSchema).optional(),
		replaySince: isoTimestamp.optional()
	}),
	z.object({ type: z.literal('unsubscribe'), namespace: RealtimeMemoryNamespaceSchema }),
	z.object({ type: z.literal('ping'), timestamp: isoTimestamp.optional() }),
]);

const RealtimeMemoryOutboundMessageSchema = z.discriminatedUnion('type', [
	z.object({ 
		type: z.literal('connected'), 
		connectionId: z.string(), 
		message: z.string(), 
		timestamp: isoTimestamp,
		server: z.object({
			host: z.string().optional(),
			port: z.number().optional(),
		}).optional()
	}),
	z.object({ 
		type: z.literal('subscriptions_restored'), 
		subscriptions: z.array(RealtimeMemoryNamespaceSchema), 
		timestamp: isoTimestamp 
	}),
	z.object({ type: z.literal('subscribed'), namespace: RealtimeMemoryNamespaceSchema, timestamp: isoTimestamp }),
	z.object({ type: z.literal('unsubscribed'), namespace: RealtimeMemoryNamespaceSchema, timestamp: isoTimestamp }),
	z.object({ type: z.literal('change'), event: RealtimeMemoryChangeEventSchema, namespace: RealtimeMemoryNamespaceSchema, timestamp: isoTimestamp }),
	z.object({ 
		type: z.literal('error'), 
		message: z.string(), 
		timestamp: isoTimestamp,
		code: z.string().optional(),
		details: z.record(z.unknown()).optional()
	}),
	z.object({ 
		type: z.literal('warning'), 
		message: z.string(), 
		timestamp: isoTimestamp,
		code: z.string().optional(),
		details: z.record(z.unknown()).optional()
	}),
	z.object({ type: z.literal('pong'), timestamp: isoTimestamp }),
]);

const RealtimeMemoryQueuedMessageSchema = z.object({
	namespace: RealtimeMemoryNamespaceSchema,
	payload: RealtimeMemoryOutboundMessageSchema,
	timestamp: isoTimestamp,
	expiresAt: isoTimestamp.optional(),
});

const RealtimeMemoryConnectionMetricsSchema = z.object({
	messagesSent: z.number().int().nonnegative(),
	messagesReceived: z.number().int().nonnegative(),
	bytesSent: z.number().int().nonnegative(),
	bytesReceived: z.number().int().nonnegative(),
	queueDepth: z.number().int().nonnegative(),
});

const RealtimeMemoryConnectionStateSchema = z.object({
	connectionId: z.string().min(1),
	status: z.enum(['connecting', 'connected', 'authenticated', 'subscribed', 'closed']),
	subscriptions: z.array(RealtimeMemoryNamespaceSchema),
	connectedAt: isoTimestamp,
	lastActivityAt: isoTimestamp.optional(),
	isReconnecting: z.boolean().optional(),
	metrics: RealtimeMemoryConnectionMetricsSchema.optional(),
});

const RealtimeMemoryConnectionSummarySchema = RealtimeMemoryConnectionStateSchema.extend({
	metrics: RealtimeMemoryConnectionMetricsSchema,
});

const RealtimeMemoryMetricsSnapshotSchema = z.object({
	snapshotId: z.string().min(1),
	brand: z.literal('brAInwav'),
	source: z.string().min(1),
	timestamp: isoTimestamp,
	description: z.string().min(1),
	reason: z.string().min(1),
	aggregate: z.object({
		totalConnections: z.number().int().nonnegative(),
		activeConnections: z.number().int().nonnegative(),
		reconnections: z.number().int().nonnegative(),
		messagesSent: z.number().int().nonnegative(),
		messagesReceived: z.number().int().nonnegative(),
		bytesSent: z.number().int().nonnegative(),
		bytesReceived: z.number().int().nonnegative(),
		lastActivityAt: isoTimestamp.optional(),
		connectionTimestamps: z.array(isoTimestamp),
	}),
	connections: z.array(RealtimeMemoryConnectionSummarySchema),
});

// Export types for use in the file
type RealtimeMemoryConnectionState = z.infer<typeof RealtimeMemoryConnectionStateSchema>;
type RealtimeMemoryInboundMessage = z.infer<typeof RealtimeMemoryInboundMessageSchema>;
type RealtimeMemoryOutboundMessage = z.infer<typeof RealtimeMemoryOutboundMessageSchema>;
type RealtimeMemoryQueuedMessage = z.infer<typeof RealtimeMemoryQueuedMessageSchema>;
type RealtimeMemoryMetricsSnapshot = z.infer<typeof RealtimeMemoryMetricsSnapshotSchema>;

import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import type { RawData } from 'ws';
import { WebSocket, WebSocketServer } from 'ws';
import type { ChangeEvent, StreamingMemoryStore } from './store.streaming.js';

type RequestContext = {
	url?: string;
	headers?: Record<string, unknown>;
	socket?: { remoteAddress?: string };
};

const nowIso = (): string => new Date().toISOString();

const readHeader = (
	headers: Record<string, unknown> | undefined,
	key: string,
): string | undefined => {
	const value = headers?.[key];
	return typeof value === 'string' ? value : undefined;
};

const isArrayBufferView = (value: unknown): value is ArrayBufferView => ArrayBuffer.isView(value);

const bufferFromRawData = (input: RawData | ArrayBufferView): Buffer => {
	if (typeof input === 'string') {
		return Buffer.from(input, 'utf8');
	}
	if (Buffer.isBuffer(input)) {
		return input;
	}
	if (Array.isArray(input)) {
		return Buffer.concat(input.map((item) => bufferFromRawData(item)));
	}
	if (input instanceof ArrayBuffer) {
		return Buffer.from(input);
	}
	if (isArrayBufferView(input)) {
		return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
	}
	return Buffer.from(input as ArrayBuffer);
};

const rawDataToString = (data: RawData): string => bufferFromRawData(data).toString('utf8');

const normalizeCloseReason = (reason?: RawData): string => {
	if (typeof reason === 'undefined') {
		return '';
	}
	if (typeof reason === 'string') {
		return reason;
	}
	if (Buffer.isBuffer(reason)) {
		return reason.toString('utf8');
	}
	return rawDataToString(reason);
};

const createConnectionMetrics = () =>
	RealtimeMemoryConnectionMetricsSchema.parse({
		messagesSent: 0,
		messagesReceived: 0,
		bytesSent: 0,
		bytesReceived: 0,
		queueDepth: 0,
	});

type ConnectionStateMetrics = ReturnType<typeof createConnectionMetrics>;

type MetricsPublisher = {
	publishRealtimeMetrics(snapshot: RealtimeMemoryMetricsSnapshot): Promise<void>;
};

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
	perMessageDeflate?:
		| {
				zlibDeflateOptions?: {
					level?: number;
				};
				zlibInflateOptions?: {
					chunkSize?: number;
				};
				threshold?: number;
		  }
		| boolean;
	metricsSnapshotDebounceMs?: number;
	metricsSource?: string;
	metricsDescription?: string;
}

export interface ConnectionInfo {
	id: string;
	ws: WebSocket;
	subscriptions: Set<string>;
	filters: Map<string, Set<string>>;
	lastActivity: number;
	connectedAt: number;
	userAgent?: string;
	remoteAddress?: string;
	state: RealtimeMemoryConnectionState;
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

export class RealtimeMemoryServer extends EventEmitter {
	private wss?: WebSocketServer;
	private readonly connections = new Map<string, ConnectionInfo>();
	private readonly clientQueues = new Map<string, RealtimeMemoryQueuedMessage[]>();
	private pingInterval?: NodeJS.Timeout;
	private readonly metrics: ConnectionMetrics = {
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
	private boundHost?: string;
	private boundPort?: number;
	private metricsPublisher?: MetricsPublisher;
	private metricsDebounceTimer?: NodeJS.Timeout;
	private readonly pendingMetricsReasons = new Set<string>();

	constructor(
		private readonly streamingStore: StreamingMemoryStore,
		private readonly config: ServerConfig = {},
		metricsPublisher?: MetricsPublisher,
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
			metricsSnapshotDebounceMs: 250,
			metricsSource: 'brAInwav.realtime.memory',
			metricsDescription: 'brAInwav RealtimeMemoryServer metrics snapshot',
			...config,
		};
		this.metricsPublisher = metricsPublisher;
	}

	async start(port?: number): Promise<void> {
		if (!port && !this.config.port) {
			throw new Error('Port must be specified');
		}
		const serverPort = port || this.config.port;
		this.boundPort = serverPort;
		this.boundHost = this.config.host ?? 'localhost';

		this.wss = new WebSocketServer({
			port: serverPort,
			host: this.config.host,
			maxPayload: 16 * 1024 * 1024, // 16MB
			perMessageDeflate: this.config.enableCompression ? this.config.perMessageDeflate : false,
		});

		this.wss.on('connection', (ws, req) => this.handleConnection(ws, req as RequestContext));
		this.wss.on('error', (error) => this.handleServerError(error));

		// Start ping interval
		this.pingInterval = setInterval(() => {
			this.pingConnections();
		}, this.config.pingInterval);

		// Subscribe to store changes
		this.streamingStore.subscribeToChanges('*', (change) => this.handleStoreChange(change));

		this.emit('started', { port: serverPort });
	}

	async stop(): Promise<void> {
		this.isShuttingDown = true;

		// Stop ping interval
		if (this.pingInterval) {
			clearInterval(this.pingInterval);
		}
		await this.flushPendingMetrics('shutdown');

		// Close all connections
		const closePromises = Array.from(this.connections.values()).map((connection) => {
			return new Promise<void>((resolve) => {
				const settle = () => resolve();
				if (connection.ws.readyState === WebSocket.CLOSED) {
					settle();
					return;
				}
				connection.ws.once('close', settle);
				if (
					connection.ws.readyState === WebSocket.OPEN ||
					connection.ws.readyState === WebSocket.CLOSING
				) {
					connection.ws.close(1000, 'brAInwav realtime server shutting down');
				}
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

	setMetricsPublisher(publisher?: MetricsPublisher): void {
		this.metricsPublisher = publisher;
		this.pendingMetricsReasons.clear();
		this.cancelMetricsDebounce();
		if (!publisher) {
			return;
		}
		if (this.connections.size > 0) {
			this.scheduleMetricsSnapshot('metrics-publisher-attached');
		}
	}

	private handleConnection(ws: WebSocket, req: RequestContext): void {
		if (this.isShuttingDown) {
			ws.close(1013, 'brAInwav realtime server shutting down');
			return;
		}

		// Check connection limit
		if (this.config.maxConnections && this.connections.size >= this.config.maxConnections) {
			ws.close(1008, 'brAInwav connection limit reached');
			this.metrics.totalConnections++;
			return;
		}

		// Parse query parameters
		const { clientId, token } = this.extractClientCredentials(req);

		// Check authentication if enabled
		if (this.config.enableAuth && token !== this.config.authToken) {
			ws.close(1008, 'brAInwav authentication required');
			this.metrics.totalConnections++;
			return;
		}

		// Check for reconnection
		const existingConnection = this.connections.get(clientId);
		if (existingConnection) {
			this.handleReconnection(existingConnection, ws);
			return;
		}

		// Create new connection
		const connection = this.createConnection(clientId, ws, req);
		this.connections.set(clientId, connection);
		this.metrics.totalConnections++;
		this.metrics.activeConnections++;
		this.metrics.connectionTimestamps.push(Date.now());
		this.metrics.lastActivity = Date.now();

		// Send welcome message
		this.sendConnected(connection);

		// Setup event handlers
		this.registerConnectionHandlers(connection);
		this.emit('connection', connection);
		this.scheduleMetricsSnapshot('connection-established');
	}

	private handleReconnection(connection: ConnectionInfo, ws: WebSocket): void {
		if (connection.ws.readyState === WebSocket.OPEN) {
			connection.ws.close(1000, 'brAInwav realtime connection replaced');
		}

		connection.ws = ws;
		connection.connectedAt = Date.now();
		this.touchConnection(connection);
		connection.state.connectedAt = nowIso();
		connection.state.isReconnecting = true;
		connection.state.status = connection.subscriptions.size > 0 ? 'subscribed' : 'connected';

		this.metrics.reconnections++;
		this.metrics.activeConnections++;
		this.metrics.connectionTimestamps.push(Date.now());

		this.sendToConnection(connection, {
			type: 'subscriptions_restored',
			subscriptions: Array.from(connection.subscriptions),
			timestamp: nowIso(),
		});

		this.registerConnectionHandlers(connection);
		this.sendQueuedMessages(connection.id);
		this.emit('reconnection', connection);
		this.scheduleMetricsSnapshot('connection-reconnected');
	}

	private async handleMessage(clientId: string, data: RawData): Promise<void> {
		const connection = this.connections.get(clientId);
		if (!connection) return;

		const payload = rawDataToString(data);
		const bytes = Buffer.byteLength(payload, 'utf8');
		this.touchConnection(connection);
		this.metrics.messagesReceived++;
		this.metrics.bytesReceived += bytes;
		this.recordInboundMetrics(connection, bytes);

		let parsed: unknown;
		try {
			parsed = JSON.parse(payload);
		} catch {
			this.sendError(connection, 'brAInwav realtime message parsing failed', {
				reason: 'invalid-json',
			});
			return;
		}

		const result = RealtimeMemoryInboundMessageSchema.safeParse(parsed);
		if (!result.success) {
			this.sendError(connection, 'brAInwav realtime schema validation failed', {
				issues: result.error.format(),
			});
			return;
		}

		await this.handleMessageContent(connection, result.data);
	}

	private async handleMessageContent(
		connection: ConnectionInfo,
		message: RealtimeMemoryInboundMessage,
	): Promise<void> {
		switch (message.type) {
			case 'subscribe':
				await this.handleSubscribe(connection, message);
				return;
			case 'unsubscribe':
				this.handleUnsubscribe(connection, message);
				return;
			case 'ping':
				this.handlePing(connection);
				return;
			default:
				this.sendError(connection, 'brAInwav realtime unknown message type', {
					received: (message as { type: string }).type,
				});
		}
	}

	private async handleSubscribe(
		connection: ConnectionInfo,
		message: Extract<RealtimeMemoryInboundMessage, { type: 'subscribe' }>,
	): Promise<void> {
		if (connection.subscriptions.has(message.namespace)) {
			this.sendWarning(connection, 'brAInwav realtime already subscribed');
			return;
		}

		connection.subscriptions.add(message.namespace);
		if (message.eventTypes?.length) {
			connection.filters.set(message.namespace, new Set(message.eventTypes));
		} else {
			connection.filters.delete(message.namespace);
		}
		this.updateSubscriptionsState(connection);

		this.sendToConnection(connection, {
			type: 'subscribed',
			namespace: message.namespace,
			timestamp: nowIso(),
		});

		this.emit('subscribe', {
			clientId: connection.id,
			namespace: message.namespace,
			connection,
		});

		if (message.replaySince) {
			const events = await this.streamingStore.replayChanges(
				message.namespace,
				message.replaySince,
			);
			for (const event of events) {
				this.sendToConnection(connection, this.createChangeMessage(event));
			}
		}

		this.streamingStore.subscribeToChanges(message.namespace, (change) => {
			this.broadcastToConnection(connection.id, change, message.eventTypes);
		});
	}

	private handleUnsubscribe(
		connection: ConnectionInfo,
		message: Extract<RealtimeMemoryInboundMessage, { type: 'unsubscribe' }>,
	): void {
		if (!connection.subscriptions.has(message.namespace)) {
			this.sendWarning(connection, 'brAInwav realtime not subscribed');
			return;
		}

		connection.subscriptions.delete(message.namespace);
		connection.filters.delete(message.namespace);
		this.updateSubscriptionsState(connection);

		this.sendToConnection(connection, {
			type: 'unsubscribed',
			namespace: message.namespace,
			timestamp: nowIso(),
		});

		this.emit('unsubscribe', {
			clientId: connection.id,
			namespace: message.namespace,
			connection,
		});
	}

	private handlePing(connection: ConnectionInfo): void {
		this.sendToConnection(connection, {
			type: 'pong',
			timestamp: nowIso(),
		});
	}

	private handleDisconnection(clientId: string, code: number, reason: string): void {
		const connection = this.connections.get(clientId);
		if (!connection) return;

		this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1);
		connection.state.status = 'closed';
		connection.state.lastActivityAt = nowIso();
		connection.state.isReconnecting = false;

		const queueGracePeriod = this.config.messageQueueTimeout ?? 0;
		if (queueGracePeriod > 0) {
			const existingSocket = connection.ws;
			setTimeout(() => {
				const currentConnection = this.connections.get(clientId);
				if (!currentConnection || currentConnection.ws !== existingSocket) {
					return;
				}
				this.connections.delete(clientId);
				this.clientQueues.delete(clientId);
			}, queueGracePeriod);
		} else {
			this.connections.delete(clientId);
			this.clientQueues.delete(clientId);
		}

		this.emit('disconnection', { clientId, connection, code, reason });
		this.scheduleMetricsSnapshot('connection-closed');
	}

	private handleConnectionError(clientId: string, error: Error): void {
		const connection = this.connections.get(clientId);
		if (!connection) return;

		this.emit('connectionError', { clientId, connection, error });

		if (connection.ws.readyState === WebSocket.OPEN) {
			connection.ws.close(1011, 'brAInwav realtime internal error');
		}
	}

	private handleServerError(error: Error): void {
		this.emit('error', error);
	}

	private handleStoreChange(change: ChangeEvent): void {
		for (const clientId of this.connections.keys()) {
			const connection = this.connections.get(clientId);
			if (connection?.subscriptions.has(change.namespace)) {
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
		if (!connection) {
			this.queueMessage(clientId, change);
			return;
		}

		const filter = eventTypes ? new Set(eventTypes) : connection.filters.get(change.namespace);
		if (filter && !filter.has(change.type)) {
			return;
		}

		if (connection.ws.readyState !== WebSocket.OPEN) {
			this.queueMessage(clientId, change);
			return;
		}

		this.sendToConnection(connection, this.createChangeMessage(change));
	}

	private queueMessage(clientId: string, change: ChangeEvent): void {
		let queue = this.clientQueues.get(clientId);
		if (!queue) {
			queue = [];
			this.clientQueues.set(clientId, queue);
		}

		const ttl = this.config.messageQueueTimeout ?? 0;
		const message = RealtimeMemoryQueuedMessageSchema.parse({
			namespace: change.namespace,
			payload: this.createChangeMessage(change),
			timestamp: nowIso(),
			expiresAt: ttl > 0 ? new Date(Date.now() + ttl).toISOString() : undefined,
		});

		queue.push(message);

		const maxQueueSize = this.config.maxQueueSize ?? 0;
		if (maxQueueSize > 0 && queue.length > maxQueueSize) {
			queue.shift();
		}

		if (ttl > 0) {
			const threshold = Date.now();
			while (queue.length > 0) {
				const head = queue[0];
				if (!head.expiresAt) {
					break;
				}
				if (new Date(head.expiresAt).getTime() >= threshold) {
					break;
				}
				queue.shift();
			}
		}

		const connection = this.connections.get(clientId);
		if (connection) {
			const metrics = this.ensureMetrics(connection);
			metrics.queueDepth = queue.length;
		}
		this.scheduleMetricsSnapshot('queue-updated');
	}

	private sendQueuedMessages(clientId: string): void {
		const queue = this.clientQueues.get(clientId);
		if (!queue?.length) {
			return;
		}

		const connection = this.connections.get(clientId);
		if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
			return;
		}

		const now = Date.now();
		for (const message of queue) {
			if (message.expiresAt && new Date(message.expiresAt).getTime() < now) {
				continue;
			}
			this.sendToConnection(connection, message.payload);
		}

		queue.length = 0;
		const metrics = this.ensureMetrics(connection);
		metrics.queueDepth = 0;
		this.scheduleMetricsSnapshot('queue-flushed');
	}

	private sendToConnection(
		connection: ConnectionInfo,
		message: RealtimeMemoryOutboundMessage,
	): void {
		if (connection.ws.readyState !== WebSocket.OPEN) return;

		const validation = RealtimeMemoryOutboundMessageSchema.safeParse(message);
		if (!validation.success) {
			this.emit('sendError', {
				ws: connection.ws,
				message,
				error: validation.error,
			});
			return;
		}

		const payload = JSON.stringify(validation.data);
		connection.ws.send(payload);
		const bytes = Buffer.byteLength(payload, 'utf8');
		this.metrics.messagesSent++;
		this.metrics.bytesSent += bytes;
		const metrics = this.ensureMetrics(connection);
		metrics.messagesSent += 1;
		metrics.bytesSent += bytes;
		this.scheduleMetricsSnapshot('message-sent');
	}

	private pingConnections(): void {
		const now = Date.now();
		const timeout = this.config.connectionTimeout ?? 0;

		for (const connection of this.connections.values()) {
			if (timeout > 0 && now - connection.lastActivity > timeout) {
				// Close stale connection
				connection.ws.close(1000, 'brAInwav realtime connection timeout');
				continue;
			}

			// Send ping
			if (connection.ws.readyState === WebSocket.OPEN) {
				connection.ws.ping();
			}
		}
	}

	private generateClientId(): string {
		return `client_${randomUUID()}`;
	}

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

	broadcastToNamespace(namespace: string, message: RealtimeMemoryOutboundMessage): void {
		for (const connection of this.connections.values()) {
			if (connection.subscriptions.has(namespace)) {
				this.sendToConnection(connection, message);
			}
		}
	}

	broadcastToAll(message: RealtimeMemoryOutboundMessage): void {
		for (const connection of this.connections.values()) {
			this.sendToConnection(connection, message);
		}
	}

	disconnectClient(clientId: string, reason?: string): void {
		const connection = this.connections.get(clientId);
		if (connection) {
			connection.ws.close(1000, reason || 'brAInwav realtime disconnect');
		}
	}

	isRunning(): boolean {
		return this.wss !== undefined;
	}

	private extractClientCredentials(req: RequestContext): {
		clientId: string;
		token?: string;
	} {
		const hostHeader =
			readHeader(req.headers, 'host') ?? `${this.boundHost ?? 'localhost'}:${this.boundPort ?? ''}`;
		const url = new URL(req.url ?? '/', `http://${hostHeader}`);
		return {
			clientId: url.searchParams.get('clientId') ?? this.generateClientId(),
			token: url.searchParams.get('token') ?? undefined,
		};
	}

	private createConnection(id: string, ws: WebSocket, req: RequestContext): ConnectionInfo {
		const client = {
			userAgent: readHeader(req.headers, 'user-agent'),
			remoteAddress:
				typeof req.socket?.remoteAddress === 'string' ? req.socket.remoteAddress : undefined,
		};

		const state = RealtimeMemoryConnectionStateSchema.parse({
			connectionId: id,
			status: 'connected',
			subscriptions: [],
			connectedAt: nowIso(),
			lastActivityAt: nowIso(),
			client: client.userAgent || client.remoteAddress ? client : undefined,
			metrics: createConnectionMetrics(),
		});

		return {
			id,
			ws,
			subscriptions: new Set(),
			filters: new Map(),
			lastActivity: Date.now(),
			connectedAt: Date.now(),
			userAgent: client.userAgent,
			remoteAddress: client.remoteAddress,
			state,
		};
	}

	private registerConnectionHandlers(connection: ConnectionInfo): void {
		const { id, ws } = connection;
		ws.on('message', (data) => {
			void this.handleMessage(id, data);
		});
		ws.on('close', (code, reason) => {
			this.handleDisconnection(id, code, normalizeCloseReason(reason));
		});
		ws.on('error', (error) => this.handleConnectionError(id, error));
		ws.on('pong', () => this.handlePong(connection));
	}

	private handlePong(connection: ConnectionInfo): void {
		this.touchConnection(connection);
	}

	private sendConnected(connection: ConnectionInfo): void {
		this.sendToConnection(connection, {
			type: 'connected',
			connectionId: connection.id,
			message: 'Connected to brAInwav RealtimeMemoryServer',
			timestamp: nowIso(),
			server:
				this.boundPort !== undefined
					? {
							host: this.boundHost ?? 'localhost',
							port: this.boundPort,
						}
					: undefined,
		});
	}

	private createChangeMessage(change: ChangeEvent): RealtimeMemoryOutboundMessage {
		const event = RealtimeMemoryChangeEventSchema.parse(change);
		return {
			type: 'change',
			event,
			namespace: change.namespace,
			timestamp: nowIso(),
		};
	}

	private updateSubscriptionsState(connection: ConnectionInfo): void {
		connection.state.subscriptions = Array.from(connection.subscriptions);
		connection.state.status = connection.subscriptions.size > 0 ? 'subscribed' : 'connected';
	}

	private touchConnection(connection: ConnectionInfo): void {
		connection.lastActivity = Date.now();
		this.metrics.lastActivity = connection.lastActivity;
		connection.state.lastActivityAt = nowIso();
	}

	private recordInboundMetrics(connection: ConnectionInfo, bytes: number): void {
		const metrics = this.ensureMetrics(connection);
		metrics.messagesReceived += 1;
		metrics.bytesReceived += bytes;
		this.scheduleMetricsSnapshot('message-received');
	}

	private ensureMetrics(connection: ConnectionInfo): ConnectionStateMetrics {
		if (!connection.state.metrics) {
			connection.state.metrics = createConnectionMetrics();
		}
		return connection.state.metrics;
	}

	private sendError(
		connection: ConnectionInfo,
		message: string,
		details?: Record<string, unknown>,
	): void {
		this.sendToConnection(connection, {
			type: 'error',
			message,
			timestamp: nowIso(),
			details,
		});
	}

	private sendWarning(connection: ConnectionInfo, message: string): void {
		this.sendToConnection(connection, {
			type: 'warning',
			message,
			timestamp: nowIso(),
		});
	}

	private scheduleMetricsSnapshot(reason: string): void {
		if (!this.metricsPublisher) {
			return;
		}
		this.pendingMetricsReasons.add(reason);
		if (this.metricsDebounceTimer) {
			return;
		}
		const debounceMs = this.config.metricsSnapshotDebounceMs ?? 250;
		this.metricsDebounceTimer = setTimeout(() => {
			this.metricsDebounceTimer = undefined;
			const reasons = Array.from(this.pendingMetricsReasons);
			this.pendingMetricsReasons.clear();
			if (reasons.length === 0) {
				return;
			}
			void this.publishMetricsSnapshot(reasons);
		}, debounceMs);
	}

	private async flushPendingMetrics(extraReason?: string): Promise<void> {
		if (!this.metricsPublisher) {
			this.pendingMetricsReasons.clear();
			this.cancelMetricsDebounce();
			return;
		}
		const reasons = new Set(this.pendingMetricsReasons);
		if (extraReason) {
			reasons.add(extraReason);
		}
		this.pendingMetricsReasons.clear();
		this.cancelMetricsDebounce();
		if (reasons.size === 0) {
			return;
		}
		await this.publishMetricsSnapshot(Array.from(reasons));
	}

	private cancelMetricsDebounce(): void {
		if (!this.metricsDebounceTimer) {
			return;
		}
		clearTimeout(this.metricsDebounceTimer);
		this.metricsDebounceTimer = undefined;
	}

	private async publishMetricsSnapshot(reasons: string[]): Promise<void> {
		if (!this.metricsPublisher) {
			return;
		}
		const timestamp = nowIso();
		const snapshot = this.createMetricsSnapshot(reasons, timestamp);
		try {
			await this.metricsPublisher.publishRealtimeMetrics(snapshot);
		} catch (error) {
			this.emit('metricsError', { error, snapshot });
		}
	}

	private createMetricsSnapshot(
		reasons: string[],
		timestamp: string,
	): RealtimeMemoryMetricsSnapshot {
		const aggregate = this.buildAggregateMetrics();
		const connections = this.buildConnectionSummaries();
		const snapshot = {
			snapshotId: `metrics-${randomUUID()}`,
			brand: 'brAInwav' as const,
			source: this.config.metricsSource ?? 'brAInwav.realtime.memory',
			timestamp,
			description:
				this.config.metricsDescription ?? 'brAInwav RealtimeMemoryServer metrics snapshot',
			reason: reasons.length > 0 ? reasons.join('|') : 'unspecified',
			aggregate,
			connections,
		};
		return RealtimeMemoryMetricsSnapshotSchema.parse(snapshot);
	}

	private buildAggregateMetrics(): RealtimeMemoryMetricsSnapshot['aggregate'] {
		const lastActivityAt =
			typeof this.metrics.lastActivity === 'number'
				? new Date(this.metrics.lastActivity).toISOString()
				: undefined;
		const connectionTimestamps = this.metrics.connectionTimestamps.map((value) =>
			new Date(value).toISOString(),
		);
		return {
			totalConnections: this.metrics.totalConnections,
			activeConnections: this.metrics.activeConnections,
			reconnections: this.metrics.reconnections,
			messagesSent: this.metrics.messagesSent,
			messagesReceived: this.metrics.messagesReceived,
			bytesSent: this.metrics.bytesSent,
			bytesReceived: this.metrics.bytesReceived,
			lastActivityAt,
			connectionTimestamps,
		};
	}

	private buildConnectionSummaries(): RealtimeMemoryMetricsSnapshot['connections'] {
		const summaries: RealtimeMemoryMetricsSnapshot['connections'] = [];
		for (const connection of this.connections.values()) {
			const metrics = { ...this.ensureMetrics(connection) };
			const summary = RealtimeMemoryConnectionSummarySchema.parse({
				...connection.state,
				metrics,
			});
			summaries.push(summary);
		}
		return summaries;
	}
}
