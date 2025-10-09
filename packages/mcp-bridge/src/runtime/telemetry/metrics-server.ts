import http from 'node:http';
import type { Logger } from 'pino';

import { getMetricsRegistry } from './metrics.js';

export type MetricsServerOptions = {
	brandPrefix: string;
	logger: Logger;
	port: number;
	host?: string;
	path?: `/${string}`;
};

export type MetricsServerHandle = {
	close: () => Promise<void>;
	host: string;
	path: `/${string}`;
	port: number;
};

const isMetricsPath = (requestPath: string, expectedPath: string) => {
	const [pathname] = requestPath.split('?');
	return pathname === expectedPath;
};

export const startMetricsServer = ({
	brandPrefix,
	logger,
	port,
	host = '127.0.0.1',
	path = '/metrics',
}: MetricsServerOptions): MetricsServerHandle => {
	const metricsRegistry = getMetricsRegistry();
	const server = http.createServer(async (request, response) => {
		if (request.method === 'GET' && request.url && isMetricsPath(request.url, path)) {
			const metrics = await metricsRegistry.metrics();
			response.writeHead(200, {
				'Content-Type': metricsRegistry.contentType,
			});
			response.end(metrics);
			return;
		}

		response.writeHead(404, { 'Content-Type': 'text/plain' });
		response.end('Not Found');
	});

	let listening = false;
	let listenErrorHandled = false;

	const handleListenError = (error: NodeJS.ErrnoException) => {
		if (listenErrorHandled) {
			return;
		}
		listenErrorHandled = true;
		listening = false;
		if (error.code === 'EADDRINUSE') {
			logger.warn(
				{ branding: brandPrefix, host, path, port },
				'Prometheus metrics endpoint disabled: port already in use',
			);
		} else {
			const message = error instanceof Error ? error.message : String(error);
			logger.error(
				{ branding: brandPrefix, host, path, port, error: message },
				'Prometheus metrics endpoint failed',
			);
		}
		server.close(() => undefined);
	};

	server.on('error', (error: NodeJS.ErrnoException) => {
		handleListenError(error);
	});

	try {
		server.listen(port, host, () => {
			listenErrorHandled = false;
			listening = true;
			logger.info({ branding: brandPrefix, host, path, port }, 'Prometheus metrics endpoint ready');
		});
	} catch (error) {
		handleListenError(error as NodeJS.ErrnoException);
	}

	const close = async () => {
		if (!listening) {
			logger.debug(
				{ branding: brandPrefix },
				'Prometheus metrics endpoint not active; skipping shutdown',
			);
			return;
		}
		await new Promise<void>((resolve, reject) => {
			server.close((error) => {
				if (error) {
					reject(error);
					return;
				}
				resolve();
			});
		});
		listening = false;
		logger.info({ branding: brandPrefix }, 'Prometheus metrics endpoint stopped');
	};

	return {
		close,
		host,
		path,
		port,
	};
};
