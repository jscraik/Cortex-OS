/**
 * Comprehensive Performance Benchmark Suite for RAG Package
 *
 * Measures:
 * - Document ingestion throughput
 * - Vector search latency and accuracy
 * - Embedding generation performance
 * - Memory usage patterns
 * - Retrieval pipeline end-to-end performance
 *
 * Usage:
 *   node benchmarks/performance-suite.js
 *   node benchmarks/performance-suite.js --profile=memory
 *   node benchmarks/performance-suite.js --profile=detailed
 */

import { createWriteStream } from 'node:fs';
import { cpus, freemem, totalmem } from 'node:os';
import { performance } from 'node:perf_hooks';
import process from 'node:process';

// Mock RAG implementation for benchmarking (replace with actual imports)
class MockRAGPipeline {
    constructor(options = {}) {
        this.options = { batchSize: 10, ...options };
        this.documents = [];
        this.vectors = new Map();
    }

    async ingest(documents) {
        const startTime = performance.now();
        const startMemory = process.memoryUsage();

        // Simulate embedding generation with realistic delays
        for (const doc of documents) {
            await new Promise((resolve) => setTimeout(resolve, 5 + Math.random() * 10));
            this.documents.push(doc);
            this.vectors.set(
                doc.id,
                new Array(384).fill(0).map(() => Math.random()),
            );
        }

        const endTime = performance.now();
        const endMemory = process.memoryUsage();

        return {
            duration: endTime - startTime,
            throughput: documents.length / ((endTime - startTime) / 1000),
            memoryDelta: {
                rss: endMemory.rss - startMemory.rss,
                heapUsed: endMemory.heapUsed - startMemory.heapUsed,
                external: endMemory.external - startMemory.external,
            },
            documentsProcessed: documents.length,
        };
    }

    async retrieve(query, options = {}) {
        const startTime = performance.now();
        const startMemory = process.memoryUsage();

        // Simulate vector search with realistic computation time
        await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 20));

        // Simulate similarity computation
        const similarities = Array.from(this.vectors.entries()).map(([id]) => {
            const similarity = Math.random(); // Simplified similarity computation
            return { id, similarity };
        });

        const topK = options.topK || 5;
        const results = similarities
            .toSorted((a, b) => b.similarity - a.similarity)
            .slice(0, topK)
            .map(({ id, similarity }) => ({
                document: this.documents.find((doc) => doc.id === id),
                similarity,
                metadata: { retrievalTime: performance.now() },
            }));

        const endTime = performance.now();
        const endMemory = process.memoryUsage();

        return {
            results,
            performance: {
                duration: endTime - startTime,
                memoryDelta: {
                    rss: endMemory.rss - startMemory.rss,
                    heapUsed: endMemory.heapUsed - startMemory.heapUsed,
                },
                vectorsCompared: this.vectors.size,
                accuracy: this.calculateAccuracy(results),
            },
        };
    }

    calculateAccuracy(results) {
        // Simplified accuracy calculation (replace with actual relevance scoring)
        return results.length > 0 ? 0.85 + Math.random() * 0.15 : 0;
    }
}

/**
 * Performance benchmark runner with comprehensive metrics
 */
class PerformanceBenchmark {
    constructor(options = {}) {
        this.options = {
            iterations: 10,
            warmupIterations: 3,
            profile: 'standard', // 'standard', 'memory', 'detailed'
            outputFile: 'benchmark-results.json',
            ...options,
        };
        this.results = [];
        this.systemInfo = this.getSystemInfo();
    }

    getSystemInfo() {
        return {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            cpus: cpus().length,
            totalMemory: totalmem(),
            freeMemory: freemem(),
            timestamp: new Date().toISOString(),
        };
    }

    async runBenchmark(name, benchmarkFn, iterations = null) {
        const actualIterations = iterations || this.options.iterations;
        const warmupIterations = this.options.warmupIterations;

        console.log(`\n🔥 Warming up ${name}...`);
        for (let i = 0; i < warmupIterations; i++) {
            await benchmarkFn();
        }

        console.log(`📊 Running ${name} (${actualIterations} iterations)...`);
        const results = [];

        for (let i = 0; i < actualIterations; i++) {
            const startTime = performance.now();
            const startMemory = process.memoryUsage();

            const result = await benchmarkFn();

            const endTime = performance.now();
            const endMemory = process.memoryUsage();

            const iterationResult = {
                iteration: i + 1,
                duration: endTime - startTime,
                result,
                memory: {
                    rss: endMemory.rss,
                    heapUsed: endMemory.heapUsed,
                    heapTotal: endMemory.heapTotal,
                    external: endMemory.external,
                    delta: {
                        rss: endMemory.rss - startMemory.rss,
                        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
                    },
                },
            };

            results.push(iterationResult);

            if (this.options.profile === 'detailed') {
                console.log(`  Iteration ${i + 1}: ${iterationResult.duration.toFixed(2)}ms`);
            }

            // Add small delay to prevent overwhelming the system
            await new Promise((resolve) => setTimeout(resolve, 10));
        }

        const stats = this.calculateStatistics(results, name);
        this.results.push(stats);

        return stats;
    }

    calculateStatistics(results, benchmarkName) {
        const durations = results.map((r) => r.duration);
        const memoryUsages = results.map((r) => r.memory.heapUsed);

        const sorted = durations.slice().sort((a, b) => a - b);
        const p50 = sorted[Math.floor(sorted.length * 0.5)];
        const p95 = sorted[Math.floor(sorted.length * 0.95)];
        const p99 = sorted[Math.floor(sorted.length * 0.99)];

        const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
        const variance = durations.reduce((a, b) => a + (b - mean) ** 2, 0) / durations.length;
        const stdDev = Math.sqrt(variance);

        const memoryMean = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;
        const memoryMax = Math.max(...memoryUsages);
        const memoryMin = Math.min(...memoryUsages);

        return {
            name: benchmarkName,
            iterations: results.length,
            duration: {
                mean: mean,
                min: Math.min(...durations),
                max: Math.max(...durations),
                p50: p50,
                p95: p95,
                p99: p99,
                stdDev: stdDev,
                coefficientOfVariation: stdDev / mean,
            },
            memory: {
                mean: memoryMean,
                min: memoryMin,
                max: memoryMax,
                peak: memoryMax,
            },
            throughput: {
                opsPerSecond: 1000 / mean,
                docsPerSecond: results[0]?.result?.throughput || null,
            },
            rawResults: this.options.profile === 'detailed' ? results : null,
        };
    }

    async runIngestionBenchmark() {
        const pipeline = new MockRAGPipeline({ batchSize: 10 });

        // Test different document sizes and batch sizes
        const scenarios = [
            { name: 'Small Documents (100 chars)', docSize: 100, count: 50 },
            { name: 'Medium Documents (1KB)', docSize: 1000, count: 25 },
            { name: 'Large Documents (10KB)', docSize: 10000, count: 10 },
        ];

        for (const scenario of scenarios) {
            console.log(`\n📝 Testing ${scenario.name}...`);

            await this.runBenchmark(`Ingestion: ${scenario.name}`, async () => {
                const documents = Array.from({ length: scenario.count }, (_, i) => ({
                    id: `doc-${i}`,
                    content: 'Lorem ipsum dolor sit amet '.repeat(scenario.docSize / 25),
                    metadata: { size: scenario.docSize, batch: i },
                }));

                return await pipeline.ingest(documents);
            });
        }
    }

    async runRetrievalBenchmark() {
        // Pre-populate the pipeline with documents
        const pipeline = new MockRAGPipeline();
        const documents = Array.from({ length: 100 }, (_, i) => ({
            id: `doc-${i}`,
            content: `Document content ${i} with various keywords and topics`,
            metadata: { category: i % 5, importance: Math.random() },
        }));

        await pipeline.ingest(documents);

        // Test different query types and result sizes
        const queryScenarios = [
            { name: 'Simple Query (topK=5)', query: 'search term', topK: 5 },
            { name: 'Complex Query (topK=10)', query: 'complex multi-word search query', topK: 10 },
            { name: 'Large Result Set (topK=20)', query: 'broad search', topK: 20 },
        ];

        for (const scenario of queryScenarios) {
            console.log(`\n🔍 Testing ${scenario.name}...`);

            await this.runBenchmark(`Retrieval: ${scenario.name}`, async () => {
                const result = await pipeline.retrieve(scenario.query, { topK: scenario.topK });
                return {
                    resultCount: result.results.length,
                    accuracy: result.performance.accuracy,
                    vectorsCompared: result.performance.vectorsCompared,
                };
            });
        }
    }

    async runEmbeddingBenchmark() {
        console.log('\n🧮 Testing Embedding Generation...');

        const textSizes = [
            { name: 'Short Text (50 chars)', length: 50 },
            { name: 'Medium Text (500 chars)', length: 500 },
            { name: 'Long Text (5000 chars)', length: 5000 },
        ];

        for (const textSize of textSizes) {
            const text = 'Sample text for embedding generation. '.repeat(Math.ceil(textSize.length / 38));

            await this.runBenchmark(`Embedding: ${textSize.name}`, async () => {
                // Simulate embedding generation
                const startTime = performance.now();
                await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 20));
                const embedding = new Array(384).fill(0).map(() => Math.random());
                const endTime = performance.now();

                return {
                    textLength: text.length,
                    embeddingDimensions: embedding.length,
                    processingTime: endTime - startTime,
                };
            });
        }
    }

    async runMemoryStressTest() {
        if (this.options.profile !== 'memory' && this.options.profile !== 'detailed') {
            console.log('\n⏭️  Skipping memory stress test (use --profile=memory)');
            return;
        }

        console.log('\n🧠 Running Memory Stress Test...');

        const pipeline = new MockRAGPipeline();
        let totalDocuments = 0;
        const batchSize = 100;
        const maxBatches = 10;

        for (let batch = 0; batch < maxBatches; batch++) {
            const documents = Array.from({ length: batchSize }, (_, i) => ({
                id: `stress-doc-${totalDocuments + i}`,
                content: 'Large document content '.repeat(1000), // ~20KB per document
                metadata: { batch, size: 'large' },
            }));

            await pipeline.ingest(documents);
            totalDocuments += batchSize;

            const memUsage = process.memoryUsage();
            console.log(
                `  Batch ${batch + 1}: ${totalDocuments} docs, ` +
                `Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
            );

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
        }
    }

    printResults() {
        console.log('\n📊 BENCHMARK RESULTS SUMMARY');
        console.log('='.repeat(50));

        for (const result of this.results) {
            console.log(`\n${result.name}:`);
            console.log(`  Mean Duration: ${result.duration.mean.toFixed(2)}ms`);
            console.log(`  P95 Duration:  ${result.duration.p95.toFixed(2)}ms`);
            console.log(`  Throughput:    ${result.throughput.opsPerSecond.toFixed(2)} ops/sec`);
            if (result.throughput.docsPerSecond) {
                console.log(`  Doc Throughput: ${result.throughput.docsPerSecond.toFixed(2)} docs/sec`);
            }
            console.log(`  Memory Peak:   ${Math.round(result.memory.peak / 1024 / 1024)}MB`);
            console.log(`  Std Deviation: ${result.duration.stdDev.toFixed(2)}ms`);
        }

        console.log('\n📋 System Information:');
        console.log(`  Platform: ${this.systemInfo.platform}`);
        console.log(`  Node.js: ${this.systemInfo.nodeVersion}`);
        console.log(`  CPUs: ${this.systemInfo.cpus}`);
        console.log(
            `  Total Memory: ${Math.round(this.systemInfo.totalMemory / 1024 / 1024 / 1024)}GB`,
        );
    }

    async saveResults() {
        const output = {
            systemInfo: this.systemInfo,
            benchmarkResults: this.results,
            metadata: {
                profile: this.options.profile,
                iterations: this.options.iterations,
                completedAt: new Date().toISOString(),
            },
        };

        const outputPath = `benchmarks/${this.options.outputFile}`;
        const writeStream = createWriteStream(outputPath);
        writeStream.write(JSON.stringify(output, null, 2));
        writeStream.end();

        console.log(`\n💾 Results saved to: ${outputPath}`);
    }

    async run() {
        console.log('🚀 Starting RAG Performance Benchmark Suite');
        console.log(`Profile: ${this.options.profile}`);
        console.log(`Iterations: ${this.options.iterations}`);
        console.log(`System: ${this.systemInfo.platform} ${this.systemInfo.arch}`);

        const startTime = performance.now();

        try {
            await this.runIngestionBenchmark();
            await this.runRetrievalBenchmark();
            await this.runEmbeddingBenchmark();
            await this.runMemoryStressTest();

            const totalTime = performance.now() - startTime;
            console.log(`\n✅ Benchmark suite completed in ${(totalTime / 1000).toFixed(2)}s`);

            this.printResults();
            await this.saveResults();
        } catch (error) {
            console.error('\n❌ Benchmark failed:', error);
            process.exit(1);
        }
    }
}

// CLI handling
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        iterations: 10,
        profile: 'standard',
        outputFile: `benchmark-results-${Date.now()}.json`,
    };

    for (const arg of args) {
        if (arg.startsWith('--iterations=')) {
            options.iterations = parseInt(arg.split('=')[1], 10);
        } else if (arg.startsWith('--profile=')) {
            options.profile = arg.split('=')[1];
        } else if (arg.startsWith('--output=')) {
            options.outputFile = arg.split('=')[1];
        } else if (arg === '--help' || arg === '-h') {
            console.log(`
RAG Performance Benchmark Suite

Usage: node benchmarks/performance-suite.js [options]

Options:
  --iterations=N     Number of iterations per benchmark (default: 10)
  --profile=TYPE     Profile type: standard, memory, detailed (default: standard)
  --output=FILE      Output file name (default: benchmark-results-{timestamp}.json)
  --help, -h         Show this help message

Profiles:
  standard   - Basic performance metrics
  memory     - Include memory stress testing
  detailed   - Full detailed metrics with raw results
      `);
            process.exit(0);
        }
    }

    return options;
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
    const options = parseArgs();
    const benchmark = new PerformanceBenchmark(options);
    benchmark.run();
}
