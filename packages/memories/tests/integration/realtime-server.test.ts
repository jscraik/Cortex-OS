import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';
import {
        RealtimeMemoryChangeEventSchema,
        type RealtimeMemoryInboundMessage,
        RealtimeMemoryInboundMessageSchema,
        RealtimeMemoryMetricsEventSchema,
        type RealtimeMemoryOutboundMessage,
        RealtimeMemoryOutboundMessageSchema,
} from '../../../../libs/typescript/contracts/src/memory-realtime.js';
import { RealtimeMemoryServer } from '../../src/adapters/server.realtime.js';
import { InMemoryStore } from '../../src/adapters/store.memory.js';
import { StreamingMemoryStore } from '../../src/adapters/store.streaming.js';
import { createMemory } from '../test-utils.js';

type MockHandler = (...args: unknown[]) => void;

const addHandler = (registry: Map<string, MockHandler[]>, event: string, handler: MockHandler) => {
	const handlers = registry.get(event) ?? [];
	handlers.push(handler);
	registry.set(event, handlers);
};

const removeHandler = (
	registry: Map<string, MockHandler[]>,
	event: string,
	handler: MockHandler,
) => {
	const handlers = registry.get(event);
	if (!handlers) return;
	const index = handlers.indexOf(handler);
	if (index >= 0) {
		handlers.splice(index, 1);
	}
};

const invokeHandlers = (
	registry: Map<string, MockHandler[]>,
	event: string,
	...args: unknown[]
) => {
	const handlers = registry.get(event);
	if (!handlers) return;
	for (const handler of handlers) {
		handler(...args);
	}
};

const createMockWebSocket = () => {
	const registry = new Map<string, MockHandler[]>();
	let readyState = 1;

	const send = vi.fn<(payload: string) => void>();
	const close = vi.fn<(code?: number, reason?: string) => void>();
	const ping = vi.fn<() => void>();
	const terminate = vi.fn<() => void>();
	const addEventListener = vi.fn<(event: string, handler: MockHandler) => void>();
	const removeEventListener = vi.fn<(event: string, handler: MockHandler) => void>();
	const on = vi.fn<(event: string, handler: MockHandler) => unknown>();
	const once = vi.fn<(event: string, handler: MockHandler) => unknown>();
	const off = vi.fn<(event: string, handler: MockHandler) => unknown>();
	const emit = vi.fn<(event: string, ...args: unknown[]) => void>();

	const ws = {
		readyState,
		send,
		close,
		ping,
		terminate,
		addEventListener,
		removeEventListener,
		on,
		once,
		off,
		emit,
		_simulateMessage: (data: string | Buffer) => {
			const payload = typeof data === 'string' ? data : Buffer.from(data);
			invokeHandlers(registry, 'message', payload);
		},
		_simulateClose: ({ code, reason }: { code: number; reason?: string }) => {
			ws.readyState = 2;
			const payload = reason ? Buffer.from(reason) : undefined;
			invokeHandlers(registry, 'close', code, payload);
			ws.readyState = 3;
		},
	};

	Object.defineProperty(ws, 'readyState', {
		get: () => readyState,
		set: (state: number) => {
			readyState = state;
		},
		enumerable: true,
		configurable: true,
	});

	close.mockImplementation((code?: number, reason?: string) => {
		ws.readyState = 3;
		const payload = typeof reason === 'string' ? Buffer.from(reason) : reason;
		invokeHandlers(registry, 'close', code ?? 1000, payload);
	});

	addEventListener.mockImplementation((event: string, handler: MockHandler) => {
		addHandler(registry, event, handler);
	});

	removeEventListener.mockImplementation((event: string, handler: MockHandler) => {
		removeHandler(registry, event, handler);
	});

	on.mockImplementation((event: string, handler: MockHandler) => {
		addHandler(registry, event, handler);
		return ws;
	});

	once.mockImplementation((event: string, handler: MockHandler) => {
		const wrapper: MockHandler = (...args: unknown[]) => {
			removeHandler(registry, event, wrapper);
			handler(...args);
		};
		addHandler(registry, event, wrapper);
		return ws;
	});

	emit.mockImplementation((event: string, ...args: unknown[]) => {
		invokeHandlers(registry, event, ...args);
	});

	off.mockImplementation((event: string, handler: MockHandler) => {
		removeHandler(registry, event, handler);
		return ws;
	});

	return ws;
};

type MockWebSocket = ReturnType<typeof createMockWebSocket>;

const createMockWebSocketServer = () => {
	const registry = new Map<string, MockHandler[]>();
	const on = vi.fn<(event: string, handler: MockHandler) => unknown>();
	const emit = vi.fn<(event: string, ...args: unknown[]) => void>();
	const close = vi.fn<(callback?: () => void) => void>();

	const server = {
		on,
		emit,
		close,
		clients: new Set<MockWebSocket>(),
	};

	on.mockImplementation((event: string, handler: MockHandler) => {
		addHandler(registry, event, handler);
		return server;
	});

	emit.mockImplementation((event: string, ...args: unknown[]) => {
		invokeHandlers(registry, event, ...args);
	});

	close.mockImplementation((callback?: () => void) => {
		callback?.();
	});

	return server;
};

type MockServer = ReturnType<typeof createMockWebSocketServer>;

let mockServer: MockServer | undefined;
let namespaceCounter = 0;

vi.mock('ws', () => {
	const WebSocketMock = vi.fn<(address: string) => MockWebSocket>(() => createMockWebSocket());
	Object.assign(WebSocketMock, {
		CONNECTING: 0,
		OPEN: 1,
		CLOSING: 2,
		CLOSED: 3,
	});

	const WebSocketServerMock = vi.fn(() => {
		const server = createMockWebSocketServer();
		mockServer = server;
		return server;
	});

	return {
		WebSocket: WebSocketMock as unknown as typeof WebSocket,
		WebSocketServer: WebSocketServerMock,
	};
});

const flushAsync = async () => {
	await Promise.resolve();
};

const advanceTimers = async (ms: number) => {
	if (typeof vi.advanceTimersByTimeAsync === 'function') {
		await vi.advanceTimersByTimeAsync(ms);
		return;
	}
	vi.advanceTimersByTime(ms);
	await flushAsync();
};

const getSentMessages = (ws: MockWebSocket): RealtimeMemoryOutboundMessage[] => {
	return ws.send.mock.calls.map(([payload]) => {
		if (typeof payload !== 'string') {
			throw new Error('Expected payload to be a string');
		}
		const parsed = JSON.parse(payload);
		return RealtimeMemoryOutboundMessageSchema.parse(parsed);
	});
};

type OutboundMessageOf<TType extends RealtimeMemoryOutboundMessage['type']> = Extract<
	RealtimeMemoryOutboundMessage,
	{ type: TType }
>;

const getLatestMessageOfType = async <TType extends RealtimeMemoryOutboundMessage['type']>(
	ws: MockWebSocket,
	type: TType,
): Promise<OutboundMessageOf<TType>> => {
	await flushAsync();
	const messages = getSentMessages(ws).filter(
		(message): message is OutboundMessageOf<TType> => message.type === type,
	);
	expect(messages.length).toBeGreaterThan(0);
	return messages[messages.length - 1];
};

const sendInboundMessage = (ws: MockWebSocket, message: RealtimeMemoryInboundMessage) => {
	const payload = JSON.stringify(RealtimeMemoryInboundMessageSchema.parse(message));
	ws._simulateMessage(payload);
};

type RequestLike = {
	url: string;
	headers: {
		host: string;
		'user-agent': string;
	};
	socket: {
		remoteAddress: string;
	};
};

const buildRequest = (url: string): RequestLike => ({
	url,
	headers: {
		host: 'localhost:3001',
		'user-agent': 'vitest-suite',
	},
	socket: {
		remoteAddress: '127.0.0.1',
	},
});

const simulateConnection = (url = '/?clientId=test-client'): MockWebSocket => {
	const ws = createMockWebSocket();
	if (!mockServer) {
		throw new Error('Mock server not initialised');
	}
	const connectionHandler = mockServer.on.mock.calls.find(([event]) => event === 'connection')?.[1];
	if (!connectionHandler) {
		throw new Error('Connection handler not registered');
	}
	mockServer.clients.add(ws);
	connectionHandler(ws, buildRequest(url));
	ws.readyState = 1;
	return ws;
};

describe('RealtimeMemoryServer contracts integration', () => {
	let baseStore: InMemoryStore;
	let streamingStore: StreamingMemoryStore;
	let server: RealtimeMemoryServer;
	let namespace: string;

	beforeEach(() => {
		vi.clearAllMocks();
		mockServer = undefined;
		baseStore = new InMemoryStore();
		streamingStore = new StreamingMemoryStore(baseStore);
		server = new RealtimeMemoryServer(streamingStore);
		namespaceCounter += 1;
		namespace = `realtime-namespace-${namespaceCounter}`;
	});

	afterEach(async () => {
		if (server.isRunning()) {
			await server.stop().catch(() => undefined);
		}
	});

	describe('connection lifecycle', () => {
		it('sends a contract-compliant connected message on join', async () => {
			await server.start(3001);
			const ws = simulateConnection();
			const connected = await getLatestMessageOfType(ws, 'connected');
			expect(connected.message).toContain('brAInwav');
			expect(connected.connectionId).toBeTruthy();
			expect(connected.server?.port).toBe(3001);
		});

		it('rejects unauthenticated connections when auth is required', async () => {
			server = new RealtimeMemoryServer(streamingStore, {
				enableAuth: true,
				authToken: 'secret-token',
			});
			await server.start(3001);
			const ws = simulateConnection();
			expect(ws.close).toHaveBeenCalledWith(1008, 'brAInwav authentication required');
		});

		it('accepts authenticated clients when token matches', async () => {
			server = new RealtimeMemoryServer(streamingStore, {
				enableAuth: true,
				authToken: 'secret-token',
			});
			await server.start(3001);
			const ws = simulateConnection('/?clientId=auth-client&token=secret-token');
			const connected = await getLatestMessageOfType(ws, 'connected');
			expect(connected.connectionId).toBeTruthy();
		});

		it('enforces the maximum connection limit with branded messaging', async () => {
			server = new RealtimeMemoryServer(streamingStore, {
				maxConnections: 1,
			});
			await server.start(3001);
			const first = simulateConnection('/?clientId=first-client');
			await getLatestMessageOfType(first, 'connected');
			const second = simulateConnection('/?clientId=second-client');
			expect(second.close).toHaveBeenCalledWith(1008, 'brAInwav connection limit reached');
		});
	});

	describe('subscription workflow', () => {
		it('subscribes and unsubscribes using contract-compliant messages', async () => {
			await server.start(3001);
			const ws = simulateConnection();
			sendInboundMessage(ws, {
				type: 'subscribe',
				namespace,
			});
			const subscribed = await getLatestMessageOfType(ws, 'subscribed');
			expect(subscribed.namespace).toBe(namespace);
			sendInboundMessage(ws, {
				type: 'unsubscribe',
				namespace,
			});
			const unsubscribed = await getLatestMessageOfType(ws, 'unsubscribed');
			expect(unsubscribed.namespace).toBe(namespace);
			expect(server.getSubscriptions(ws as unknown as WebSocket)).toHaveLength(0);
		});

		it('warns on duplicate subscriptions with brAInwav branding', async () => {
			await server.start(3001);
			const ws = simulateConnection();
			sendInboundMessage(ws, {
				type: 'subscribe',
				namespace,
			});
			await getLatestMessageOfType(ws, 'subscribed');
			sendInboundMessage(ws, {
				type: 'subscribe',
				namespace,
			});
			const warning = await getLatestMessageOfType(ws, 'warning');
			expect(warning.message).toBe('brAInwav realtime already subscribed');
		});

		it('responds with pong to ping messages', async () => {
			await server.start(3001);
			const ws = simulateConnection();
			sendInboundMessage(ws, { type: 'ping' });
			const pong = await getLatestMessageOfType(ws, 'pong');
			expect(pong.timestamp).toBeDefined();
		});
	});

	describe('change propagation', () => {
		it('broadcasts change events that satisfy the outbound schema', async () => {
			await server.start(3001);
			const ws = simulateConnection('/?clientId=change-client');
			sendInboundMessage(ws, {
				type: 'subscribe',
				namespace,
			});
			await getLatestMessageOfType(ws, 'subscribed');
			const memory = createMemory({ text: 'Contract compliant broadcast' });
			await streamingStore.upsert(memory, namespace);
			const change = await getLatestMessageOfType(ws, 'change');
			expect(change.namespace).toBe(namespace);
			RealtimeMemoryChangeEventSchema.parse(change.event);
		});

		it('replays queued messages after reconnection', async () => {
			await server.start(3001);
			const clientId = 'queue-client';
			const first = simulateConnection(`/?clientId=${clientId}`);
			sendInboundMessage(first, {
				type: 'subscribe',
				namespace,
			});
			await getLatestMessageOfType(first, 'subscribed');
			first._simulateClose({ code: 1000, reason: 'client disconnect' });
			const queuedMemory = createMemory({ text: 'Queued update' });
			await streamingStore.upsert(queuedMemory, namespace);
			const second = simulateConnection(`/?clientId=${clientId}`);
			await getLatestMessageOfType(second, 'subscriptions_restored');
			const change = await getLatestMessageOfType(second, 'change');
			expect(change.namespace).toBe(namespace);
			RealtimeMemoryChangeEventSchema.parse(change.event);
		});
	});

	describe('realtime metrics publishing', () => {
		let publishMetrics: ReturnType<typeof vi.fn>;

		beforeEach(() => {
			vi.useFakeTimers();
			publishMetrics = vi.fn(async () => undefined);
			server = new RealtimeMemoryServer(streamingStore, {
				metricsSnapshotDebounceMs: 5,
			});
			server.setMetricsPublisher({
				publishRealtimeMetrics: publishMetrics,
			});
		});

		afterEach(() => {
			vi.useRealTimers();
		});

                it('publishes a metrics event when clients connect', async () => {
                        await server.start(3001);
                        const ws = simulateConnection();
                        await getLatestMessageOfType(ws, 'connected');
                        await advanceTimers(10);
                        expect(publishMetrics).toHaveBeenCalled();
                        const event = publishMetrics.mock.calls[0]?.[0];
                        expect(() => RealtimeMemoryMetricsEventSchema.parse(event)).not.toThrow();
                        expect(event.type).toBe('memory.realtime.metrics');
                        expect(event.brand).toBe('brAInwav');
                        expect(event.description).toContain('brAInwav');
                        expect(event.reason.split('|')).toContain('connection-established');
                        expect(event.aggregate.activeConnections).toBe(1);
                        await server.stop();
                        await advanceTimers(10);
                });

                it('captures message activity in snapshot reasons', async () => {
                        await server.start(3001);
                        const ws = simulateConnection();
                        await getLatestMessageOfType(ws, 'connected');
                        await advanceTimers(10);
			publishMetrics.mockClear();
			sendInboundMessage(ws, {
				type: 'subscribe',
				namespace,
			});
			await getLatestMessageOfType(ws, 'subscribed');
                        const memory = createMemory({ text: 'Metrics change event' });
                        await streamingStore.upsert(memory, namespace);
                        await advanceTimers(10);
                        expect(publishMetrics).toHaveBeenCalled();
                        const event = publishMetrics.mock.calls[publishMetrics.mock.calls.length - 1]?.[0];
                        expect(() => RealtimeMemoryMetricsEventSchema.parse(event)).not.toThrow();
                        const reasons = event.reason.split('|');
                        expect(reasons).toContain('message-received');
                        expect(reasons).toContain('message-sent');
                        expect(event.headers).toBeUndefined();
                        await server.stop();
                        await advanceTimers(10);
                });

                it('respects the metricsSnapshotsEnabled toggle', async () => {
                        publishMetrics.mockClear();
                        server = new RealtimeMemoryServer(
                                streamingStore,
                                {
                                        metricsSnapshotDebounceMs: 5,
                                        metricsSnapshotsEnabled: false,
                                        metricsPublisher: { publishRealtimeMetrics: publishMetrics },
                                },
                        );
                        await server.start(3001);
                        const ws = simulateConnection();
                        await getLatestMessageOfType(ws, 'connected');
                        await advanceTimers(10);
                        expect(publishMetrics).not.toHaveBeenCalled();
                        await server.stop();
                        await advanceTimers(10);
                });
        });

	describe('validation layer', () => {
		it('returns a branded parse error for malformed JSON', async () => {
			await server.start(3001);
			const ws = simulateConnection();
			ws._simulateMessage('not json');
			const error = await getLatestMessageOfType(ws, 'error');
			expect(error.message).toBe('brAInwav realtime message parsing failed');
			expect(error.details).toEqual({ reason: 'invalid-json' });
		});

		it('returns schema validation errors when inbound payload is invalid', async () => {
			await server.start(3001);
			const ws = simulateConnection();
			ws._simulateMessage(JSON.stringify({ type: 'subscribe' }));
			const error = await getLatestMessageOfType(ws, 'error');
			expect(error.message).toBe('brAInwav realtime schema validation failed');
			expect(error.details).toBeDefined();
		});
	});
});
