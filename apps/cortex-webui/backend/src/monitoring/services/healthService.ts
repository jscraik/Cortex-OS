// Enhanced Health Check Service for brAInwav Cortex WebUI
// Comprehensive dependency validation with detailed reporting

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { safeErrorMessage, safeErrorStack } from '@cortex-os/utils';
import { getDatabase } from '../../utils/database.js';
import logger from '../utils/logger';

export interface HealthCheckResult {
	status: 'healthy' | 'degraded' | 'unhealthy';
	checks: Record<string, HealthCheck>;
	timestamp: string;
	uptime: number;
	version: string;
}

export interface HealthCheck {
	status: 'pass' | 'fail' | 'warn';
	message?: string;
	observedValue?: number | string | boolean;
	observedUnit?: string;
	time?: string;
	componentId?: string;
	componentType?: string;
}

export interface ReadinessResult {
	status: 'ready' | 'not ready';
	checks: Record<string, HealthCheck>;
	timestamp: string;
	warnings?: string[];
	error?: string;
}

export interface LivenessResult {
	status: 'alive' | 'not alive';
	timestamp: string;
	uptime: number;
	memoryUsage?: NodeJS.MemoryUsage;
	error?: string;
}

export interface DetailedHealthResult extends HealthCheckResult {
	brand: string;
	service: string;
	environment: string;
	nodeVersion: string;
	performance: {
		memoryUsage: NodeJS.MemoryUsage;
		cpuUsage: NodeJS.CpuUsage;
		eventLoopLag: number;
	};
}

export class HealthService {
	private static instance: HealthService;
	private isShuttingDown = false;
	private lastHealthCheck: HealthCheckResult | null = null;

	private constructor() {
		// Handle graceful shutdown
		process.on('SIGTERM', () => {
			this.isShuttingDown = true;
			logger.info('Health service: SIGTERM received, marking as shutting down');
		});

		process.on('SIGINT', () => {
			this.isShuttingDown = true;
			logger.info('Health service: SIGINT received, marking as shutting down');
		});
	}

	public static getInstance(): HealthService {
		if (!HealthService.instance) {
			HealthService.instance = new HealthService();
		}
		return HealthService.instance;
	}

	async performHealthCheck(): Promise<HealthCheckResult> {
		const startTime = performance.now();
		const checks: Record<string, HealthCheck> = {};

		// Perform all health checks in parallel for better performance
		const [db, fsCheck, mem, disk, env, external] = await Promise.allSettled([
			this.checkDatabase(),
			this.checkFileSystem(),
			this.checkMemory(),
			this.checkDiskSpace(),
			this.checkEnvironment(),
			this.checkExternalDependencies(),
		]);

		// Process results
		if (db.status === 'fulfilled') checks.database = db.value;
		else {
			logger.error('Database health check failed', {
				brand: 'brAInwav',
				message: safeErrorMessage(db.reason),
				stack: safeErrorStack(db.reason),
			});
			checks.database = {
				status: 'fail',
				message: `Health check error: ${safeErrorMessage(db.reason)}`,
				componentId: 'database',
				componentType: 'datastore',
			};
		}

		if (fsCheck.status === 'fulfilled') checks.filesystem = fsCheck.value;
		else {
			checks.filesystem = {
				status: 'fail',
				message: `Health check error: ${safeErrorMessage(fsCheck.reason)}`,
				componentId: 'filesystem',
				componentType: 'system',
			};
		}

		if (mem.status === 'fulfilled') checks.memory = mem.value;
		else {
			checks.memory = {
				status: 'fail',
				message: `Health check error: ${safeErrorMessage(mem.reason)}`,
				componentId: 'memory',
				componentType: 'system',
			};
		}

		if (disk.status === 'fulfilled') checks.diskspace = disk.value;
		else {
			checks.diskspace = {
				status: 'fail',
				message: `Health check error: ${safeErrorMessage(disk.reason)}`,
				componentId: 'diskspace',
				componentType: 'system',
			};
		}

		if (env.status === 'fulfilled') checks.environment = env.value;
		else {
			checks.environment = {
				status: 'fail',
				message: `Health check error: ${safeErrorMessage(env.reason)}`,
				componentId: 'environment',
				componentType: 'system',
			};
		}

		if (external.status === 'fulfilled') checks.external = external.value;
		else {
			checks.external = {
				status: 'warn',
				message: `External health check failed: ${safeErrorMessage(external.reason)}`,
				componentId: 'external',
				componentType: 'external',
			};
		}

		// Determine overall status
		const overallStatus = this.determineOverallStatus(checks);

		const result: HealthCheckResult = {
			status: overallStatus,
			checks,
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			version: process.env.npm_package_version || '1.0.0',
		};

		// Cache the last health check
		this.lastHealthCheck = result;

		// Log health check results
		const duration = performance.now() - startTime;
		logger.info(`Health check completed in ${duration.toFixed(2)}ms`, {
			status: overallStatus,
			duration: Math.round(duration),
			category: 'health',
			brand: 'brAInwav',
		});

		return result;
	}

	async checkReadiness(): Promise<ReadinessResult> {
		try {
			const healthResult = await this.performHealthCheck();
			const warnings: string[] = [];
			let error: string | undefined;

			// Check critical dependencies for readiness
			const criticalChecks = ['database', 'filesystem', 'environment'];
			const failedChecks = criticalChecks.filter(
				(check) => healthResult.checks[check]?.status === 'fail',
			);

			if (failedChecks.length > 0) {
				error = `Critical dependencies failed: ${failedChecks.join(', ')}`;
				return {
					status: 'not ready',
					checks: healthResult.checks,
					timestamp: healthResult.timestamp,
					error,
				};
			}

			// Collect warnings from non-critical checks
			Object.entries(healthResult.checks).forEach(([name, check]) => {
				if (check.status === 'warn' && check.message) {
					warnings.push(`${name}: ${check.message}`);
				}
			});

			return {
				status: 'ready',
				checks: healthResult.checks,
				timestamp: healthResult.timestamp,
				warnings: warnings.length > 0 ? warnings : undefined,
			};
		} catch (error) {
			logger.error('Readiness check failed', {
				brand: 'brAInwav',
				message: safeErrorMessage(error),
				stack: safeErrorStack(error),
			});

			return {
				status: 'not ready',
				checks: {},
				timestamp: new Date().toISOString(),
				error: safeErrorMessage(error),
			};
		}
	}

	async checkLiveness(): Promise<LivenessResult> {
		try {
			if (this.isShuttingDown) {
				return {
					status: 'not alive',
					timestamp: new Date().toISOString(),
					uptime: process.uptime(),
					error: 'Application is shutting down',
				};
			}

			// Check if event loop is responsive
			const eventLoopLag = await this.measureEventLoopLag();
			if (eventLoopLag > 10000) {
				// 10 seconds
				return {
					status: 'not alive',
					timestamp: new Date().toISOString(),
					uptime: process.uptime(),
					error: 'Event loop is unresponsive',
				};
			}

			return {
				status: 'alive',
				timestamp: new Date().toISOString(),
				uptime: process.uptime(),
				memoryUsage: process.memoryUsage(),
			};
		} catch (error) {
			logger.error('Liveness check failed', {
				brand: 'brAInwav',
				message: safeErrorMessage(error),
				stack: safeErrorStack(error),
			});

			return {
				status: 'not alive',
				timestamp: new Date().toISOString(),
				uptime: process.uptime(),
				error: safeErrorMessage(error),
			};
		}
	}

	async getDetailedHealth(): Promise<DetailedHealthResult> {
		const healthResult = await this.performHealthCheck();
		const cpuUsage = process.cpuUsage();
		const eventLoopLag = await this.measureEventLoopLag();

		return {
			...healthResult,
			brand: 'brAInwav',
			service: 'cortex-webui',
			environment: process.env.NODE_ENV || 'development',
			nodeVersion: process.version,
			performance: {
				memoryUsage: process.memoryUsage(),
				cpuUsage,
				eventLoopLag,
			},
		};
	}

	private async checkDatabase(): Promise<HealthCheck> {
		try {
			const db = getDatabase();

			// Test database connection with a simple query
			const start = performance.now();
			const result = db.prepare('SELECT 1 as test').get();
			const duration = performance.now() - start;

			if (!result) {
				return {
					status: 'fail',
					message: 'Database query returned no result',
					componentId: 'database',
					componentType: 'datastore',
					observedValue: duration,
					observedUnit: 'ms',
				};
			}

			// Check if query time is reasonable
			if (duration > 1000) {
				return {
					status: 'warn',
					message: 'Database response time is slow',
					observedValue: Math.round(duration),
					observedUnit: 'ms',
					componentId: 'database',
					componentType: 'datastore',
				};
			}

			return {
				status: 'pass',
				message: 'Database is responding normally',
				observedValue: Math.round(duration),
				observedUnit: 'ms',
				componentId: 'database',
				componentType: 'datastore',
			};
		} catch (error) {
			logger.error('Database health check failed', {
				brand: 'brAInwav',
				message: safeErrorMessage(error),
				stack: safeErrorStack(error),
			});
			return {
				status: 'fail',
				message: `Database connection failed: ${safeErrorMessage(error)}`,
				componentId: 'database',
				componentType: 'datastore',
			};
		}
	}

	private async checkFileSystem(): Promise<HealthCheck> {
		try {
			const uploadDir = process.env.UPLOAD_DIR || './uploads';
			const dataDir = path.dirname(process.env.DATABASE_PATH || './data/cortex.db');

			// Check if directories exist and are writable
			await fs.access(uploadDir, fs.constants.W_OK);
			await fs.access(dataDir, fs.constants.W_OK);

			// Test write operation
			const testFile = path.join(uploadDir, '.health-check');
			await fs.writeFile(testFile, 'health-check');
			await fs.unlink(testFile);

			return {
				status: 'pass',
				message: 'File system is accessible and writable',
				componentId: 'filesystem',
				componentType: 'system',
			};
		} catch (error) {
			logger.error('File system health check failed', {
				brand: 'brAInwav',
				message: safeErrorMessage(error),
				stack: safeErrorStack(error),
			});
			return {
				status: 'fail',
				message: `File system check failed: ${safeErrorMessage(error)}`,
				componentId: 'filesystem',
				componentType: 'system',
			};
		}
	}

	private async checkMemory(): Promise<HealthCheck> {
		try {
			const memUsage = process.memoryUsage();
			const totalMem = memUsage.heapTotal;
			const usedMem = memUsage.heapUsed;
			const memUtilization = (usedMem / totalMem) * 100;

			if (memUtilization > 90) {
				return {
					status: 'fail',
					message: 'Memory utilization is critically high',
					observedValue: Math.round(memUtilization),
					observedUnit: '%',
					componentId: 'memory',
					componentType: 'system',
				};
			}

			if (memUtilization > 80) {
				return {
					status: 'warn',
					message: 'Memory utilization is high',
					observedValue: Math.round(memUtilization),
					observedUnit: '%',
					componentId: 'memory',
					componentType: 'system',
				};
			}

			return {
				status: 'pass',
				message: 'Memory utilization is normal',
				observedValue: Math.round(memUtilization),
				observedUnit: '%',
				componentId: 'memory',
				componentType: 'system',
			};
		} catch (error) {
			logger.error('Memory health check failed', {
				brand: 'brAInwav',
				message: safeErrorMessage(error),
				stack: safeErrorStack(error),
			});
			return {
				status: 'fail',
				message: `Memory check failed: ${safeErrorMessage(error)}`,
				componentId: 'memory',
				componentType: 'system',
			};
		}
	}

	private async checkDiskSpace(): Promise<HealthCheck> {
		try {
			const dataDir = path.dirname(process.env.DATABASE_PATH || './data/cortex.db');
			const stats = await fs.stat(dataDir);

			if (stats.isDirectory()) {
				return {
					status: 'pass',
					message: 'Data directory is accessible',
					componentId: 'diskspace',
					componentType: 'system',
				};
			}

			return {
				status: 'fail',
				message: 'Data directory is not accessible',
				componentId: 'diskspace',
				componentType: 'system',
			};
		} catch (error) {
			logger.error('Disk space health check failed', {
				brand: 'brAInwav',
				message: safeErrorMessage(error),
				stack: safeErrorStack(error),
			});
			return {
				status: 'fail',
				message: `Disk space check failed: ${safeErrorMessage(error)}`,
				componentId: 'diskspace',
				componentType: 'system',
			};
		}
	}

	private async checkEnvironment(): Promise<HealthCheck> {
		try {
			const requiredEnvVars = ['JWT_SECRET', 'NODE_ENV'];
			const optionalButRecommended = ['MODEL_API_KEY', 'DATABASE_PATH'];

			const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
			const missingRecommended = optionalButRecommended.filter((varName) => !process.env[varName]);

			if (missingVars.length > 0) {
				return {
					status: 'fail',
					message: `Missing required environment variables: ${missingVars.join(', ')}`,
					componentId: 'environment',
					componentType: 'system',
				};
			}

			if (missingRecommended.length > 0) {
				return {
					status: 'warn',
					message: `Missing recommended environment variables: ${missingRecommended.join(', ')}`,
					componentId: 'environment',
					componentType: 'system',
				};
			}

			// Check JWT secret length
			if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
				return {
					status: 'warn',
					message: 'JWT secret should be at least 32 characters long',
					componentId: 'environment',
					componentType: 'system',
				};
			}

			return {
				status: 'pass',
				message: 'Environment configuration is valid',
				componentId: 'environment',
				componentType: 'system',
			};
		} catch (error) {
			logger.error('Environment health check failed', {
				brand: 'brAInwav',
				message: safeErrorMessage(error),
				stack: safeErrorStack(error),
			});
			return {
				status: 'fail',
				message: `Environment check failed: ${safeErrorMessage(error)}`,
				componentId: 'environment',
				componentType: 'system',
			};
		}
	}

	private async checkExternalDependencies(): Promise<HealthCheck> {
		try {
			// Check external service connectivity (if any)
			// This could include external APIs, external databases, etc.
			// For now, we'll just check if we can resolve external hostnames

			const externalServices = [process.env.EXTERNAL_API_URL, process.env.AUTH_PROVIDER_URL].filter(
				Boolean,
			);

			if (externalServices.length === 0) {
				return {
					status: 'pass',
					message: 'No external dependencies configured',
					componentId: 'external',
					componentType: 'external',
				};
			}

			// For now, just return pass - in a real implementation,
			// you would check connectivity to each service
			return {
				status: 'pass',
				message: `${externalServices.length} external dependencies configured`,
				observedValue: externalServices.length,
				observedUnit: 'services',
				componentId: 'external',
				componentType: 'external',
			};
		} catch (error) {
			return {
				status: 'warn',
				message: `External dependency check failed: ${safeErrorMessage(error)}`,
				componentId: 'external',
				componentType: 'external',
			};
		}
	}

	private determineOverallStatus(
		checks: Record<string, HealthCheck>,
	): 'healthy' | 'degraded' | 'unhealthy' {
		const statuses = Object.values(checks).map((check) => check.status);

		if (statuses.includes('fail')) {
			return 'unhealthy';
		}

		if (statuses.includes('warn')) {
			return 'degraded';
		}

		return 'healthy';
	}

	private async measureEventLoopLag(): Promise<number> {
		return new Promise((resolve) => {
			const start = performance.now();
			setImmediate(() => {
				const lag = performance.now() - start;
				resolve(lag);
			});
		});
	}

	public getLastHealthCheck(): HealthCheckResult | null {
		return this.lastHealthCheck;
	}

	public markAsShuttingDown(): void {
		this.isShuttingDown = true;
		logger.info('Health service marked as shutting down');
	}
}
