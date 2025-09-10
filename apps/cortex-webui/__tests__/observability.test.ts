import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	ChatStreamDoneSchema,
	ChatStreamEventSchema,
	ChatStreamStartSchema,
	logEvent,
	makeDoneEvent,
	makeStartEvent,
} from '../utils/observability';

describe('observability helpers', () => {
	const originalEnv = { ...process.env };
	let logSpy: ReturnType<typeof vi.spyOn>;
	let errorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		process.env = { ...originalEnv };
		logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		logSpy.mockRestore();
		errorSpy.mockRestore();
	});

	it('makeStartEvent produces schema-valid events with current timestamp', () => {
		const evt = makeStartEvent({
			sessionId: 's1',
			model: 'gpt-x',
			lastUserId: 'u1',
		});
		expect(() => ChatStreamStartSchema.parse(evt)).not.toThrow();
		expect(evt.evt).toBe('chat.stream.start');
		expect(evt.sessionId).toBe('s1');
		expect(evt.model).toBe('gpt-x');
		expect(evt.lastUserId).toBe('u1');
		// sanity: ts is ISO string
		expect(() => new Date(evt.ts).toISOString()).not.toThrow();
	});

	it('makeDoneEvent produces schema-valid events with metrics', () => {
		const evt = makeDoneEvent({
			sessionId: 's1',
			model: 'gpt-x',
			messageId: 'm1',
			durationMs: 123,
			tokenCount: 10,
			textSize: 42,
		});
		expect(() => ChatStreamDoneSchema.parse(evt)).not.toThrow();
		expect(evt.evt).toBe('chat.stream.done');
	});

	it('logEvent logs valid events and errors on invalid ones', () => {
		const good = makeStartEvent({
			sessionId: 's2',
			model: 'm',
			lastUserId: 'u',
		});
		const parsed = ChatStreamEventSchema.parse(good);
		expect(parsed).toBeTruthy();

		logEvent(good);
		expect(logSpy).toHaveBeenCalledTimes(1);
		expect(errorSpy).not.toHaveBeenCalled();

		// invalid: missing required field
		// @ts-expect-error intentionally wrong shape for negative test
		const bad = {
			evt: 'chat.stream.start',
			ts: new Date().toISOString(),
			model: 'm',
		} as unknown;
		// Should not throw; should print an error
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		logEvent(bad as unknown);
		expect(errorSpy).toHaveBeenCalledTimes(1);
	});
});
