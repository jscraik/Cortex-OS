import express from 'express';
import type { Express } from 'express';
import { logger } from '../logging/logger.js';
import { healthMonitor } from '../monitoring/health.js';
import type { StoreInspectionReport, StoreInspector } from '../monitoring/store-inspector.js';

const PORT = process.env.MEMORIES_API_PORT || 3001;

export type HealthAppDependencies = {
	healthMonitor: Pick<typeof healthMonitor, 'checkAll'>;
	inspector: StoreInspector;
	logger: Pick<typeof logger, 'info' | 'error' | 'warn'>;
};

export function createMemoriesHealthApp(partial?: Partial<HealthAppDependencies>): Express {
	const deps = resolveDependencies(partial);
	const app = express();
	app.use(express.json());

	registerHealthRoute(app, deps);
	registerReadyRoute(app, deps);
	registerMetricsRoute(app, deps);
	registerStatsRoute(app, deps);

	return app;
}

export function startHealthServer(): Promise<void> {
	return new Promise((resolve) => {
		const app = createMemoriesHealthApp();
		const server = app.listen(PORT, () => {
			logger.info(`brAInwav memories health server listening on port ${PORT}`);
			resolve();
		});

		const gracefulShutdown = () => {
			logger.info('brAInwav memories health server shutting down');
			server.close(() => {
				logger.info('brAInwav memories health server shutdown complete');
				process.exit(0);
			});
		};

		process.on('SIGTERM', gracefulShutdown);
		process.on('SIGINT', gracefulShutdown);
	});
}

function resolveDependencies(partial?: Partial<HealthAppDependencies>): HealthAppDependencies {
	return {
		healthMonitor,
		inspector: partial?.inspector ?? createFallbackInspector(),
		logger: partial?.logger ?? logger,
		...(partial?.healthMonitor ? { healthMonitor: partial.healthMonitor } : {}),
	};
}

function registerHealthRoute(app: Express, deps: HealthAppDependencies) {
	app.get('/health', async (_req, res) => {
		try {
			const health = await deps.healthMonitor.checkAll();
			res.status(health.isHealthy ? 200 : 503).json({
				status: health.isHealthy ? 'healthy' : 'unhealthy',
				timestamp: health.timestamp,
				uptime: health.uptime,
				services: {
					mlx: health.mlx,
					ollama: health.ollama,
					database: health.database,
				},
			});
		} catch (error) {
			deps.logger.error({ error }, 'brAInwav memories health check failed');
			res.status(500).json({
				status: 'error',
				message: 'brAInwav health check failed',
				timestamp: new Date().toISOString(),
			});
		}
	});
}

function registerReadyRoute(app: Express, deps: HealthAppDependencies) {
	app.get('/ready', async (_req, res) => {
		try {
			const health = await deps.healthMonitor.checkAll();
			res.status(health.isHealthy ? 200 : 503).json({
				ready: health.isHealthy,
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			deps.logger.error({ error }, 'brAInwav memories readiness check failed');
			res.status(500).json({
				ready: false,
				error: 'brAInwav readiness check failed',
			});
		}
	});
}

function registerMetricsRoute(app: Express, deps: HealthAppDependencies) {
	app.get('/metrics', async (_req, res) => {
		try {
			const { metrics } = await import('../monitoring/metrics');
			const report = await metrics.report();
			res.json(report);
		} catch (error) {
			deps.logger.error({ error }, 'brAInwav memories metrics collection failed');
			res.status(500).json({
				error: 'brAInwav metrics collection failed',
			});
		}
	});
}

function registerStatsRoute(app: Express, deps: HealthAppDependencies) {
	app.get('/memories/stats', async (_req, res) => {
		try {
			const [report, systemHealth] = await Promise.all([
				deps.inspector.collect(),
				deps.healthMonitor.checkAll(),
			]);
			res.json(formatStatsPayload(report, systemHealth));
		} catch (error) {
			deps.logger.error({ error }, 'brAInwav memories stats collection failed');
			res.status(500).json({
				brand: 'brAInwav',
				error: 'brAInwav memories stats unavailable',
				timestamp: new Date().toISOString(),
			});
		}
	});
}

function formatStatsPayload(
	report: StoreInspectionReport,
	system: Awaited<ReturnType<typeof healthMonitor.checkAll>>,
) {
	return {
		brand: report.brand,
		service: 'brAInwav.memories',
		backend: report.backend,
		health: {
			overall: system.isHealthy ? 'healthy' : 'unhealthy',
			services: {
				mlx: system.mlx,
				ollama: system.ollama,
				database: system.database,
			},
			timestamp: system.timestamp,
			uptime: system.uptime,
		},
		timestamp: report.timestamp,
	};
}

function createFallbackInspector(): StoreInspector {
	return {
		collect: async () => ({
			brand: 'brAInwav',
			timestamp: new Date().toISOString(),
			backend: {
				active: 'unknown',
				status: 'degraded',
				adapters: [],
				metrics: {},
			},
		}),
	};
}
