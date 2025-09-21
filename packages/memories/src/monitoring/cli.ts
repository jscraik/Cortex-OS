#!/usr/bin/env node

import { Command } from 'commander';
import { createStoreFromEnv } from '../config/store-from-env.js';
import { MemoryHealthChecker, type HealthCheckConfig } from './health-check.js';
import { MemoryMetricsCollector, type MetricsCollectorConfig } from './metrics-collector.js';
import { OperationalDashboard } from './operaional-dashboard.js';
import { initializeExternalStorage } from '../adapters/external-storage.js';
import table from 'tty-table';

const program = new Command();

program
	.name('memories-monitor')
	.description('Monitoring CLI for Cortex Memories')
	.version('1.0.0');

// Health check command
program
	.command('health')
	.description('Check memory system health')
	.option('-d, --detailed', 'Show detailed health information')
	.option('-w, --watch', 'Watch mode - continuously check health')
	.option('-i, --interval <ms>', 'Check interval in milliseconds', '5000')
	.action(async (options) => {
		const store = await createStoreFromEnv();
		const healthChecker = new MemoryHealthChecker(store);

		if (options.watch) {
			console.log(`Watching health status every ${options.interval}ms...`);
			console.log('Press Ctrl+C to stop\n');

			const interval = setInterval(async () => {
				const result = await healthChecker.checkHealth();
				displayHealth(result, options.detailed);
				console.log('\n');
			}, parseInt(options.interval));

			process.on('SIGINT', () => {
				clearInterval(interval);
				process.exit(0);
			});
		} else {
			const result = await healthChecker.checkHealth();
			displayHealth(result, options.detailed);
		}

		await store.close();
	});

// Metrics command
program
	.command('metrics')
	.description('Show memory system metrics')
	.option('-w, --watch', 'Watch mode - continuously show metrics')
	.option('-i, --interval <ms>', 'Update interval in milliseconds', '5000')
	.option('-j, --json', 'Output in JSON format')
	.action(async (options) => {
		const store = await createStoreFromEnv();
		const metricsCollector = new MemoryMetricsCollector(store);
		const instrumentedStore = metricsCollector.createInstrumentedStore();

		// Initial metrics update
		await metricsCollector.updateStorageMetrics();

		if (options.watch) {
			console.log(`Watching metrics every ${options.interval}ms...`);
			console.log('Press Ctrl+C to stop\n');

			const interval = setInterval(async () => {
				await metricsCollector.updateStorageMetrics();
				const metrics = metricsCollector.getMetrics();

				if (options.json) {
					console.log(JSON.stringify(metrics, null, 2));
				} else {
					displayMetrics(metrics);
				}

				console.log('\n');
			}, parseInt(options.interval));

			process.on('SIGINT', () => {
				clearInterval(interval);
				process.exit(0);
			});
		} else {
			await metricsCollector.updateStorageMetrics();
			const metrics = metricsCollector.getMetrics();

			if (options.json) {
				console.log(JSON.stringify(metrics, null, 2));
			} else {
				displayMetrics(metrics);
			}
		}

		await instrumentedStore.close();
	});

// Dashboard command
program
	.command('dashboard')
	.description('Start operational dashboard')
	.option('-p, --port <port>', 'Dashboard port', '3001')
	.option('-r, --refresh <ms>', 'Refresh interval in milliseconds', '30000')
	.action(async (options) => {
		const store = await createStoreFromEnv();
		const healthChecker = new MemoryHealthChecker(store);
		const metricsCollector = new MemoryMetricsCollector(store);
		const instrumentedStore = metricsCollector.createInstrumentedStore();

		// Initialize external storage
		await initializeExternalStorage();

		const dashboard = new OperationalDashboard(healthChecker, metricsCollector, {
			port: parseInt(options.port),
			refreshIntervalMs: parseInt(options.refresh),
		});

		console.log(`Starting dashboard on port ${options.port}...`);
		await dashboard.start();
	});

// Storage command
program
	.command('storage')
	.description('Show external storage status')
	.option('-w, --watch', 'Watch mode - continuously check storage')
	.option('-i, --interval <ms>', 'Check interval in milliseconds', '5000')
	.action(async (options) => {
		const externalManager = await initializeExternalStorage();

		if (options.watch) {
			console.log(`Watching storage status every ${options.interval}ms...`);
			console.log('Press Ctrl+C to stop\n');

			const interval = setInterval(() => {
				displayStorageStatus(externalManager);
				console.log('\n');
			}, parseInt(options.interval));

			process.on('SIGINT', () => {
				clearInterval(interval);
				process.exit(0);
			});
		} else {
			displayStorageStatus(externalManager);
		}
	});

// Stress test command
program
	.command('stress')
	.description('Run stress test on memory system')
	.option('-c, --concurrency <num>', 'Number of concurrent operations', '10')
	.option('-d, --duration <seconds>', 'Test duration in seconds', '30')
	.option('-o, --operations <type>', 'Operation type (upsert|search|get|mixed)', 'mixed')
	.action(async (options) => {
		const store = await createStoreFromEnv();
		const metricsCollector = new MemoryMetricsCollector(store, {
			sampleRate: 1.0, // Sample all operations for stress test
		});
		const instrumentedStore = metricsCollector.createInstrumentedStore();

		const concurrency = parseInt(options.concurrency);
		const duration = parseInt(options.duration) * 1000;
		const operationType = options.operations;

		console.log(`Running stress test: ${concurrency} concurrent ${operationType} operations for ${options.duration} seconds`);

		const startTime = Date.now();
		let completedOperations = 0;
		let errors = 0;

		// Create test data
		const testMemories = Array.from({ length: 100 }, (_, i) => ({
			id: `stress-test-${i}`,
			kind: 'stress-test' as const,
			text: `Stress test memory ${i} with some content to make it realistic`,
			tags: ['stress-test', `batch-${Math.floor(i / 10)}`],
			metadata: { index: i, timestamp: Date.now() },
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			provenance: { source: 'stress-test' },
		}));

		// Run concurrent operations
		const runOperation = async (): Promise<void> => {
			while (Date.now() - startTime < duration) {
				try {
					switch (operationType) {
						case 'upsert':
							const memory = testMemories[Math.floor(Math.random() * testMemories.length)];
							await instrumentedStore.upsert({ ...memory, id: `${memory.id}-${Date.now()}` });
							break;
						case 'search':
							await instrumentedStore.search({
								query: 'stress test',
								limit: 10,
							});
							break;
						case 'get':
							const id = `stress-test-${Math.floor(Math.random() * 100)}`;
							await instrumentedStore.get(id);
							break;
						case 'mixed':
							const op = Math.floor(Math.random() * 3);
							if (op === 0) {
								const memory = testMemories[Math.floor(Math.random() * testMemories.length)];
								await instrumentedStore.upsert({ ...memory, id: `${memory.id}-${Date.now()}` });
							} else if (op === 1) {
								await instrumentedStore.search({ query: 'stress', limit: 5 });
							} else {
								const id = `stress-test-${Math.floor(Math.random() * 100)}`;
								await instrumentedStore.get(id);
							}
							break;
					}
					completedOperations++;
				} catch (error) {
					errors++;
				}
			}
		};

		// Start concurrent workers
		const workers = Array.from({ length: concurrency }, () => runOperation());

		// Wait for completion
		await Promise.all(workers);

		// Calculate results
		const actualDuration = (Date.now() - startTime) / 1000;
		const throughput = completedOperations / actualDuration;
		const errorRate = errors / completedOperations;

		const metrics = metricsCollector.getMetrics();

		console.log('\nStress Test Results:');
		console.log('===================');
		console.log(`Duration: ${actualDuration.toFixed(2)} seconds`);
		console.log(`Concurrency: ${concurrency}`);
		console.log(`Completed Operations: ${completedOperations}`);
		console.log(`Errors: ${errors}`);
		console.log(`Error Rate: ${(errorRate * 100).toFixed(2)}%`);
		console.log(`Throughput: ${throughput.toFixed(2)} ops/sec`);
		console.log(`\nPerformance Metrics:`);
		console.log(`Average Latency: ${metrics.performance.averageLatencyMs.toFixed(2)}ms`);
		console.log(`P95 Latency: ${metrics.performance.p95LatencyMs.toFixed(2)}ms`);
		console.log(`P99 Latency: ${metrics.performance.p99LatencyMs.toFixed(2)}ms`);

		await instrumentedStore.close();
	});

// Helper functions
function displayHealth(result: any, detailed: boolean) {
	const timestamp = new Date(result.timestamp).toLocaleString();

	if (!detailed) {
		console.log(`[${timestamp}] Status: ${result.status.toUpperCase()}`);
		return;
	}

	console.log(`Health Check - ${timestamp}`);
	console.log('============================');
	console.log(`Overall Status: ${result.status.toUpperCase()}`);

	const headers = ['Component', 'Status', 'Latency', 'Message'];
	const rows = Object.entries(result.components).map(([key, comp]) => [
		key,
		comp.status.toUpperCase(),
		comp.latencyMs ? `${comp.latencyMs}ms` : '-',
		comp.message || '-',
	]);

	const t1 = table(headers, rows, { borderStyle: 'dashed' });
	console.log(t1.render());

	if (result.metrics) {
		console.log('\nSystem Metrics:');
		console.log(`Uptime: ${formatDuration(result.metrics.uptimeMs)}`);
		console.log(`Memory Usage: ${(result.metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
	}
}

function displayMetrics(metrics: any) {
	const summary = metrics.summary;

	console.log('Memory System Metrics');
	console.log('=====================');
	console.log(`Uptime: ${formatDuration(summary.uptime)}`);
	console.log(`Total Operations: ${summary.totalOperations.toLocaleString()}`);
	console.log(`Success Rate: ${(summary.successRate * 100).toFixed(2)}%`);
	console.log(`Average Latency: ${summary.averageLatencyMs.toFixed(2)}ms`);
	console.log(`P95 Latency: ${summary.p95LatencyMs.toFixed(2)}ms`);
	console.log(`Throughput: ${summary.throughputPerSecond.toFixed(2)} ops/sec`);
	console.log(`Total Memories: ${summary.totalMemories.toLocaleString()}`);
	console.log(`Total Errors: ${summary.totalErrors.toLocaleString()}`);

	if (metrics.storage && Object.keys(metrics.storage.memoriesByKind).length > 0) {
		console.log('\nMemories by Kind:');
		for (const [kind, count] of Object.entries(metrics.storage.memoriesByKind)) {
			console.log(`  ${kind}: ${count}`);
		}
	}

	if (Object.keys(metrics.errors.byOperation).length > 0) {
		console.log('\nErrors by Operation:');
		for (const [op, count] of Object.entries(metrics.errors.byOperation)) {
			console.log(`  ${op}: ${count}`);
		}
	}
}

function displayStorageStatus(manager: any) {
	const current = manager.getCurrentStorage();
	const allStatus = manager.getAllStatus();
	const timestamp = new Date().toLocaleString();

	console.log(`External Storage Status - ${timestamp}`);
	console.log('=================================');

	if (current) {
		console.log(`Current Storage: ${current}`);
		const currentStatus = allStatus.find(s => s.path === current);
		if (currentStatus) {
			console.log(`Available: ${currentStatus.available ? 'Yes' : 'No'}`);
			console.log(`Free Space: ${currentStatus.freeSpaceGB?.toFixed(2) || 'N/A'} GB`);
			console.log(`Total Size: ${currentStatus.sizeGB?.toFixed(2) || 'N/A'} GB`);
		}
	} else {
		console.log('Current Storage: None available');
	}

	console.log('\nAll Storage Paths:');
	for (const status of allStatus) {
		console.log(`  ${status.path}: ${status.available ? 'Available' : 'Unavailable'}`);
		if (status.available) {
			console.log(`    Free: ${status.freeSpaceGB?.toFixed(2) || 'N/A'} GB`);
		}
	}
}

function formatDuration(ms: number): string {
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${days}d ${hours % 24}h`;
	if (hours > 0) return `${hours}h ${minutes % 60}m`;
	if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
	return `${seconds}s`;
}

program.parse();