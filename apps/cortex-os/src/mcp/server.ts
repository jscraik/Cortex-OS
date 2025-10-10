import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';
import { ALLOWED_ORIGINS } from '@cortex-os/security';
import type { ShutdownResult } from '../operational/shutdown-result.js';
import type { McpGateway } from './gateway.js';

const MCP_CORS_METHODS = 'GET,POST,OPTIONS';
const MCP_CORS_HEADERS = 'Content-Type, Authorization, Accept';

/**
 * Apply CORS headers with whitelist validation
 * CodeQL Fix #213, #212: Replaces origin reflection with whitelist validation
 * @param req - Incoming HTTP request
 * @param res - Server response
 */
function applyCors(req: IncomingMessage, res: ServerResponse) {
	const requestOrigin = req.headers.origin;

	// Validate origin against whitelist
	const allowedOrigin =
		requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0]; // Default to first allowed origin

	res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
	res.setHeader('Access-Control-Allow-Methods', MCP_CORS_METHODS);
	res.setHeader(
		'Access-Control-Allow-Headers',
		req.headers['access-control-request-headers'] ?? MCP_CORS_HEADERS,
	);
	res.setHeader('Access-Control-Allow-Credentials', 'true');
	res.setHeader('Vary', 'Origin');
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
	const payload = JSON.stringify(body);
	res.writeHead(status, {
		'Content-Type': 'application/json',
		'Content-Length': Buffer.byteLength(payload),
	});
	res.end(payload);
}

async function readRequestBody(req: IncomingMessage): Promise<string> {
	return await new Promise<string>((resolve, reject) => {
		let data = '';
		req.setEncoding('utf8');
		req.on('data', (chunk) => {
			data += chunk;
		});
		req.on('end', () => resolve(data));
		req.on('error', reject);
	});
}

function statusForError(code: string | undefined): number {
	switch (code) {
		case 'unknown_tool':
		case 'tool_not_found':
		case 'not_found':
			return 400;
		case 'forbidden':
			return 403;
		case 'rate_limited':
			return 429;
		case 'validation_failed':
		case 'invalid_request':
			return 400;
		default:
			return 500;
	}
}

function sendUnavailable(res: ServerResponse) {
	sendJson(res, 503, {
		status: 'unavailable',
		message: 'brAInwav: MCP runtime shutting down',
		timestamp: new Date().toISOString(),
	});
}

export interface McpHttpServer {
	listen(port: number, host?: string): Promise<{ port: number }>;
	close(): Promise<void>;
	beginShutdown(options?: { timeoutMs?: number }): Promise<ShutdownResult>;
}

export function createMcpHttpServer(gateway: McpGateway): McpHttpServer {
	let activeRequests = 0;
	let shuttingDown = false;
	let serverClosed = false;
	let shutdownPromise: Promise<ShutdownResult> | undefined;
	let resolveShutdown: ((result: ShutdownResult) => void) | undefined;
	let shutdownTimer: NodeJS.Timeout | undefined;

	const pendingRequests = () => activeRequests;

	const completeShutdown = (completed: boolean) => {
		if (!resolveShutdown) return;
		if (!completed) {
			serverClosed = true;
		}
		const resolver = resolveShutdown;
		resolveShutdown = undefined;
		if (shutdownTimer) {
			clearTimeout(shutdownTimer);
			shutdownTimer = undefined;
		}
		resolver({ completed, pendingRequests: pendingRequests() });
	};

	const checkShutdownCompletion = () => {
		if (!shuttingDown || !serverClosed) return;
		if (pendingRequests() === 0) {
			completeShutdown(true);
		}
	};

	const trackRequest = (res: ServerResponse) => {
		activeRequests += 1;
		let finished = false;
		const finalize = () => {
			if (finished) return;
			finished = true;
			activeRequests = Math.max(0, activeRequests - 1);
			checkShutdownCompletion();
		};

		const remove = (event: string, handler: () => void) => {
			if (typeof res.off === 'function') {
				res.off(event, handler);
			} else {
				res.removeListener(event, handler as () => void);
			}
		};

		const listeners: Array<[string, () => void]> = [
			['close', finalize],
			['finish', finalize],
			['error', finalize],
		];

		for (const [event, handler] of listeners) {
			res.once(event, handler);
		}

		return () => {
			for (const [event, handler] of listeners) {
				remove(event, handler);
			}
			finalize();
		};
	};

	const server = createServer((req, res) => {
		void (async () => {
			if (!req.url) {
				res.statusCode = 400;
				res.end();
				return;
			}

			if (shuttingDown) {
				sendUnavailable(res);
				return;
			}

			const finalize = trackRequest(res);

			try {
				const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
				applyCors(req, res);

				if (req.method === 'OPTIONS') {
					res.writeHead(204);
					res.end();
					return;
				}

				if (req.method === 'GET' && url.pathname === '/health') {
					sendJson(res, 200, {
						status: 'healthy',
						service: 'cortex-mcp',
						timestamp: new Date().toISOString(),
						version: '0.1.0',
						endpoints: ['/tools', '/tools/call', '/health'],
					});
					return;
				}

				if (req.method === 'GET' && url.pathname === '/tools') {
					sendJson(res, 200, { tools: gateway.listTools() });
					return;
				}

				if (req.method === 'POST' && url.pathname === '/tools/call') {
					let payload: string;
					try {
						payload = await readRequestBody(req);
					} catch (_error) {
						sendJson(res, 500, {
							error: { code: 'internal_error', message: 'Failed to read request body' },
						});
						return;
					}

					let parsed: unknown;
					try {
						parsed = payload.length > 0 ? JSON.parse(payload) : {};
					} catch {
						sendJson(res, 400, {
							error: { code: 'invalid_request', message: 'Request body must be valid JSON' },
						});
						return;
					}

					const body = parsed as { name?: unknown; arguments?: unknown };
					if (typeof body.name !== 'string' || body.name.trim() === '') {
						sendJson(res, 400, {
							error: { code: 'invalid_request', message: 'Tool name is required' },
						});
						return;
					}

					const args = body.arguments ?? {};
					if (
						args !== undefined &&
						(typeof args !== 'object' || args === null || Array.isArray(args))
					) {
						sendJson(res, 400, {
							error: {
								code: 'invalid_request',
								message: 'Tool arguments must be an object',
							},
						});
						return;
					}

					let result: unknown;
					try {
						result = await gateway.callTool(body.name as string, args);
					} catch (error) {
						sendJson(res, 500, {
							error: {
								code: 'internal_error',
								message: error instanceof Error ? error.message : 'Unknown error',
							},
						});
						return;
					}

					const maybeError =
						result && typeof result === 'object' && 'error' in (result as Record<string, unknown>)
							? (result as { error: { code?: string } })
							: undefined;

					if (maybeError?.error) {
						sendJson(res, statusForError(maybeError.error.code), result);
						return;
					}

					sendJson(res, 200, result ?? {});
					return;
				}

				res.statusCode = 404;
				res.end();
			} catch (error) {
				sendJson(res, 500, {
					error: {
						code: 'internal_error',
						message: error instanceof Error ? error.message : 'Unknown error',
					},
				});
			} finally {
				finalize();
			}
		})();
	});

	const beginShutdown = ({
		timeoutMs = 30_000,
	}: {
		timeoutMs?: number;
	} = {}): Promise<ShutdownResult> => {
		if (shutdownPromise) {
			return shutdownPromise;
		}

		shuttingDown = true;

		server.close((error) => {
			serverClosed = true;
			if (error) {
				console.warn('brAInwav MCP shutdown: server close error', error);
				completeShutdown(false);
				return;
			}
			checkShutdownCompletion();
		});

		shutdownPromise = new Promise<ShutdownResult>((resolve) => {
			resolveShutdown = resolve;
			if (timeoutMs >= 0) {
				shutdownTimer = setTimeout(() => completeShutdown(false), timeoutMs);
			}
			checkShutdownCompletion();
		});

		return shutdownPromise;
	};

	return {
		async listen(port, host = '127.0.0.1') {
			await new Promise<void>((resolve) => server.listen(port, host, () => resolve()));
			const address = server.address();
			if (address && typeof address === 'object') {
				return { port: address.port };
			}
			return { port };
		},
		async close() {
			await beginShutdown({ timeoutMs: 0 });
		},
		beginShutdown,
	};
}
