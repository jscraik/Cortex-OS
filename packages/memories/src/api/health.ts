import express from 'express';
import { logger } from '../logging/logger.js';
import { healthMonitor } from '../monitoring/health.js';

const app = express();
const PORT = process.env.MEMORIES_API_PORT || 3001;

// Health check endpoint
app.get('/health', async (_req, res) => {
	try {
		const health = await healthMonitor.checkAll();

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
		logger.error({ error }, 'Health check failed');
		res.status(500).json({
			status: 'error',
			message: 'Health check failed',
			timestamp: new Date().toISOString(),
		});
	}
});

// Readiness check endpoint
app.get('/ready', async (_req, res) => {
	try {
		const health = await healthMonitor.checkAll();
		const ready = health.isHealthy;

		res.status(ready ? 200 : 503).json({
			ready,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		logger.error({ error }, 'Readiness check failed');
		res.status(500).json({
			ready: false,
			error: 'Readiness check failed',
		});
	}
});

// Metrics endpoint
app.get('/metrics', async (_req, res) => {
	try {
		const { metrics } = await import('../monitoring/metrics.js');
		const report = await metrics.report();

		res.json(report);
	} catch (error) {
		logger.error({ error }, 'Metrics collection failed');
		res.status(500).json({
			error: 'Failed to collect metrics',
		});
	}
});

export function startHealthServer(): Promise<void> {
	return new Promise((resolve) => {
		const server = app.listen(PORT, () => {
			logger.info(`Health server listening on port ${PORT}`);
			resolve();
		});

		// Graceful shutdown handler
		process.on('SIGTERM', gracefulShutdown);
		process.on('SIGINT', gracefulShutdown);

		async function gracefulShutdown() {
			logger.info('Shutting down health server gracefully...');
			server.close(() => {
				logger.info('Health server shutdown complete');
				process.exit(0);
			});
		}
	});
}
