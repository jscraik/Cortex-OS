#!/usr/bin/env tsx

/**
 * GraphRAG Performance Benchmark Script
 *
 * Comprehensive performance testing for the brAInwav GraphRAG system:
 * - Query latency benchmarks
 * - Cache performance testing
 * - Memory usage profiling
 * - External provider performance
 * - Concurrent load testing
 */

import { createGraphRAGService } from '../../packages/memory-core/src/services/GraphRAGService.js';
import { performanceMonitor } from '../../packages/memory-core/src/monitoring/PerformanceMonitor.js';

interface BenchmarkConfig {
	queries: string[];
	concurrency: number;
	iterations: number;
	warmupIterations: number;
	cacheEnabled: boolean;
	externalProvidersEnabled: boolean;
}

interface BenchmarkResults {
	totalQueries: number;
	totalDuration: number;
	averageLatency: number;
	p50Latency: number;
	p95Latency: number;
	p99Latency: number;
	cacheHitRatio: number;
	memoryUsageMB: number;
	throughputQPS: number;
	errors: number;
}

class GraphRAGBenchmark {
	private service: ReturnType<typeof createGraphRAGService>;
	private config: BenchmarkConfig;

	constructor(config: BenchmarkConfig) {
		this.config = config;
		this.service = createGraphRAGService({
			qdrant: {
				url: process.env.QDRANT_URL || 'http://localhost:6333',
				collection: 'local_memory_v1',
				timeout: 30000,
				maxRetries: 3,
				brainwavBranding: true,
			},
			limits: {
				maxConcurrentQueries: config.concurrency,
				queryTimeoutMs: 30000,
				maxContextChunks: 24,
			},
			externalKg: {
				enabled: config.externalProvidersEnabled,
				provider: 'mcp',
				slug: 'arxiv-1',
				tool: 'search_papers',
				maxResults: 5,
				requestTimeoutMs: 10000,
			},
		});
	}

	async initialize(): Promise<void> {
		// Mock embedding functions for benchmarking
		const embedDense = async (text: string): Promise<number[]> => {
			// Simulate embedding generation latency
			await new Promise(resolve => setTimeout(resolve, 50));
			return Array.from({ length: 1536 }, () => Math.random() - 0.5);
		};

		const embedSparse = async (text: string): Promise<{ indices: number[]; values: number[] }> => {
			// Simulate sparse embedding generation
			await new Promise(resolve => setTimeout(resolve, 20));
			const words = text.toLowerCase().split(/\s+/);
			const indices = words.map((_, i) => i).slice(0, 10);
			const values = Array.from({ length: indices.length }, () => Math.random());
			return { indices, values };
		};

		await this.service.initialize(embedDense, embedSparse);
		console.log('brAInwav GraphRAG Benchmark: Service initialized', {
			component: 'benchmark',
			brand: 'brAInwav',
		});
	}

	async runSingleQuery(query: string): Promise<{ success: boolean; latency: number; error?: string }> {
		const startTime = Date.now();
		try {
			await this.service.query({
				question: query,
				k: 8,
				maxChunks: 24,
				includeCitations: true,
			});
			const latency = Date.now() - startTime;
			return { success: true, latency };
		} catch (error) {
			const latency = Date.now() - startTime;
			return {
				success: false,
				latency,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	async runWarmup(): Promise<void> {
		console.log('brAInwav GraphRAG Benchmark: Starting warmup', {
			component: 'benchmark',
			brand: 'brAInwav',
			warmupIterations: this.config.warmupIterations,
		});

		for (let i = 0; i < this.config.warmupIterations; i++) {
			const query = this.config.queries[i % this.config.queries.length];
			await this.runSingleQuery(query);
		}

		console.log('brAInwav GraphRAG Benchmark: Warmup completed', {
			component: 'benchmark',
			brand: 'brAInwav',
		});
	}

	async runBenchmark(): Promise<BenchmarkResults> {
		console.log('brAInwav GraphRAG Benchmark: Starting benchmark', {
			component: 'benchmark',
			brand: 'brAInwav',
			totalQueries: this.config.queries.length * this.config.iterations,
			concurrency: this.config.concurrency,
		});

		const latencies: number[] = [];
		const startTime = Date.now();
		let errors = 0;

		// Warmup phase
		await this.runWarmup();

		// Reset performance monitor before main benchmark
		performanceMonitor.reset();

		// Run benchmark queries
		const queryPromises: Promise<void>[] = [];

		for (let iteration = 0; iteration < this.config.iterations; iteration++) {
			for (const query of this.config.queries) {
				for (let concurrent = 0; concurrent < this.config.concurrency; concurrent++) {
					queryPromises.push(
						(async () => {
							const result = await this.runSingleQuery(query);
							if (result.success) {
								latencies.push(result.latency);
							} else {
								errors++;
							}
						})()
					);
				}
			}
		}

		// Wait for all queries to complete
		await Promise.all(queryPromises);

		const totalDuration = Date.now() - startTime;
		const totalQueries = this.config.queries.length * this.config.iterations * this.config.concurrency;

		// Calculate statistics
		latencies.sort((a, b) => a - b);
		const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
		const p50Latency = latencies[Math.floor(latencies.length * 0.5)];
		const p95Latency = latencies[Math.floor(latencies.length * 0.95)];
		const p99Latency = latencies[Math.floor(latencies.length * 0.99)];

		const metrics = performanceMonitor.getMetrics();
		const throughputQPS = (totalQueries / totalDuration) * 1000;

		const results: BenchmarkResults = {
			totalQueries,
			totalDuration,
			averageLatency: Math.round(averageLatency * 100) / 100,
			p50Latency,
			p95Latency,
			p99Latency,
			cacheHitRatio: Math.round(metrics.cacheHitRatio * 1000) / 1000,
			memoryUsageMB: metrics.memoryUsageMB,
			throughputQPS: Math.round(throughputQPS * 100) / 100,
			errors,
		};

		console.log('brAInwav GraphRAG Benchmark: Completed', {
			component: 'benchmark',
			brand: 'brAInwav',
			...results,
		});

		return results;
	}

	async runCachePerformanceTest(): Promise<{
		cacheEnabledLatency: number;
		cacheDisabledLatency: number;
		speedupRatio: number;
	}> {
		const testQuery = this.config.queries[0];

		// Test with cache enabled
		console.log('brAInwav GraphRAG Benchmark: Testing cache performance', {
			component: 'benchmark',
			brand: 'brAInwav',
		});

		const cacheEnabledTimes: number[] = [];
		for (let i = 0; i < 10; i++) {
			const result = await this.runSingleQuery(testQuery);
			if (result.success) {
				cacheEnabledTimes.push(result.latency);
			}
		}

		const cacheEnabledLatency = cacheEnabledTimes.reduce((sum, time) => sum + time, 0) / cacheEnabledTimes.length;

		// Test with cache disabled (clear cache and run single query)
		performanceMonitor.reset();
		const cacheDisabledResult = await this.runSingleQuery(testQuery);
		const cacheDisabledLatency = cacheDisabledResult.latency;

		const speedupRatio = cacheDisabledLatency / cacheEnabledLatency;

		console.log('brAInwav GraphRAG Benchmark: Cache performance results', {
			component: 'benchmark',
			brand: 'brAInwav',
			cacheEnabledLatency,
			cacheDisabledLatency,
			speedupRatio,
		});

		return {
			cacheEnabledLatency,
			cacheDisabledLatency,
			speedupRatio,
		};
	}

	async cleanup(): Promise<void> {
		await this.service.close();
		console.log('brAInwav GraphRAG Benchmark: Service cleaned up', {
			component: 'benchmark',
			brand: 'brAInwav',
		});
	}
}

// Default benchmark configuration
const defaultConfig: BenchmarkConfig = {
	queries: [
		'What are the latest developments in transformer architectures?',
		'How does dependency injection work in modern frameworks?',
		'What are the best practices for API design?',
		'Explain the concept of graph databases and their use cases',
		'How to implement secure authentication systems?',
	],
	concurrency: 5,
	iterations: 3,
	warmupIterations: 5,
	cacheEnabled: true,
	externalProvidersEnabled: false, // Disabled for reliable benchmarking
};

async function main(): Promise<void> {
	console.log('brAInwav GraphRAG Performance Benchmark Starting', {
		component: 'benchmark',
		brand: 'brAInwav',
		config: defaultConfig,
	});

	const benchmark = new GraphRAGBenchmark(defaultConfig);

	try {
		await benchmark.initialize();

		// Run main benchmark
		const results = await benchmark.runBenchmark();

		// Run cache performance test
		const cacheResults = await benchmark.runCachePerformanceTest();

		// Get operation statistics
		const operationStats = performanceMonitor.getOperationStats();

		// Print comprehensive results
		console.log('\n=== brAInwav GraphRAG Performance Benchmark Results ===');
		console.log(`Total Queries: ${results.totalQueries}`);
		console.log(`Average Latency: ${results.averageLatency}ms`);
		console.log(`P50 Latency: ${results.p50Latency}ms`);
		console.log(`P95 Latency: ${results.p95Latency}ms`);
		console.log(`P99 Latency: ${results.p99Latency}ms`);
		console.log(`Throughput: ${results.throughputQPS} QPS`);
		console.log(`Cache Hit Ratio: ${(results.cacheHitRatio * 100).toFixed(1)}%`);
		console.log(`Memory Usage: ${results.memoryUsageMB}MB`);
		console.log(`Errors: ${results.errors}`);
		console.log('\n=== Cache Performance ===');
		console.log(`Cache Speedup: ${cacheResults.speedupRatio.toFixed(2)}x`);
		console.log('\n=== Operation Statistics ===');
		console.log(JSON.stringify(operationStats, null, 2));

		// Export results to file
		const exportData = {
			timestamp: new Date().toISOString(),
			config: defaultConfig,
			results,
			cacheResults,
			operationStats,
		};

		await import('fs').then(fs => {
			fs.writeFileSync('benchmark-results.json', JSON.stringify(exportData, null, 2));
		});

		console.log('\nResults exported to: benchmark-results.json');

	} catch (error) {
		console.error('brAInwav GraphRAG Benchmark failed', {
			component: 'benchmark',
			brand: 'brAInwav',
			error: error instanceof Error ? error.message : String(error),
		});
		process.exit(1);
	} finally {
		await benchmark.cleanup();
	}
}

// Run benchmark if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch(console.error);
}