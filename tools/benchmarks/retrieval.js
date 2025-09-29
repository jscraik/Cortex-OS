#!/usr/bin/env node

/**
 * Retrieval Performance Benchmark
 *
 * Measures vector search and retrieval performance for:
 * - Different query types and complexities
 * - Various result set sizes (topK)
 * - Vector database sizes
 * - Similarity thresholds
 *
 * Usage:
 *   node benchmarks/retrieval.js
 *   node benchmarks/retrieval.js --db-size=10000 --queries=100
 */

import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

const DEFAULT_OPTIONS = {
	dbSize: 1000, // Number of documents in the vector database
	queryCount: 50, // Number of queries to test
	topK: 10, // Results to retrieve per query
	embeddingDim: 384, // Vector dimensions
	similarityThreshold: 0.7,
	outputFile: 'retrieval-results.json',
};

class VectorDatabase {
	constructor(dimensions) {
		this.dimensions = dimensions;
		this.vectors = new Map();
		this.documents = new Map();
		this.size = 0;
	}

	async addDocument(id, content, vector) {
		this.vectors.set(id, vector);
		this.documents.set(id, {
			id,
			content,
			contentLength: content.length,
			wordCount: content.split(' ').length,
			addedAt: new Date().toISOString(),
		});
		this.size++;
	}

	cosineSimilarity(vecA, vecB) {
		let dotProduct = 0;
		let normA = 0;
		let normB = 0;

		for (let i = 0; i < vecA.length; i++) {
			dotProduct += vecA[i] * vecB[i];
			normA += vecA[i] * vecA[i];
			normB += vecB[i] * vecB[i];
		}

		return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
	}

	async search(queryVector, topK = 10, threshold = 0.0) {
		const startTime = performance.now();

		const similarities = [];
		for (const [id, vector] of this.vectors) {
			const similarity = this.cosineSimilarity(queryVector, vector);
			if (similarity >= threshold) {
				similarities.push({ id, similarity });
			}
		}

		// Sort by similarity (descending) and take top K
		similarities.sort((a, b) => b.similarity - a.similarity);
		const results = similarities.slice(0, topK);

		const endTime = performance.now();

		return {
			results: results.map(({ id, similarity }) => ({
				document: this.documents.get(id),
				similarity,
				id,
			})),
			performance: {
				searchTime: endTime - startTime,
				vectorsCompared: this.vectors.size,
				candidatesFound: similarities.length,
				resultsReturned: results.length,
			},
		};
	}

	getStats() {
		return {
			totalVectors: this.size,
			dimensions: this.dimensions,
			memoryEstimate: this.size * this.dimensions * 8, // 8 bytes per float64
		};
	}
}

class RetrievalBenchmark {
	constructor(options = {}) {
		this.options = { ...DEFAULT_OPTIONS, ...options };
		this.database = new VectorDatabase(this.options.embeddingDim);
		this.results = [];
		this.queries = [];
	}

	generateVector(dimensions, seed) {
		// Generate deterministic pseudo-random vector for reproducibility
		const hash = createHash('sha256').update(seed.toString()).digest();
		const vector = [];

		for (let i = 0; i < dimensions; i++) {
			const byteIndex = (i * 4) % hash.length;
			const value = hash.readUInt32BE(byteIndex) / 0xffffffff;
			vector.push((value - 0.5) * 2); // Normalize to [-1, 1]
		}

		// L2 normalize the vector
		const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
		return vector.map((val) => val / magnitude);
	}

	generateDocument(id, category, complexity = 'medium') {
		const categories = {
			tech: [
				'artificial intelligence',
				'machine learning',
				'neural networks',
				'deep learning',
				'algorithms',
			],
			science: ['quantum physics', 'molecular biology', 'chemistry', 'astronomy', 'genetics'],
			business: [
				'marketing strategy',
				'financial analysis',
				'operations management',
				'supply chain',
				'leadership',
			],
			health: [
				'medical research',
				'pharmaceutical',
				'healthcare',
				'clinical trials',
				'patient care',
			],
			education: [
				'learning theory',
				'curriculum design',
				'educational technology',
				'assessment',
				'pedagogy',
			],
		};

		const words = categories[category] || categories.tech;
		const complexityMap = {
			simple: 20,
			medium: 100,
			complex: 500,
		};

		const targetLength = complexityMap[complexity];
		let content = '';

		while (content.split(' ').length < targetLength) {
			const word = words[Math.floor(Math.random() * words.length)];
			content += content.length === 0 ? word : ` ${word}`;
		}

		return {
			id,
			content: content.trim(),
			category,
			complexity,
			metadata: {
				wordCount: content.split(' ').length,
				characterCount: content.length,
			},
		};
	}

	async populateDatabase() {
		console.log(`📚 Populating database with ${this.options.dbSize} documents...`);

		const categories = ['tech', 'science', 'business', 'health', 'education'];
		const complexities = ['simple', 'medium', 'complex'];

		const startTime = performance.now();

		for (let i = 0; i < this.options.dbSize; i++) {
			const category = categories[i % categories.length];
			const complexity = complexities[i % complexities.length];
			const document = this.generateDocument(`doc-${i}`, category, complexity);

			// Generate vector based on document content hash for consistency
			const contentHash = createHash('md5').update(document.content).digest('hex');
			const vector = this.generateVector(this.options.embeddingDim, contentHash);

			await this.database.addDocument(document.id, document.content, vector);

			if ((i + 1) % 1000 === 0) {
				console.log(`  Added ${i + 1}/${this.options.dbSize} documents...`);
			}
		}

		const endTime = performance.now();
		console.log(`✅ Database populated in ${(endTime - startTime).toFixed(2)}ms`);

		return this.database.getStats();
	}

	generateQueries() {
		console.log(`🔍 Generating ${this.options.queryCount} test queries...`);

		const queryTypes = [
			{ type: 'specific', complexity: 'simple', description: 'Simple specific queries' },
			{ type: 'broad', complexity: 'medium', description: 'Broad topic queries' },
			{ type: 'complex', complexity: 'complex', description: 'Multi-faceted queries' },
			{ type: 'edge', complexity: 'simple', description: 'Edge case queries' },
		];

		this.queries = [];

		for (let i = 0; i < this.options.queryCount; i++) {
			const queryType = queryTypes[i % queryTypes.length];

			// Generate query vector
			const queryVector = this.generateVector(
				this.options.embeddingDim,
				`query-${i}-${queryType.type}`,
			);

			// Vary topK for different queries
			const topKVariations = [5, 10, 20, 50];
			const topK = topKVariations[i % topKVariations.length];

			this.queries.push({
				id: `query-${i}`,
				type: queryType.type,
				complexity: queryType.complexity,
				vector: queryVector,
				topK,
				description: `${queryType.description} (${i + 1})`,
			});
		}

		return this.queries.length;
	}

	async runRetrievalBenchmarks() {
		console.log(`🚀 Running retrieval benchmarks...`);
		console.log(`  Database size: ${this.database.size.toLocaleString()} vectors`);
		console.log(`  Vector dimensions: ${this.options.embeddingDim}`);
		console.log(`  Queries to test: ${this.queries.length}`);

		const results = [];
		let totalSearchTime = 0;
		let totalCandidates = 0;
		let totalResults = 0;

		const benchmarkStart = performance.now();

		for (let i = 0; i < this.queries.length; i++) {
			const query = this.queries[i];

			// Run the search
			const searchResult = await this.database.search(
				query.vector,
				query.topK,
				this.options.similarityThreshold,
			);

			const queryResult = {
				queryId: query.id,
				queryType: query.type,
				topK: query.topK,
				searchTime: searchResult.performance.searchTime,
				vectorsCompared: searchResult.performance.vectorsCompared,
				candidatesFound: searchResult.performance.candidatesFound,
				resultsReturned: searchResult.performance.resultsReturned,
				avgSimilarity:
					searchResult.results.length > 0
						? searchResult.results.reduce((sum, r) => sum + r.similarity, 0) /
							searchResult.results.length
						: 0,
				minSimilarity:
					searchResult.results.length > 0
						? Math.min(...searchResult.results.map((r) => r.similarity))
						: 0,
				maxSimilarity:
					searchResult.results.length > 0
						? Math.max(...searchResult.results.map((r) => r.similarity))
						: 0,
			};

			results.push(queryResult);

			totalSearchTime += queryResult.searchTime;
			totalCandidates += queryResult.candidatesFound;
			totalResults += queryResult.resultsReturned;

			// Progress reporting
			if ((i + 1) % 10 === 0) {
				const avgTime = totalSearchTime / (i + 1);
				console.log(
					`  Processed ${i + 1}/${this.queries.length} queries (avg: ${avgTime.toFixed(2)}ms)`,
				);
			}
		}

		const benchmarkEnd = performance.now();
		const totalBenchmarkTime = benchmarkEnd - benchmarkStart;

		this.results = {
			summary: {
				totalQueries: this.queries.length,
				totalSearchTime,
				avgSearchTime: totalSearchTime / this.queries.length,
				minSearchTime: Math.min(...results.map((r) => r.searchTime)),
				maxSearchTime: Math.max(...results.map((r) => r.searchTime)),
				totalCandidates,
				totalResults,
				avgCandidatesPerQuery: totalCandidates / this.queries.length,
				avgResultsPerQuery: totalResults / this.queries.length,
				totalBenchmarkTime,
				queriesPerSecond: this.queries.length / (totalBenchmarkTime / 1000),
			},
			configuration: this.options,
			database: this.database.getStats(),
			queries: results,
			timestamp: new Date().toISOString(),
		};

		return this.results;
	}

	analyzeResults() {
		const r = this.results;

		// Group by query type
		const byType = r.queries.reduce((acc, query) => {
			if (!acc[query.queryType]) {
				acc[query.queryType] = [];
			}
			acc[query.queryType].push(query);
			return acc;
		}, {});

		const analysis = {
			byQueryType: {},
			byTopK: {},
			performance: {
				p50: this.percentile(
					r.queries.map((q) => q.searchTime),
					0.5,
				),
				p95: this.percentile(
					r.queries.map((q) => q.searchTime),
					0.95,
				),
				p99: this.percentile(
					r.queries.map((q) => q.searchTime),
					0.99,
				),
			},
		};

		// Analyze by query type
		for (const [type, queries] of Object.entries(byType)) {
			const times = queries.map((q) => q.searchTime);
			analysis.byQueryType[type] = {
				count: queries.length,
				avgTime: times.reduce((a, b) => a + b, 0) / times.length,
				minTime: Math.min(...times),
				maxTime: Math.max(...times),
				avgSimilarity: queries.reduce((sum, q) => sum + q.avgSimilarity, 0) / queries.length,
				avgResults: queries.reduce((sum, q) => sum + q.resultsReturned, 0) / queries.length,
			};
		}

		// Analyze by topK
		const byTopKMap = r.queries.reduce((acc, query) => {
			const k = query.topK;
			if (!acc[k]) acc[k] = [];
			acc[k].push(query);
			return acc;
		}, {});

		for (const [k, queries] of Object.entries(byTopKMap)) {
			const times = queries.map((q) => q.searchTime);
			analysis.byTopK[k] = {
				count: queries.length,
				avgTime: times.reduce((a, b) => a + b, 0) / times.length,
				avgResults: queries.reduce((sum, q) => sum + q.resultsReturned, 0) / queries.length,
			};
		}

		return analysis;
	}

	percentile(arr, p) {
		const sorted = arr.slice().sort((a, b) => a - b);
		const index = Math.ceil(sorted.length * p) - 1;
		return sorted[Math.max(0, index)];
	}

	printResults() {
		const r = this.results;
		const analysis = this.analyzeResults();

		console.log('\n📊 RETRIEVAL BENCHMARK RESULTS');
		console.log('='.repeat(45));
		console.log(`Total Queries:          ${r.summary.totalQueries.toLocaleString()}`);
		console.log(`Database Size:          ${r.database.totalVectors.toLocaleString()} vectors`);
		console.log(`Vector Dimensions:      ${r.database.dimensions}`);
		console.log(`Total Search Time:      ${(r.summary.totalSearchTime / 1000).toFixed(2)}s`);
		console.log(`Average Search Time:    ${r.summary.avgSearchTime.toFixed(2)}ms`);
		console.log(`Queries Per Second:     ${r.summary.queriesPerSecond.toFixed(2)}`);
		console.log(`P50 Latency:           ${analysis.performance.p50.toFixed(2)}ms`);
		console.log(`P95 Latency:           ${analysis.performance.p95.toFixed(2)}ms`);
		console.log(`P99 Latency:           ${analysis.performance.p99.toFixed(2)}ms`);

		console.log('\n📈 Performance by Query Type:');
		for (const [type, stats] of Object.entries(analysis.byQueryType)) {
			console.log(
				`  ${type.padEnd(10)} | ${stats.avgTime.toFixed(2)}ms avg | ${stats.avgResults.toFixed(1)} results | ${stats.avgSimilarity.toFixed(3)} similarity`,
			);
		}

		console.log('\n📊 Performance by Result Count (topK):');
		for (const [k, stats] of Object.entries(analysis.byTopK)) {
			console.log(
				`  Top-${k.padEnd(2)} | ${stats.avgTime.toFixed(2)}ms avg | ${stats.avgResults.toFixed(1)} results returned`,
			);
		}

		// Performance assessment
		const avgLatency = r.summary.avgSearchTime;
		const qps = r.summary.queriesPerSecond;

		console.log('\n🎯 Performance Assessment:');
		if (avgLatency < 50 && qps > 100) {
			console.log('✅ EXCELLENT: Low latency, high throughput');
		} else if (avgLatency < 100 && qps > 50) {
			console.log('✅ GOOD: Acceptable performance for most applications');
		} else if (avgLatency < 200) {
			console.log('⚠️  MODERATE: Some optimization opportunities exist');
		} else {
			console.log('❌ POOR: Significant optimization needed');
		}

		console.log(
			`\nMemory Usage Estimate: ${Math.round(r.database.memoryEstimate / 1024 / 1024)}MB`,
		);
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
			case 'db-size':
				options.dbSize = parseInt(value, 10);
				break;
			case 'queries':
				options.queryCount = parseInt(value, 10);
				break;
			case 'top-k':
				options.topK = parseInt(value, 10);
				break;
			case 'embedding-dim':
				options.embeddingDim = parseInt(value, 10);
				break;
			case 'threshold':
				options.similarityThreshold = parseFloat(value);
				break;
			case 'output':
				options.outputFile = value;
				break;
			case 'help':
				console.log(`
Retrieval Performance Benchmark

Usage: node benchmarks/retrieval.js [options]

Options:
  --db-size=N         Number of vectors in database (default: 1000)
  --queries=N         Number of test queries (default: 50)
  --top-k=N          Results per query (default: 10)
  --embedding-dim=N   Vector dimensions (default: 384)
  --threshold=N       Similarity threshold (default: 0.7)
  --output=FILE       Output file name (default: retrieval-results.json)
  --help              Show this help message

Examples:
  node benchmarks/retrieval.js --db-size=10000 --queries=100
  node benchmarks/retrieval.js --top-k=20 --threshold=0.8
        `);
				process.exit(0);
		}
	}

	return options;
}

// Main execution
async function main() {
	const options = parseArgs();
	const benchmark = new RetrievalBenchmark(options);

	try {
		console.log('🚀 Starting retrieval performance benchmark...');

		// Setup
		await benchmark.populateDatabase();
		benchmark.generateQueries();

		// Run benchmarks
		await benchmark.runRetrievalBenchmarks();

		// Analysis and reporting
		benchmark.printResults();
		benchmark.saveResults();
	} catch (error) {
		console.error('\n❌ Benchmark failed:', error);
		process.exit(1);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
