import { serve } from '@hono/node-server';
import { createServerConfig, type ServerConfig } from './config.js';
import { app } from './index.js';

export interface HttpServerOptions {
	port?: number;
	host?: string;
	config?: Partial<ServerConfig>;
}

export class HttpServer {
	private server: any = null;
	private config: ServerConfig;

	constructor(options: HttpServerOptions = {}) {
		this.config = createServerConfig(options.config);
	}

	async start(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.server = serve(
				{
					fetch: app.fetch,
					port: this.config.port,
					hostname: this.config.host,
				},
				() => {
					console.log(`Server running at http://${this.config.host}:${this.config.port}`);
					resolve();
				},
			);

			this.server.on('error', (error: any) => {
				if (error.code === 'EADDRINUSE') {
					reject(new Error(`Port ${this.config.port} is already in use`));
				} else {
					reject(error);
				}
			});
		});
	}

	async stop(): Promise<void> {
		return new Promise((resolve) => {
			if (this.server) {
				this.server.close(() => {
					console.log('Server stopped');
					resolve();
				});
			} else {
				resolve();
			}
		});
	}

	isRunning(): boolean {
		return this.server?.listening || false;
	}
}

export const createHttpServer = (options?: HttpServerOptions) => {
	return new HttpServer(options);
};
