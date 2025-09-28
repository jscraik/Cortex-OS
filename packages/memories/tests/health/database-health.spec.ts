import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// Import database adapters and health checker (need to be implemented)
import { DatabaseHealthChecker } from '../../src/health/database-health-checker.js';

describe('Memories Service Database Health Checks', () => {
	let healthChecker: DatabaseHealthChecker;

	beforeEach(() => {
		healthChecker = new DatabaseHealthChecker();
	});

	afterEach(async () => {
		await healthChecker.cleanup();
	});

	it('detects SQLite connection failures with invalid connection string', async () => {
		const invalidSqliteConfig = {
			type: 'sqlite' as const,
			connectionString: '/nonexistent/path/invalid.db',
			timeout: 1000,
		};

		const result = await healthChecker.checkHealth(invalidSqliteConfig);

		expect(result.healthy).toBe(false);
		expect(result.adapter).toBe('sqlite');
		expect(result.error).toBeDefined();
		expect(result.error?.message).toContain('brAInwav SQLite');
		expect(result.responseTime).toBeGreaterThan(0);
		expect(result.details.connectionAttempted).toBe(true);
		expect(result.details.connectionSuccessful).toBe(false);
	});

	it('validates Prisma connection with invalid database URL', async () => {
		const invalidPrismaConfig = {
			type: 'prisma' as const,
			connectionString: 'postgresql://invalid:invalid@nonexistent:5432/invalid',
			timeout: 2000,
		};

		const result = await healthChecker.checkHealth(invalidPrismaConfig);

		expect(result.healthy).toBe(false);
		expect(result.adapter).toBe('prisma');
		expect(result.error).toBeDefined();
		expect(result.error?.message).toContain('brAInwav Prisma');
		expect(result.responseTime).toBeGreaterThan(0);
		expect(result.details.prismaClient).toBe('initialized');
		expect(result.details.databaseReachable).toBe(false);
	});

	it('handles Local Memory adapter gracefully', async () => {
		const localMemoryConfig = {
			type: 'local-memory' as const,
			maxSize: 1024 * 1024, // 1MB
			timeout: 500,
		};

		const result = await healthChecker.checkHealth(localMemoryConfig);

		expect(result.healthy).toBe(true);
		expect(result.adapter).toBe('local-memory');
		expect(result.error).toBeUndefined();
		expect(result.responseTime).toBeLessThan(100);
		expect(result.details.memoryUsage).toBeDefined();
		expect(result.details.memoryUsage).toBeGreaterThanOrEqual(0);
		expect(result.details.maxCapacity).toBe(1024 * 1024);
	});

	it('performs connection ping tests for each adapter type', async () => {
		const configs = [
			{
				type: 'sqlite' as const,
				connectionString: ':memory:',
				timeout: 1000,
			},
			{
				type: 'local-memory' as const,
				maxSize: 512 * 1024,
				timeout: 500,
			},
		];

		for (const config of configs) {
			const result = await healthChecker.checkHealth(config);

			// Each adapter should support ping test
			expect(result.details.pingTest).toBeDefined();
			expect(result.details.pingResponse).toBeGreaterThan(0);

			if (result.healthy) {
				expect(result.details.pingTest).toBe('successful');
				expect(result.brAInwavStatus).toBe('operational');
			} else {
				expect(result.details.pingTest).toBe('failed');
				expect(result.brAInwavStatus).toBe('degraded');
			}
		}
	});

	it('validates database schema and table existence', async () => {
		const sqliteConfig = {
			type: 'sqlite' as const,
			connectionString: ':memory:',
			requiredTables: ['memories', 'embeddings', 'metadata'],
			timeout: 1000,
		};

		const result = await healthChecker.checkHealth(sqliteConfig);

		expect(result.details.schemaValidation).toBeDefined();
		expect(result.details.tableChecks).toBeDefined();

		if (result.healthy) {
			expect(result.details.schemaValidation.valid).toBe(true);
			expect(result.details.tableChecks.requiredTables).toEqual([
				'memories',
				'embeddings',
				'metadata',
			]);
			expect(result.details.tableChecks.existingTables).toContain('memories');
		}
	});

	it('measures performance metrics during health checks', async () => {
		const configs = [
			{ type: 'sqlite' as const, connectionString: ':memory:', timeout: 1000 },
			{ type: 'local-memory' as const, maxSize: 256 * 1024, timeout: 500 },
		];

		const results = await Promise.all(configs.map((config) => healthChecker.checkHealth(config)));

		for (const result of results) {
			expect(result.performance).toBeDefined();
			expect(result.performance.connectionTime).toBeGreaterThan(0);
			expect(result.performance.queryTime).toBeGreaterThan(0);
			expect(result.performance.totalTime).toBeGreaterThanOrEqual(
				result.performance.connectionTime + result.performance.queryTime,
			);

			// brAInwav performance standards
			if (result.adapter === 'local-memory') {
				expect(result.performance.totalTime).toBeLessThan(100);
				expect(result.performance.benchmarkScore).toBeGreaterThan(0.9);
			}
		}
	});

	it('provides comprehensive diagnostics for troubleshooting', async () => {
		const diagnosticConfig = {
			type: 'sqlite' as const,
			connectionString: '/tmp/nonexistent.db',
			enableDiagnostics: true,
			timeout: 1500,
		};

		const result = await healthChecker.checkHealth(diagnosticConfig);

		expect(result.diagnostics).toBeDefined();
		expect(result.diagnostics.brAInwavVersion).toBeDefined();
		expect(result.diagnostics.systemInfo).toBeDefined();
		expect(result.diagnostics.configurationSummary).toBeDefined();

		expect(result.diagnostics.systemInfo.platform).toBeDefined();
		expect(result.diagnostics.systemInfo.nodeVersion).toBeDefined();
		expect(result.diagnostics.systemInfo.memoryUsage).toBeDefined();

		expect(result.diagnostics.configurationSummary.adapterType).toBe('sqlite');
		expect(result.diagnostics.configurationSummary.connectionMethod).toBeDefined();
		expect(result.diagnostics.configurationSummary.securityLevel).toBeDefined();

		// Should include brAInwav-specific troubleshooting info
		expect(result.diagnostics.troubleshooting).toBeDefined();
		expect(result.diagnostics.troubleshooting.commonIssues).toHaveLength.greaterThan(0);
		expect(result.diagnostics.troubleshooting.recommendedActions).toHaveLength.greaterThan(0);
		expect(result.diagnostics.troubleshooting.supportInformation).toContain('brAInwav');
	});

	it('handles concurrent health checks without resource conflicts', async () => {
		const concurrentConfigs = Array.from({ length: 5 }, (_, i) => ({
			type: 'local-memory' as const,
			maxSize: (i + 1) * 128 * 1024,
			timeout: 1000,
			instanceId: `brAInwav-concurrent-${i}`,
		}));

		const startTime = Date.now();
		const results = await Promise.all(
			concurrentConfigs.map((config) => healthChecker.checkHealth(config)),
		);
		const totalTime = Date.now() - startTime;

		// All checks should complete successfully
		for (const result of results) {
			expect(result.healthy).toBe(true);
			expect(result.adapter).toBe('local-memory');
			expect(result.details.instanceId).toBeDefined();
		}

		// Concurrent execution should be faster than sequential
		expect(totalTime).toBeLessThan(1000 * concurrentConfigs.length);

		// Each result should have unique instance identifier
		const instanceIds = results.map((r) => r.details.instanceId);
		const uniqueIds = new Set(instanceIds);
		expect(uniqueIds.size).toBe(concurrentConfigs.length);
	});

	it('integrates with brAInwav monitoring and alerting', async () => {
		const monitoringConfig = {
			type: 'sqlite' as const,
			connectionString: ':memory:',
			enableMonitoring: true,
			alertThresholds: {
				responseTime: 500,
				errorRate: 0.1,
			},
			timeout: 1000,
		};

		const result = await healthChecker.checkHealth(monitoringConfig);

		expect(result.monitoring).toBeDefined();
		expect(result.monitoring.enabled).toBe(true);
		expect(result.monitoring.metricsCollected).toBe(true);
		expect(result.monitoring.alertsConfigured).toBe(true);

		expect(result.monitoring.metrics).toBeDefined();
		expect(result.monitoring.metrics.healthCheckCount).toBeGreaterThan(0);
		expect(result.monitoring.metrics.averageResponseTime).toBeGreaterThan(0);
		expect(result.monitoring.metrics.successRate).toBeGreaterThanOrEqual(0);

		// brAInwav monitoring integration
		expect(result.monitoring.brAInwavIntegration).toBeDefined();
		expect(result.monitoring.brAInwavIntegration.dashboardUrl).toContain('brAInwav');
		expect(result.monitoring.brAInwavIntegration.alertingEnabled).toBe(true);
	});
});
