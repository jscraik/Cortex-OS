/**
 * nO Master Agent Loop - Production Integration Example
 * Part of brAInwav's production-ready nO implementation
 *
 * Simplified integration example showing how to use operational components
 */

import type { Server } from 'node:http';
import express from 'express';
import { ConfigurationManager } from './operations/configuration-manager.js';
import {
	GracefulShutdownManager,
	StandardShutdownHandlers,
} from './operations/graceful-shutdown.js';
import { HealthChecker, StandardHealthChecks } from './operations/health-checker.js';
import { createOperationalEndpoints } from './operations/operational-endpoints.js';

/**
 * nO Master Agent Loop Production Application
 * Integrates core operational components for production deployment
 */
export class NOProductionApp {
	private readonly app: express.Application;
	private server: Server | null = null;
	private readonly config: ConfigurationManager;
	private healthChecker!: HealthChecker;
	private shutdownManager!: GracefulShutdownManager;

	constructor() {
		// Initialize configuration
		this.config = new ConfigurationManager();

		// Initialize Express app
		this.app = express();
		this.setupMiddleware();

		// Initialize components
		this.initializeComponents();
		this.setupRoutes();
		this.setupShutdownHandlers();
	}

	/**
	 * Setup Express middleware
	 */
	private setupMiddleware(): void {
		this.app.use(express.json());
		this.app.use(express.urlencoded({ extended: true }));

		// Security headers
		this.app.use((_req, res, next) => {
			res.set({
				'X-Content-Type-Options': 'nosniff',
				'X-Frame-Options': 'DENY',
				'X-XSS-Protection': '1; mode=block',
				'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
			});
			next();
		});

		// Add brAInwav branding header
		this.app.use((_req, res, next) => {
			res.set('X-Powered-By', 'brAInwav nO Master Agent Loop v1.0.0');
			next();
		});
	}

	/**
	 * Initialize operational components
	 */
	private initializeComponents(): void {
		// Initialize health checker
		this.healthChecker = new HealthChecker({
			defaultTimeout: this.config.getValue('health.timeout', 5000),
			defaultInterval: this.config.getValue('health.interval', 30000),
		});
		this.setupHealthChecks();

		// Initialize shutdown manager
		this.shutdownManager = new GracefulShutdownManager({
			gracePeriod: this.config.getValue('operations.gracefulShutdown.gracePeriod', 30000),
			forceExitDelay: this.config.getValue('operations.gracefulShutdown.forceExitDelay', 5000),
		});
	}

	/**
	 * Setup health checks for core components
	 */
	private setupHealthChecks(): void {
		// Standard health checks
		this.healthChecker.register(StandardHealthChecks.memory());

		// Mock database health check
		this.healthChecker.register({
			name: 'database',
			critical: true,
			check: async () => {
				// Simulate database connectivity check
				try {
					// In a real implementation, this would test actual database connectivity
					await new Promise((resolve) => setTimeout(resolve, 10));
					return {
						name: 'database',
						status: 'healthy' as const,
						timestamp: new Date(),
						responseTime: 10,
						details: { connected: true },
					};
				} catch (error) {
					return {
						name: 'database',
						status: 'unhealthy' as const,
						timestamp: new Date(),
						responseTime: 0,
						error: error instanceof Error ? error.message : String(error),
					};
				}
			},
		});

		// Mock agent pool health check
		this.healthChecker.register({
			name: 'agent-pool',
			check: async () => {
				// Simulate agent pool status check
				const mockAgents = {
					active: 8,
					total: 10,
					healthy: 9,
				};

				return {
					name: 'agent-pool',
					status: 'healthy' as const,
					timestamp: new Date(),
					responseTime: 5,
					details: {
						...mockAgents,
						healthyRatio: mockAgents.healthy / mockAgents.total,
					},
				};
			},
		});
	}

	/**
	 * Setup operational routes
	 */
	private setupRoutes(): void {
		// Create operational endpoints
		const { endpoints } = createOperationalEndpoints({
			enableAdmin: this.config.isEnabled('operations.admin.enabled'),
			adminAuth: this.createAdminAuthMiddleware(),
		});

		// Mount operational routes
		this.app.use('/', endpoints.getRouter());

		// Add brAInwav specific routes
		this.app.get('/brainwav/info', (_req, res) => {
			res.json({
				company: this.config.getValue('brainwav.companyName', 'brAInwav'),
				product: this.config.getValue('brainwav.productName', 'nO Master Agent Loop'),
				version: this.config.getValue('service.version', '1.0.0'),
				branding: this.config.isEnabled('brainwav.brandingEnabled'),
				customMetrics: this.config.getValue('brainwav.customMetrics', []),
				integrations: this.config.getValue('brainwav.integrations', {}),
			});
		});

		// Error handling middleware
		this.app.use(
			(error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
				console.error('Unhandled error:', error);
				res.status(500).json({
					error: {
						code: 'INTERNAL_ERROR',
						message: 'An internal error occurred',
						timestamp: new Date().toISOString(),
					},
				});
			},
		);

		// 404 handler
		this.app.use('*', (_req, res) => {
			res.status(404).json({
				error: {
					code: 'NOT_FOUND',
					message: 'Endpoint not found',
					timestamp: new Date().toISOString(),
				},
			});
		});
	}

	/**
	 * Create admin authentication middleware (simplified)
	 */
	private createAdminAuthMiddleware(): express.RequestHandler | undefined {
		if (!this.config.isEnabled('operations.admin.authRequired')) {
			return undefined;
		}

		return (req: express.Request, res: express.Response, next: express.NextFunction): void => {
			try {
				const authHeader = req.headers.authorization;
				if (!authHeader?.startsWith('Bearer ')) {
					res.status(401).json({
						error: {
							code: 'UNAUTHORIZED',
							message: 'Bearer token required',
						},
					});
					return;
				}

				// Simplified token validation for demo
				const token = authHeader.substring(7);
				if (token !== 'admin-token') {
					res.status(401).json({
						error: {
							code: 'UNAUTHORIZED',
							message: 'Invalid token',
						},
					});
					return;
				}

				next();
			} catch {
				res.status(401).json({
					error: {
						code: 'UNAUTHORIZED',
						message: 'Authentication failed',
					},
				});
				return;
			}
		};
	}

	/**
	 * Setup graceful shutdown handlers
	 */
	private setupShutdownHandlers(): void {
		// Register shutdown handlers
		this.shutdownManager.register(StandardShutdownHandlers.httpServer(this.server));
		this.shutdownManager.register(
			StandardShutdownHandlers.cleanup(async () => {
				// Custom cleanup logic
				console.log('[brAInwav nO] Performing cleanup...');
				this.healthChecker.stop();
			}),
		);

		// Listen to shutdown events
		this.shutdownManager.on('shutdown-started', (reason) => {
			console.log(`[brAInwav nO] Graceful shutdown initiated: ${reason}`);
		});

		this.shutdownManager.on('shutdown-completed', (results) => {
			console.log('[brAInwav nO] Graceful shutdown completed');
			console.log('Shutdown results:', results);
		});
	}

	/**
	 * Start the application
	 */
	async start(): Promise<void> {
		const port = this.config.getValue('service.port', 3000);
		const host = this.config.getValue('service.host', '0.0.0.0');

		try {
			// Start components
			this.healthChecker.start();

			// Start metrics collection
			console.log('[brAInwav nO] Starting metrics collection...');

			// Start HTTP server
			this.server = this.app.listen(port, host, () => {
				console.log(`[brAInwav nO] Server started on ${host}:${port}`);
				console.log(`[brAInwav nO] Environment: ${this.config.getValue('service.environment')}`);
				console.log(`[brAInwav nO] Health check: http://${host}:${port}/health`);
				console.log(`[brAInwav nO] Metrics: http://${host}:${port}/metrics`);

				if (this.config.isEnabled('operations.admin.enabled')) {
					console.log(`[brAInwav nO] Admin panel: http://${host}:${port}/admin/status`);
				}
			});

			// Handle server errors
			this.server.on('error', (error: Error) => {
				console.error('[brAInwav nO] Server error:', error);
				throw error;
			});
		} catch (error) {
			console.error('[brAInwav nO] Failed to start application:', error);
			throw error;
		}
	}

	/**
	 * Stop the application gracefully
	 */
	async stop(): Promise<void> {
		await this.shutdownManager.shutdown('Manual stop');
	}

	/**
	 * Get the Express app (for testing)
	 */
	getApp(): express.Application {
		return this.app;
	}

	/**
	 * Get configuration manager
	 */
	getConfig(): ConfigurationManager {
		return this.config;
	}

	/**
	 * Get health checker
	 */
	getHealthChecker(): HealthChecker {
		return this.healthChecker;
	}
}

/**
 * Create and start the nO Master Agent Loop application
 */
export async function createNOApp(_configPath?: string): Promise<NOProductionApp> {
	const app = new NOProductionApp();
	await app.start();
	return app;
}

// Auto-start if this file is run directly
if (require.main === module) {
	createNOApp()
		.then(() => {
			console.log('[brAInwav nO] Application started successfully');
		})
		.catch((error) => {
			console.error('[brAInwav nO] Failed to start application:', error);
			process.exit(1);
		});
}
