#!/usr/bin/env node

/**
 * Document Ingestion Performance Benchmark
 *
 * Measures document ingestion throughput for different:
 * - Document sizes
 * - Batch sizes
 * - Embedding dimensions
 * - Concurrency levels
 *
 * Usage:
 *   node benchmarks/ingest.js
 *   node benchmarks/ingest.js --batch-size=50 --doc-count=1000
 */

import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

const DEFAULT_OPTIONS = {
    batchSize: 25,
    docCount: 100,
    docSize: 1000, // characters
    embeddingDim: 384,
    concurrency: 1,
    outputFile: 'ingestion-results.json',
};

class IngestionBenchmark {
    constructor(options = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.results = [];
    }

    generateDocument(id, size) {
        const words = [
            'artificial',
            'intelligence',
            'machine',
            'learning',
            'data',
            'science',
            'algorithm',
            'neural',
            'network',
            'deep',
            'learning',
            'model',
            'training',
            'inference',
            'optimization',
            'gradient',
            'descent',
            'clustering',
            'classification',
            'regression',
            'supervised',
            'unsupervised',
            'reinforcement',
            'computer',
            'vision',
            'processing',
        ];

        let content = '';
        while (content.length < size) {
            const word = words[Math.floor(Math.random() * words.length)];
            content += content.length === 0 ? word : ` ${word}`;
        }

        return {
            id: `doc-${id}`,
            content: content.substring(0, size),
            metadata: {
                size: content.length,
                words: content.split(' ').length,
                created: new Date().toISOString(),
            },
        };
    }

    async simulateEmbedding(text, dimensions) {
        // Simulate embedding generation time based on text length
        const processingTime = Math.max(5, text.length * 0.01 + Math.random() * 10);
        await new Promise((resolve) => setTimeout(resolve, processingTime));

        // Generate mock embedding vector
        return Array.from({ length: dimensions }, () => Math.random() * 2 - 1);
    }

    async processBatch(documents) {
        const startTime = performance.now();
        const startMemory = process.memoryUsage();

        const embeddings = await Promise.all(
            documents.map((doc) => this.simulateEmbedding(doc.content, this.options.embeddingDim)),
        );

        // Simulate vector store insertion
        await new Promise((resolve) => setTimeout(resolve, documents.length * 2));

        const endTime = performance.now();
        const endMemory = process.memoryUsage();

        return {
            documents: documents.length,
            embeddings: embeddings.length,
            duration: endTime - startTime,
            throughput: documents.length / ((endTime - startTime) / 1000),
            memory: {
                delta: endMemory.heapUsed - startMemory.heapUsed,
                peak: endMemory.heapUsed,
            },
            avgDocSize: documents.reduce((sum, doc) => sum + doc.content.length, 0) / documents.length,
        };
    }

    async runBenchmark() {
        console.log(`🚀 Starting ingestion benchmark`);
        console.log(`  Documents: ${this.options.docCount}`);
        console.log(`  Batch size: ${this.options.batchSize}`);
        console.log(`  Doc size: ${this.options.docSize} chars`);
        console.log(`  Embedding dimensions: ${this.options.embeddingDim}`);
        console.log(`  Concurrency: ${this.options.concurrency}`);

        // Generate all documents upfront
        console.log('📝 Generating documents...');
        const allDocuments = Array.from({ length: this.options.docCount }, (_, i) =>
            this.generateDocument(i, this.options.docSize),
        );

        // Split into batches
        const batches = [];
        for (let i = 0; i < allDocuments.length; i += this.options.batchSize) {
            batches.push(allDocuments.slice(i, i + this.options.batchSize));
        }

        console.log(`📦 Processing ${batches.length} batches...`);

        const benchmarkStart = performance.now();
        let totalDocuments = 0;
        let totalDuration = 0;
        let peakMemory = 0;

        // Process batches with concurrency control
        for (let i = 0; i < batches.length; i += this.options.concurrency) {
            const concurrentBatches = batches.slice(i, i + this.options.concurrency);

            const batchResults = await Promise.all(
                concurrentBatches.map((batch) => this.processBatch(batch)),
            );

            for (const result of batchResults) {
                totalDocuments += result.documents;
                totalDuration += result.duration;
                peakMemory = Math.max(peakMemory, result.memory.peak);

                console.log(
                    `  Batch ${Math.floor(i / this.options.concurrency) + 1}: ` +
                    `${result.documents} docs in ${result.duration.toFixed(2)}ms ` +
                    `(${result.throughput.toFixed(2)} docs/sec)`,
                );
            }

            // Small delay between concurrent batch sets
            await new Promise((resolve) => setTimeout(resolve, 10));
        }

        const benchmarkEnd = performance.now();
        const totalBenchmarkTime = benchmarkEnd - benchmarkStart;

        const results = {
            summary: {
                totalDocuments,
                totalBatches: batches.length,
                totalTime: totalBenchmarkTime,
                avgBatchTime: totalDuration / batches.length,
                overallThroughput: totalDocuments / (totalBenchmarkTime / 1000),
                peakMemoryMB: Math.round(peakMemory / 1024 / 1024),
                docsPerBatch: this.options.batchSize,
                avgDocSize: this.options.docSize,
            },
            configuration: this.options,
            timestamp: new Date().toISOString(),
            performance: {
                documentsPerSecond: totalDocuments / (totalBenchmarkTime / 1000),
                millisecondsPerDocument: totalBenchmarkTime / totalDocuments,
                batchesPerSecond: batches.length / (totalBenchmarkTime / 1000),
                charactersPerSecond: (totalDocuments * this.options.docSize) / (totalBenchmarkTime / 1000),
            },
        };

        this.results = results;
        return results;
    }

    printResults() {
        const r = this.results;
        console.log('\n📊 INGESTION BENCHMARK RESULTS');
        console.log('='.repeat(40));
        console.log(`Total Documents:    ${r.summary.totalDocuments.toLocaleString()}`);
        console.log(`Total Time:         ${(r.summary.totalTime / 1000).toFixed(2)}s`);
        console.log(`Overall Throughput: ${r.performance.documentsPerSecond.toFixed(2)} docs/sec`);
        console.log(`Characters/sec:     ${r.performance.charactersPerSecond.toLocaleString()}`);
        console.log(`Time per Document:  ${r.performance.millisecondsPerDocument.toFixed(2)}ms`);
        console.log(`Peak Memory:        ${r.summary.peakMemoryMB}MB`);
        console.log(`Batches Processed:  ${r.summary.totalBatches}`);
        console.log(`Avg Batch Time:     ${r.summary.avgBatchTime.toFixed(2)}ms`);

        if (r.performance.documentsPerSecond > 100) {
            console.log('\n✅ EXCELLENT: High throughput performance');
        } else if (r.performance.documentsPerSecond > 50) {
            console.log('\n✅ GOOD: Acceptable throughput performance');
        } else if (r.performance.documentsPerSecond > 20) {
            console.log('\n⚠️  MODERATE: Room for improvement');
        } else {
            console.log('\n❌ POOR: Performance optimization needed');
        }
    }

    saveResults() {
        const outputPath = `benchmarks/${this.options.outputFile}`;
        writeFileSync(outputPath, JSON.stringify(this.results, null, 2));
        console.log(`\n💾 Results saved to: ${outputPath}`);
    }
}

// Parse command line arguments
function parseArgs() {
    const options = { ...DEFAULT_OPTIONS };
    const args = process.argv.slice(2);

    for (const arg of args) {
        const [key, value] = arg.replace(/^--/, '').split('=');

        switch (key) {
            case 'batch-size':
                options.batchSize = parseInt(value, 10);
                break;
            case 'doc-count':
                options.docCount = parseInt(value, 10);
                break;
            case 'doc-size':
                options.docSize = parseInt(value, 10);
                break;
            case 'embedding-dim':
                options.embeddingDim = parseInt(value, 10);
                break;
            case 'concurrency':
                options.concurrency = parseInt(value, 10);
                break;
            case 'output':
                options.outputFile = value;
                break;
            case 'help':
                console.log(`
Document Ingestion Benchmark

Usage: node benchmarks/ingest.js [options]

Options:
  --batch-size=N      Number of documents per batch (default: 25)
  --doc-count=N       Total documents to process (default: 100)
  --doc-size=N        Characters per document (default: 1000)
  --embedding-dim=N   Embedding vector dimensions (default: 384)
  --concurrency=N     Concurrent batch processing (default: 1)
  --output=FILE       Output file name (default: ingestion-results.json)
  --help              Show this help message

Examples:
  node benchmarks/ingest.js --batch-size=50 --doc-count=1000
  node benchmarks/ingest.js --doc-size=5000 --concurrency=4
        `);
                process.exit(0);
        }
    }

    return options;
}

// Main execution
async function main() {
    const options = parseArgs();
    const benchmark = new IngestionBenchmark(options);

    try {
        const startTime = performance.now();
        await benchmark.runBenchmark();
        const endTime = performance.now();

        benchmark.printResults();
        benchmark.saveResults();

        console.log(`\n⏱️  Total benchmark runtime: ${((endTime - startTime) / 1000).toFixed(2)}s`);
    } catch (error) {
        console.error('\n❌ Benchmark failed:', error);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
