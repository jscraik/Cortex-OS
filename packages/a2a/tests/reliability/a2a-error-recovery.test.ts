import { createEnvelope } from '@cortex-os/a2a-contracts';
import { createBus } from '@cortex-os/a2a-core';
import type { A2AEventEnvelope } from '@cortex-os/a2a-events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('A2A Error Recovery', () => {
	let mockTransport: any;
	let bus: ReturnType<typeof createBus>;
	let consoleSpy: any;

	beforeEach(() => {
		consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		mockTransport = {
			publish: vi.fn(),
			subscribe: vi.fn(),
		};
		bus = createBus(mockTransport);
	});

	afterEach(() => {
		consoleSpy.mockRestore();
	});

	it('should handle transport failures gracefully', async () => {
		const transportError = new Error('Transport unavailable');
		mockTransport.publish.mockRejectedValue(transportError);

		const envelope = createEnvelope({
			type: 'test.message',
			source: 'urn:cortex:test',
			data: { test: true },
		});

		// Should reject with transport error
		await expect(bus.publish(envelope as A2AEventEnvelope)).rejects.toThrow(transportError);
	});

	it('should continue processing after handler errors', async () => {
		const messages: A2AEventEnvelope[] = [];
		let callCount = 0;

		mockTransport.subscribe.mockImplementation((topics: string[], handler: Function) => {
			// Simulate multiple messages
			const envelopes = [
				createEnvelope({
					type: 'test.message',
					source: 'urn:cortex:test',
					data: { id: 1 },
				}),
				createEnvelope({
					type: 'test.message',
					source: 'urn:cortex:test',
					data: { id: 2 },
				}),
			];

			// Process messages sequentially
			envelopes.forEach((env, index) => {
				setTimeout(() => {
					try {
						handler(env as A2AEventEnvelope);
						messages.push(env as A2AEventEnvelope);
					} catch (error) {
						consoleSpy(`Error processing message ${index}`);
					}
				}, 10 * index);
			});
		});

		const handler = vi.fn().mockImplementation((msg: A2AEventEnvelope) => {
			callCount++;
			if (callCount === 1) {
				throw new Error('First handler error');
			}
			return Promise.resolve();
		});

		await bus.bind([{ type: 'test.message', handle: handler }]);

		// Wait for async processing
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Should have attempted to process both messages
		expect(callCount).toBe(2);
		expect(consoleSpy).toHaveBeenCalled();
	});

	it('should validate envelopes before processing', async () => {
		const invalidEnvelope = {
			// Missing required fields
			data: { test: true },
		} as A2AEventEnvelope;

		// Should throw validation error
		await expect(bus.publish(invalidEnvelope)).rejects.toThrow();
	});

	it('should handle malformed envelopes in subscription', async () => {
		let handlerCalled = false;

		mockTransport.subscribe.mockImplementation((topics: string[], handler: Function) => {
			// Send malformed envelope
			setTimeout(() => {
				try {
					handler({
						// Missing required fields
						data: { test: true },
					} as A2AEventEnvelope);
				} catch (error) {
					consoleSpy('Validation error');
				}
			}, 10);
		});

		const handler = vi.fn().mockImplementation(() => {
			handlerCalled = true;
			return Promise.resolve();
		});

		await bus.bind([{ type: 'test.message', handle: handler }]);

		// Wait for async processing
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Handler should not be called for invalid envelope
		expect(handlerCalled).toBe(false);
		expect(consoleSpy).toHaveBeenCalledWith('Validation error');
	});

	it('should recover from temporary transport failures', async () => {
		let attempt = 0;
		mockTransport.publish.mockImplementation(() => {
			attempt++;
			if (attempt <= 2) {
				return Promise.reject(new Error('Temporary failure'));
			}
			return Promise.resolve();
		});

		const envelope = createEnvelope({
			type: 'retry.test',
			source: 'urn:cortex:test',
			data: { attempt },
		});

		// First two attempts should fail
		await expect(bus.publish(envelope as A2AEventEnvelope)).rejects.toThrow('Temporary failure');
		await expect(bus.publish(envelope as A2AEventEnvelope)).rejects.toThrow('Temporary failure');

		// Third attempt should succeed
		await expect(bus.publish(envelope as A2AEventEnvelope)).resolves.not.toThrow();
	});
});
