import { createServer as createHttpServer, type Server } from 'node:http';
import { app } from './index';

export interface HttpServerOptions {
	port?: number;
	host?: string;
}

export class HttpServer {
	private server: Server | null = null;
	private port: number;
	private host: string;

	constructor(options: HttpServerOptions = {}) {
		this.port = options.port || 3000;
		this.host = options.host || 'localhost';
	}

	async start(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.server = createHttpServer(app);

			this.server.listen(this.port, this.host, () => {
				console.log(`Server running at http://${this.host}:${this.port}`);
				resolve();
			});

			this.server.on('error', (error: any) => {
				if (error.code === 'EADDRINUSE') {
					reject(new Error(`Port ${this.port} is already in use`));
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
