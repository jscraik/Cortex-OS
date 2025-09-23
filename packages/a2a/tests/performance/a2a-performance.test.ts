import { createEnvelope } from '@cortex-os/a2a-contracts';
import { createBus } from '@cortex-os/a2a-core';
import type { A2AEventEnvelope } from '@cortex-os/a2a-events';
import { beforeEach, describe, expect, it } from 'vitest';

describe('A2A Performance Characteristics', () => {
	let mockTransport: any;
	let bus: ReturnType<typeof createBus>;

	beforeEach(() => {
		mockTransport = {
			publish: vi.fn(),
			subscribe: vi.fn(),
		};
		bus = createBus(mockTransport);
	});

	it('should handle 1000 messages/second throughput', async () => {
		const messageCount = 1000;
		const startTime = Date.now();

		// Mock fast publish
		mockTransport.publish.mockImplementation(() => Promise.resolve());

		const promises = Array.from({ length: messageCount }, (_, i) =>
			bus.publish(
				createEnvelope({
					type: 'load.test.message',
					source: 'urn:cortex:load:test',
					data: { messageId: i },
				}) as A2AEventEnvelope,
			),
		);

		await Promise.all(promises);
		const duration = Date.now() - startTime;
		const messagesPerSecond = messageCount / (duration / 1000);

		expect(messagesPerSecond).toBeGreaterThan(1000);
		expect(mockTransport.publish).toHaveBeenCalledTimes(messageCount);
	});

	it('should handle high concurrency without errors', async () => {
		const concurrentCount = 100;
		const messageCount = 50;

		mockTransport.publish.mockImplementation(() => Promise.resolve());

		// Create concurrent publish operations
		const concurrentPromises = Array.from({ length: concurrentCount }, async () => {
			const promises = Array.from({ length: messageCount }, (_, i) =>
				bus.publish(
					createEnvelope({
						type: 'concurrent.test.message',
						source: 'urn:cortex:concurrent:test',
						data: { batchId: i },
					}) as A2AEventEnvelope,
				),
			);
			return Promise.all(promises);
		});

		await Promise.all(concurrentPromises);

		expect(mockTransport.publish).toHaveBeenCalledTimes(concurrentCount * messageCount);
	});

	it('should maintain memory efficiency with large payloads', async () => {
		const largePayload = {
			data: 'x'.repeat(1024 * 1024), // 1MB payload
			metadata: Array.from({ length: 1000 }, (_, i) => ({
				id: i,
				value: `value-${i}`,
			})),
		};

		mockTransport.publish.mockImplementation(() => Promise.resolve());

		const startMemory = process.memoryUsage();
		const messageCount = 100;

		const promises = Array.from({ length: messageCount }, () =>
			bus.publish(
				createEnvelope({
					type: 'large.payload.test',
					source: 'urn:cortex:payload:test',
					data: largePayload,
				}) as A2AEventEnvelope,
			),
		);

		await Promise.all(promises);
		const endMemory = process.memoryUsage();
		const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;

		// Memory increase should be reasonable (less than 10x payload size)
		expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024 * messageCount);
	});
});
