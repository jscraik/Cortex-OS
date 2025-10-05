import {
	createGraphRAGService,
	createMemoryProviderFromEnv,
	type GraphRAGService,
	type MemoryProvider,
} from '@cortex-os/memory-core';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { pino } from 'pino';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { graphragRoutes } from './routes/graphrag.js';
import { memoryRoutes } from './routes/memory.js';
import { openApiDocument } from './utils/swagger.js';

const logger = pino({ level: 'info' });

interface RestApiConfig {
	port?: number;
	host?: string;
	enableCors?: boolean;
	enableRateLimit?: boolean;
	rateLimitWindowMs?: number;
	rateLimitMax?: number;
	enableSwagger?: boolean;
	basePath?: string;
}

class MemoryRestApi {
	private app: express.Application;
	private provider: MemoryProvider;
	private config: RestApiConfig;
	private server?: any;
	private graphService: GraphRAGService;
	private graphReady: Promise<void>;

	constructor(config: RestApiConfig = {}) {
		this.config = {
			port: 9700,
			host: '127.0.0.1',
			enableCors: true,
			enableRateLimit: true,
			rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
			rateLimitMax: 1000, // 1000 requests per window
			enableSwagger: process.env.NODE_ENV !== 'production',
			basePath: '/api/v1',
			...config,
		};

		this.app = express();
		this.provider = createMemoryProviderFromEnv();
		this.graphService = createGraphRAGService();
		this.graphReady = this.graphService.initialize(defaultDenseEmbedding, defaultSparseEmbedding);
		this.setupMiddleware();
		this.setupRoutes();
		this.setupErrorHandling();
	}

	private setupMiddleware(): void {
		// Security
		this.app.use(helmet());

		// CORS
		if (this.config.enableCors) {
			this.app.use(
				cors({
					origin: process.env.CORS_ORIGIN || '*',
					credentials: true,
				}),
			);
		}

		// Rate limiting
		if (this.config.enableRateLimit) {
			this.app.use(
				rateLimit({
					windowMs: this.config.rateLimitWindowMs!,
					max: this.config.rateLimitMax,
					message: {
						error: 'brAInwav Memory API: Too many requests',
						retryAfter: this.config.rateLimitWindowMs! / 1000,
					},
				}),
			);
		}

		// Logging
		this.app.use(pinoHttp());

		// Body parsing
		this.app.use(express.json({ limit: '10mb' }));
		this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

		// Request logging
		this.app.use(requestLogger);
	}

	private setupRoutes(): void {
		const basePath = this.config.basePath!;

		// Health checks
		this.app.get('/healthz', async (_req, res) => {
			try {
				const health = await this.provider.healthCheck();
				res.status(health.healthy ? 200 : 503).json({
					status: health.healthy ? 'healthy' : 'unhealthy',
					timestamp: new Date().toISOString(),
					version: '0.1.0',
					details: health.details,
					branding: 'brAInwav Memory API',
				});
			} catch (error) {
				res.status(503).json({
					status: 'unhealthy',
					timestamp: new Date().toISOString(),
					error: `brAInwav Memory API Error: ${(error as Error).message}`,
					branding: 'brAInwav Memory API',
				});
			}
		});

		this.app.get('/readyz', async (_req, res) => {
			const health = await this.provider.healthCheck();
			res.status(health.healthy ? 200 : 503).json({
				ready: health.healthy,
				timestamp: new Date().toISOString(),
				branding: 'brAInwav Memory API',
			});
		});

		// API routes
		this.app.use(`${basePath}/memory`, memoryRoutes(this.provider));
		this.app.use(`${basePath}/graphrag`, graphragRoutes(this.graphService));

		// OpenAPI documentation
		if (this.config.enableSwagger) {
			this.app.use('/api-docs', swaggerUi.serve);
			this.app.get(
				'/api-docs',
				swaggerUi.setup(openApiDocument, {
					explorer: true,
					customCss: '.swagger-ui .topbar { display: none }',
				}),
			);
			this.app.get('/openapi.json', (_req, res) => {
				res.json(openApiDocument);
			});
		}

		// 404 handler
		this.app.use('*', (req, res) => {
			res.status(404).json({
				error: 'Not Found',
				message: `Route ${req.method} ${req.originalUrl} not found`,
				timestamp: new Date().toISOString(),
			});
		});
	}

	private setupErrorHandling(): void {
		this.app.use(errorHandler);
	}

	async start(): Promise<void> {
		const port = this.config.port!;
		const host = this.config.host!;

		await this.graphReady.catch((error) => {
			logger.error('Failed to initialize GraphRAG service', { error: (error as Error).message });
			throw error;
		});

		this.server = this.app.listen(port, host, () => {
			logger.info(`Memory REST API server listening on http://${host}:${port}`);
			logger.info(`API documentation available at http://${host}:${port}/api-docs`);
			logger.info(`OpenAPI spec available at http://${host}:${port}/openapi.json`);
		});

		// Graceful shutdown
		process.on('SIGTERM', () => this.shutdown());
		process.on('SIGINT', () => this.shutdown());
	}

	private async shutdown(): Promise<void> {
		logger.info('Shutting down REST API server...');

		if (this.server) {
			await new Promise<void>((resolve) => {
				this.server.close(() => resolve());
			});
		}

		await Promise.allSettled([this.provider.close?.(), this.graphService.close()]);
		logger.info('REST API server stopped');
		process.exit(0);
	}

	getApp(): express.Application {
		return this.app;
	}
}

function defaultDenseEmbedding(text: string): Promise<number[]> {
	const dimension = 128;
	const vector = new Array<number>(dimension).fill(0);
	for (let i = 0; i < text.length; i += 1) {
		vector[text.charCodeAt(i) % dimension] += 1;
	}
	const norm = Math.hypot(...vector) || 1;
	return Promise.resolve(vector.map((value) => value / norm));
}

function defaultSparseEmbedding(text: string): Promise<{ indices: number[]; values: number[] }> {
	const tokens = text
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter(Boolean);
	const bucketSize = 2048;
	const counts = new Map<number, number>();
	for (const token of tokens) {
		let hash = 0;
		for (let i = 0; i < token.length; i += 1) {
			hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
		}
		const index = hash % bucketSize;
		counts.set(index, (counts.get(index) ?? 0) + 1);
	}
	const total = tokens.length || 1;
	const indices: number[] = [];
	const values: number[] = [];
	for (const [index, value] of counts.entries()) {
		indices.push(index);
		values.push(value / total);
	}
	return Promise.resolve({ indices, values });
}

// Start the server if run directly
async function main(): Promise<void> {
	try {
		const api = new MemoryRestApi({
			port: parseInt(process.env.API_PORT || '9700', 10),
			host: process.env.API_HOST || '127.0.0.1',
			enableSwagger: process.env.ENABLE_SWAGGER !== 'false',
		});
		await api.start();
	} catch (error) {
		logger.error('Failed to start REST API server', { error: (error as Error).message });
		process.exit(1);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}

export { MemoryRestApi };
