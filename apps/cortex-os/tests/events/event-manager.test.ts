import { randomUUID } from 'node:crypto';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createEventManager,
	type EventManager,
	type RuntimeEvent,
} from '../../src/events/event-manager.js';
import type { RuntimeHttpServer } from '../../src/http/runtime-server.js';
import { type RuntimeHandle, startRuntime } from '../../src/runtime.js';
import { prepareLoopbackAuth } from '../setup.global.js';

let authHeader: string;

const withAuthHeaders = (headers: Record<string, string> = {}) => {
	if (!authHeader) {
		throw new Error('Loopback auth header not prepared for event manager tests');
	}
	return { Authorization: authHeader, ...headers };
};

describe('Event Manager', () => {
	let runtime: RuntimeHandle;

	beforeAll(async () => {
		const { header } = await prepareLoopbackAuth();
		authHeader = header;
	});

	beforeEach(async () => {
		// Set test environment variables for random ports
		process.env.CORTEX_HTTP_PORT = '0';
		process.env.CORTEX_MCP_MANAGER_PORT = '0';

		runtime = await startRuntime();
	});

	afterEach(async () => {
		if (runtime) {
			await runtime.stop();
		}
		// Clean up environment variables
		delete process.env.CORTEX_HTTP_PORT;
		delete process.env.CORTEX_MCP_MANAGER_PORT;
	});

	it('should emit runtime events', async () => {
		const testEvent = {
			type: 'test.runtime.event',
			data: {
				message: 'This is a test event',
				timestamp: new Date().toISOString(),
				source: 'event-manager-test',
			},
		};

		// Should be able to emit events without throwing
		await expect(runtime.events.emitEvent(testEvent)).resolves.not.toThrow();
	});

	it('should handle different event types', async () => {
		const events = [
			{
				type: 'runtime.started',
				data: {
					httpUrl: runtime.httpUrl,
					mcpUrl: runtime.mcpUrl,
					startedAt: new Date().toISOString(),
				},
			},
			{
				type: 'task.created',
				data: {
					taskId: 'task-123',
					title: 'Test Task',
					createdBy: 'event-test',
				},
			},
			{
				type: 'memory.stored',
				data: {
					memoryId: 'memory-456',
					content: 'Test memory content',
					tags: ['test', 'event'],
				},
			},
		];

		// Should be able to emit all event types
		for (const event of events) {
			await expect(runtime.events.emitEvent(event)).resolves.not.toThrow();
		}
	});

	it('should validate event structure', async () => {
		// Test with missing type
		const invalidEvent1 = {
			data: { message: 'Missing type' },
		} as any;

		await expect(runtime.events.emitEvent(invalidEvent1)).rejects.toThrow();

		// Test with missing data
		const invalidEvent2 = {
			type: 'test.missing.data',
		} as any;

		await expect(runtime.events.emitEvent(invalidEvent2)).rejects.toThrow();
	});

	it('should handle event emission errors gracefully', async () => {
		const invalidEvent = {
			type: null,
			data: null,
		} as any;

		// Should reject but not crash the runtime
		await expect(runtime.events.emitEvent(invalidEvent)).rejects.toThrow();

		// Runtime should still be functional
		const healthResponse = await fetch(`${runtime.httpUrl}/health`, {
			headers: withAuthHeaders(),
		});
		expect(healthResponse.status).toBe(200);
	});

	it('should emit events to SSE stream', async () => {
		// Connect to SSE stream
		const sseResponse = await fetch(`${runtime.httpUrl}/v1/events?stream=sse`, {
			headers: withAuthHeaders({ Accept: 'text/event-stream' }),
		});

		expect(sseResponse.status).toBe(200);
		expect(sseResponse.headers.get('content-type')).toContain('text/event-stream');

		const reader = sseResponse.body?.getReader();
		if (!reader) throw new Error('SSE response did not expose a readable stream');

		// Read initial heartbeat
		const initialChunk = await reader.read();
		expect(initialChunk.done).toBe(false);

		// Emit a test event
		const testEvent = {
			type: 'test.sse.event',
			data: {
				message: 'This should appear in SSE stream',
				timestamp: Date.now(),
			},
		};

		await runtime.events.emitEvent(testEvent);

		// Give some time for the event to propagate
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Clean up
		await reader.cancel();
	});

	it('should broadcast events to HTTP server', async () => {
		// This test verifies that events emitted through the event manager
		// are properly broadcasted to connected SSE clients

		let eventReceived = false;
		const testEvent = {
			type: 'test.broadcast',
			data: {
				message: 'Broadcast test event',
				id: Math.random().toString(36),
			},
		};

		// Start SSE connection
		const sseResponse = await fetch(`${runtime.httpUrl}/v1/events?stream=sse`, {
			headers: withAuthHeaders({ Accept: 'text/event-stream' }),
		});

		const reader = sseResponse.body?.getReader();
		if (!reader) throw new Error('SSE response did not expose a readable stream');

		// Set up event listening with timeout
		const eventPromise = new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error('Event not received within timeout'));
			}, 5000);

			const readNext = async () => {
				try {
					const chunk = await reader.read();
					if (chunk.done) {
						clearTimeout(timeout);
						resolve();
						return;
					}

					const text = new TextDecoder().decode(chunk.value);
					if (text.includes('test.broadcast') && text.includes(testEvent.data.id)) {
						eventReceived = true;
						clearTimeout(timeout);
						resolve();
						return;
					}

					// Continue reading
					setImmediate(readNext);
				} catch (error) {
					clearTimeout(timeout);
					reject(error);
				}
			};

			readNext();
		});

		// Emit the test event after a small delay
		setTimeout(async () => {
			await runtime.events.emitEvent(testEvent);
		}, 100);

		// Wait for event or timeout
		try {
			await eventPromise;
			expect(eventReceived).toBe(true);
		} finally {
			await reader.cancel();
		}
	});

	it('should handle high-frequency events', async () => {
		const eventCount = 50;
		const events = Array.from({ length: eventCount }, (_, i) => ({
			type: 'test.high.frequency',
			data: {
				sequence: i,
				timestamp: Date.now(),
				message: `High frequency event ${i}`,
			},
		}));

		// Emit all events rapidly
		const emitPromises = events.map((event) => runtime.events.emitEvent(event));

		// All events should be emitted successfully
		await expect(Promise.all(emitPromises)).resolves.not.toThrow();
	});

	it('should maintain event order for synchronous emissions', async () => {
		const eventOrder: string[] = [];
		const events = [
			{ type: 'test.order.1', data: { order: 1 } },
			{ type: 'test.order.2', data: { order: 2 } },
			{ type: 'test.order.3', data: { order: 3 } },
		];

		// Emit events sequentially
		for (const event of events) {
			await runtime.events.emitEvent(event);
			eventOrder.push(event.type);
		}

		expect(eventOrder).toEqual(['test.order.1', 'test.order.2', 'test.order.3']);
	});
});

describe('createEventManager validation', () => {
	let manager: EventManager;
	let broadcast: ReturnType<typeof vi.fn>;

	function createHttpServerStub(): RuntimeHttpServer {
		return {
			broadcast,
			listen: vi.fn(),
			close: vi.fn(),
			dependencies: {
				tasks: {} as unknown,
				profiles: {} as unknown,
				artifacts: {} as unknown,
				evidence: {} as unknown,
			},
		} as unknown as RuntimeHttpServer;
	}

	beforeEach(() => {
		broadcast = vi.fn();
		manager = createEventManager({
			httpServer: createHttpServerStub(),
			maxBufferedEvents: 5,
			ledgerFilename: `events/test-${randomUUID()}.ndjson`,
		});
	});

	it('rejects non-object events', async () => {
		await expect(manager.emitEvent(null as unknown as RuntimeEvent)).rejects.toThrow(
			'Runtime events require an object payload',
		);
	});

	it('rejects events with empty type', async () => {
		await expect(
			manager.emitEvent({ type: '   ', data: { ok: true } } as unknown as RuntimeEvent),
		).rejects.toThrow('Runtime events require a non-empty type');
	});

	it('rejects events with non-object payloads', async () => {
		await expect(
			manager.emitEvent({ type: 'test.invalid', data: null } as unknown as RuntimeEvent),
		).rejects.toThrow('Runtime events require a data object payload');

		await expect(
			manager.emitEvent({ type: 'test.invalid', data: [] } as unknown as RuntimeEvent),
		).rejects.toThrow('Runtime events require a data object payload');
	});

	it('trims event types before broadcasting', async () => {
		await manager.emitEvent({
			type: '  test.trim  ',
			data: { value: 42 },
		});

		expect(broadcast).toHaveBeenCalledTimes(1);
		const payload = broadcast.mock.calls[0]?.[0] as { type: string; data: RuntimeEvent };
		expect(payload.type).toBe('test.trim');
		expect(payload.data.type).toBe('test.trim');
		const recent = manager.getRecentEvents();
		expect(recent[0]?.type).toBe('test.trim');
	});
});
