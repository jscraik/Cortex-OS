import { EventEmitter } from 'node:events';
import { type MemoryStore, type MemorySearchOptions, type SearchResult } from '../ports/MemoryStore.js';

export interface MemoryMetrics {
	operations: {
		upsert: OperationMetrics;
		get: OperationMetrics;
		search: OperationMetrics;
		delete: OperationMetrics;
		clear: OperationMetrics;
	};
	storage: {
		totalMemories: number;
		totalSizeBytes: number;
		averageMemorySizeBytes: number;
		memoriesByKind: Record<string, number>;
	};
	errors: {
		total: number;
		byType: Record<string, number>;
		byOperation: Record<string, number>;
	};
	performance: {
		averageLatencyMs: number;
		p95LatencyMs: number;
		p99LatencyMs: number;
		throughputPerSecond: number;
	};
	timestamp: Date;
}

export interface OperationMetrics {
	count: number;
	successCount: number;
	errorCount: number;
	totalLatencyMs: number;
	averageLatencyMs: number;
	minLatencyMs: number;
	maxLatencyMs: number;
	lastOperationTime?: Date;
}

export interface MetricsCollectorConfig {
	sampleRate: number;
	maxSamples: number;
	retentionPeriodMs: number;
	enabledMetrics: string[];
}

export class MemoryMetricsCollector extends EventEmitter {
	private config: MetricsCollectorConfig;
	private store: MemoryStore;
	private metrics: MemoryMetrics;
	private latencySamples: Map<string, number[]> = new Map();
	private operationCounts: Map<string, number> = new Map();
	private startTime: Date;

	constructor(store: MemoryStore, config: Partial<MetricsCollectorConfig> = {}) {
		super();
		this.store = store;
		this.startTime = new Date();

		this.config = {
			sampleRate: 0.1, // Sample 10% of operations
			maxSamples: 1000,
			retentionPeriodMs: 5 * 60 * 1000, // 5 minutes
			enabledMetrics: ['operations', 'storage', 'errors', 'performance'],
			...config,
		};

		this.metrics = this.initializeMetrics();

		// Start periodic cleanup
		setInterval(() => this.cleanup(), this.config.retentionPeriodMs);
	}

	/**
	 * Initialize metrics structure
	 */
	private initializeMetrics(): MemoryMetrics {
		return {
			operations: {
				upsert: this.createOperationMetrics(),
				get: this.createOperationMetrics(),
				search: this.createOperationMetrics(),
				delete: this.createOperationMetrics(),
				clear: this.createOperationMetrics(),
			},
			storage: {
				totalMemories: 0,
				totalSizeBytes: 0,
				averageMemorySizeBytes: 0,
				memoriesByKind: {},
			},
			errors: {
				total: 0,
				byType: {},
				byOperation: {},
			},
			performance: {
				averageLatencyMs: 0,
				p95LatencyMs: 0,
				p99LatencyMs: 0,
				throughputPerSecond: 0,
			},
			timestamp: new Date(),
		};
	}

	/**
	 * Create operation metrics template
	 */
	private createOperationMetrics(): OperationMetrics {
		return {
			count: 0,
			successCount: 0,
			errorCount: 0,
			totalLatencyMs: 0,
			averageLatencyMs: 0,
			minLatencyMs: Number.MAX_VALUE,
			maxLatencyMs: 0,
		};
	}

	/**
	 * Wrap store operations to collect metrics
	 */
	createInstrumentedStore(): MemoryStore {
		const self = this;
		const store = this.store;

		return {
			async upsert(memory: any) {
				return self.instrumentOperation('upsert', () => store.upsert(memory));
			},

			async get(id: string) {
				return self.instrumentOperation('get', () => store.get(id));
			},

			async search(options: MemorySearchOptions) {
				return self.instrumentOperation('search', () => store.search(options));
			},

			async delete(id: string) {
				return self.instrumentOperation('delete', () => store.delete(id));
			},

			async clear() {
				return self.instrumentOperation('clear', () => store.clear());
			},

			async close() {
				return store.close();
			},
		};
	}

	/**
	 * Instrument an operation with metrics collection
	 */
	async instrumentOperation<T>(
		operation: string,
		fn: () => Promise<T>,
	): Promise<T> {
		// Skip sampling if not enabled or random check fails
		if (!this.shouldSample(operation)) {
			return fn();
		}

		const startTime = Date.now();
		let result: T;
		let error: any = null;

		try {
			result = await fn();
			this.recordSuccess(operation, Date.now() - startTime);
			return result;
		} catch (err) {
			error = err;
			this.recordError(operation, err, Date.now() - startTime);
			throw err;
		} finally {
			this.recordLatency(operation, Date.now() - startTime);
			this.emit('operation', {
				operation,
				duration: Date.now() - startTime,
				success: !error,
				error: error?.message,
			});
		}
	}

	/**
	 * Check if operation should be sampled
	 */
	private shouldSample(operation: string): boolean {
		if (!this.config.enabledMetrics.includes('operations')) {
			return false;
		}

		return Math.random() < this.config.sampleRate;
	}

	/**
	 * Record successful operation
	 */
	private recordSuccess(operation: string, latencyMs: number): void {
		const opMetrics = this.metrics.operations[operation as keyof typeof this.metrics.operations];
		opMetrics.count++;
		opMetrics.successCount++;
		opMetrics.totalLatencyMs += latencyMs;
		opMetrics.lastOperationTime = new Date();

		if (latencyMs < opMetrics.minLatencyMs) {
			opMetrics.minLatencyMs = latencyMs;
		}
		if (latencyMs > opMetrics.maxLatencyMs) {
			opMetrics.maxLatencyMs = latencyMs;
		}

		opMetrics.averageLatencyMs = opMetrics.totalLatencyMs / opMetrics.count;
	}

	/**
	 * Record operation error
	 */
	private recordError(operation: string, error: any, latencyMs: number): void {
		const opMetrics = this.metrics.operations[operation as keyof typeof this.metrics.operations];
		opMetrics.count++;
		opMetrics.errorCount++;
		opMetrics.totalLatencyMs += latencyMs;
		opMetrics.lastOperationTime = new Date();

		// Update error metrics
		this.metrics.errors.total++;
		const errorType = error?.name || 'Unknown';
		this.metrics.errors.byType[errorType] = (this.metrics.errors.byType[errorType] || 0) + 1;
		this.metrics.errors.byOperation[operation] = (this.metrics.errors.byOperation[operation] || 0) + 1;

		this.emit('error', {
			operation,
			errorType,
			message: error?.message,
			latencyMs,
		});
	}

	/**
	 * Record latency sample
	 */
	private recordLatency(operation: string, latencyMs: number): void {
		if (!this.latencySamples.has(operation)) {
			this.latencySamples.set(operation, []);
		}

		const samples = this.latencySamples.get(operation)!;
		samples.push(latencyMs);

		// Keep only recent samples
		if (samples.length > this.config.maxSamples) {
			samples.shift();
		}

		// Update operation counts for throughput calculation
		const now = Date.now();
		const timeKey = Math.floor(now / 1000); // Second precision
		this.operationCounts.set(timeKey, (this.operationCounts.get(timeKey) || 0) + 1);
	}

	/**
	 * Update storage metrics (call this periodically)
	 */
	async updateStorageMetrics(): Promise<void> {
		if (!this.config.enabledMetrics.includes('storage')) {
			return;
		}

		try {
			// Get memory count
			const searchResult = await this.store.search({ limit: 10000 });
			this.metrics.storage.totalMemories = searchResult.total;

			// Calculate size metrics
			let totalSize = 0;
			const kindCounts: Record<string, number> = {};

			for (const memory of searchResult.memories) {
				const size = Buffer.byteLength(JSON.stringify(memory), 'utf8');
				totalSize += size;
				kindCounts[memory.kind] = (kindCounts[memory.kind] || 0) + 1;
			}

			this.metrics.storage.totalSizeBytes = totalSize;
			this.metrics.storage.averageMemorySizeBytes = searchResult.total > 0 ? totalSize / searchResult.total : 0;
			this.metrics.storage.memoriesByKind = kindCounts;

			// If we got all memories, we're done. Otherwise, estimate total size
			if (searchResult.hasMore && searchResult.total > searchResult.memories.length) {
				this.metrics.storage.totalSizeBytes = Math.round(
					(totalSize / searchResult.memories.length) * searchResult.total
				);
			}
		} catch (error) {
			this.emit('error', {
				operation: 'updateStorageMetrics',
				errorType: 'MetricsUpdateFailed',
				message: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}

	/**
	 * Calculate performance metrics
	 */
	private calculatePerformanceMetrics(): void {
		if (!this.config.enabledMetrics.includes('performance')) {
			return;
		}

		// Calculate percentiles from latency samples
		const allLatencies: number[] = [];
		for (const samples of this.latencySamples.values()) {
			allLatencies.push(...samples);
		}

		if (allLatencies.length > 0) {
			allLatencies.sort((a, b) => a - b);

			this.metrics.performance.averageLatencyMs = allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length;

			const p95Index = Math.floor(allLatencies.length * 0.95);
			const p99Index = Math.floor(allLatencies.length * 0.99);

			this.metrics.performance.p95LatencyMs = allLatencies[p95Index] || 0;
			this.metrics.performance.p99LatencyMs = allLatencies[p99Index] || 0;
		}

		// Calculate throughput
		const now = Date.now();
		const oneMinuteAgo = now - 60 * 1000;
		let recentOperations = 0;

		for (const [timeKey, count] of this.operationCounts.entries()) {
			if (timeKey * 1000 >= oneMinuteAgo) {
				recentOperations += count;
			}
		}

		this.metrics.performance.throughputPerSecond = recentOperations / 60;
	}

	/**
	 * Get current metrics
	 */
	getMetrics(): MemoryMetrics {
		this.calculatePerformanceMetrics();
		this.metrics.timestamp = new Date();
		return { ...this.metrics };
	}

	/**
	 * Reset metrics
	 */
	reset(): void {
		this.metrics = this.initializeMetrics();
		this.latencySamples.clear();
		this.operationCounts.clear();
		this.startTime = new Date();
		this.emit('reset');
	}

	/**
	 * Cleanup old samples
	 */
	private cleanup(): void {
		const cutoff = Date.now() - this.config.retentionPeriodMs;

		// Cleanup operation counts
		for (const [timeKey] of this.operationCounts.entries()) {
			if (timeKey * 1000 < cutoff) {
				this.operationCounts.delete(timeKey);
			}
		}

		this.emit('cleanup', {
			remainingSamples: this.latencySamples.size,
			cutoffTime: new Date(cutoff),
		});
	}

	/**
	 * Get metrics summary for dashboards
	 */
	getSummary() {
		const metrics = this.getMetrics();
		return {
			uptime: Date.now() - this.startTime.getTime(),
			totalOperations: Object.values(metrics.operations).reduce((sum, op) => sum + op.count, 0),
			successRate: this.calculateSuccessRate(),
			averageLatencyMs: metrics.performance.averageLatencyMs,
			p95LatencyMs: metrics.performance.p95LatencyMs,
			throughputPerSecond: metrics.performance.throughputPerSecond,
			totalMemories: metrics.storage.totalMemories,
			totalErrors: metrics.errors.total,
		};
	}

	/**
	 * Calculate overall success rate
	 */
	private calculateSuccessRate(): number {
		const totalOperations = Object.values(this.metrics.operations).reduce((sum, op) => sum + op.count, 0);
		const totalSuccess = Object.values(this.metrics.operations).reduce((sum, op) => sum + op.successCount, 0);

		return totalOperations > 0 ? totalSuccess / totalOperations : 1;
	}
}

/**
 * Create Prometheus metrics exporter
 */
export function createPrometheusExporter(metricsCollector: MemoryMetricsCollector) {
	return {
		getMetrics: () => {
			const metrics = metricsCollector.getMetrics();
			const lines: string[] = [];

			// Operation metrics
			for (const [op, opMetrics] of Object.entries(metrics.operations)) {
				lines.push(`# TYPE memories_operation_total counter`);
				lines.push(`# HELP memories_operation_total Total number of operations`);
				lines.push(`memories_operation_total{operation="${op}"} ${opMetrics.count}`);

				lines.push(`# TYPE memories_operation_latency_ms histogram`);
				lines.push(`# HELP memories_operation_latency_ms Operation latency in milliseconds`);
				lines.push(`memories_operation_latency_ms_bucket{operation="${op}",le="0.1"} 0`);
				lines.push(`memories_operation_latency_ms_bucket{operation="${op}",le="1"} 0`);
				lines.push(`memories_operation_latency_ms_bucket{operation="${op}",le="10"} 0`);
				lines.push(`memories_operation_latency_ms_bucket{operation="${op}",le="100"} 0`);
				lines.push(`memories_operation_latency_ms_bucket{operation="${op}",le="+Inf"} ${opMetrics.count}`);
				lines.push(`memories_operation_latency_ms_sum{operation="${op}"} ${opMetrics.totalLatencyMs}`);
				lines.push(`memories_operation_latency_ms_count{operation="${op}"} ${opMetrics.count}`);
			}

			// Storage metrics
			lines.push(`# TYPE memories_storage_total_bytes gauge`);
			lines.push(`# HELP memories_storage_total_bytes Total storage used by memories`);
			lines.push(`memories_storage_total_bytes ${metrics.storage.totalSizeBytes}`);

			lines.push(`# TYPE memories_storage_total_memories gauge`);
			lines.push(`# HELP memories_storage_total_memories Total number of memories stored`);
			lines.push(`memories_storage_total_memories ${metrics.storage.totalMemories}`);

			// Error metrics
			lines.push(`# TYPE memories_errors_total counter`);
			lines.push(`# HELP memories_errors_total Total number of errors`);
			lines.push(`memories_errors_total ${metrics.errors.total}`);

			// Performance metrics
			lines.push(`# TYPE memories_performance_average_latency_ms gauge`);
			lines.push(`# HELP memories_performance_average_latency_ms Average operation latency`);
			lines.push(`memories_performance_average_latency_ms ${metrics.performance.averageLatencyMs}`);

			lines.push(`# TYPE memories_performance_throughput_per_second gauge`);
			lines.push(`# HELP memories_performance_throughput_per_second Operations per second`);
			lines.push(`memories_performance_throughput_per_second ${metrics.performance.throughputPerSecond}`);

			return lines.join('\n') + '\n';
		},
	};
}