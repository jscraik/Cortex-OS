// Comprehensive health check service


import { promises as fs } from 'fs';
import path from 'path';
import { getDatabase } from '../utils/database';
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
	observedValue?: any;
	observedUnit?: string;
	time?: string;
	componentId?: string;
	componentType?: string;
}

export class HealthService {
	private static instance: HealthService;

	private constructor() { }

	public static getInstance(): HealthService {
		if (!HealthService.instance) {
			HealthService.instance = new HealthService();
		}
		return HealthService.instance;
	}

	async performHealthCheck(): Promise<HealthCheckResult> {
		const startTime = Date.now();
		const checks: Record<string, HealthCheck> = {};

		// Perform all health checks
		await Promise.allSettled([
			this.checkDatabase().then((result) => (checks.database = result)),
			this.checkFileSystem().then((result) => (checks.filesystem = result)),
			this.checkMemory().then((result) => (checks.memory = result)),
			this.checkDiskSpace().then((result) => (checks.diskspace = result)),
			this.checkEnvironment().then((result) => (checks.environment = result)),
		]);

		// Determine overall status
		const overallStatus = this.determineOverallStatus(checks);

		const result: HealthCheckResult = {
			status: overallStatus,
			checks,
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			version: process.env.npm_package_version || '1.0.0',
		};

		// Log health check results
		const duration = Date.now() - startTime;
		logger.info(`Health check completed in ${duration}ms`, {
			status: overallStatus,
			duration,
			category: 'health',
		});

		return result;
	}

	private async checkDatabase(): Promise<HealthCheck> {
		try {
			const db = getDatabase();

			// Test database connection
			const start = Date.now();
			const result = db.prepare('SELECT 1 as test').get();
			const duration = Date.now() - start;

			if (!result) {
				return {
					status: 'fail',
					message: 'Database query returned no result',
					componentId: 'database',
					componentType: 'datastore',
				};
			}

			// Check if query time is reasonable
			if (duration > 1000) {
				return {
					status: 'warn',
					message: 'Database response time is slow',
					observedValue: duration,
					observedUnit: 'ms',
					componentId: 'database',
					componentType: 'datastore',
				};
			}

			return {
				status: 'pass',
				message: 'Database is responding normally',
				observedValue: duration,
				observedUnit: 'ms',
				componentId: 'database',
				componentType: 'datastore',
			};
		} catch (error) {
			logger.error('Database health check failed', error);
			return {
				status: 'fail',
				message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				componentId: 'database',
				componentType: 'datastore',
			};
		}
	}

	private async checkFileSystem(): Promise<HealthCheck> {
		try {
			const uploadDir = process.env.UPLOAD_DIR || './uploads';
			const dataDir = path.dirname(
				process.env.DATABASE_PATH || './data/cortex.db',
			);

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
			logger.error('File system health check failed', error);
			return {
				status: 'fail',
				message: `File system check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
			logger.error('Memory health check failed', error);
			return {
				status: 'fail',
				message: `Memory check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				componentId: 'memory',
				componentType: 'system',
			};
		}
	}

	private async checkDiskSpace(): Promise<HealthCheck> {
		try {
			const dataDir = path.dirname(
				process.env.DATABASE_PATH || './data/cortex.db',
			);
			const stats = await fs.stat(dataDir);

			// This is a simplified check - in production you'd want to check actual disk usage
			// For now, we'll just ensure the directory exists
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
			logger.error('Disk space health check failed', error);
			return {
				status: 'fail',
				message: `Disk space check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				componentId: 'diskspace',
				componentType: 'system',
			};
		}
	}

	private async checkEnvironment(): Promise<HealthCheck> {
		try {
			const requiredEnvVars = ['JWT_SECRET', 'MODEL_API_KEY', 'NODE_ENV'];

			const missingVars = requiredEnvVars.filter(
				(varName) => !process.env[varName],
			);

			if (missingVars.length > 0) {
				return {
					status: 'fail',
					message: `Missing required environment variables: ${missingVars.join(', ')}`,
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
			logger.error('Environment health check failed', error);
			return {
				status: 'fail',
				message: `Environment check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				componentId: 'environment',
				componentType: 'system',
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
}
