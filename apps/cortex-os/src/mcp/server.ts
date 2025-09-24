import { createServer } from 'node:http';
import { URL } from 'node:url';
import type { McpGateway } from './gateway.js';

function sendJson(res: import('node:http').ServerResponse, status: number, body: unknown) {
	const payload = JSON.stringify(body);
	res.writeHead(status, {
		'Content-Type': 'application/json',
		'Content-Length': Buffer.byteLength(payload),
	});
	res.end(payload);
}

export interface McpHttpServer {
	listen(port: number, host?: string): Promise<{ port: number }>;
	close(): Promise<void>;
}

export function createMcpHttpServer(gateway: McpGateway): McpHttpServer {
	const server = createServer(async (req, res) => {
		if (!req.url) {
			res.statusCode = 400;
			res.end();
			return;
		}

		const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);

		if (req.method === 'GET' && url.pathname === '/tools') {
			sendJson(res, 200, { tools: gateway.listTools() });
			return;
		}

		res.statusCode = 404;
		res.end();
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
