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

import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

import { createGraphRAGService } from '../../packages/memory-core/src/services/GraphRAGService.js';
import { performanceMonitor } from '../../packages/memory-core/src/monitoring/PerformanceMonitor.js';

interface BenchmarkConfig {
        queries: string[];
        concurrency: number;
        iterations: number;
        warmupIterations: number;
        cacheEnabled: boolean;
        externalProvidersEnabled: boolean;
        useProductionEmbeddings: boolean;
        artifactPath: string;
        embeddingAdapter: 'mlx' | 'frontier' | 'mcp';
        embeddingModel?: string;
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

interface EmbeddingMetricsSummary {
        mode: 'synthetic' | 'production';
        adapter: string;
        dense: ReturnType<typeof summarizeSamples> & { metadata?: Record<string, string> };
        sparse: ReturnType<typeof summarizeSamples> & { metadata?: Record<string, string> };
        errors: string[];
}

const DEFAULT_SPARSE_BUCKET_SIZE = 2048;

function summarizeSamples(samples: number[]): {
        count: number;
        min: number;
        max: number;
        average: number;
        p50: number;
        p95: number;
        p99: number;
} {
        if (samples.length === 0) {
                return { count: 0, min: 0, max: 0, average: 0, p50: 0, p95: 0, p99: 0 };
        }

        const sorted = [...samples].sort((a, b) => a - b);
        const percentile = (p: number) => {
                const index = Math.ceil((p / 100) * sorted.length) - 1;
                return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
        };

        const sum = sorted.reduce((acc, value) => acc + value, 0);

        return {
                count: sorted.length,
                min: sorted[0],
                max: sorted[sorted.length - 1],
                average: Math.round((sum / sorted.length) * 100) / 100,
                p50: percentile(50),
                p95: percentile(95),
                p99: percentile(99),
        };
}

class GraphRAGBenchmark {
        private service: ReturnType<typeof createGraphRAGService>;
        private config: BenchmarkConfig;
        private embedDense!: (text: string) => Promise<number[]>;
        private embedSparse!: (text: string) => Promise<{ indices: number[]; values: number[] }>;
        private embeddingMetrics = {
                mode: 'synthetic' as EmbeddingMetricsSummary['mode'],
                adapter: 'synthetic',
                denseSamples: [] as number[],
                sparseSamples: [] as number[],
                denseMetadata: {} as Record<string, string>,
                sparseMetadata: {} as Record<string, string>,
                errors: [] as string[],
        };

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
                await this.setupEmbeddings();
                await this.service.initialize(this.embedDense, this.embedSparse);
                console.log('brAInwav GraphRAG Benchmark: Service initialized', {
                        component: 'benchmark',
                        brand: 'brAInwav',
                        productionEmbeddings: this.embeddingMetrics.mode === 'production',
                        adapter: this.embeddingMetrics.adapter,
                });
        }

        private async setupEmbeddings(): Promise<void> {
                if (this.config.useProductionEmbeddings) {
                        try {
                                await this.setupProductionEmbeddings();
                                return;
                        } catch (error) {
                                const message =
                                        error instanceof Error ? error.message : 'Unknown production embedding error';
                                this.embeddingMetrics.errors.push(message);
                                console.warn('brAInwav GraphRAG Benchmark: production embedding setup failed', {
                                        component: 'benchmark',
                                        brand: 'brAInwav',
                                        adapter: this.config.embeddingAdapter,
                                        error: message,
                                });
                        }
                }

                this.setupSyntheticEmbeddings();
        }

        private async setupProductionEmbeddings(): Promise<void> {
                const adapter = this.config.embeddingAdapter;
                if (adapter !== 'mlx') {
                        throw new Error(`Unsupported embedding adapter for benchmark: ${adapter}`);
                }

                const { createMLXAdapter } = await import(
                        '../../packages/model-gateway/src/adapters/mlx-adapter.js'
                );
                const mlxAdapter = createMLXAdapter();
                const model = this.config.embeddingModel || process.env.GRAPHRAG_BENCH_EMBED_MODEL || 'qwen3-embedding-4b-mlx';

                this.embeddingMetrics.mode = 'production';
                this.embeddingMetrics.adapter = `mlx:${model}`;
                this.embeddingMetrics.denseMetadata = { model, provider: 'mlx' };
                this.embeddingMetrics.sparseMetadata = { strategy: 'hash', bucketSize: String(DEFAULT_SPARSE_BUCKET_SIZE) };

                this.embedDense = async (text: string) => {
                        const start = performance.now();
                        const response = await mlxAdapter.generateEmbedding({ text, model });
                        const duration = performance.now() - start;
                        this.embeddingMetrics.denseSamples.push(Math.round(duration * 100) / 100);
                        return response.embedding;
                };

                this.embedSparse = async (text: string) => {
                        const start = performance.now();
                        const sparse = await this.computeSparseEmbedding(text);
                        const duration = performance.now() - start;
                        this.embeddingMetrics.sparseSamples.push(Math.round(duration * 100) / 100);
                        return sparse;
                };
        }

        private setupSyntheticEmbeddings(): void {
                const useTestVectors = process.env.PERF_USE_TEST_VECTORS === 'true';
                const useTestValues = process.env.PERF_USE_TEST_VALUES === 'true';

                this.embeddingMetrics.mode = 'synthetic';
                this.embeddingMetrics.adapter = useTestVectors ? 'synthetic:test-pattern' : 'synthetic:zero-vector';
                this.embeddingMetrics.denseMetadata = { pattern: this.embeddingMetrics.adapter };
                this.embeddingMetrics.sparseMetadata = {
                        strategy: useTestValues ? 'deterministic' : 'uniform',
                        bucketSize: String(DEFAULT_SPARSE_BUCKET_SIZE),
                };

                this.embedDense = async (text: string) => {
                        const start = performance.now();
                        await new Promise(resolve => setTimeout(resolve, 50));
                        const vector = useTestVectors
                                ? Array.from({ length: 1536 }, (_, i) => (i % 2 === 0 ? 0.1 : -0.1))
                                : Array.from({ length: 1536 }, () => 0);
                        const duration = performance.now() - start;
                        this.embeddingMetrics.denseSamples.push(Math.round(duration * 100) / 100);
                        return vector;
                };

                this.embedSparse = async (text: string) => {
                        const start = performance.now();
                        await new Promise(resolve => setTimeout(resolve, 20));
                        const sparse = await this.computeSparseEmbedding(text, {
                                deterministicValues: useTestValues,
                        });
                        const duration = performance.now() - start;
                        this.embeddingMetrics.sparseSamples.push(Math.round(duration * 100) / 100);
                        return sparse;
                };
        }

        private async computeSparseEmbedding(
                text: string,
                options: { deterministicValues?: boolean } = {},
        ): Promise<{ indices: number[]; values: number[] }> {
                const tokens = text
                        .toLowerCase()
                        .split(/[^a-z0-9]+/)
                        .filter(Boolean);
                const counts = new Map<number, number>();

                for (const token of tokens) {
                        const hash = createHash('sha256').update(token).digest();
                        const index = hash.readUInt32BE(0) % DEFAULT_SPARSE_BUCKET_SIZE;
                        counts.set(index, (counts.get(index) ?? 0) + 1);
                }

                const total = tokens.length || 1;
                const indices: number[] = [];
                const values: number[] = [];

                for (const [index, count] of counts.entries()) {
                        indices.push(index);
                        if (options.deterministicValues) {
                                const normalizedIndex = index % 10;
                                values.push(0.5 + normalizedIndex * 0.1);
                        } else {
                                values.push(count / total);
                        }
                }

                return { indices, values };
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
                        productionEmbeddings: this.embeddingMetrics.mode === 'production',
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

        getEmbeddingSummary(): EmbeddingMetricsSummary {
                return {
                        mode: this.embeddingMetrics.mode,
                        adapter: this.embeddingMetrics.adapter,
                        dense: {
                                ...summarizeSamples(this.embeddingMetrics.denseSamples),
                                metadata:
                                        Object.keys(this.embeddingMetrics.denseMetadata).length > 0
                                                ? this.embeddingMetrics.denseMetadata
                                                : undefined,
                        },
                        sparse: {
                                ...summarizeSamples(this.embeddingMetrics.sparseSamples),
                                metadata:
                                        Object.keys(this.embeddingMetrics.sparseMetadata).length > 0
                                                ? this.embeddingMetrics.sparseMetadata
                                                : undefined,
                        },
                        errors: this.embeddingMetrics.errors,
                };
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
        useProductionEmbeddings: process.env.GRAPHRAG_BENCH_USE_PROD_EMBEDDINGS === 'true',
        artifactPath: process.env.GRAPHRAG_BENCH_ARTIFACT_PATH || 'benchmark-results.json',
        embeddingAdapter: (process.env.GRAPHRAG_BENCH_EMBED_ADAPTER as 'mlx' | 'frontier' | 'mcp') || 'mlx',
        embeddingModel: process.env.GRAPHRAG_BENCH_EMBED_MODEL,
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
                const performanceMetrics = performanceMonitor.getMetrics();
                const embeddingSummary = benchmark.getEmbeddingSummary();
                const exportData = {
                        timestamp: new Date().toISOString(),
                        config: defaultConfig,
                        results,
                        cacheResults,
                        operationStats,
                        performanceMetrics,
                        embeddingSummary,
                };

                writeFileSync(defaultConfig.artifactPath, JSON.stringify(exportData, null, 2));

                console.log('\nResults exported to:', defaultConfig.artifactPath);

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