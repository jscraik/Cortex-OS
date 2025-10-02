// Memory Management Service for brAInwav Cortex WebUI
// Advanced memory management, leak detection, and stream processing

import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { performance } from 'node:perf_hooks';
import { pipeline, Transform } from 'node:stream';
import { promisify } from 'node:util';
import { createGunzip, createGzip } from 'node:zlib';

const pipelineAsync = promisify(pipeline);

export interface MemoryStats {
	heapUsed: number;
	heapTotal: number;
	external: number;
	arrayBuffers: number;
	rss: number;
	usageRatio: number;
	leakDetected: boolean;
	gcStats: {
		forcedCollections: number;
		naturalCollections: number;
		totalTime: number;
	};
	streamStats: {
		activeStreams: number;
		totalStreams: number;
		bytesProcessed: number;
		averageThroughput: number;
	};
}

export interface StreamOptions {
	chunkSize?: number;
	compression?: boolean;
	encryption?: boolean;
	tempDir?: string;
	maxMemory?: number;
	enableBackpressure?: boolean;
	onProgress?: (progress: StreamProgress) => void;
}

export interface StreamProgress {
	bytesRead: number;
	bytesWritten: number;
	percentage: number;
	throughput: number;
	eta?: number;
}

export interface BufferPool {
	size: number;
	count: number;
	maxSize: number;
	available: Buffer[];
	inUse: Buffer[];
}

export class MemoryService {
	private static instance: MemoryService;
	private stats: MemoryStats = {
		heapUsed: 0,
		heapTotal: 0,
		external: 0,
		arrayBuffers: 0,
		rss: 0,
		usageRatio: 0,
		leakDetected: false,
		gcStats: {
			forcedCollections: 0,
			naturalCollections: 0,
			totalTime: 0,
		},
		streamStats: {
			activeStreams: 0,
			totalStreams: 0,
			bytesProcessed: 0,
			averageThroughput: 0,
		},
	};
	private memorySnapshots: number[] = [];
	private leakDetectionThreshold = 100 * 1024 * 1024; // 100MB
	private monitoringInterval?: NodeJS.Timeout;
	private gcInterval?: NodeJS.Timeout;
	private bufferPools: Map<number, BufferPool> = new Map();
	private activeStreams: Set<string> = new Set();
	private streamThroughputHistory: number[] = [];
	private maxThroughputHistory = 100;

	private constructor() {
		this.startMemoryMonitoring();
		this.startGCMonitoring();
		this.initializeBufferPools();
	}

	public static getInstance(): MemoryService {
		if (!MemoryService.instance) {
			MemoryService.instance = new MemoryService();
		}
		return MemoryService.instance;
	}

	private startMemoryMonitoring(): void {
		// Monitor memory every 30 seconds
		this.monitoringInterval = setInterval(() => {
			this.updateMemoryStats();
			this.detectMemoryLeaks();
		}, 30000);
	}

	private startGCMonitoring(): void {
		// Force garbage collection every 5 minutes if needed
		this.gcInterval = setInterval(() => {
			const usage = process.memoryUsage();
			const usageRatio = usage.heapUsed / usage.heapTotal;

			if (usageRatio > 0.8) {
				this.forceGarbageCollection();
			}
		}, 300000);
	}

	private initializeBufferPools(): void {
		// Initialize buffer pools for common sizes
		const commonSizes = [1024, 4096, 16384, 65536, 262144]; // 1KB to 256KB

		for (const size of commonSizes) {
			this.bufferPools.set(size, {
				size,
				count: 0,
				maxSize: 100,
				available: [],
				inUse: [],
			});
		}
	}

	private updateMemoryStats(): void {
		const usage = process.memoryUsage();
		const usageRatio = usage.heapUsed / usage.heapTotal;

		this.stats = {
			...this.stats,
			heapUsed: usage.heapUsed,
			heapTotal: usage.heapTotal,
			external: usage.external,
			arrayBuffers: usage.arrayBuffers,
			rss: usage.rss,
			usageRatio,
		};

		// Track memory usage history for leak detection
		this.memorySnapshots.push(usage.heapUsed);
		if (this.memorySnapshots.length > 100) {
			this.memorySnapshots.shift();
		}
	}

	private detectMemoryLeaks(): void {
		if (this.memorySnapshots.length < 10) {
			return;
		}

		// Simple leak detection: if memory keeps growing
		const recentSnapshots = this.memorySnapshots.slice(-10);
		const olderSnapshots = this.memorySnapshots.slice(-20, -10);

		if (olderSnapshots.length === 0) {
			return;
		}

		const recentAvg = recentSnapshots.reduce((sum, val) => sum + val, 0) / recentSnapshots.length;
		const olderAvg = olderSnapshots.reduce((sum, val) => sum + val, 0) / olderSnapshots.length;
		const growthRate = (recentAvg - olderAvg) / olderAvg;

		// Detect if memory is growing consistently
		if (growthRate > 0.1 && recentAvg > this.leakDetectionThreshold) {
			this.stats.leakDetected = true;
			console.warn('Potential memory leak detected', {
				recentAvg: this.formatBytes(recentAvg),
				olderAvg: this.formatBytes(olderAvg),
				growthRate: `${(growthRate * 100).toFixed(2)}%`,
			});
		}
	}

	public forceGarbageCollection(): void {
		const startTime = performance.now();

		try {
			if (global.gc) {
				global.gc();
				const endTime = performance.now();
				const gcTime = endTime - startTime;

				this.stats.gcStats.forcedCollections++;
				this.stats.gcStats.totalTime += gcTime;

				console.log(`Forced garbage collection completed in ${gcTime.toFixed(2)}ms`);
			}
		} catch (error) {
			console.error('Error forcing garbage collection:', error);
		}
	}

	public getBuffer(size: number): Buffer {
		// Find the closest buffer pool size
		const poolSize = this.findClosestPoolSize(size);
		const pool = this.bufferPools.get(poolSize);

		if (pool && pool.available.length > 0) {
			const buffer = pool.available.pop()!;
			pool.inUse.push(buffer);
			return buffer;
		}

		// Create new buffer if pool is empty
		const buffer = Buffer.alloc(poolSize);
		if (pool) {
			pool.inUse.push(buffer);
			pool.count++;
		}

		return buffer;
	}

	public releaseBuffer(buffer: Buffer): void {
		// Find the appropriate pool
		const poolSize = buffer.length;
		const pool = this.bufferPools.get(poolSize);

		if (pool) {
			const index = pool.inUse.indexOf(buffer);
			if (index !== -1) {
				pool.inUse.splice(index, 1);
				pool.available.push(buffer);
			}
		}
	}

	private findClosestPoolSize(size: number): number {
		const sizes = Array.from(this.bufferPools.keys()).sort((a, b) => a - b);

		for (const poolSize of sizes) {
			if (poolSize >= size) {
				return poolSize;
			}
		}

		// Return the largest pool size if requested size is bigger
		return sizes[sizes.length - 1] || size;
	}

	// Stream processing methods
	public createProcessingStream(options: StreamOptions = {}): Transform {
		const opts = {
			chunkSize: options.chunkSize || 64 * 1024, // 64KB chunks
			compression: options.compression || false,
			encryption: options.encryption || false,
			maxMemory: options.maxMemory || 50 * 1024 * 1024, // 50MB
			enableBackpressure: options.enableBackpressure !== false,
			onProgress: options.onProgress,
		};

		const streamId = createHash('md5').update(Date.now().toString()).digest('hex').substring(0, 8);
		this.activeStreams.add(streamId);
		this.stats.streamStats.activeStreams++;
		this.stats.streamStats.totalStreams++;

		let totalBytes = 0;
		let processedBytes = 0;
		const startTime = Date.now();

		return new Transform({
			transform(chunk: Buffer, _encoding, callback) {
				totalBytes += chunk.length;

				// Check memory usage
				const memoryUsage = process.memoryUsage();
				if (memoryUsage.heapUsed > opts.maxMemory) {
					// Force garbage collection if memory is high
					MemoryService.getInstance().forceGarbageCollection();
				}

				// Process chunk
				const processedChunk = chunk;

				if (opts.compression) {
					// Would compress chunk here
					// For now, just pass through
				}

				if (opts.encryption) {
					// Would encrypt chunk here
					// For now, just pass through
				}

				processedBytes += processedChunk.length;
				this.stats.streamStats.bytesProcessed += processedChunk.length;

				// Report progress
				if (opts.onProgress) {
					const progress: StreamProgress = {
						bytesRead: totalBytes,
						bytesWritten: processedBytes,
						percentage: totalBytes > 0 ? (processedBytes / totalBytes) * 100 : 0,
						throughput: this.calculateThroughput(processedBytes, startTime),
					};

					if (progress.throughput > 0) {
						progress.eta = (totalBytes - processedBytes) / progress.throughput;
					}

					opts.onProgress(progress);
				}

				this.push(processedChunk);
				callback();
			},

			flush(callback) {
				// Clean up stream
				this.activeStreams.delete(streamId);
				this.stats.streamStats.activeStreams--;

				// Update throughput stats
				const totalTime = (Date.now() - startTime) / 1000;
				const throughput = processedBytes / totalTime;

				this.streamThroughputHistory.push(throughput);
				if (this.streamThroughputHistory.length > this.maxThroughputHistory) {
					this.streamThroughputHistory.shift();
				}

				this.stats.streamStats.averageThroughput =
					this.streamThroughputHistory.reduce((sum, val) => sum + val, 0) /
					this.streamThroughputHistory.length;

				callback();
			},
		});
	}

	public async processFileStream(
		inputPath: string,
		outputPath: string,
		options: StreamOptions = {},
	): Promise<StreamProgress> {
		const startTime = Date.now();
		let totalBytes = 0;
		let processedBytes = 0;

		try {
			const stats = statSync(inputPath);
			totalBytes = stats.size;

			const readStream = createReadStream(inputPath, {
				highWaterMark: options.chunkSize || 64 * 1024,
			});

			const writeStream = createWriteStream(outputPath);

			// Add processing stream
			const processingStream = this.createProcessingStream({
				...options,
				onProgress: (progress) => {
					processedBytes = progress.bytesWritten;
					if (options.onProgress) {
						options.onProgress(progress);
					}
				},
			});

			// Build pipeline
			const streams = [readStream];

			if (options.compression) {
				streams.push(createGzip());
			}

			streams.push(processingStream);

			if (options.compression) {
				streams.push(createGunzip());
			}

			streams.push(writeStream);

			await pipelineAsync(streams);

			const totalTime = (Date.now() - startTime) / 1000;
			const throughput = processedBytes / totalTime;

			return {
				bytesRead: totalBytes,
				bytesWritten: processedBytes,
				percentage: 100,
				throughput,
			};
		} catch (error) {
			console.error('Stream processing error:', error);
			throw error;
		}
	}

	public async processLargeFileInChunks(
		filePath: string,
		processor: (chunk: Buffer, chunkIndex: number) => Promise<Buffer>,
		options: {
			chunkSize?: number;
			maxConcurrency?: number;
			onProgress?: (progress: StreamProgress) => void;
		} = {},
	): Promise<void> {
		const opts = {
			chunkSize: options.chunkSize || 1024 * 1024, // 1MB chunks
			maxConcurrency: options.maxConcurrency || 4,
			onProgress: options.onProgress,
		};

		const stats = statSync(filePath);
		const totalChunks = Math.ceil(stats.size / opts.chunkSize);
		let processedChunks = 0;
		let totalBytes = 0;

		const processChunk = async (chunkIndex: number): Promise<void> => {
			const start = chunkIndex * opts.chunkSize;
			const end = Math.min(start + opts.chunkSize, stats.size);

			const readStream = createReadStream(filePath, {
				start,
				end: end - 1,
			});

			const chunks: Buffer[] = [];

			for await (const chunk of readStream) {
				chunks.push(chunk);
			}

			const chunk = Buffer.concat(chunks);
			const processedChunk = await processor(chunk, chunkIndex);

			// Write processed chunk back to file (or handle as needed)
			// This is a simplified example
			totalBytes += processedChunk.length;
			processedChunks++;

			if (opts.onProgress) {
				const progress: StreamProgress = {
					bytesRead: processedChunks * opts.chunkSize,
					bytesWritten: totalBytes,
					percentage: (processedChunks / totalChunks) * 100,
					throughput: totalBytes / ((Date.now() - performance.now()) / 1000),
				};

				opts.onProgress(progress);
			}
		};

		// Process chunks with concurrency control
		const promises: Promise<void>[] = [];
		for (let i = 0; i < totalChunks; i++) {
			promises.push(processChunk(i));

			// Limit concurrency
			if (promises.length >= opts.maxConcurrency) {
				await Promise.race(promises);
				promises.splice(
					promises.findIndex((p) => p),
					1,
				);
			}
		}

		await Promise.all(promises);
	}

	private calculateThroughput(bytes: number, startTime: number): number {
		const elapsedSeconds = (Date.now() - startTime) / 1000;
		return elapsedSeconds > 0 ? bytes / elapsedSeconds : 0;
	}

	public getMemoryStats(): MemoryStats {
		this.updateMemoryStats();
		return { ...this.stats };
	}

	public getBufferPoolStats(): Array<{
		size: number;
		available: number;
		inUse: number;
		efficiency: number;
	}> {
		const stats: Array<{ size: number; available: number; inUse: number; efficiency: number }> = [];

		for (const [size, pool] of this.bufferPools) {
			const efficiency = pool.count > 0 ? (pool.available.length / pool.count) * 100 : 0;
			stats.push({
				size,
				available: pool.available.length,
				inUse: pool.inUse.length,
				efficiency,
			});
		}

		return stats.sort((a, b) => a.size - b.size);
	}

	public async analyzeMemoryUsage(): Promise<{
		summary: MemoryStats;
		bufferPools: ReturnType<typeof this.getBufferPoolStats>;
		recommendations: string[];
		heapAnalysis: {
			largestObjects: Array<{ size: number; type: string }>;
			suspiciousPatterns: string[];
		};
	}> {
		const summary = this.getMemoryStats();
		const bufferPools = this.getBufferPoolStats();
		const recommendations: string[] = [];

		// Generate recommendations
		if (summary.usageRatio > 0.8) {
			recommendations.push(
				'High memory usage detected. Consider increasing memory limits or optimizing algorithms.',
			);
		}

		if (summary.leakDetected) {
			recommendations.push(
				'Memory leak detected. Review object disposal patterns and check for circular references.',
			);
		}

		if (summary.gcStats.forcedCollections > summary.gcStats.naturalCollections) {
			recommendations.push(
				'Frequent forced garbage collections. Consider reducing memory allocations.',
			);
		}

		// Check buffer pool efficiency
		for (const pool of bufferPools) {
			if (pool.efficiency < 50) {
				recommendations.push(
					`Buffer pool for size ${this.formatBytes(pool.size)} has low efficiency (${pool.efficiency.toFixed(1)}%). Consider adjusting pool size.`,
				);
			}
		}

		// Simple heap analysis (would need more sophisticated tools for real analysis)
		const heapAnalysis = {
			largestObjects: [],
			suspiciousPatterns: [] as string[],
		};

		if (summary.arrayBuffers > 100 * 1024 * 1024) {
			heapAnalysis.suspiciousPatterns.push('Large ArrayBuffer usage detected');
		}

		if (summary.external > 50 * 1024 * 1024) {
			heapAnalysis.suspiciousPatterns.push('High external memory usage');
		}

		return {
			summary,
			bufferPools,
			recommendations,
			heapAnalysis,
		};
	}

	public formatBytes(bytes: number): string {
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
		if (bytes === 0) return '0 Bytes';
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return `${(bytes / 1024 ** i).toFixed(2)} ${sizes[i]}`;
	}

	public cleanup(): void {
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
		}

		if (this.gcInterval) {
			clearInterval(this.gcInterval);
		}

		// Clear buffer pools
		for (const pool of this.bufferPools.values()) {
			pool.available = [];
			pool.inUse = [];
		}

		// Clear active streams
		this.activeStreams.clear();
	}

	// Advanced memory optimization methods
	public optimizeMemoryUsage(): void {
		console.log('Starting memory optimization...');

		// Force garbage collection
		this.forceGarbageCollection();

		// Optimize buffer pools
		for (const [_size, pool] of this.bufferPools) {
			// Release unused buffers if pool is too large
			if (pool.available.length > pool.maxSize / 2) {
				const excess = pool.available.length - Math.floor(pool.maxSize / 2);
				pool.available.splice(0, excess);
			}
		}

		// Clear old snapshots
		if (this.memorySnapshots.length > 50) {
			this.memorySnapshots = this.memorySnapshots.slice(-50);
		}

		// Clear old throughput history
		if (this.streamThroughputHistory.length > 50) {
			this.streamThroughputHistory = this.streamThroughputHistory.slice(-50);
		}

		console.log('Memory optimization completed');
	}

	public setMemoryThresholds(thresholds: {
		leakDetection?: number;
		gcTrigger?: number;
		maxBufferPoolSize?: number;
	}): void {
		if (thresholds.leakDetection) {
			this.leakDetectionThreshold = thresholds.leakDetection;
		}

		if (thresholds.gcTrigger) {
			// Would update GC trigger threshold
		}

		if (thresholds.maxBufferPoolSize) {
			for (const pool of this.bufferPools.values()) {
				pool.maxSize = thresholds.maxBufferPoolSize;
			}
		}
	}
}

// Export singleton instance
export const memoryService = MemoryService.getInstance();

// Export types and utilities
export type { BufferPool, MemoryStats, StreamOptions, StreamProgress };
export const createStreamOptions = (options: Partial<StreamOptions> = {}): StreamOptions => ({
	chunkSize: 64 * 1024,
	compression: false,
	encryption: false,
	tempDir: tmpdir(),
	maxMemory: 50 * 1024 * 1024,
	enableBackpressure: true,
	...options,
});

// Memory monitoring middleware
export const createMemoryMonitoringMiddleware = () => {
	return (req: Request, res: Response, next: NextFunction): void => {
		const memoryBefore = process.memoryUsage();

		res.on('finish', () => {
			const memoryAfter = process.memoryUsage();
			const memoryDelta = {
				heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
				heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
				external: memoryAfter.external - memoryBefore.external,
			};

			// Log significant memory usage
			if (Math.abs(memoryDelta.heapUsed) > 10 * 1024 * 1024) {
				// 10MB
				console.log(`Memory delta for ${req.method} ${req.path}:`, {
					heapUsed: memoryService.formatBytes(memoryDelta.heapUsed),
					responseTime: `${res.get('X-Response-Time') || 'unknown'}`,
				});
			}
		});

		next();
	};
};
