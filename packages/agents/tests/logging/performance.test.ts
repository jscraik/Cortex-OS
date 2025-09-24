import { beforeEach, describe, expect, it } from 'vitest';
import { Logger } from '../../src/logging/logger.js';
import { createMemoryWritableStream } from '../utils/test-stream.js';

describe('Logger Performance', () => {
	let capturedOutput: string[];
	let stream: WritableStream<Uint8Array>;

	beforeEach(() => {
		capturedOutput = [];
		stream = createMemoryWritableStream((data) => {
			capturedOutput.push(data);
		});
	});

	describe('High throughput scenarios', () => {
		it('should handle 10,000 log messages per second', async () => {
			// RED: Test fails because implementation doesn't exist
			const logger = new Logger({
				level: 'info',
				format: 'json',
				streams: [
					{
						stream,
						level: 'trace',
					},
				],
			});

			const messageCount = 10000;
			const batchSize = 100;
			const startTime = process.hrtime.bigint();

			// Send messages in batches to simulate real-world scenarios
			for (let i = 0; i < messageCount; i += batchSize) {
				const batch = [];
				for (let j = 0; j < batchSize && i + j < messageCount; j++) {
					batch.push(
						logger.info(`Message ${i + j}`, {
							userId: `user${i + j}`,
							timestamp: Date.now(),
						}),
					);
				}
				await Promise.all(batch);
			}

			await logger.flush();
			const endTime = process.hrtime.bigint();

			const durationSeconds = Number(endTime - startTime) / 1000000000;
			const messagesPerSecond = messageCount / durationSeconds;

			expect(messagesPerSecond).toBeGreaterThan(10000);
			expect(capturedOutput).toHaveLength(messageCount);
		});

		it('should maintain performance with large log objects', async () => {
			// RED: Test fails because implementation doesn't exist
			const logger = new Logger({
				level: 'info',
				format: 'json',
				streams: [
					{
						stream,
						level: 'trace',
					},
				],
			});

			const largeObject = {
				metadata: {
					request: {
						headers: {
							'user-agent': 'Mozilla/5.0...',
							accept: 'application/json',
							'content-type': 'application/json',
						},
						body: {
							data: Array(100).fill('sample data').join(', '),
						},
					},
					response: {
						status: 200,
						headers: {
							'content-type': 'application/json',
							'x-request-id': '12345',
						},
						body: {
							items: Array(50)
								.fill(0)
								.map((_, i) => ({
									id: i,
									name: `Item ${i}`,
									description: `Description for item ${i}`,
									tags: ['tag1', 'tag2', 'tag3'],
								})),
						},
					},
				},
			};

			const messageCount = 1000;
			const startTime = process.hrtime.bigint();

			for (let i = 0; i < messageCount; i++) {
				logger.info('Large log message', largeObject);
			}

			await logger.flush();
			const endTime = process.hrtime.bigint();

			const durationMs = Number(endTime - startTime) / 1000000;
			const avgMsPerMessage = durationMs / messageCount;

			expect(avgMsPerMessage).toBeLessThan(1); // Less than 1ms per message
			expect(capturedOutput).toHaveLength(messageCount);
		});
	});

	describe('Memory usage', () => {
		it('should not accumulate memory with high logging volume', async () => {
			// RED: Test fails because implementation doesn't exist
			const logger = new Logger({
				level: 'info',
				format: 'json',
				streams: [
					{
						stream,
						level: 'trace',
					},
				],
			});

			// Force garbage collection before test
			if (global.gc) {
				global.gc();
			}

			const initialMemory = process.memoryUsage();

			// Log many messages
			for (let i = 0; i < 5000; i++) {
				logger.info(`Performance test message ${i}`, {
					iteration: i,
					timestamp: Date.now(),
					data: 'sample data'.repeat(10),
				});
			}

			await logger.flush();

			// Force garbage collection after test
			if (global.gc) {
				global.gc();
			}

			const finalMemory = process.memoryUsage();
			const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

			// Memory increase should be minimal (less than 10MB)
			expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
		});

		it('should handle backpressure when stream is slow', async () => {
			// RED: Test fails because implementation doesn't exist
			let isPaused = false;
			const pendingWrites: { data: Uint8Array; resolve: () => void }[] = [];

			const slowStream = new WritableStream<Uint8Array>({
				write(chunk) {
					return new Promise((resolve) => {
						if (isPaused) {
							pendingWrites.push({ data: chunk, resolve });
						} else {
							// Simulate slow write
							setTimeout(resolve, 1);
						}
					});
				},
			});

			const logger = new Logger({
				level: 'info',
				format: 'json',
				streams: [
					{
						stream: slowStream,
						level: 'trace',
					},
				],
			});

			// Pause the stream to create backpressure
			isPaused = true;

			// Send messages while paused
			const promises = [];
			for (let i = 0; i < 100; i++) {
				promises.push(logger.info(`Backpressure test ${i}`));
			}
			await Promise.all(promises);

			// Resume and process all pending writes
			isPaused = false;
			while (pendingWrites.length > 0) {
				const write = pendingWrites.shift();
				if (write) {
					setTimeout(write.resolve, 1);
				}
			}

			await logger.flush();

			// All messages should eventually be written
			expect(logger.getPendingCount?.()).toBe(0);
		});
	});

	describe('Conditional logging performance', () => {
		it('should have zero overhead for disabled log levels', async () => {
			// RED: Test fails because implementation doesn't exist
			const logger = new Logger({
				level: 'error',
				format: 'json',
				streams: [
					{
						stream,
						level: 'trace',
					},
				],
			});

			const startTime = process.hrtime.bigint();

			// Debug messages should be filtered out very quickly
			for (let i = 0; i < 100000; i++) {
				logger.debug(`This should be filtered out ${i}`);
			}

			const endTime = process.hrtime.bigint();
			const durationMs = Number(endTime - startTime) / 1000000;

			expect(durationMs).toBeLessThan(10); // Should be extremely fast
			expect(capturedOutput).toHaveLength(0);
		});

		it('should quickly evaluate complex conditions', async () => {
			// RED: Test fails because implementation doesn't exist
			const logger = new Logger({
				level: 'info',
				format: 'json',
				streams: [
					{
						stream,
						level: 'trace',
					},
				],
			});

			const startTime = process.hrtime.bigint();

			// Log with conditional data generation
			for (let i = 0; i < 10000; i++) {
				logger.debug({
					msg: 'Conditional message',
					// This expensive function should not be called for disabled levels
					expensiveData: () => ({
						result: 'expensive computation',
						timestamp: Date.now(),
						largeArray: Array(1000).fill(0),
					}),
				});
			}

			const endTime = process.hrtime.bigint();
			const durationMs = Number(endTime - startTime) / 1000000;

			expect(durationMs).toBeLessThan(5); // Should be very fast
			expect(capturedOutput).toHaveLength(0);
		});
	});

	describe('Buffer management', () => {
		it('should efficiently manage internal buffers', async () => {
			// RED: Test fails because implementation doesn't exist
			const logger = new Logger({
				level: 'info',
				format: 'json',
				streams: [
					{
						stream,
						level: 'trace',
					},
				],
				bufferOptions: {
					size: 1024 * 1024, // 1MB buffer
					flushInterval: 100, // 100ms
				},
			});

			// Log messages that would fill multiple buffers
			const largeMessage = {
				data: 'x'.repeat(1024), // 1KB per message
			};

			const messageCount = 5000; // ~5MB total
			for (let i = 0; i < messageCount; i++) {
				logger.info('Large message', largeMessage);
			}

			await logger.flush();

			expect(capturedOutput).toHaveLength(messageCount);

			// Check that memory is cleaned up
			if (global.gc) {
				global.gc();
			}
			const memoryAfter = process.memoryUsage().heapUsed;
			expect(memoryAfter).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
		});
	});

	describe('Async logging performance', () => {
		it('should not block application execution', async () => {
			// RED: Test fails because implementation doesn't exist
			const logger = new Logger({
				level: 'info',
				format: 'json',
				streams: [
					{
						stream,
						level: 'trace',
					},
				],
			});

			// Measure time for logging operations
			const loggingStart = process.hrtime.bigint();

			// Log many messages without waiting
			const promises = [];
			for (let i = 0; i < 1000; i++) {
				promises.push(
					logger.info(`Async log message ${i}`, {
						index: i,
						data: Array(100).fill('sample').join(),
					}),
				);
			}

			const loggingEnd = process.hrtime.bigint();
			const loggingDuration = Number(loggingEnd - loggingStart) / 1000000;

			// Logging should return very quickly (non-blocking)
			expect(loggingDuration).toBeLessThan(10);

			// Now wait for actual logging to complete
			await Promise.all(promises);
			await logger.flush();

			expect(capturedOutput).toHaveLength(1000);
		});
	});
});
