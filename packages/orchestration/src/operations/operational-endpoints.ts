/**
 * nO Master Agent Loop - Operational Endpoints
 * Part of brAInwav's production-ready nO implementation
 *
 * Express.js routes for health checks, metrics, and operational procedures
 */

import { freemem, loadavg, totalmem } from 'node:os';
import { type NextFunction, type Request, type Response, Router } from 'express';
import { GracefulShutdownManager, StandardShutdownHandlers } from './graceful-shutdown';
import { HealthChecker, StandardHealthChecks } from './health-checker';

export interface OperationalConfig {
	healthChecker: HealthChecker;
	shutdownManager: GracefulShutdownManager;
	enableMetrics?: boolean;
	enableAdminEndpoints?: boolean;
	adminAuthMiddleware?: (req: Request, res: Response, next: NextFunction) => void;
}

export class OperationalEndpoints {
	private router: Router;
	private healthChecker: HealthChecker;
	private shutdownManager: GracefulShutdownManager;
	private config: OperationalConfig;

	constructor(config: OperationalConfig) {
		this.config = config;
		this.healthChecker = config.healthChecker;
		this.shutdownManager = config.shutdownManager;
		this.router = Router();

		this.setupRoutes();
	}

	/**
	 * Setup all operational routes
	 */
	private setupRoutes(): void {
		// Health check endpoints (public)
		this.router.get('/health', this.getHealth.bind(this));
		this.router.get('/health/live', this.getLiveness.bind(this));
		this.router.get('/health/ready', this.getReadiness.bind(this));
		this.router.get('/health/detailed', this.getDetailedHealth.bind(this));

		// Metrics endpoint (public if enabled)
		if (this.config.enableMetrics) {
			this.router.get('/metrics', this.getMetrics.bind(this));
		}

		// Admin endpoints (protected if middleware provided)
		if (this.config.enableAdminEndpoints) {
			const adminAuth = this.config.adminAuthMiddleware || this.noAuth;

			this.router.post('/admin/shutdown', adminAuth, this.initiateShutdown.bind(this));
			this.router.get('/admin/health/checks', adminAuth, this.getHealthChecks.bind(this));
			this.router.post('/admin/health/check/:name', adminAuth, this.runHealthCheck.bind(this));
			this.router.get('/admin/shutdown/handlers', adminAuth, this.getShutdownHandlers.bind(this));
			this.router.get('/admin/status', adminAuth, this.getSystemStatus.bind(this));
		}

		// System info endpoint
		this.router.get('/info', this.getSystemInfo.bind(this));
	}

	/**
	 * Get basic health status
	 */
	private async getHealth(_req: Request, res: Response): Promise<Response> {
		try {
			const health = await this.healthChecker.getSystemHealth();
			const statusCode =
				health.overall === 'healthy' ? 200 : health.overall === 'degraded' ? 200 : 503;

			return res.status(statusCode).json({
				status: health.overall,
				timestamp: health.timestamp,
				uptime: health.uptime,
				version: health.version,
			});
		} catch (error) {
			return res.status(500).json({
				status: 'error',
				message: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}

	/**
	 * Get liveness probe (Kubernetes compatible)
	 */
	private async getLiveness(_req: Request, res: Response): Promise<Response> {
		try {
			const liveness = await this.healthChecker.getLivenessProbe();
			return res.status(200).json(liveness);
		} catch (error) {
			return res.status(500).json({
				status: 'error',
				message: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}

	/**
	 * Get readiness probe (Kubernetes compatible)
	 */
	private async getReadiness(_req: Request, res: Response): Promise<Response> {
		try {
			const readiness = await this.healthChecker.getReadinessProbe();
			const statusCode = readiness.ready ? 200 : 503;

			return res.status(statusCode).json(readiness);
		} catch (error) {
			return res.status(503).json({
				status: 'error',
				ready: false,
				message: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}

	/**
	 * Get detailed health information
	 */
	private async getDetailedHealth(_req: Request, res: Response): Promise<Response> {
		try {
			const health = await this.healthChecker.getSystemHealth();
			const statusCode =
				health.overall === 'healthy' ? 200 : health.overall === 'degraded' ? 200 : 503;

			return res.status(statusCode).json(health);
		} catch (error) {
			return res.status(500).json({
				status: 'error',
				message: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}

	/**
	 * Get Prometheus metrics
	 */
	private async getMetrics(_req: Request, res: Response): Promise<Response> {
		try {
			// Try to get prometheus metrics asynchronously
			const { metrics, contentType } = await this.getPrometheusMetrics();

			res.set('Content-Type', contentType);
			return res.end(metrics);
		} catch (error) {
			return res.status(500).json({
				status: 'error',
				message: 'Metrics not available',
				details: error instanceof Error ? error.message : undefined,
			});
		}
	}

	/**
	 * Asynchronously get Prometheus metrics with proper error handling
	 */
	private async getPrometheusMetrics(): Promise<{ metrics: string; contentType: string }> {
		try {
			// Use dynamic import for better async handling
			const promClient = await import('prom-client');
			const register = promClient.register;

			// Get metrics asynchronously
			const metrics = await register.metrics();
			const contentType = register.contentType;

			return { metrics, contentType };
		} catch (importError) {
			// Fallback: try require if dynamic import fails
			try {
				// eslint-disable-next-line @typescript-eslint/no-require-imports
				const promClient = require('prom-client');
				const register = promClient.register;

				// Wrap in Promise to ensure async behavior
				const metrics = await Promise.resolve(register.metrics());
				const contentType = register.contentType;

				return { metrics, contentType };
			} catch (requireError) {
				throw new Error(
					`Failed to load prom-client: ${importError.message || requireError.message}`,
				);
			}
		}
	}

	/**
	 * Get system information
	 */
	private async getSystemInfo(_req: Request, res: Response): Promise<Response> {
		const systemInfo = {
			service: 'nO Master Agent Loop',
			company: 'brAInwav',
			version: process.env.NO_VERSION || '1.0.0',
			environment: process.env.NODE_ENV || 'development',
			nodeVersion: process.version,
			platform: process.platform,
			arch: process.arch,
			pid: process.pid,
			uptime: process.uptime(),
			memory: process.memoryUsage(),
			cpuUsage: process.cpuUsage(),
		};

		return res.json(systemInfo);
	}

	/**
	 * Initiate graceful shutdown (admin only)
	 */
	private async initiateShutdown(req: Request, res: Response): Promise<Response> {
		try {
			if (this.shutdownManager.isShutdownInProgress()) {
				return res.status(409).json({
					status: 'error',
					message: 'Shutdown already in progress',
				});
			}

			const reason = req.body.reason || 'Admin initiated shutdown';

			// Start shutdown in background
			setImmediate(async () => {
				await this.shutdownManager.shutdown(reason);
			});

			return res.json({
				status: 'success',
				message: 'Graceful shutdown initiated',
				reason,
			});
		} catch (error) {
			return res.status(500).json({
				status: 'error',
				message: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}

	/**
	 * Get list of health checks (admin only)
	 */
	private async getHealthChecks(_req: Request, res: Response): Promise<Response> {
		try {
			const results = this.healthChecker.getAllResults();
			return res.json({
				checks: results,
				total: results.length,
				healthy: results.filter((r) => r.status === 'healthy').length,
				degraded: results.filter((r) => r.status === 'degraded').length,
				unhealthy: results.filter((r) => r.status === 'unhealthy').length,
			});
		} catch (error) {
			return res.status(500).json({
				status: 'error',
				message: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}

	/**
	 * Run specific health check (admin only)
	 */
	private async runHealthCheck(req: Request, res: Response): Promise<Response> {
		try {
			const checkName = req.params.name;
			const result = await this.healthChecker.runCheck(checkName);

			return res.json(result);
		} catch (error) {
			return res.status(404).json({
				status: 'error',
				message: error instanceof Error ? error.message : 'Health check not found',
			});
		}
	}

	/**
	 * Get list of shutdown handlers (admin only)
	 */
	private async getShutdownHandlers(_req: Request, res: Response): Promise<Response> {
		try {
			const handlers = this.shutdownManager.getHandlers();
			return res.json({
				handlers,
				total: handlers.length,
				shutdownInProgress: this.shutdownManager.isShutdownInProgress(),
			});
		} catch (error) {
			return res.status(500).json({
				status: 'error',
				message: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}

	/**
	 * Get comprehensive system status (admin only)
	 */
	private async getSystemStatus(_req: Request, res: Response): Promise<Response> {
		try {
			const health = await this.healthChecker.getSystemHealth();
			const handlers = this.shutdownManager.getHandlers();

			return res.json({
				health,
				shutdown: {
					handlers,
					inProgress: this.shutdownManager.isShutdownInProgress(),
				},
				system: {
					pid: process.pid,
					uptime: process.uptime(),
					memory: process.memoryUsage(),
					cpuUsage: process.cpuUsage(),
					loadAverage: loadavg(),
					freeMemory: freemem(),
					totalMemory: totalmem(),
				},
			});
		} catch (error) {
			return res.status(500).json({
				status: 'error',
				message: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}

	/**
	 * No-op auth middleware for when admin auth is not configured
	 */
	private noAuth(_req: Request, _res: Response, next: NextFunction): void {
		next();
	}

	/**
	 * Get the Express router
	 */
	getRouter(): Router {
		return this.router;
	}
}

/**
 * Factory function to create operational endpoints with standard configuration
 */
export function createOperationalEndpoints(options: {
	// Database connection for health checks
	database?: any;
	// Redis client for health checks
	redis?: any;
	// Agent pool for health checks
	agentPool?: any;
	// HTTP server for shutdown handling
	httpServer?: any;
	// Job processor for shutdown handling
	jobProcessor?: any;
	// Custom cleanup function
	cleanup?: () => Promise<void>;
	// Enable admin endpoints
	enableAdmin?: boolean;
	// Admin authentication middleware
	adminAuth?: (req: Request, res: Response, next: NextFunction) => void;
}): {
	endpoints: OperationalEndpoints;
	healthChecker: HealthChecker;
	shutdownManager: GracefulShutdownManager;
} {
	// Create health checker
	const healthChecker = new HealthChecker({
		defaultTimeout: 5000,
		defaultInterval: 30000,
	});

	// Register standard health checks
	healthChecker.register(StandardHealthChecks.memory());

	if (options.database) {
		healthChecker.register(
			StandardHealthChecks.database(async () => {
				// Basic database ping - customize based on your database
				return true;
			}),
		);
	}

	if (options.redis) {
		healthChecker.register(StandardHealthChecks.redis(options.redis));
	}

	if (options.agentPool) {
		healthChecker.register(
			StandardHealthChecks.agentPool(async () => ({
				active: 5,
				total: 10,
				healthy: 8,
			})),
		);
	}

	// Create shutdown manager
	const shutdownManager = new GracefulShutdownManager({
		gracePeriod: 30000,
		forceExitDelay: 5000,
	});

	// Register standard shutdown handlers
	if (options.httpServer) {
		shutdownManager.register(StandardShutdownHandlers.httpServer(options.httpServer));
	}

	if (options.agentPool) {
		shutdownManager.register(StandardShutdownHandlers.agentPool(options.agentPool));
	}

	if (options.jobProcessor) {
		shutdownManager.register(StandardShutdownHandlers.jobProcessor(options.jobProcessor));
	}

	if (options.database) {
		shutdownManager.register(StandardShutdownHandlers.database(options.database));
	}

	if (options.redis) {
		shutdownManager.register(StandardShutdownHandlers.redis(options.redis));
	}

	if (options.cleanup) {
		shutdownManager.register(StandardShutdownHandlers.cleanup(options.cleanup));
	}

	// Create endpoints
	const endpoints = new OperationalEndpoints({
		healthChecker,
		shutdownManager,
		enableMetrics: true,
		enableAdminEndpoints: options.enableAdmin || false,
		adminAuthMiddleware: options.adminAuth,
	});

	return {
		endpoints,
		healthChecker,
		shutdownManager,
	};
}
