// Health Check API Routes for brAInwav Cortex WebUI
// Comprehensive health endpoints with proper security headers

import type { Request, Response, Router } from 'express';
import logger from '../utils/logger.js';
import { HealthService } from './services/healthService.js';

export function createHealthCheckRoutes(): Router {
	const router = Router();

	// Basic health check endpoint (lightweight, always responds 200 if server is running)
	router.get('/', (_req: Request, res: Response) => {
		const response = {
			status: 'OK',
			timestamp: new Date().toISOString(),
			brand: 'brAInwav',
			service: 'cortex-webui',
			uptime: process.uptime(),
		};

		res.set({
			'Cache-Control': 'no-cache, no-store, must-revalidate',
			Pragma: 'no-cache',
			Expires: '0',
			'X-Content-Type-Options': 'nosniff',
			'X-Frame-Options': 'DENY',
		});

		res.json(response);
	});

	// Readiness probe endpoint (checks if all dependencies are ready)
	router.get('/ready', async (_req: Request, res: Response) => {
		try {
			const healthService = HealthService.getInstance();
			const readinessResult = await healthService.checkReadiness();

			const statusCode = readinessResult.status === 'ready' ? 200 : 503;
			const response = {
				status: readinessResult.status,
				checks: readinessResult.checks,
				timestamp: readinessResult.timestamp,
				brand: 'brAInwav',
				...(readinessResult.warnings && { warnings: readinessResult.warnings }),
				...(readinessResult.error && { error: readinessResult.error }),
			};

			res.set({
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				Pragma: 'no-cache',
				Expires: '0',
				'X-Content-Type-Options': 'nosniff',
				'X-Frame-Options': 'DENY',
			});

			res.status(statusCode).json(response);
		} catch (error) {
			logger.error('Readiness check failed', {
				brand: 'brAInwav',
				message: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined,
			});

			const response = {
				status: 'not ready',
				timestamp: new Date().toISOString(),
				brand: 'brAInwav',
				error: error instanceof Error ? error.message : 'Unknown error',
			};

			res.set({
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				Pragma: 'no-cache',
				Expires: '0',
				'X-Content-Type-Options': 'nosniff',
				'X-Frame-Options': 'DENY',
			});

			res.status(503).json(response);
		}
	});

	// Liveness probe endpoint (checks if application is alive)
	router.get('/live', async (_req: Request, res: Response) => {
		try {
			const healthService = HealthService.getInstance();
			const livenessResult = await healthService.checkLiveness();

			const statusCode = livenessResult.status === 'alive' ? 200 : 503;
			const response = {
				status: livenessResult.status,
				timestamp: livenessResult.timestamp,
				uptime: livenessResult.uptime,
				brand: 'brAInwav',
				...(livenessResult.memoryUsage && { memoryUsage: livenessResult.memoryUsage }),
				...(livenessResult.error && { error: livenessResult.error }),
			};

			res.set({
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				Pragma: 'no-cache',
				Expires: '0',
				'X-Content-Type-Options': 'nosniff',
				'X-Frame-Options': 'DENY',
			});

			res.status(statusCode).json(response);
		} catch (error) {
			logger.error('Liveness check failed', {
				brand: 'brAInwav',
				message: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined,
			});

			const response = {
				status: 'not alive',
				timestamp: new Date().toISOString(),
				brand: 'brAInwav',
				error: error instanceof Error ? error.message : 'Unknown error',
			};

			res.set({
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				Pragma: 'no-cache',
				Expires: '0',
				'X-Content-Type-Options': 'nosniff',
				'X-Frame-Options': 'DENY',
			});

			res.status(503).json(response);
		}
	});

	// Detailed health check endpoint (comprehensive system health report)
	router.get('/detailed', async (_req: Request, res: Response) => {
		try {
			const healthService = HealthService.getInstance();
			const detailedHealth = await healthService.getDetailedHealth();

			const statusCode =
				detailedHealth.status === 'healthy'
					? 200
					: detailedHealth.status === 'degraded'
						? 200
						: 503;

			const response = detailedHealth;

			res.set({
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				Pragma: 'no-cache',
				Expires: '0',
				'X-Content-Type-Options': 'nosniff',
				'X-Frame-Options': 'DENY',
			});

			res.status(statusCode).json(response);
		} catch (error) {
			logger.error('Detailed health check failed', {
				brand: 'brAInwav',
				message: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined,
			});

			const response = {
				status: 'unhealthy',
				timestamp: new Date().toISOString(),
				brand: 'brAInwav',
				service: 'cortex-webui',
				error: error instanceof Error ? error.message : 'Unknown error',
				checks: {},
				uptime: process.uptime(),
				version: process.env.npm_package_version || '1.0.0',
			};

			res.set({
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				Pragma: 'no-cache',
				Expires: '0',
				'X-Content-Type-Options': 'nosniff',
				'X-Frame-Options': 'DENY',
			});

			res.status(503).json(response);
		}
	});

	// Handle unsupported methods for all health endpoints
	router.all('/', (_req: Request, res: Response) => {
		res.set('Allow', 'GET');
		res.status(405).json({
			error: 'Method not allowed',
			timestamp: new Date().toISOString(),
			brand: 'brAInwav',
		});
	});

	router.all('/ready', (_req: Request, res: Response) => {
		res.set('Allow', 'GET');
		res.status(405).json({
			error: 'Method not allowed',
			timestamp: new Date().toISOString(),
			brand: 'brAInwav',
		});
	});

	router.all('/live', (_req: Request, res: Response) => {
		res.set('Allow', 'GET');
		res.status(405).json({
			error: 'Method not allowed',
			timestamp: new Date().toISOString(),
			brand: 'brAInwav',
		});
	});

	router.all('/detailed', (_req: Request, res: Response) => {
		res.set('Allow', 'GET');
		res.status(405).json({
			error: 'Method not allowed',
			timestamp: new Date().toISOString(),
			brand: 'brAInwav',
		});
	});

	return router;
}
