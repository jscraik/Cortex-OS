// @vitest-environment node
import type { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/logger.js', () => {
	const logError = vi.fn();
	const logInfo = vi.fn();
	return { logError, logInfo };
});

import { createASBRServer } from '../../src/api/server.js';
import { logError } from '../../src/lib/logger.js';

function getEventsHandler(app: any) {
	const stack: any[] = app?._router?.stack ?? [];
	for (const layer of stack) {
		if (layer?.route?.path === '/v1/events') {
			const boundHandler = layer.route.stack.find(
				(entry: any) => entry.name === 'bound getEvents',
			);
			if (boundHandler) {
				return boundHandler.handle;
			}
		}
	}
	throw new Error('getEvents handler not found');
}

describe('getEvents auto-close behaviour', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.resetAllMocks();
	});

	it('logs when auto-close fails to end the response', async () => {
		const server = createASBRServer({ port: 0, host: '127.0.0.1' });

		try {
			const app: any = server.app;
			const handler = getEventsHandler(app);

			const req = {
				query: { stream: 'sse' },
				headers: {
					'user-agent': 'supertest',
					accept: 'text/event-stream',
				},
				on: vi.fn(() => req),
			} as unknown as Request;

			const error = new Error('end failed');
			const res = {
				writeHead: vi.fn(),
				write: vi.fn(),
				end: vi.fn(() => {
					throw error;
				}),
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
				writableEnded: false,
			} as unknown as Response;

			const result = handler(req, res);

			await vi.advanceTimersByTimeAsync(100);
			await result;

			expect(logError).toHaveBeenCalledWith(
				'Failed to close SSE stream gracefully',
				expect.objectContaining({
					error: expect.objectContaining({ message: 'end failed' }),
				}),
			);
		} finally {
			await server.stop();
		}
	});
});
