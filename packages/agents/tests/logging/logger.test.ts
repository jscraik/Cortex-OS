import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '../../src/logging/logger.js';
import type { LoggerConfig } from '../../src/logging/types.js';
import { createMemoryWritableStream } from '../utils/test-stream.js';

describe('Structured Logger', () => {
	let logger: Logger;
	let mockStream: WritableStream<Uint8Array>;
	let capturedOutput: string[];

	beforeEach(() => {
		vi.clearAllMocks();
		capturedOutput = [];

		// Create mock stream to capture log output
		mockStream = createMemoryWritableStream((data) => {
			capturedOutput.push(data.trim()); // Remove newlines
		});

		const config: LoggerConfig = {
			level: 'info',
			format: 'json',
			streams: [
				{
					stream: mockStream,
					level: 'trace',
				},
			],
		};

		logger = new Logger(config);
	});

	describe('JSON format output', () => {
		it('should output logs in JSON format', async () => {
			// RED: Test fails because implementation doesn't exist
			logger.info('Test message', { userId: '123' });

			// Ensure log is written
			await logger.flush();

			expect(capturedOutput).toHaveLength(1);
			const output = capturedOutput[0];
			const parsed = JSON.parse(output);

			expect(parsed.level).toBe('info');
			expect(parsed.msg).toBe('Test message');
			expect(parsed.userId).toBe('123');
			expect(parsed.time).toBeDefined();
		});

		it('should include standard log fields', async () => {
			// RED: Test fails because implementation doesn't exist
			logger.warn('Warning message');

			await logger.flush();

			expect(capturedOutput).toHaveLength(1);
			const output = capturedOutput[0];
			const parsed = JSON.parse(output);

			expect(parsed).toHaveProperty('level');
			expect(parsed).toHaveProperty('time');
			expect(parsed).toHaveProperty('pid', process.pid);
			expect(parsed).toHaveProperty('hostname');
			expect(parsed).toHaveProperty('msg', 'Warning message');
		});
	});

	describe('Log levels', () => {
		it('should respect configured log level', async () => {
			// RED: Test fails because implementation doesn't exist
			const silentLogger = new Logger({
				level: 'error',
				format: 'json',
				streams: [
					{
						stream: mockStream,
						level: 'trace',
					},
				],
			});

			silentLogger.info('This should not appear');
			silentLogger.error('This should appear');

			await silentLogger.flush();

			expect(capturedOutput).toHaveLength(1);
			const output = capturedOutput[0];
			const parsed = JSON.parse(output);
			expect(parsed.level).toBe('error');
		});

		it('should support all log levels', async () => {
			// RED: Test fails because implementation doesn't exist
			logger.trace('trace');
			logger.debug('debug');
			logger.info('info');
			logger.warn('warn');
			logger.error('error');
			logger.fatal('fatal');

			await logger.flush();

			expect(capturedOutput).toHaveLength(4); // info and above only

			const levels = capturedOutput.map((out) => JSON.parse(out).level);
			expect(levels).toEqual(['info', 'warn', 'error', 'fatal']);
		});
	});

	describe('Error handling', () => {
		it('should properly serialize error objects', async () => {
			// RED: Test fails because implementation doesn't exist
			const error = new Error('Test error');
			error.stack = 'mock stack trace';

			logger.error('Error occurred', { err: error });

			await logger.flush();

			expect(capturedOutput).toHaveLength(1);
			const output = capturedOutput[0];
			const parsed = JSON.parse(output);

			expect(parsed.err.type).toBe('Error');
			expect(parsed.err.message).toBe('Test error');
			expect(parsed.err.stack).toBe('mock stack trace');
		});

		it('should handle circular references', async () => {
			// RED: Test fails because implementation doesn't exist
			const circular: any = { name: 'test' };
			circular.self = circular;

			logger.info('Circular reference', { obj: circular });

			await logger.flush();

			const output = capturedOutput[0];
			expect(() => JSON.parse(output)).not.toThrow();
		});
	});

	describe('Child loggers', () => {
		it('should inherit parent configuration', async () => {
			// RED: Test fails because implementation doesn't exist
			const child = logger.child({ component: 'test' });

			child.info('Child logger message');

			await child.flush();

			expect(capturedOutput).toHaveLength(1);
			const output = capturedOutput[0];
			const parsed = JSON.parse(output);

			expect(parsed.component).toBe('test');
			expect(parsed.msg).toBe('Child logger message');
		});

		it('should merge child and parent fields', async () => {
			// RED: Test fails because implementation doesn't exist
			const child = logger.child({ service: 'api' });

			child.info('Message with context', { userId: '123' });

			await child.flush();

			const output = capturedOutput[0];
			const parsed = JSON.parse(output);

			expect(parsed.service).toBe('api');
			expect(parsed.userId).toBe('123');
		});
	});

	describe('Performance', () => {
		it('should handle high throughput without dropping logs', async () => {
			// RED: Test fails because implementation doesn't exist
			const messageCount = 1000;

			const promises = Array(messageCount)
				.fill(0)
				.map((_, i) => {
					return logger.info(`Message ${i}`, { index: i });
				});

			await Promise.all(promises);
			await logger.flush();

			expect(capturedOutput).toHaveLength(messageCount);
		});

		it('should have minimal overhead for disabled log levels', async () => {
			// RED: Test fails because implementation doesn't exist
			const silentLogger = new Logger({
				level: 'error',
				format: 'json',
				streams: [
					{
						stream: mockStream,
						level: 'trace',
					},
				],
			});

			const start = process.hrtime.bigint();

			for (let i = 0; i < 1000; i++) {
				silentLogger.debug(`Debug message ${i}`);
			}

			const end = process.hrtime.bigint();
			const duration = Number(end - start) / 1000000; // Convert to milliseconds

			expect(duration).toBeLessThan(10); // Should be very fast
			expect(capturedOutput).toHaveLength(0);
		});
	});

	describe('Stream management', () => {
		it('should write to multiple streams', async () => {
			// RED: Test fails because implementation doesn't exist
			const outputs: string[][] = [[], []];

			const streams = outputs.map((output) =>
				createMemoryWritableStream((data) => output.push(data)),
			);

			const multiStreamLogger = new Logger({
				level: 'info',
				format: 'json',
				streams: [
					{ stream: streams[0], level: 'info' },
					{ stream: streams[1], level: 'warn' },
				],
			});

			multiStreamLogger.info('Info message');
			multiStreamLogger.warn('Warning message');

			await multiStreamLogger.flush();

			expect(outputs[0]).toHaveLength(2);
			expect(outputs[1]).toHaveLength(1);

			const warnOutput = JSON.parse(outputs[1][0]);
			expect(warnOutput.msg).toBe('Warning message');
		});

		it('should handle stream errors gracefully', async () => {
			// RED: Test fails because implementation doesn't exist
			const errorStream = {
				write: vi.fn().mockRejectedValue(new Error('Stream error')),
				close: vi.fn(),
			};

			const errorLogger = new Logger({
				level: 'info',
				format: 'json',
				streams: [
					{
						stream: errorStream as any,
						level: 'info',
					},
				],
			});

			// Should not throw
			expect(() => {
				errorLogger.info('Test message');
			}).not.toThrow();
		});
	});
});
