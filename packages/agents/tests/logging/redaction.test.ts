import { beforeEach, describe, expect, it } from 'vitest';
import { Logger } from '../../src/logging/logger.js';
import { createRedactionStream } from '../../src/logging/redaction.js';
import type { RedactionConfig } from '../../src/logging/types.js';
import { createMemoryWritableStream } from '../utils/test-stream.js';

describe('Log Redaction', () => {
	let capturedOutput: string[];
	let baseStream: WritableStream<Uint8Array>;

	beforeEach(() => {
		capturedOutput = [];
		baseStream = createMemoryWritableStream((data) => {
			capturedOutput.push(data);
		});
	});

	describe('Basic redaction patterns', () => {
		it('should redact password fields', async () => {
			// RED: Test fails because implementation doesn't exist
			const config: RedactionConfig = {
				patterns: [
					{
						pattern: 'password',
						fields: ['password', 'pwd', 'pass'],
						replacement: '[REDACTED]',
					},
				],
			};

			const redactionStream = createRedactionStream(baseStream, config);
			const logger = new Logger({
				level: 'info',
				format: 'json',
				streams: [
					{
						stream: redactionStream,
						level: 'trace',
					},
				],
			});

			logger.info('User login attempt', {
				username: 'testuser',
				password: 'secret123',
				credentials: {
					pwd: 'also-secret',
				},
			});

			await logger.flush();

			const output = capturedOutput[0];
			const parsed = JSON.parse(output);

			expect(parsed.username).toBe('testuser');
			expect(parsed.password).toBe('[REDACTED]');
			expect(parsed.credentials.pwd).toBe('[REDACTED]');
		});

		it('should redact sensitive headers', async () => {
			// RED: Test fails because implementation doesn't exist
			const config: RedactionConfig = {
				patterns: [
					{
						pattern: 'authorization',
						fields: ['authorization', 'cookie', 'x-api-key'],
						replacement: '[REDACTED]',
					},
				],
			};

			const redactionStream = createRedactionStream(baseStream, config);
			const logger = new Logger({
				level: 'info',
				format: 'json',
				streams: [
					{
						stream: redactionStream,
						level: 'trace',
					},
				],
			});

			logger.info('API request', {
				headers: {
					authorization: 'Bearer token123',
					cookie: 'session=abc123',
					'x-api-key': 'secret-key',
					'content-type': 'application/json',
				},
			});

			await logger.flush();

			const output = capturedOutput[0];
			const parsed = JSON.parse(output);

			expect(parsed.headers.authorization).toBe('[REDACTED]');
			expect(parsed.headers.cookie).toBe('[REDACTED]');
			expect(parsed.headers['x-api-key']).toBe('[REDACTED]');
			expect(parsed.headers['content-type']).toBe('application/json');
		});
	});

	describe('Pattern matching', () => {
		it('should redact credit card numbers', async () => {
			// RED: Test fails because implementation doesn't exist
			const config: RedactionConfig = {
				patterns: [
					{
						pattern: '\\b\\d{4}[ -]?\\d{4}[ -]?\\d{4}[ -]?\\d{4}\\b',
						replacement: '[REDACTED_CC]',
					},
				],
			};

			const redactionStream = createRedactionStream(baseStream, config);
			const logger = new Logger({
				level: 'info',
				format: 'json',
				streams: [
					{
						stream: redactionStream,
						level: 'trace',
					},
				],
			});

			logger.info('Payment processed', {
				cardNumber: '4111-1111-1111-1111',
				message: 'Card on file: 4111111111111111',
				notes: 'Customer provided 4111 1111 1111 1111',
			});

			await logger.flush();

			const output = capturedOutput[0];
			const parsed = JSON.parse(output);

			expect(parsed.cardNumber).toBe('[REDACTED_CC]');
			expect(parsed.message).toContain('[REDACTED_CC]');
			expect(parsed.notes).toContain('[REDACTED_CC]');
		});

		it('should redact social security numbers', async () => {
			// RED: Test fails because implementation doesn't exist
			const config: RedactionConfig = {
				patterns: [
					{
						pattern: '\\b\\d{3}[ -]?\\d{2}[ -]?\\d{4}\\b',
						replacement: '[REDACTED_SSN]',
					},
				],
			};

			const redactionStream = createRedactionStream(baseStream, config);
			const logger = new Logger({
				level: 'info',
				format: 'json',
				streams: [
					{
						stream: redactionStream,
						level: 'trace',
					},
				],
			});

			logger.info('User profile updated', {
				ssn: '123-45-6789',
				taxId: '123456789',
			});

			await logger.flush();

			const output = capturedOutput[0];
			const parsed = JSON.parse(output);

			expect(parsed.ssn).toBe('[REDACTED_SSN]');
			expect(parsed.taxId).toBe('[REDACTED_SSN]');
		});
	});

	describe('Nested object redaction', () => {
		it('should redact sensitive data in nested objects', async () => {
			// RED: Test fails because implementation doesn't exist
			const config: RedactionConfig = {
				patterns: [
					{
						pattern: 'secret',
						fields: ['secret', 'token'],
						replacement: '[HIDDEN]',
					},
				],
			};

			const redactionStream = createRedactionStream(baseStream, config);
			const logger = new Logger({
				level: 'info',
				format: 'json',
				streams: [
					{
						stream: redactionStream,
						level: 'trace',
					},
				],
			});

			logger.info('Complex data structure', {
				user: {
					profile: {
						secret: 'user-secret',
						publicInfo: 'safe-data',
					},
					tokens: {
						access: 'secret-token',
						refresh: 'refresh-token',
					},
				},
				metadata: {
					secretKey: 'should-be-redacted',
				},
			});

			await logger.flush();

			const output = capturedOutput[0];
			const parsed = JSON.parse(output);

			expect(parsed.user.profile.secret).toBe('[HIDDEN]');
			expect(parsed.user.profile.publicInfo).toBe('safe-data');
			expect(parsed.user.tokens.access).toBe('[HIDDEN]');
			expect(parsed.user.tokens.refresh).toBe('refresh-token');
			expect(parsed.metadata.secretKey).toBe('[HIDDEN]');
		});
	});

	describe('Array redaction', () => {
		it('should redact sensitive data in arrays', async () => {
			// RED: Test fails because implementation doesn't exist
			const config: RedactionConfig = {
				patterns: [
					{
						pattern: 'password',
						fields: ['password'],
						replacement: '[REDACTED]',
					},
				],
			};

			const redactionStream = createRedactionStream(baseStream, config);
			const logger = new Logger({
				level: 'info',
				format: 'json',
				streams: [
					{
						stream: redactionStream,
						level: 'trace',
					},
				],
			});

			logger.info('User batch operation', {
				users: [
					{ id: 1, password: 'pass1' },
					{ id: 2, password: 'pass2', credentials: { password: 'nested-pass' } },
				],
				passwords: ['old-pass', 'new-pass'],
			});

			await logger.flush();

			const output = capturedOutput[0];
			const parsed = JSON.parse(output);

			expect(parsed.users[0].password).toBe('[REDACTED]');
			expect(parsed.users[1].password).toBe('[REDACTED]');
			expect(parsed.users[1].credentials.password).toBe('[REDACTED]');
			expect(parsed.passwords[0]).toBe('[REDACTED]');
			expect(parsed.passwords[1]).toBe('[REDACTED]');
		});
	});

	describe('Custom redaction rules', () => {
		it('should apply custom redaction functions', async () => {
			// RED: Test fails because implementation doesn't exist
			const config: RedactionConfig = {
				patterns: [
					{
						pattern: 'email',
						fields: ['email'],
						replacement: (value: string) => {
							const [username, domain] = value.split('@');
							return `${username.substring(0, 3)}***@${domain}`;
						},
					},
				],
			};

			const redactionStream = createRedactionStream(baseStream, config);
			const logger = new Logger({
				level: 'info',
				format: 'json',
				streams: [
					{
						stream: redactionStream,
						level: 'trace',
					},
				],
			});

			logger.info('User registration', {
				email: 'john.doe@example.com',
				secondaryEmail: 'jane@example.com',
			});

			await logger.flush();

			const output = capturedOutput[0];
			const parsed = JSON.parse(output);

			expect(parsed.email).toBe('joh***@example.com');
			expect(parsed.secondaryEmail).toBe('jan***@example.com');
		});
	});

	describe('Performance and safety', () => {
		it('should handle circular references during redaction', async () => {
			// RED: Test fails because implementation doesn't exist
			const config: RedactionConfig = {
				patterns: [
					{
						pattern: 'secret',
						fields: ['secret'],
						replacement: '[REDACTED]',
					},
				],
			};

			const redactionStream = createRedactionStream(baseStream, config);
			const logger = new Logger({
				level: 'info',
				format: 'json',
				streams: [
					{
						stream: redactionStream,
						level: 'trace',
					},
				],
			});

			const circular: any = { name: 'test' };
			circular.self = circular;
			circular.secret = 'should-be-redacted';

			logger.info('Circular reference test', { obj: circular });

			await logger.flush();

			const output = capturedOutput[0];
			expect(() => JSON.parse(output)).not.toThrow();
			const parsed = JSON.parse(output);
			expect(parsed.obj.secret).toBe('[REDACTED]');
		});

		it('should have minimal performance impact for non-sensitive data', async () => {
			// RED: Test fails because implementation doesn't exist
			const config: RedactionConfig = {
				patterns: [
					{
						pattern: 'password',
						fields: ['password'],
						replacement: '[REDACTED]',
					},
				],
			};

			const redactionStream = createRedactionStream(baseStream, config);
			const logger = new Logger({
				level: 'info',
				format: 'json',
				streams: [
					{
						stream: redactionStream,
						level: 'trace',
					},
				],
			});

			const start = process.hrtime.bigint();

			for (let i = 0; i < 1000; i++) {
				logger.info('Non-sensitive message', { index: i, data: 'safe' });
			}

			await logger.flush();

			const end = process.hrtime.bigint();
			const duration = Number(end - start) / 1000000;

			expect(duration).toBeLessThan(100); // Should be fast
			expect(capturedOutput).toHaveLength(1000);
		});
	});
});
