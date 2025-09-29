/**
 * brAInwav Health Endpoints Example
 * Kubernetes-compatible health, readiness, and liveness endpoints
 *
 * Co-authored-by: brAInwav Development Team
 */

import type express from 'express';

interface HealthCheck {
    name: string;
    status: 'healthy' | 'unhealthy';
    message?: string;
    responseTime?: number;
}

interface HealthResponse {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    uptime: number;
    version: string;
    brainwav: {
        environment: string;
        buildVersion: string;
        deploymentId: string;
    };
    checks: HealthCheck[];
}

class BrAInwavHealthService {
    private startTime: number;
    private readonly version: string;
    private readonly environment: string;
    private readonly buildVersion: string;
    private readonly deploymentId: string;

    constructor() {
        this.startTime = Date.now();
        this.version = process.env.npm_package_version || '1.0.0';
        this.environment = process.env.BRAINWAV_ENV || 'development';
        this.buildVersion = process.env.BRAINWAV_BUILD_VERSION || 'local';
        this.deploymentId = process.env.BRAINWAV_DEPLOYMENT_ID || 'local-dev';
    }

    /**
     * Health endpoint - comprehensive health check
     * Use for: Load balancer health checks, general monitoring
     */
    async getHealth(): Promise<HealthResponse> {
        const checks = await Promise.all([
            this.checkDatabase(),
            this.checkExternalServices(),
            this.checkMemoryUsage(),
            this.checkDiskSpace(),
        ]);

        const allHealthy = checks.every((check) => check.status === 'healthy');

        const response: HealthResponse = {
            status: allHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            version: this.version,
            brainwav: {
                environment: this.environment,
                buildVersion: this.buildVersion,
                deploymentId: this.deploymentId,
            },
            checks,
        };

        // brAInwav branded logging
        console.log(`[brAInwav] Health check completed: ${response.status}`, {
            timestamp: response.timestamp,
            environment: this.environment,
            uptime: response.uptime,
            failedChecks: checks.filter((c) => c.status === 'unhealthy').length,
        });

        return response;
    }

    /**
     * Readiness endpoint - is the service ready to receive traffic?
     * Use for: Kubernetes readiness probe
     */
    async getReadiness(): Promise<{ status: string; brainwav: string }> {
        try {
            // Check critical dependencies that must be available
            await this.checkCriticalDependencies();

            console.log('[brAInwav] Readiness check passed - service ready for traffic');
            return {
                status: 'ready',
                brainwav: 'Service operational and ready for requests',
            };
        } catch (error) {
            console.error('[brAInwav] Readiness check failed:', error);
            return {
                status: 'not ready',
                brainwav: `Service not ready: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }

    /**
     * Liveness endpoint - is the service alive and not deadlocked?
     * Use for: Kubernetes liveness probe
     */
    getLiveness(): { status: string; brainwav: string; uptime: number } {
        const uptime = Math.floor((Date.now() - this.startTime) / 1000);

        // Simple uptime check - if we can respond, we're alive
        console.log(`[brAInwav] Liveness check - service alive for ${uptime} seconds`);

        return {
            status: 'alive',
            brainwav: 'brAInwav service is alive and responsive',
            uptime,
        };
    }

    private async checkDatabase(): Promise<HealthCheck> {
        const start = Date.now();
        try {
            // Replace with your actual database check
            // await db.query('SELECT 1');

            return {
                name: 'database',
                status: 'healthy',
                message: 'brAInwav database connection active',
                responseTime: Date.now() - start,
            };
        } catch (error) {
            return {
                name: 'database',
                status: 'unhealthy',
                message: `brAInwav database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                responseTime: Date.now() - start,
            };
        }
    }

    private async checkExternalServices(): Promise<HealthCheck> {
        const start = Date.now();
        try {
            // Check external dependencies (APIs, message queues, etc.)
            // const response = await fetch('https://api.external-service.com/health');

            return {
                name: 'external_services',
                status: 'healthy',
                message: 'brAInwav external service dependencies operational',
                responseTime: Date.now() - start,
            };
        } catch (error) {
            return {
                name: 'external_services',
                status: 'unhealthy',
                message: `brAInwav external service check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                responseTime: Date.now() - start,
            };
        }
    }

    private async checkMemoryUsage(): Promise<HealthCheck> {
        const start = Date.now();
        try {
            const memUsage = process.memoryUsage();
            const memUsedMB = memUsage.heapUsed / 1024 / 1024;
            const memLimitMB = Number(process.env.MEMORY_LIMIT_MB) || 512;

            const memoryHealthy = memUsedMB < memLimitMB * 0.8; // 80% threshold

            return {
                name: 'memory_usage',
                status: memoryHealthy ? 'healthy' : 'unhealthy',
                message: `brAInwav memory usage: ${memUsedMB.toFixed(2)}MB / ${memLimitMB}MB`,
                responseTime: Date.now() - start,
            };
        } catch (error) {
            return {
                name: 'memory_usage',
                status: 'unhealthy',
                message: `brAInwav memory check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                responseTime: Date.now() - start,
            };
        }
    }

    private async checkDiskSpace(): Promise<HealthCheck> {
        const start = Date.now();
        try {
            // Simple disk space check - in production, use proper disk space monitoring
            return {
                name: 'disk_space',
                status: 'healthy',
                message: 'brAInwav disk space within acceptable limits',
                responseTime: Date.now() - start,
            };
        } catch (error) {
            return {
                name: 'disk_space',
                status: 'unhealthy',
                message: `brAInwav disk space check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                responseTime: Date.now() - start,
            };
        }
    }

    private async checkCriticalDependencies(): Promise<void> {
        // Check that critical services are available
        // Throw error if any critical dependency is unavailable

        // Example: Check database connection
        // await db.ping();

        // Example: Check message queue
        // await messageQueue.ping();

        console.log('[brAInwav] Critical dependencies verified');
    }
}

/**
 * Express.js integration example
 */
export function setupBrAInwavHealthEndpoints(app: express.Application): void {
    const healthService = new BrAInwavHealthService();

    // Health endpoint - comprehensive check
    app.get('/health', async (req, res) => {
        try {
            const health = await healthService.getHealth();
            const statusCode = health.status === 'healthy' ? 200 : 503;

            res.status(statusCode).json(health);
        } catch (error) {
            console.error('[brAInwav] Health endpoint error:', error);
            res.status(500).json({
                status: 'unhealthy',
                brainwav: 'brAInwav health check failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Readiness endpoint - Kubernetes readiness probe
    app.get('/ready', async (req, res) => {
        try {
            const readiness = await healthService.getReadiness();
            const statusCode = readiness.status === 'ready' ? 200 : 503;

            res.status(statusCode).json(readiness);
        } catch (error) {
            console.error('[brAInwav] Readiness endpoint error:', error);
            res.status(503).json({
                status: 'not ready',
                brainwav: 'brAInwav readiness check failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Liveness endpoint - Kubernetes liveness probe
    app.get('/live', (req, res) => {
        try {
            const liveness = healthService.getLiveness();
            res.status(200).json(liveness);
        } catch (error) {
            console.error('[brAInwav] Liveness endpoint error:', error);
            res.status(500).json({
                status: 'dead',
                brainwav: 'brAInwav liveness check failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    console.log('[brAInwav] Health endpoints configured: /health, /ready, /live');
}

/**
 * Kubernetes deployment configuration
 */
export const kubernetesHealthProbes = {
    readinessProbe: {
        httpGet: {
            path: '/ready',
            port: 3000,
        },
        initialDelaySeconds: 10,
        periodSeconds: 5,
        timeoutSeconds: 3,
        failureThreshold: 3,
    },
    livenessProbe: {
        httpGet: {
            path: '/live',
            port: 3000,
        },
        initialDelaySeconds: 30,
        periodSeconds: 10,
        timeoutSeconds: 5,
        failureThreshold: 3,
    },
};

/**
 * Usage Example:
 *
 * ```typescript
 * import express from 'express';
 * import { setupBrAInwavHealthEndpoints } from './health-endpoints';
 *
 * const app = express();
 * setupBrAInwavHealthEndpoints(app);
 *
 * app.listen(3000, () => {
 *   console.log('[brAInwav] Server running with health endpoints');
 * });
 * ```
 *
 * Testing:
 *
 * ```bash
 * curl http://localhost:3000/health   # Comprehensive health check
 * curl http://localhost:3000/ready    # Readiness probe
 * curl http://localhost:3000/live     # Liveness probe
 * ```
 */

export default BrAInwavHealthService;
