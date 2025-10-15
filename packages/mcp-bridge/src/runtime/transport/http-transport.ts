import http from 'node:http';
import https from 'node:https';
import net, { type Socket } from 'node:net';
import { pipeline } from 'node:stream/promises';
import type { FastMCP } from 'fastmcp';
import type { Logger } from 'pino';

type ProxyServer = http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;

export type CustomRouteHandler = (
	req: http.IncomingMessage,
	res: http.ServerResponse,
) => Promise<boolean>;

export interface HttpTransportOptions {
	server: FastMCP;
	host: string;
	port: number;
	endpoint: string;
	logger: Logger;
	customHandler: CustomRouteHandler;
}

export interface HttpTransportHandle {
	stop: () => Promise<void>;
}

const INTERNAL_HOST = '127.0.0.1';

export async function startHttpTransport(options: HttpTransportOptions): Promise<HttpTransportHandle> {
	const { server, host, port, endpoint, customHandler, logger } = options;

	const internalPort = await allocateEphemeralPort(INTERNAL_HOST);

	await server.start({
		transportType: 'httpStream',
		httpStream: {
			host: INTERNAL_HOST,
			port: internalPort,
			endpoint: endpoint as `/${string}`,
			enableJsonResponse: true,
			stateless: true,
		},
	});

	const proxyServer = await createProxyServer({
		publicHost: host,
		publicPort: port,
		internalPort,
		customHandler,
		logger,
	});

	logger.info(
		{
			brand: 'brAInwav',
			component: 'http-transport',
			host,
			port,
			internalPort,
			endpoint,
		},
		'HTTP proxy transport ready',
	);

	return {
		stop: async () => {
			await new Promise<void>((resolve) => {
				proxyServer.close(() => resolve());
			});
			await server.stop();
			logger.info({ brand: 'brAInwav', component: 'http-transport' }, 'HTTP proxy transport stopped');
		},
	};
}

async function allocateEphemeralPort(host: string): Promise<number> {
	return new Promise<number>((resolve, reject) => {
		const socket = net.createServer();
		socket.once('error', reject);
		socket.listen(0, host, () => {
			const address = socket.address();
			if (typeof address === 'object' && address) {
				const port = address.port;
				socket.close(() => resolve(port));
			} else {
				socket.close(() =>
					reject(new Error('Failed to allocate internal port for FastMCP HTTP transport')),
				);
			}
		});
	});
}

interface ProxyServerOptions {
	publicHost: string;
	publicPort: number;
	internalPort: number;
	customHandler: CustomRouteHandler;
	logger: Logger;
}

async function createProxyServer(options: ProxyServerOptions): Promise<ProxyServer> {
	const { publicHost, publicPort, internalPort, customHandler, logger } = options;

	const server = http.createServer(async (req, res) => {
		try {
			const handled = await customHandler(req, res);
			if (handled) {
				return;
			}

			await proxyRequest(req, res, { targetPort: internalPort, logger });
		} catch (error) {
			logger.error(
				{
					brand: 'brAInwav',
					component: 'http-transport',
					err: error instanceof Error ? error.message : String(error),
				},
				'Failed to proxy request',
			);

			if (!res.headersSent) {
				res.writeHead(502, { 'Content-Type': 'application/json' });
			}
			if (!res.writableEnded) {
				res.end(JSON.stringify({ error: 'Bad Gateway' }));
			}
		}
	});

	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(publicPort, publicHost, () => resolve());
	});

	return server;
}

interface ProxyRequestOptions {
	targetPort: number;
	logger: Logger;
}

async function proxyRequest(
	req: http.IncomingMessage,
	res: http.ServerResponse,
	options: ProxyRequestOptions,
): Promise<void> {
	const { targetPort, logger } = options;

	const socket = req.socket as Socket & { encrypted?: boolean };
	const isSecure = socket?.encrypted === true;
	const transport = isSecure ? https : http;

	await new Promise<void>((resolve, reject) => {
		const proxyReq = transport.request(
			{
				hostname: INTERNAL_HOST,
				port: targetPort,
				path: req.url,
				method: req.method,
				headers: sanitizeHeaders(req.headers),
			},
			async (proxyRes) => {
				res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
				try {
					await pipeline(proxyRes, res);
					resolve();
				} catch (err) {
					reject(err);
				}
			},
		);

		proxyReq.setTimeout(0);

		proxyReq.on('error', (err) => {
			logger.error(
				{
					brand: 'brAInwav',
					component: 'http-transport',
					err: err instanceof Error ? err.message : String(err),
				},
				'Proxy request error',
			);
			reject(err);
		});

		void pipeline(req, proxyReq).catch(reject);
	});
}

function sanitizeHeaders(headers: http.IncomingHttpHeaders): http.OutgoingHttpHeaders {
	const clean: http.OutgoingHttpHeaders = {};
	for (const [key, value] of Object.entries(headers)) {
		if (value === undefined) continue;
		if (key.toLowerCase() === 'host') continue;
		clean[key] = value;
	}
	return clean;
}

export { sanitizeHeaders };
