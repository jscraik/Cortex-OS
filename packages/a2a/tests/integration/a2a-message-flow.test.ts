import { createEnvelope, type Envelope } from '@cortex-os/a2a-contracts';
import { createBus, type Handler } from '@cortex-os/a2a-core';
import type { A2AEventEnvelope } from '@cortex-os/a2a-events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('A2A Message Flow Integration', () => {
	let mockTransport: any;
	let bus: ReturnType<typeof createBus>;

	beforeEach(() => {
		mockTransport = {
			publish: vi.fn(),
			subscribe: vi.fn(),
		};
		bus = createBus(mockTransport);
	});

	it('should handle complete request-response cycle', async () => {
		const responses: Envelope[] = [];

		// Setup response handler
		const responseHandler: Handler = {
			type: 'agent.task.response',
			handle: async (msg: A2AEventEnvelope) => {
				responses.push(msg as Envelope);
			},
		};

		// Mock the subscription to directly call the handler
		mockTransport.subscribe.mockImplementation((_topics: string[], handler: Function) => {
			// Store handler for direct invocation
			(mockTransport as any).handler = handler;
		});

		// Bind the handler
		await bus.bind([responseHandler]);

		// Send request
		const requestEnvelope = createEnvelope({
			type: 'agent.task.request',
			source: 'urn:cortex:test:client',
			data: { task: 'process data' },
			correlationId: 'req-123',
		});

		await bus.publish(requestEnvelope as A2AEventEnvelope);

		// Simulate agent processing and response
		const responseEnvelope = createEnvelope({
			type: 'agent.task.response',
			source: 'urn:cortex:agent:worker',
			data: { result: 'processed', status: 'success' },
			correlationId: 'req-123',
			causationId: 'req-123',
		});

		// Simulate receiving the response (mock transport handler)
		if ((mockTransport as any).handler) {
			await (mockTransport as any).handler(responseEnvelope);
		}

		// Verify response received
		expect(responses).toHaveLength(1);
		expect(responses[0].data).toMatchObject({
			result: 'processed',
			status: 'success',
		});
		expect(responses[0].correlationId).toBe('req-123');
	});

	it('should handle multiple subscribers to same event type', async () => {
		const receivedMessages: Envelope[] = [];

		const handler1: Handler = {
			type: 'agent.notification',
			handle: async (msg: A2AEventEnvelope) => {
				receivedMessages.push({ ...(msg as Envelope), handler: 'handler1' });
			},
		};

		const handler2: Handler = {
			type: 'agent.notification',
			handle: async (msg: A2AEventEnvelope) => {
				receivedMessages.push({ ...(msg as Envelope), handler: 'handler2' });
			},
		};

		mockTransport.subscribe.mockImplementation((_topics: string[], handler: Function) => {
			(mockTransport as any).handler = handler;
		});

		await bus.bind([handler1, handler2]);

		const notification = createEnvelope({
			type: 'agent.notification',
			source: 'urn:cortex:test:system',
			data: { message: 'System update available' },
		});

		await bus.publish(notification as A2AEventEnvelope);

		// Simulate delivery
		if ((mockTransport as any).handler) {
			await (mockTransport as any).handler(notification);
		}

		// Both handlers should receive the message
		expect(receivedMessages).toHaveLength(2);
		expect(receivedMessages[0].handler).toBe('handler1');
		expect(receivedMessages[1].handler).toBe('handler2');
		expect(receivedMessages[0].data).toEqual(receivedMessages[1].data);
	});

	it('should handle errors gracefully', async () => {
		const errorHandler: Handler = {
			type: 'agent.error.test',
			handle: async () => {
				throw new Error('Handler error');
			},
		};

		mockTransport.subscribe.mockImplementation((_topics: string[], handler: Function) => {
			(mockTransport as any).handler = handler;
		});

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await bus.bind([errorHandler]);

		const errorEnvelope = createEnvelope({
			type: 'agent.error.test',
			source: 'urn:cortex:test:error',
			data: { trigger: 'error' },
		});

		// Should not throw, but should log error
		await expect(bus.publish(errorEnvelope as A2AEventEnvelope)).resolves.not.toThrow();

		// Simulate delivery
		if ((mockTransport as any).handler) {
			await (mockTransport as any).handler(errorEnvelope);
		}

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining('[A2A Bus] Error handling message type agent.error.test'),
			expect.any(Error),
		);

		consoleSpy.mockRestore();
	});

	it('should respect idempotency', async () => {
		const receivedMessages: Envelope[] = [];

		const handler: Handler = {
			type: 'agent.idempotency.test',
			handle: async (msg: A2AEventEnvelope) => {
				receivedMessages.push(msg as Envelope);
			},
		};

		mockTransport.subscribe.mockImplementation((_topics: string[], handler: Function) => {
			(mockTransport as any).handler = handler;
		});

		// Create bus with idempotency enabled
		const idempotentBus = createBus(mockTransport, undefined, undefined, undefined, {
			enableIdempotency: true,
		});

		await idempotentBus.bind([handler]);

		const message = createEnvelope({
			type: 'agent.idempotency.test',
			source: 'urn:cortex:test:idempotency',
			data: { sequence: 1 },
		});

		// Publish same message twice
		await idempotentBus.publish(message as A2AEventEnvelope);
		await idempotentBus.publish(message as A2AEventEnvelope);

		// Simulate delivery twice with same ID
		if ((mockTransport as any).handler) {
			await (mockTransport as any).handler(message);
			await (mockTransport as any).handler(message);
		}

		// Should only receive one message due to idempotency
		expect(receivedMessages).toHaveLength(1);
	});
});
