import { createServer as createHttpServer, type Server } from 'node:http';
import { app } from './index.js';

export interface HttpServerOptions {
	port?: number;
	host?: string;
}

export class HttpServer {
	private server: Server | null = null;
	private readonly port: number;
	private readonly host: string;

	constructor(options: HttpServerOptions = {}) {
		this.port = options.port || 3000;
		this.host = options.host || 'localhost';
	}

	async start(): Promise<void> {
		return new Promise((resolve, reject) => {
			// createHttpServer expects a Node request listener; cast the Express app to a Node request listener via unknown
			type NodeRequestListener = (
				req: import('node:http').IncomingMessage,
				res: import('node:http').ServerResponse,
			) => void;
			this.server = createHttpServer(app as unknown as NodeRequestListener);

			this.server.listen(this.port, this.host, () => {
				console.log(`brAInwav HTTP server running at http://${this.host}:${this.port}`);
				resolve();
			});

			this.server.on('error', (error: unknown) => {
				if (typeof error === 'object' && error !== null) {
					const maybe = error as Record<string, unknown>;
					if (maybe.code === 'EADDRINUSE') {
						reject(new Error(`Port ${this.port} is already in use`));
						return;
					}
				}
				// Ensure we only reject with an Error to satisfy linter and runtime expectations
				reject(error instanceof Error ? error : new Error(String(error)));
			});
		});
	}

	async stop(): Promise<void> {
		return new Promise((resolve) => {
			if (this.server) {
				this.server.close(() => {
					console.log('brAInwav HTTP server stopped');
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

export const createServerInstance = (options?: HttpServerOptions) => {
	return new HttpServer(options);
};
