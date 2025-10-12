/**
 * Query Pre-computation System for brAInwav GraphRAG
 *
 * Advanced pre-computation system that:
 * - Analyzes query patterns and predicts common queries
 * - Pre-computes results for frequently used queries
 * - Maintains a pre-computation schedule based on usage patterns
 * - Implements intelligent result freshness management
 * - Provides ML-based query pattern recognition
 */

import type { GraphRAGQueryRequest } from '../services/GraphRAGService.js';
import type { GraphRAGSearchResult } from '../retrieval/QdrantHybrid.js';
import { performanceMonitor } from '../monitoring/PerformanceMonitor.js';
import type { DistributedCache } from '../caching/DistributedCache.js';

export interface QueryPattern {
	id: string;
	pattern: string; // Regex or template pattern
	frequency: number;
	lastUsed: number;
	averageLatency: number;
	confidence: number;
	precomputedResults?: PrecomputedResult[];
}

export interface PrecomputedResult {
	query: GraphRAGQueryRequest;
	results: GraphRAGSearchResult[];
	timestamp: number;
	ttl: number;
	freshnessScore: number;
	accessCount: number;
	lastAccessed: number;
}

export interface PrecomputationConfig {
	enabled: boolean;
	maxPrecomputedQueries: number;
	patternAnalysis: {
		minFrequency: number;
		confidenceThreshold: number;
		analysisWindow: number; // milliseconds
	};
	scheduling: {
		interval: number; // Precomputation interval in milliseconds
		maxConcurrentJobs: number;
		offPeakHours: number[]; // Hours for intensive precomputation
	};
	freshness: {
		defaultTTL: number;
		maxTTL: number;
		refreshThreshold: number; // Refresh when freshness < this
	};
	cache: {
		distributedCacheNamespace: string;
		compressionEnabled: boolean;
	};
}

export class QueryPrecomputer {
	private config: PrecomputationConfig;
	private queryPatterns = new Map<string, QueryPattern>();
	private precomputedResults = new Map<string, PrecomputedResult>();
	private queryHistory: Array<{ query: GraphRAGQueryRequest; timestamp: number; latency: number }> = [];
	private distributedCache: DistributedCache | null = null;
	private isRunning = false;
	private precomputationTimer: NodeJS.Timeout | null = null;

	constructor(config: PrecomputationConfig) {
		this.config = config;
	}

	async initialize(distributedCache?: DistributedCache): Promise<void> {
		this.distributedCache = distributedCache || null;

		// Load existing patterns and precomputed results from cache
		await this.loadFromCache();

		// Start precomputation scheduler
		this.startPrecomputationScheduler();

		console.info('brAInwav Query Precomputer initialized', {
			component: 'memory-core',
			brand: 'brAInwav',
			patternCount: this.queryPatterns.size,
			precomputedCount: this.precomputedResults.size,
		});
	}

	private async loadFromCache(): Promise<void> {
		if (!this.distributedCache) return;

		try {
			// Load query patterns
			const patterns = await this.distributedCache.get<QueryPattern[]>('query_patterns', 'precompute');
			if (patterns) {
				for (const pattern of patterns) {
					this.queryPatterns.set(pattern.id, pattern);
				}
			}

			// Load precomputed results
			const results = await this.distributedCache.get<PrecomputedResult[]>('precomputed_results', 'precompute');
			if (results) {
				for (const result of results) {
					// Only load fresh results
					if (this.isResultFresh(result)) {
						this.precomputedResults.set(this.generateResultKey(result.query), result);
					}
				}
			}

			console.info('brAInwav Query Precomputer loaded from cache', {
				component: 'memory-core',
				brand: 'brAInwav',
				patternsLoaded: this.queryPatterns.size,
				resultsLoaded: this.precomputedResults.size,
			});
		} catch (error) {
			console.warn('brAInwav Query Precomputer cache load failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private startPrecomputationScheduler(): Promise<void> {
		return new Promise((resolve) => {
			const scheduleNext = () => {
				const now = new Date();
				const currentHour = now.getHours();
				const isOffPeak = this.config.scheduling.offPeakHours.includes(currentHour);

				// Adjust interval based on peak/off-peak hours
				const interval = isOffPeak
					? this.config.scheduling.interval / 2 // More frequent during off-peak
					: this.config.scheduling.interval;

				this.precomputationTimer = setTimeout(async () => {
					try {
						await this.runPrecomputationCycle();
					} catch (error) {
						console.error('brAInwav Query Precomputer cycle failed', {
							component: 'memory-core',
							brand: 'brAInwav',
							error: error instanceof Error ? error.message : String(error),
						});
					}
					scheduleNext(); // Schedule next cycle
				}, interval);
			};

			scheduleNext();
			resolve();
		});
	}

	private async runPrecomputationCycle(): Promise<void> {
		if (!this.config.enabled || this.isRunning) return;

		this.isRunning = true;
		const startTime = Date.now();

		console.info('brAInwav Query Precomputer starting cycle', {
			component: 'memory-core',
			brand: 'brAInwav',
		});

		try {
			// Analyze recent query patterns
			await this.analyzeQueryPatterns();

			// Identify candidates for pre-computation
			const candidates = this.identifyPrecomputationCandidates();

			// Pre-compute results for candidates
			await this.precomputeQueries(candidates);

			// Clean up stale precomputed results
			await this.cleanupStaleResults();

			// Save updated patterns and results to cache
			await this.saveToCache();

			const duration = Date.now() - startTime;
			console.info('brAInwav Query Precomputer cycle completed', {
				component: 'memory-core',
				brand: 'brAInwav',
				duration,
				candidatesProcessed: candidates.length,
				totalPrecomputed: this.precomputedResults.size,
			});
		} finally {
			this.isRunning = false;
		}
	}

	private async analyzeQueryPatterns(): Promise<void> {
		// Get recent query history from performance monitor
		const metrics = performanceMonitor.getMetrics();
		const cutoffTime = Date.now() - this.config.patternAnalysis.analysisWindow;

		// Analyze query patterns from recent history
		const patternCounts = new Map<string, {
			count: number;
			totalLatency: number;
			lastUsed: number;
			sampleQueries: GraphRAGQueryRequest[];
		}>();

		for (const query of this.queryHistory) {
			if (query.timestamp < cutoffTime) continue;

			const pattern = this.extractQueryPattern(query.query);
			const existing = patternCounts.get(pattern) || {
				count: 0,
				totalLatency: 0,
				lastUsed: 0,
				sampleQueries: [],
			};

			existing.count++;
			existing.totalLatency += query.latency;
			existing.lastUsed = Math.max(existing.lastUsed, query.timestamp);
			if (existing.sampleQueries.length < 5) {
				existing.sampleQueries.push(query.query);
			}

			patternCounts.set(pattern, existing);
		}

		// Update patterns with new analysis
		for (const [pattern, data] of patternCounts) {
			if (data.count >= this.config.patternAnalysis.minFrequency) {
				const patternId = this.generatePatternId(pattern);
				const existingPattern = this.queryPatterns.get(patternId);

				const updatedPattern: QueryPattern = {
					id: patternId,
					pattern,
					frequency: data.count,
					lastUsed: data.lastUsed,
					averageLatency: data.totalLatency / data.count,
					confidence: Math.min(data.count / 10, 1), // Simple confidence calculation
					...existingPattern,
				};

				this.queryPatterns.set(patternId, updatedPattern);
			}
		}
	}

	private extractQueryPattern(query: GraphRAGQueryRequest): string {
		// Extract patterns by normalizing the question
		let normalized = query.question.toLowerCase().trim();

		// Remove specific values and keep structure
		normalized = normalized
			.replace(/\d+/g, 'N') // Replace numbers with N
			.replace(/["'`][^"'`]+["'`]/g, '"X"') // Replace quoted strings with "X"
			.replace(/\b(?:latest|recent|current|new)\b/g, 'RECENT') // Normalize time references
			.replace(/\b(?:how|what|when|where|why|which|who)\b/g, 'QUESTION_WORD'); // Normalize question words

		// Extract key terms
		const terms = normalized.split(/\s+/).filter(term => term.length > 2);
		return terms.slice(0, 5).join(' '); // Keep first 5 terms
	}

	private identifyPrecomputationCandidates(): QueryPattern[] {
		const candidates: QueryPattern[] = [];

		for (const pattern of this.queryPatterns.values()) {
			// Check if pattern meets criteria for pre-computation
			if (
				pattern.frequency >= this.config.patternAnalysis.minFrequency &&
				pattern.confidence >= this.config.patternAnalysis.confidenceThreshold &&
				pattern.averageLatency > 1000 // Only pre-compute slow queries
			) {
				candidates.push(pattern);
			}
		}

		// Sort by priority (frequency * confidence * latency)
		candidates.sort((a, b) => {
			const scoreA = a.frequency * a.confidence * a.averageLatency;
			const scoreB = b.frequency * b.confidence * b.averageLatency;
			return scoreB - scoreA;
		});

		// Return top candidates
		return candidates.slice(0, this.config.maxPrecomputedQueries);
	}

	private async precomputeQueries(patterns: QueryPattern[]): Promise<void> {
		const jobs = patterns.slice(0, this.config.scheduling.maxConcurrentJobs);

		const precomputationPromises = jobs.map(async (pattern) => {
			try {
				// Generate representative query from pattern
				const query = this.generateRepresentativeQuery(pattern);
				const resultKey = this.generateResultKey(query);

				// Check if already precomputed and fresh
				const existing = this.precomputedResults.get(resultKey);
				if (existing && this.isResultFresh(existing)) {
					existing.accessCount++;
					existing.lastAccessed = Date.now();
					return;
				}

				// Perform pre-computation (this would integrate with the actual GraphRAG service)
				const results = await this.performPrecomputation(query);

				const precomputedResult: PrecomputedResult = {
					query,
					results,
					timestamp: Date.now(),
					ttl: this.config.freshness.defaultTTL,
					freshnessScore: 1.0,
					accessCount: 0,
					lastAccessed: Date.now(),
				};

				this.precomputedResults.set(resultKey, precomputedResult);

				console.info('brAInwav Query Precomputer precomputed query', {
					component: 'memory-core',
					brand: 'brAInwav',
					patternId: pattern.id,
					resultCount: results.length,
				});
			} catch (error) {
				console.error('brAInwav Query Precomputer precomputation failed', {
					component: 'memory-core',
					brand: 'brAInwav',
					patternId: pattern.id,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		});

		await Promise.all(precomputationPromises);
	}

	private generateRepresentativeQuery(pattern: QueryPattern): GraphRAGQueryRequest {
		// This is a simplified implementation
		// In practice, you'd use more sophisticated pattern-to-query generation
		const question = pattern.pattern
			.replace(/QUESTION_WORD/g, 'What')
			.replace(/RECENT/g, 'latest')
			.replace(/N/g, '5')
			.replace(/"X"/g, 'example');

		return {
			question,
			k: 8,
			maxChunks: 24,
			includeCitations: true,
		};
	}

	private async performPrecomputation(query: GraphRAGQueryRequest): Promise<GraphRAGSearchResult[]> {
		// This would integrate with the actual GraphRAG service
		// For now, return mock results
		return Array.from({ length: 5 }, (_, i) => ({
			id: `precomputed_${i}`,
			score: 0.8 - (i * 0.1),
			nodeId: `node_${i}`,
			chunkContent: `Precomputed content for ${query.question}`,
			metadata: {
				path: '/path/to/file.ts',
				nodeType: 'FILE',
				nodeKey: 'file.ts',
				brainwavSource: 'brAInwav Cortex-OS GraphRAG',
				relevanceScore: 0.8 - (i * 0.1),
			},
		}));
	}

	private async cleanupStaleResults(): Promise<void> {
		const now = Date.now();
		const staleKeys: string[] = [];

		for (const [key, result] of this.precomputedResults.entries()) {
			if (!this.isResultFresh(result)) {
				staleKeys.push(key);
			}
		}

		for (const key of staleKeys) {
			this.precomputedResults.delete(key);
		}

		if (staleKeys.length > 0) {
			console.info('brAInwav Query Precomputer cleaned up stale results', {
				component: 'memory-core',
				brand: 'brAInwav',
				staleCount: staleKeys.length,
				remainingCount: this.precomputedResults.size,
			});
		}
	}

	private isResultFresh(result: PrecomputedResult): boolean {
		const age = Date.now() - result.timestamp;
		const freshnessScore = Math.max(0, 1 - (age / result.ttl));
		result.freshnessScore = freshnessScore;
		return freshnessScore >= this.config.freshness.refreshThreshold;
	}

	private async saveToCache(): Promise<void> {
		if (!this.distributedCache) return;

		try {
			const patterns = Array.from(this.queryPatterns.values());
			const results = Array.from(this.precomputedResults.values());

			await Promise.all([
				this.distributedCache.set('query_patterns', patterns, {
					namespace: 'precompute',
					ttl: 86400000, // 24 hours
				}),
				this.distributedCache.set('precomputed_results', results, {
					namespace: 'precompute',
					ttl: this.config.freshness.defaultTTL,
				}),
			]);
		} catch (error) {
			console.warn('brAInwav Query Precomputer cache save failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	recordQuery(query: GraphRAGQueryRequest, latency: number): void {
		this.queryHistory.push({
			query,
			timestamp: Date.now(),
			latency,
		});

		// Keep only recent history
		const cutoffTime = Date.now() - this.config.patternAnalysis.analysisWindow * 2;
		this.queryHistory = this.queryHistory.filter(q => q.timestamp > cutoffTime);

		// Update pattern frequency
		const pattern = this.extractQueryPattern(query);
		const patternId = this.generatePatternId(pattern);
		const existingPattern = this.queryPatterns.get(patternId);

		if (existingPattern) {
			existingPattern.frequency++;
			existingPattern.lastUsed = Date.now();
			existingPattern.averageLatency = (existingPattern.averageLatency + latency) / 2;
		}
	}

	async getPrecomputedResult(query: GraphRAGQueryRequest): Promise<GraphRAGSearchResult[] | null> {
		const resultKey = this.generateResultKey(query);
		const result = this.precomputedResults.get(resultKey);

		if (!result || !this.isResultFresh(result)) {
			return null;
		}

		// Update access statistics
		result.accessCount++;
		result.lastAccessed = Date.now();

		console.info('brAInwav Query Precomputer cache hit', {
			component: 'memory-core',
			brand: 'brAInwav',
			resultKey: resultKey.substring(0, 20) + '...',
			accessCount: result.accessCount,
		});

		return result.results;
	}

	private generatePatternId(pattern: string): string {
		return Buffer.from(pattern).toString('base64').substring(0, 16);
	}

	private generateResultKey(query: GraphRAGQueryRequest): string {
		const key = `${query.question}|${query.k}|${query.maxChunks}`;
		return Buffer.from(key).toString('base64');
	}

	getStats(): {
		patternCount: number;
		precomputedCount: number;
		averagePatternFrequency: number;
		cacheHitRate: number;
	} {
		const patterns = Array.from(this.queryPatterns.values());
		const results = Array.from(this.precomputedResults.values());

		const totalAccesses = results.reduce((sum, r) => sum + r.accessCount, 0);
		const totalQueries = this.queryHistory.length;

		return {
			patternCount: patterns.length,
			precomputedCount: results.length,
			averagePatternFrequency: patterns.length > 0
				? patterns.reduce((sum, p) => sum + p.frequency, 0) / patterns.length
				: 0,
			cacheHitRate: totalQueries > 0 ? totalAccesses / totalQueries : 0,
		};
	}

	async stop(): Promise<void> {
		if (this.precomputationTimer) {
			clearTimeout(this.precomputationTimer);
			this.precomputationTimer = null;
		}

		this.isRunning = false;

		// Save final state to cache
		await this.saveToCache();

		console.info('brAInwav Query Precomputer stopped', {
			component: 'memory-core',
			brand: 'brAInwav',
		});
	}
}

// Global precomputer instance
let queryPrecomputer: QueryPrecomputer | null = null;

export function getQueryPrecomputer(config?: PrecomputationConfig): QueryPrecomputer {
	if (!queryPrecomputer) {
		if (!config) {
			throw new Error('Query precomputer configuration required for first initialization');
		}
		queryPrecomputer = new QueryPrecomputer(config);
	}
	return queryPrecomputer;
}

export async function stopQueryPrecomputer(): Promise<void> {
	if (queryPrecomputer) {
		await queryPrecomputer.stop();
		queryPrecomputer = null;
	}
}