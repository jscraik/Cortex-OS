// Observability utility tests
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatStreamEventSchema } from '../../utils/observability';
import { logEvent, makeDoneEvent, makeStartEvent } from '../../utils/observability';

// Mock logger
vi.mock('../../utils/logger', () => ({
	default: {
		info: vi.fn(),
		warn: vi.fn(),
	},
}));

describe('Observability Utils', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('makeStartEvent', () => {
		it('should create a valid start event with timestamp', () => {
			const input = {
				sessionId: 'session-123',
				model: 'gpt-4',
				lastUserId: 'user-456'
			};

			const event = makeStartEvent(input);

			expect(event.evt).toBe('chat.stream.start');
			expect(event.sessionId).toBe('session-123');
			expect(event.model).toBe('gpt-4');
			expect(event.lastUserId).toBe('user-456');
			expect(event.ts).toBeDefined();
			expect(typeof event.ts).toBe('string');
			expect(event.ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
		});

		it('should validate required fields', () => {
			const input = {
				sessionId: '',
				model: 'gpt-4',
				lastUserId: 'user-456'
			};

			expect(() => makeStartEvent(input)).toThrow();
		});

		it('should accept additional properties', () => {
			const input = {
				sessionId: 'session-789',
				model: 'claude-3',
				lastUserId: 'user-999'
			};

			const event = makeStartEvent(input);

			expect(ChatStreamEventSchema.safeParse(event).success).toBe(true);
		});
	});

	describe('makeDoneEvent', () => {
		it('should create a valid done event with timestamp', () => {
			const input = {
				sessionId: 'session-123',
				model: 'gpt-4',
				messageId: 'msg-456',
				durationMs: 1500,
				tokenCount: 250,
				textSize: 1000
			};

			const event = makeDoneEvent(input);

			expect(event.evt).toBe('chat.stream.done');
			expect(event.sessionId).toBe('session-123');
			expect(event.model).toBe('gpt-4');
			expect(event.messageId).toBe('msg-456');
			expect(event.durationMs).toBe(1500);
			expect(event.tokenCount).toBe(250);
			expect(event.textSize).toBe(1000);
			expect(event.ts).toBeDefined();
			expect(typeof event.ts).toBe('string');
			expect(event.ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
		});

		it('should validate non-negative numbers', () => {
			const input = {
				sessionId: 'session-123',
				model: 'gpt-4',
				messageId: 'msg-456',
				durationMs: -1,
				tokenCount: 0,
				textSize: 100
			};

			expect(() => makeDoneEvent(input)).toThrow();
		});

		it('should accept zero values', () => {
			const input = {
				sessionId: 'session-123',
				model: 'gpt-4',
				messageId: 'msg-456',
				durationMs: 0,
				tokenCount: 0,
				textSize: 0
			};

			const event = makeDoneEvent(input);

			expect(event.durationMs).toBe(0);
			expect(event.tokenCount).toBe(0);
			expect(event.textSize).toBe(0);
		});
	});

	describe('logEvent', () => {
		let logger: any;

		beforeEach(() => {
			// Import the mocked logger
			const loggerModule = await import('../../utils/logger');
			logger = loggerModule.default;
		});

		it('should log valid start events', async () => {
			const event = makeStartEvent({
				sessionId: 'session-123',
				model: 'gpt-4',
				lastUserId: 'user-456'
			});

			logEvent(event);

			expect(logger.info).toHaveBeenCalledWith('obs:event', expect.objectContaining({
				evt: 'chat.stream.start',
				sessionId: 'session-123',
				model: 'gpt-4',
				lastUserId: 'user-456'
			}));
		});

		it('should log valid done events', async () => {
			const event = makeDoneEvent({
				sessionId: 'session-123',
				model: 'gpt-4',
				messageId: 'msg-456',
				durationMs: 1500,
				tokenCount: 250,
				textSize: 1000
			});

			logEvent(event);

			expect(logger.info).toHaveBeenCalledWith('obs:event', expect.objectContaining({
				evt: 'chat.stream.done',
				sessionId: 'session-123',
				model: 'gpt-4',
				messageId: 'msg-456',
				durationMs: 1500,
				tokenCount: 250,
				textSize: 1000
			}));
		});

		it('should log warnings for invalid events', () => {
			const invalidEvent = {
				evt: 'invalid.event.type',
				sessionId: 'session-123'
			} as any;

			logEvent(invalidEvent);

			expect(logger.warn).toHaveBeenCalledWith('obs:event_invalid', expect.any(Object));
		});

		it('should handle malformed events gracefully', () => {
			const malformedEvent = {
				evt: 'chat.stream.start',
				// Missing required sessionId
				model: 'gpt-4'
			} as any;

			logEvent(malformedEvent);

			expect(logger.warn).toHaveBeenCalled();
		});
	});
});