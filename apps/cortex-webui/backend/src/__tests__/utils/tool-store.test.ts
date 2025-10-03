// Tool store utility tests
import { beforeEach, describe, expect, it } from 'vitest';
import { addToolEvent, getToolEvents, redactArgs } from '../../utils/tool-store';

describe('Tool Store Utils', () => {
	beforeEach(() => {
		// Clear the global tool store before each test
		const store = (globalThis as any).__cortexToolStore;
		if (store) {
			store.clear();
		}
	});

	describe('getToolEvents', () => {
		it('should return empty array for non-existent session', () => {
			const events = getToolEvents('non-existent-session');
			expect(events).toEqual([]);
		});

		it('should return events for existing session', () => {
			const sessionId = 'test-session-123';
			addToolEvent(sessionId, { name: 'test-tool', status: 'start' });

			const events = getToolEvents(sessionId);
			expect(events).toHaveLength(1);
			expect(events[0].name).toBe('test-tool');
			expect(events[0].status).toBe('start');
		});

		it('should return events in chronological order', () => {
			const sessionId = 'test-session-456';
			addToolEvent(sessionId, { name: 'tool-1', status: 'start' });
			addToolEvent(sessionId, { name: 'tool-2', status: 'complete' });

			const events = getToolEvents(sessionId);
			expect(events).toHaveLength(2);
			expect(events[0].name).toBe('tool-1');
			expect(events[1].name).toBe('tool-2');
		});
	});

	describe('addToolEvent', () => {
		it('should add event with generated ID and timestamp', () => {
			const sessionId = 'test-session-789';
			const event = addToolEvent(sessionId, { name: 'new-tool', status: 'complete' });

			expect(event.id).toBeDefined();
			expect(event.name).toBe('new-tool');
			expect(event.status).toBe('complete');
			expect(event.createdAt).toBeDefined();
			expect(typeof event.id).toBe('string');
			expect(typeof event.createdAt).toBe('string');
		});

		it('should use provided ID when given', () => {
			const sessionId = 'test-session-abc';
			const customId = 'custom-event-id';
			const event = addToolEvent(sessionId, {
				name: 'tool-with-id',
				id: customId,
				status: 'start',
			});

			expect(event.id).toBe(customId);
		});

		it('should redact sensitive arguments', () => {
			const sessionId = 'test-session-def';
			const event = addToolEvent(sessionId, {
				name: 'sensitive-tool',
				args: {
					apiKey: 'secret-key-123',
					publicData: 'this is public',
				},
			});

			expect(event.args?.apiKey).toBe('[REDACTED]');
			expect(event.args?.publicData).toBe('this is public');
		});
	});

	describe('redactArgs', () => {
		it('should redact sensitive keys', () => {
			const args = {
				apiKey: 'secret-key',
				token: 'auth-token',
				normalField: 'normal-value',
				password: 'user-password',
			};

			const redacted = redactArgs(args);

			expect(redacted.apiKey).toBe('[REDACTED]');
			expect(redacted.token).toBe('[REDACTED]');
			expect(redacted.password).toBe('[REDACTED]');
			expect(redacted.normalField).toBe('normal-value');
		});

		it('should redact email addresses', () => {
			const args = {
				message: 'Send to user@example.com',
				text: 'Contact support@company.org for help',
			};

			const redacted = redactArgs(args);

			expect(redacted.message).toBe('Send to [EMAIL]');
			expect(redacted.text).toBe('Contact [EMAIL] for help');
		});

		it('should redact bearer tokens', () => {
			const args = {
				headerValue: 'Bearer abc123def456',
				dataString: 'Bearer token789',
			};

			const redacted = redactArgs(args);

			expect(redacted.headerValue).toBe('Bearer [REDACTED]');
			expect(redacted.dataString).toBe('Bearer [REDACTED]');
		});

		it('should handle nested objects', () => {
			const args = {
				config: {
					apiKey: 'nested-key',
					settings: {
						token: 'deep-token',
					},
				},
				safe: 'value',
			};

			const redacted = redactArgs(args);

			expect(redacted.config?.apiKey).toBe('[REDACTED]');
			expect(redacted.config?.settings?.token).toBe('[REDACTED]');
			expect(redacted.safe).toBe('value');
		});

		it('should handle arrays', () => {
			const args = {
				items: [{ apiKey: 'key1', value: 'val1' }, { normalField: 'val2' }],
			};

			const redacted = redactArgs(args);

			expect(redacted.items[0]?.apiKey).toBe('[REDACTED]');
			expect(redacted.items[0]?.value).toBe('val1');
			expect(redacted.items[1]?.normalField).toBe('val2');
		});

		it('should handle circular references', () => {
			const obj: any = { name: 'test' };
			obj.self = obj;

			const redacted = redactArgs({ circular: obj });

			expect(redacted.circular?.self).toBe('[Circular]');
		});

		it('should not modify primitive values', () => {
			const args = {
				number: 42,
				boolean: true,
				null: null,
				undefined: undefined,
				string: 'normal string',
			};

			const redacted = redactArgs(args);

			expect(redacted).toEqual(args);
		});

		it('should handle case-insensitive sensitive keys', () => {
			const args = {
				APIKEY: 'uppercase-key',
				Secret_Value: 'mixed-case-secret',
				authTOKEN: 'another-token',
			};

			const redacted = redactArgs(args);

			expect(redacted.APIKEY).toBe('[REDACTED]');
			expect(redacted.Secret_Value).toBe('[REDACTED]');
			expect(redacted.authTOKEN).toBe('[REDACTED]');
		});
	});
});
