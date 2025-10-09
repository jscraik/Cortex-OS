import type http from 'node:http';
import type { Logger } from 'pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type CloseCallback = (error?: Error | null) => void;
type CloseFn = (callback?: CloseCallback) => void;
type ListenFn = () => void;
type ErrorHandler = (error: NodeJS.ErrnoException) => void;

interface MockServer {
	close: CloseFn;
	listen: ListenFn;
	on: (event: string, handler: (...args: unknown[]) => void) => MockServer;
}

const closeMock = vi.fn<CloseFn>();
const listenMock = vi.fn<ListenFn>();
const createServerMock = vi.fn<(listener: http.RequestListener) => void>();

let errorHandlers: ErrorHandler[] = [];

vi.mock('node:http', async () => {
	return {
		default: {
			createServer: ((listener: http.RequestListener) => {
				const server: MockServer = {
					close: (callback) => {
						closeMock(callback);
						callback?.(null);
					},
					listen: () => {
						listenMock();
					},
					on: (event, handler) => {
						if (event === 'error') {
							errorHandlers.push(handler as ErrorHandler);
						}
						return server;
					},
				};
				createServerMock(listener);
				return server as unknown as http.Server;
			}) as typeof http.createServer,
		},
	};
});

const { startMetricsServer } = await import('./metrics-server.js');
const { initializeMetrics } = await import('./metrics.js');

const createLoggerStub = () => {
	const stub = {
		debug: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	};
	return stub as unknown as Logger;
};

beforeEach(() => {
	errorHandlers = [];
	closeMock.mockClear();
	listenMock.mockClear();
	createServerMock.mockClear();
	closeMock.mockImplementation((callback) => {
		callback?.(null);
	});
	listenMock.mockImplementation(() => undefined);
});

describe('startMetricsServer', () => {
	it('logs a warning and skips shutdown when listen throws EADDRINUSE synchronously', async () => {
		initializeMetrics('test-brand');
		listenMock.mockImplementation(() => {
			const error = new Error('in use') as NodeJS.ErrnoException;
			error.code = 'EADDRINUSE';
			throw error;
		});
		const logger = createLoggerStub();

		const handle = startMetricsServer({
			brandPrefix: 'test-brand',
			host: '127.0.0.1',
			logger,
			path: '/metrics',
			port: 1234,
		});

		expect(logger.warn).toHaveBeenCalledWith(
			{ branding: 'test-brand', host: '127.0.0.1', path: '/metrics', port: 1234 },
			'Prometheus metrics endpoint disabled: port already in use',
		);
		expect(closeMock).toHaveBeenCalledTimes(1);

		await expect(handle.close()).resolves.toBeUndefined();
		expect(logger.debug).toHaveBeenCalledWith(
			{ branding: 'test-brand' },
			'Prometheus metrics endpoint not active; skipping shutdown',
		);
	});

	it('logs an error when listen throws an unexpected error', () => {
		initializeMetrics('test-brand');
		listenMock.mockImplementation(() => {
			const error = new Error('permission denied') as NodeJS.ErrnoException;
			error.code = 'EACCES';
			throw error;
		});
		const logger = createLoggerStub();

		startMetricsServer({
			brandPrefix: 'test-brand',
			host: '127.0.0.1',
			logger,
			port: 4321,
		});

		expect(logger.error).toHaveBeenCalledWith(
			{
				branding: 'test-brand',
				host: '127.0.0.1',
				path: '/metrics',
				port: 4321,
				error: 'permission denied',
			},
			'Prometheus metrics endpoint failed',
		);
		expect(closeMock).toHaveBeenCalledTimes(1);
	});

	it('handles asynchronous error events emitted after listen succeeds', () => {
		initializeMetrics('test-brand');
		const logger = createLoggerStub();

		startMetricsServer({
			brandPrefix: 'test-brand',
			host: '127.0.0.1',
			logger,
			port: 5678,
		});

		expect(errorHandlers.length).toBeGreaterThan(0);
		const error = new Error('in use later') as NodeJS.ErrnoException;
		error.code = 'EADDRINUSE';
		errorHandlers.forEach((handler) => handler(error));

		expect(logger.warn).toHaveBeenCalledWith(
			{ branding: 'test-brand', host: '127.0.0.1', path: '/metrics', port: 5678 },
			'Prometheus metrics endpoint disabled: port already in use',
		);
		expect(closeMock).toHaveBeenCalledTimes(1);
	});
});
