import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';
import type { McpGateway } from './gateway.js';

const MCP_CORS_METHODS = 'GET,POST,OPTIONS';
const MCP_CORS_HEADERS = 'Content-Type, Authorization, Accept';

function applyCors(req: IncomingMessage, res: ServerResponse) {
	const origin = req.headers.origin ?? '*';
	res.setHeader('Access-Control-Allow-Origin', origin);
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

export interface McpHttpServer {
	listen(port: number, host?: string): Promise<{ port: number }>;
	close(): Promise<void>;
}

export function createMcpHttpServer(gateway: McpGateway): McpHttpServer {
	const server = createServer(async (req, res) => {
		try {
			if (!req.url) {
				res.statusCode = 400;
				res.end();
				return;
			}

			const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
			applyCors(req, res);

			if (req.method === 'OPTIONS') {
				res.writeHead(204);
				res.end();
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
				} catch (error) {
					sendJson(res, 500, { error: { code: 'internal_error', message: 'Failed to read request body' } });
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
				if (args !== undefined && (typeof args !== 'object' || args === null || Array.isArray(args))) {
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
		}
	});

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
			await new Promise<void>((resolve, reject) => {
				server.close((err) => (err ? reject(err) : resolve()));
			});
		},
	};
}
