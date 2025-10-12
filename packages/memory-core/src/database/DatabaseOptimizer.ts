/**
 * Database Optimization System for brAInwav GraphRAG
 *
 * Advanced database optimization that:
 * - Analyzes query patterns and identifies optimization opportunities
 * - Automatically creates and manages database indexes
 * - Monitors index performance and usage statistics
 * - Implements intelligent index selection based on query patterns
 * - Provides recommendations for database schema improvements
 */

import { prisma } from '../db/prismaClient.js';
import type { GraphEdgeType, GraphNodeType } from '@prisma/client';

export interface QueryPatternAnalysis {
	pattern: string;
	frequency: number;
	avgLatency: number;
	tableOperations: {
		tableName: string;
		operations: ('select' | 'join' | 'filter' | 'sort')[];
		fields: string[];
	}[];
	indexRecommendations: IndexRecommendation[];
}

export interface IndexRecommendation {
	tableName: string;
	fields: string[];
	indexType: 'btree' | 'hash' | 'gin' | 'gist';
	estimatedImprovement: number;
	priority: 'high' | 'medium' | 'low';
	currentIndexes: string[];
}

export interface DatabaseOptimizationConfig {
	enabled: boolean;
	analysis: {
		querySampleSize: number;
		analysisWindow: number; // milliseconds
		minQueryFrequency: number;
		performanceThreshold: number; // milliseconds
	};
	indexes: {
		autoCreate: boolean;
		maxIndexesPerTable: number;
		dropUnusedIndexes: boolean;
		unusedIndexThreshold: number; // days
	};
	monitoring: {
		enabled: boolean;
		collectInterval: number; // milliseconds
		alertThresholds: {
			slowQueryCount: number;
			indexUsageRatio: number;
			missingIndexImpact: number;
		};
	};
}

export interface DatabaseMetrics {
	slowQueries: number;
	indexUsageStats: Record<string, {
		indexName: string;
		usageCount: number;
		lastUsed: number;
		tableName: string;
	}>;
	missingIndexes: IndexRecommendation[];
	performanceIssues: string[];
}

export class DatabaseOptimizer {
	private config: DatabaseOptimizationConfig;
	private queryPatterns = new Map<string, QueryPatternAnalysis>();
	private queryHistory: Array<{
		query: string;
		timestamp: number;
		latency: number;
		tables: string[];
	}> = [];
	private indexUsageStats = new Map<string, {
		usageCount: number;
		lastUsed: number;
		tableName: string;
	}>();

	constructor(config: DatabaseOptimizationConfig) {
		this.config = config;
	}

	async initialize(): Promise<void> {
		if (!this.config.enabled) return;

		// Load existing index usage statistics
		await this.loadIndexUsageStats();

		// Start monitoring
		if (this.config.monitoring.enabled) {
			this.startMonitoring();
		}

		// Run initial analysis
		await this.analyzeQueryPatterns();

		console.info('brAInwav Database Optimizer initialized', {
			component: 'memory-core',
			brand: 'brAInwav',
			enabled: true,
			indexStatsCount: this.indexUsageStats.size,
		});
	}

	private async loadIndexUsageStats(): Promise<void> {
		try {
			// Get PostgreSQL index usage statistics
			const indexStats = await prisma.$queryRaw`
				SELECT
					schemaname || 'public' as schema_name,
					indexname,
					tables.relname as table_name,
					idx_scan as usage_count,
					idx_tup_read as tuples_read,
					GREATEST(idx_scan, 0) as last_used
				FROM pg_stat_user_indexes
				JOIN pg_class tables ON pg_stat_user_indexes.relid = tables.oid
				WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
				ORDER BY usage_count DESC
			` as any[];

			for (const stat of indexStats) {
				this.indexUsageStats.set(stat.indexname, {
					usageCount: parseInt(stat.usage_count),
					lastUsed: Date.now() - (parseInt(stat.last_used) || 0) * 1000,
					tableName: stat.table_name,
				});
			}

			console.info('brAInwav Database Optimizer loaded index stats', {
				component: 'memory-core',
				brand: 'brAInwav',
				indexCount: indexStats.length,
			});
		} catch (error) {
			console.warn('brAInwav Database Optimizer failed to load index stats', {
				component: 'memory-core',
				brand: 'brAInwav',
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private startMonitoring(): void {
		setInterval(async () => {
			try {
				await this.collectMetrics();
				await this.checkAlertThresholds();
			} catch (error) {
				console.error('brAInwav Database Optimizer monitoring failed', {
					component: 'memory-core',
					brand: 'brAInwav',
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}, this.config.monitoring.collectInterval);
	}

	private async collectMetrics(): Promise<void> {
		// Update index usage statistics
		await this.loadIndexUsageStats();

		// Analyze recent slow queries
		const slowQueryThreshold = this.config.analysis.performanceThreshold;
		const recentSlowQueries = this.queryHistory.filter(
			q => q.latency > slowQueryThreshold &&
			Date.now() - q.timestamp < this.config.analysis.analysisWindow
		);

		console.debug('brAInwav Database Optimizer metrics collected', {
			component: 'memory-core',
			brand: 'brAInwav',
			slowQueryCount: recentSlowQueries.length,
			indexStatsCount: this.indexUsageStats.size,
		});
	}

	private async checkAlertThresholds(): Promise<void> {
		const { alertThresholds } = this.config.monitoring;
		const metrics = this.getMetrics();

		// Check slow query count
		if (metrics.slowQueries > alertThresholds.slowQueryCount) {
			console.warn('brAInwav Database Optimizer alert: High slow query count', {
				component: 'memory-core',
				brand: 'brAInwav',
				currentCount: metrics.slowQueries,
				threshold: alertThresholds.slowQueryCount,
			});
		}

		// Check index usage ratio
		const unusedIndexes = Object.values(metrics.indexUsageStats).filter(
			stat => stat.usageCount < 10 && Date.now() - stat.lastUsed > 86400000 // 1 day
		);

		if (unusedIndexes.length > alertThresholds.indexUsageRatio) {
			console.warn('brAInwav Database Optimizer alert: Many unused indexes', {
				component: 'memory-core',
				brand: 'brAInwav',
				unusedCount: unusedIndexes.length,
				threshold: alertThresholds.indexUsageRatio,
			});
		}

		// Check missing index impact
		const highImpactMissingIndexes = metrics.missingIndexes.filter(
			rec => rec.estimatedImprovement > alertThresholds.missingIndexImpact
		);

		if (highImpactMissingIndexes.length > 0) {
			console.warn('brAInwav Database Optimizer alert: High impact missing indexes', {
				component: 'memory-core',
				brand: 'brAInwav',
				missingCount: highImpactMissingIndexes.length,
				impact: highImpactMissingIndexes.map(r => r.estimatedImprovement),
			});
		}
	}

	async analyzeQueryPatterns(): Promise<void> {
		const cutoffTime = Date.now() - this.config.analysis.analysisWindow;
		const recentQueries = this.queryHistory.filter(q => q.timestamp > cutoffTime);

		// Group queries by pattern
		const patternGroups = new Map<string, {
			queries: typeof recentQueries;
			totalLatency: number;
			tables: Set<string>;
		}>();

		for (const query of recentQueries) {
			const pattern = this.extractQueryPattern(query.query);
			const existing = patternGroups.get(pattern) || {
				queries: [],
				totalLatency: 0,
				tables: new Set(),
			};

			existing.queries.push(query);
			existing.totalLatency += query.latency;
			query.tables.forEach(table => existing.tables.add(table));

			patternGroups.set(pattern, existing);
		}

		// Analyze each pattern
		for (const [pattern, group] of patternGroups) {
			if (group.queries.length >= this.config.analysis.minQueryFrequency) {
				const analysis: QueryPatternAnalysis = {
					pattern,
					frequency: group.queries.length,
					avgLatency: group.totalLatency / group.queries.length,
					tableOperations: await this.analyzeTableOperations(group.queries[0].query),
					indexRecommendations: await this.generateIndexRecommendations(pattern, Array.from(group.tables)),
				};

				this.queryPatterns.set(pattern, analysis);

				// Auto-create high-priority indexes if enabled
				if (this.config.indexes.autoCreate) {
					await this.createRecommendedIndexes(analysis.indexRecommendations);
				}
			}
		}

		console.info('brAInwav Database Optimizer completed pattern analysis', {
			component: 'memory-core',
			brand: 'brAInwav',
			patternsAnalyzed: this.queryPatterns.size,
			totalQueries: recentQueries.length,
		});
	}

	private extractQueryPattern(query: string): string {
		// Extract SQL pattern by normalizing literals
		let normalized = query.toLowerCase();

		// Replace string literals with placeholders
		normalized = normalized.replace(/'[^']*'/g, "'STRING'");

		// Replace numeric literals with placeholders
		normalized = normalized.replace(/\b\d+\b/g, 'NUMBER');

		// Replace specific identifiers with placeholders
		normalized = normalized.replace(/\b[a-z_][a-z0-9_]*\b/gi, (match) => {
			// Keep common SQL keywords
			const sqlKeywords = new Set([
				'select', 'from', 'where', 'join', 'inner', 'left', 'right', 'on',
				'and', 'or', 'not', 'in', 'like', 'ilike', 'between', 'is', 'null',
				'order', 'by', 'group', 'having', 'limit', 'offset', 'distinct',
				'count', 'sum', 'avg', 'min', 'max', 'exists', 'case', 'when', 'then',
				'else', 'end', 'as', 'asc', 'desc', 'union', 'intersect', 'except',
			]);

			return sqlKeywords.has(match) ? match : 'IDENTIFIER';
		});

		// Normalize whitespace
		normalized = normalized.replace(/\s+/g, ' ').trim();

		return normalized;
	}

	private async analyzeTableOperations(query: string): Promise<QueryPatternAnalysis['tableOperations']> {
		const operations: QueryPatternAnalysis['tableOperations'] = [];

		// Simple parsing for common operations
		const tables = await this.extractTablesFromQuery(query);

		for (const table of tables) {
			const tableOps: QueryPatternAnalysis['tableOperations'][0]['operations'] = [];
			const fields: string[] = [];

			// Extract fields from SELECT clause
			const selectMatch = query.match(/select\s+(.+?)\s+from/i);
			if (selectMatch) {
				const selectFields = selectMatch[1].split(',').map(f => f.trim());
				fields.push(...selectFields);
			}

			// Detect WHERE conditions
			if (query.includes('where')) {
				tableOps.push('filter');
			}

			// Detect ORDER BY
			if (query.includes('order by')) {
				tableOps.push('sort');
			}

			// Detect JOINs
			if (query.includes('join')) {
				tableOps.push('join');
			}

			if (tableOps.length > 0) {
				operations.push({
					tableName: table,
					operations: tableOps,
					fields,
				});
			}
		}

		return operations;
	}

	private async extractTablesFromQuery(query: string): Promise<string[]> {
		const tables: string[] = [];

		// Extract from table references
		const fromMatches = query.match(/from\s+([a-z_][a-z0-9_]*)/gi);
		if (fromMatches) {
			for (const match of fromMatches) {
				const table = match.replace(/^from\s+/i, '');
				if (!tables.includes(table)) {
					tables.push(table);
				}
			}
		}

		// Extract join table references
		const joinMatches = query.match(/join\s+([a-z_][a-z0-9_]*)/gi);
		if (joinMatches) {
			for (const match of joinMatches) {
				const table = match.replace(/^join\s+/i, '');
				if (!tables.includes(table)) {
					tables.push(table);
				}
			}
		}

		return tables;
	}

	private async generateIndexRecommendations(
		pattern: string,
		tables: string[]
	): Promise<IndexRecommendation[]> {
		const recommendations: IndexRecommendation[] = [];

		// Common GraphRAG query patterns and their optimal indexes
		const graphRAGPatterns = {
			'chunk_ref where node_id in': {
				table: 'ChunkRef',
				fields: ['node_id'],
				type: 'btree' as const,
				impact: 0.8,
			},
			'graph_edge where src_id in': {
				table: 'GraphEdge',
				fields: ['src_id', 'dst_id'],
				type: 'btree' as const,
				impact: 0.7,
			},
			'graph_edge where type in': {
				table: 'GraphEdge',
				fields: ['type'],
				type: 'btree' as const,
				impact: 0.6,
			},
			'graph_node where type in': {
				table: 'GraphNode',
				fields: ['type'],
				type: 'btree' as const,
				impact: 0.5,
			},
		};

		// Check pattern against known GraphRAG patterns
		for (const [queryPattern, config] of Object.entries(graphRAGPatterns)) {
			if (pattern.includes(queryPattern)) {
				const existingIndexes = await this.getExistingIndexes(config.table);

				const recommendation: IndexRecommendation = {
					tableName: config.table,
					fields: config.fields,
					indexType: config.type,
					estimatedImprovement: config.impact,
					priority: config.impact > 0.7 ? 'high' : config.impact > 0.5 ? 'medium' : 'low',
					currentIndexes: existingIndexes,
				};

				// Check if similar index already exists
				const hasSimilarIndex = existingIndexes.some(index =>
					this.indexesAreSimilar(recommendation.fields, index)
				);

				if (!hasSimilarIndex) {
					recommendations.push(recommendation);
				}
			}
		}

		// Generate general recommendations based on WHERE clauses
		const whereMatch = pattern.match(/where\s+(\w+)/i);
		if (whereMatch) {
			const field = whereMatch[1];
			for (const table of tables) {
				// Check if field exists in table
				const fieldExists = await this.fieldExistsInTable(field, table);
				if (fieldExists) {
					const existingIndexes = await this.getExistingIndexes(table);

					const recommendation: IndexRecommendation = {
						tableName: table,
						fields: [field],
						indexType: 'btree',
						estimatedImprovement: 0.4,
						priority: 'medium',
						currentIndexes: existingIndexes,
					};

					const hasIndex = existingIndexes.some(index =>
						index.toLowerCase().includes(field.toLowerCase())
					);

					if (!hasIndex) {
						recommendations.push(recommendation);
					}
				}
			}
		}

		return recommendations.sort((a, b) => b.estimatedImprovement - a.estimatedImprovement);
	}

	private indexesAreSimilar(fields1: string[], fields2: string): boolean {
		// Check if indexes cover similar fields
		const set1 = new Set(fields1);
		const set2 = new Set(fields2);

		const intersection = new Set([...set1].filter(x => set2.has(x)));
		const union = new Set([...set1, ...set2]);

		return intersection.size / union.size > 0.6; // 60% similarity threshold
	}

	private async getExistingIndexes(tableName: string): Promise<string[]> {
		try {
			const indexes = await prisma.$queryRaw<{ indexname: string }[]>`
				SELECT indexname
				FROM pg_indexes
				WHERE tablename = ${tableName} AND schemaname NOT IN ('pg_catalog', 'information_schema')
			`;

			return indexes.map(row => row.indexname);
		} catch (error) {
			console.warn('brAInwav Database Optimizer failed to get existing indexes', {
				component: 'memory-core',
				brand: 'brAInwav',
				tableName,
				error: error instanceof Error ? error.message : String(error),
			});
			return [];
		}
	}

	private async fieldExistsInTable(field: string, table: string): Promise<boolean> {
		try {
			const columns = await prisma.$queryRaw<{ column_name: string }[]>`
				SELECT column_name
				FROM information_schema.columns
				WHERE table_name = ${table} AND column_name = ${field}
			`;

			return columns.length > 0;
		} catch {
			return false;
		}
	}

	private async createRecommendedIndexes(recommendations: IndexRecommendation[]): Promise<void> {
		const highPriorityRecs = recommendations.filter(r => r.priority === 'high');
		const currentTableIndexes = new Map<string, number>();

		// Count current indexes per table
		for (const rec of recommendations) {
			const count = currentTableIndexes.get(rec.tableName) || 0;
			currentTableIndexes.set(rec.tableName, count + 1);
		}

		for (const rec of highPriorityRecs) {
			const currentIndexCount = currentTableIndexes.get(rec.tableName) || 0;

			if (currentIndexCount < this.config.indexes.maxIndexesPerTable) {
				try {
					const indexName = `idx_${rec.tableName}_${rec.fields.join('_')}`;

					await prisma.$executeRaw`
						CREATE INDEX CONCURRENTLY IF NOT EXISTS ${indexName}
						ON "${rec.tableName}" (${rec.fields.map(f => `"${f}"`).join(', ')})
					`;

					console.info('brAInwav Database Optimizer created index', {
						component: 'memory-core',
						brand: 'brAInwav',
						indexName,
						tableName: rec.tableName,
						fields: rec.fields,
						estimatedImprovement: rec.estimatedImprovement,
					});

					// Update index usage stats
					this.indexUsageStats.set(indexName, {
						usageCount: 0,
						lastUsed: Date.now(),
						tableName: rec.tableName,
					});
				} catch (error) {
					console.error('brAInwav Database Optimizer failed to create index', {
						component: 'memory-core',
						brand: 'brAInwav',
						tableName: rec.tableName,
						fields: rec.fields,
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}
		}
	}

	recordQuery(query: string, latency: number): void {
		this.queryHistory.push({
			query,
			timestamp: Date.now(),
			latency,
			tables: [], // Would be populated by query parser
		});

		// Keep only recent queries
		const cutoffTime = Date.now() - this.config.analysis.analysisWindow * 2;
		this.queryHistory = this.queryHistory.filter(q => q.timestamp > cutoffTime);

		// Periodic analysis trigger
		if (this.queryHistory.length % 100 === 0) {
			setTimeout(() => this.analyzeQueryPatterns(), 0);
		}
	}

	getMetrics(): DatabaseMetrics {
		const slowQueryThreshold = this.config.analysis.performanceThreshold;
		const slowQueries = this.queryHistory.filter(q => q.latency > slowQueryThreshold).length;

		const missingIndexes: IndexRecommendation[] = [];
		for (const analysis of this.queryPatterns.values()) {
			missingIndexes.push(...analysis.indexRecommendations);
		}

		const performanceIssues: string[] = [];

		if (slowQueries > 10) {
			performanceIssues.push('High number of slow queries detected');
		}

		const unusedIndexes = Array.from(this.indexUsageStats.values()).filter(
			stat => stat.usageCount < 5 && Date.now() - stat.lastUsed > 86400000
		);

		if (unusedIndexes.length > 5) {
			performanceIssues.push('Many unused indexes consuming resources');
		}

		return {
			slowQueries,
			indexUsageStats: Object.fromEntries(this.indexUsageStats),
			missingIndexes,
			performanceIssues,
		};
	}

	async cleanupUnusedIndexes(): Promise<void> {
		if (!this.config.indexes.dropUnusedIndexes) return;

		const unusedThreshold = this.config.indexes.unusedIndexThreshold * 86400000; // days to ms
		const now = Date.now();

		for (const [indexName, stats] of this.indexUsageStats.entries()) {
			if (stats.usageCount < 5 && now - stats.lastUsed > unusedThreshold) {
				try {
					await prisma.$executeRaw`DROP INDEX IF EXISTS ${indexName}`;

					console.info('brAInwav Database Optimizer dropped unused index', {
						component: 'memory-core',
						brand: 'brAInwav',
						indexName,
						usageCount: stats.usageCount,
						lastUsed: stats.lastUsed,
					});

					this.indexUsageStats.delete(indexName);
				} catch (error) {
					console.warn('brAInwav Database Optimizer failed to drop index', {
						component: 'memory-core',
						brand: 'brAInwav',
						indexName,
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}
		}
	}

	async stop(): Promise<void> {
		// Final cleanup
		await this.cleanupUnusedIndexes();

		console.info('brAInwav Database Optimizer stopped', {
			component: 'memory-core',
			brand: 'brAInwav',
		});
	}
}

// Global optimizer instance
let databaseOptimizer: DatabaseOptimizer | null = null;

export function getDatabaseOptimizer(config?: DatabaseOptimizationConfig): DatabaseOptimizer {
	if (!databaseOptimizer) {
		if (!config) {
			throw new Error('Database optimizer configuration required for first initialization');
		}
		databaseOptimizer = new DatabaseOptimizer(config);
	}
	return databaseOptimizer;
}

export async function stopDatabaseOptimizer(): Promise<void> {
	if (databaseOptimizer) {
		await databaseOptimizer.stop();
		databaseOptimizer = null;
	}
}
