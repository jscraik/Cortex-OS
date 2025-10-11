import { createMemoryProviderFromEnv } from '@cortex-os/memory-core';
import { corsOptions } from '@cortex-os/security';
import {
	MemoryAnalysisInputSchema,
	MemoryRelationshipsInputSchema,
	MemorySearchInputSchema,
	MemoryStatsInputSchema,
	MemoryStoreInputSchema,
} from '@cortex-os/tool-spec';
import compression from 'compression';
import cors from 'cors';
import type { Express } from 'express';
import express from 'express';
import helmet from 'helmet';
import { pino } from 'pino';

const logger = pino({ level: process.env.MEMORY_LOG_LEVEL || 'info' });

export interface LocalMemoryServerOptions {
	port?: number;
	host?: string;
}

export async function createLocalMemoryApp(): Promise<Express> {
	const provider = createMemoryProviderFromEnv();

	const app = express();
	app.disable('x-powered-by');
	// CodeQL Fix #202: Enable CSP with appropriate directives
	app.use(
		helmet({
			contentSecurityPolicy: {
				directives: {
					defaultSrc: ["'self'"],
					scriptSrc: ["'self'"],
					styleSrc: ["'self'", "'unsafe-inline'"], // Required for some UI frameworks
					imgSrc: ["'self'", 'data:', 'https:'],
					connectSrc: ["'self'", 'http://localhost:*'],
					fontSrc: ["'self'"],
					objectSrc: ["'none'"],
					mediaSrc: ["'self'"],
					frameSrc: ["'none'"],
				},
			},
			frameguard: { action: 'deny' },
		}),
	);
	// CodeQL Fix #200, #199: Replace permissive CORS with whitelist validation
	app.use(cors(corsOptions));
	app.use(compression());
	app.use(express.json({ limit: '16mb' }));

	app.get('/healthz', async (_req, res) => {
		try {
			const health = await provider.healthCheck();
			res.status(health.healthy ? 200 : 503).json({
				success: health.healthy,
				data: health,
			});
		} catch (error) {
			const message = (error as Error).message;
			res.status(503).json({
				success: false,
				error: {
					code: 'UNHEALTHY',
					message,
				},
			});
		}
	});

	app.get('/readyz', async (_req, res) => {
		try {
			const health = await provider.healthCheck();
			const ready = health.healthy === true;
			res.status(ready ? 200 : 503).json({
				success: ready,
				data: { ready },
			});
		} catch (error) {
			const message = (error as Error).message;
			res.status(503).json({
				success: false,
				error: {
					code: 'NOT_READY',
					message,
				},
			});
		}
	});

	app.post('/memory/store', async (req, res, next) => {
		try {
			const input = MemoryStoreInputSchema.parse(req.body);
			const data = await provider.store(input);
			res.status(201).json({ success: true, data });
		} catch (error) {
			next(error);
		}
	});

	app.post('/memory/search', async (req, res, next) => {
		try {
			const input = MemorySearchInputSchema.parse(req.body);
			const data = await provider.search(input);
			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	});

	app.post('/memory/analysis', async (req, res, next) => {
		try {
			const input = MemoryAnalysisInputSchema.parse(req.body);
			const data = await provider.analysis(input);
			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	});

	app.post('/memory/relationships', async (req, res, next) => {
		try {
			const input = MemoryRelationshipsInputSchema.parse(req.body);
			const data = await provider.relationships(input);
			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	});

	app.post('/memory/stats', async (req, res, next) => {
		try {
			const input = MemoryStatsInputSchema.parse(req.body ?? {});
			const data = await provider.stats(input);
			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	});

	app.post('/maintenance/optimize', async (_req, res, next) => {
		try {
			await provider.optimize?.();
			res.json({ success: true, data: { optimized: true } });
		} catch (error) {
			next(error);
		}
	});

	app.post('/maintenance/cleanup', async (_req, res, next) => {
		try {
			await provider.cleanup?.();
			res.json({ success: true, data: { cleaned: true } });
		} catch (error) {
			next(error);
		}
	});

	// Error handler
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	app.use(
		(error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
			const message = error instanceof Error ? error.message : 'Unknown error';
			logger.error({ err: error }, 'Local-Memory request failed');
			res.status(400).json({
				success: false,
				error: {
					code: 'BAD_REQUEST',
					message,
				},
			});
		},
	);

	process.on('SIGINT', async () => {
		logger.info('Received SIGINT, shutting down gracefully');
		await provider.cleanup?.();
		process.exit(0);
	});

	process.on('SIGTERM', async () => {
		logger.info('Received SIGTERM, shutting down gracefully');
		await provider.cleanup?.();
		process.exit(0);
	});

	return app;
}

export async function startLocalMemoryServer(options: LocalMemoryServerOptions = {}) {
	// Support both LOCAL_MEMORY_PORT and MEMORY_API_PORT for backward compatibility
	// MEMORY_API_PORT takes precedence as it's the canonical port registry value
	const port = options.port ?? parseInt(
		process.env.MEMORY_API_PORT || process.env.LOCAL_MEMORY_PORT || '3028',
		10
	);
	const host = (options.host ?? process.env.LOCAL_MEMORY_HOST) || '0.0.0.0';

	const app = await createLocalMemoryApp();

	return new Promise<void>((resolve) => {
		app.listen(port, host, () => {
			logger.info({ host, port }, 'Local-Memory service started');
			resolve();
		});
	});
}

if (import.meta.url === `file://${process.argv[1]}`) {
	startLocalMemoryServer().catch((error) => {
		logger.error({ err: error }, 'Failed to start Local-Memory service');
		process.exit(1);
	});
}
