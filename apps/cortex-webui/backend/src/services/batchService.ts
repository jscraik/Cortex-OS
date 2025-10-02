// Batch Operations Service for brAInwav Cortex WebUI
// High-performance bulk data operations with transaction management

import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import type { Database } from 'sqlite3';
import { MetricsService } from '../monitoring/services/metricsService.js';
import { cacheService } from './cacheService.js';
import { type BatchOperation, databaseService } from './databaseService.js';
import { ragCacheService } from './ragCacheService.js';

export interface BatchJob {
	id: string;
	name: string;
	operations: BatchOperation[];
	status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
	startTime?: Date;
	endTime?: Date;
	progress: number;
	totalOperations: number;
	completedOperations: number;
	failedOperations: number;
	errorMessage?: string;
	results?: any[];
	metadata?: Record<string, any>;
}

export interface BatchOptions {
	batchSize?: number;
	retryAttempts?: number;
	retryDelay?: number;
	timeout?: number;
	transactionSize?: number;
	continueOnError?: boolean;
	progressCallback?: (job: BatchJob) => void;
	validationCallback?: (operation: BatchOperation) => boolean;
}

export interface BatchStats {
	totalJobs: number;
	completedJobs: number;
	failedJobs: number;
	averageJobTime: number;
	totalOperations: number;
	operationsPerSecond: number;
	cacheInvalidations: number;
	transactionCommits: number;
	transactionRollbacks: number;
}

export class BatchService {
	private static instance: BatchService;
	private jobs: Map<string, BatchJob> = new Map();
	private activeJobs: Set<string> = new Set();
	private stats: BatchStats = {
		totalJobs: 0,
		completedJobs: 0,
		failedJobs: 0,
		averageJobTime: 0,
		totalOperations: 0,
		operationsPerSecond: 0,
		cacheInvalidations: 0,
		transactionCommits: 0,
		transactionRollbacks: 0,
	};
	private jobTimes: number[] = [];
	private metricsService: MetricsService;
	private cleanupInterval?: NodeJS.Timeout;

	private constructor() {
		this.metricsService = MetricsService.getInstance();
		this.startCleanupInterval();
	}

	public static getInstance(): BatchService {
		if (!BatchService.instance) {
			BatchService.instance = new BatchService();
		}
		return BatchService.instance;
	}

	public createJob(
		name: string,
		operations: BatchOperation[],
		options: BatchOptions = {},
	): BatchJob {
		const job: BatchJob = {
			id: randomUUID(),
			name,
			operations,
			status: 'pending',
			progress: 0,
			totalOperations: operations.length,
			completedOperations: 0,
			failedOperations: 0,
			metadata: {
				batchSize: options.batchSize || 100,
				retryAttempts: options.retryAttempts || 3,
				continueOnError: options.continueOnError || false,
			},
		};

		this.jobs.set(job.id, job);
		this.stats.totalJobs++;
		this.stats.totalOperations += operations.length;

		return job;
	}

	public async executeJob(jobId: string, options: BatchOptions = {}): Promise<BatchJob> {
		const job = this.jobs.get(jobId);
		if (!job) {
			throw new Error(`Job not found: ${jobId}`);
		}

		if (job.status === 'running') {
			throw new Error(`Job already running: ${jobId}`);
		}

		const opts = {
			batchSize: options.batchSize || 100,
			retryAttempts: options.retryAttempts || 3,
			retryDelay: options.retryDelay || 1000,
			timeout: options.timeout || 300000, // 5 minutes
			transactionSize: options.transactionSize || 1000,
			continueOnError: options.continueOnError || false,
			progressCallback: options.progressCallback,
			validationCallback: options.validationCallback,
		};

		this.activeJobs.add(jobId);
		job.status = 'running';
		job.startTime = new Date();
		job.results = [];

		const startTime = performance.now();

		try {
			await this.executeBatchOperations(job, opts);
			job.status = 'completed';
			this.stats.completedJobs++;
		} catch (error) {
			job.status = 'failed';
			job.errorMessage = error instanceof Error ? error.message : String(error);
			this.stats.failedJobs++;
		} finally {
			job.endTime = new Date();
			job.progress = 100;
			this.activeJobs.delete(jobId);

			const jobTime = performance.now() - startTime;
			this.updateJobStats(jobTime);

			if (opts.progressCallback) {
				opts.progressCallback(job);
			}
		}

		return job;
	}

	private async executeBatchOperations(job: BatchJob, options: BatchOptions): Promise<void> {
		const operations = job.operations;
		const batchSize = options.batchSize!;
		const transactionSize = options.transactionSize!;

		// Process in batches
		for (let i = 0; i < operations.length; i += batchSize) {
			if (job.status === 'cancelled') {
				break;
			}

			const batch = operations.slice(i, Math.min(i + batchSize, operations.length));
			const batchIndex = Math.floor(i / batchSize);

			// Determine if we need a transaction
			const needsTransaction =
				batch.length > 1 || batchIndex % Math.ceil(transactionSize / batchSize) === 0;

			try {
				if (needsTransaction) {
					await this.executeBatchWithTransaction(batch, job, options);
				} else {
					await this.executeBatchWithoutTransaction(batch, job, options);
				}

				job.completedOperations += batch.length;
			} catch (error) {
				job.failedOperations += batch.length;

				if (!options.continueOnError) {
					throw error;
				}
			}

			// Update progress
			job.progress = (job.completedOperations / job.totalOperations) * 100;

			if (options.progressCallback) {
				options.progressCallback(job);
			}

			// Add delay between batches to prevent overwhelming the database
			if (i + batchSize < operations.length) {
				await new Promise((resolve) => setTimeout(resolve, 10));
			}
		}

		// Invalidate relevant caches
		await this.invalidateBatchCache(operations);
	}

	private async executeBatchWithTransaction(
		batch: BatchOperation[],
		job: BatchJob,
		options: BatchOptions,
	): Promise<void> {
		const connection = await databaseService['getConnection']();

		try {
			// Begin transaction
			await databaseService['runQuery'](connection, 'BEGIN TRANSACTION');

			const results: any[] = [];

			for (const operation of batch) {
				// Validate operation if callback provided
				if (options.validationCallback && !options.validationCallback(operation)) {
					throw new Error(`Invalid operation: ${operation.query}`);
				}

				const result = await this.executeOperationWithRetry(
					connection,
					operation,
					options.retryAttempts!,
					options.retryDelay!,
				);

				results.push(result);
			}

			// Commit transaction
			await databaseService['runQuery'](connection, 'COMMIT');
			this.stats.transactionCommits++;

			if (job.results) {
				job.results.push(...results);
			}
		} catch (error) {
			// Rollback transaction
			await databaseService['runQuery'](connection, 'ROLLBACK');
			this.stats.transactionRollbacks++;
			throw error;
		} finally {
			databaseService['releaseConnection'](connection);
		}
	}

	private async executeBatchWithoutTransaction(
		batch: BatchOperation[],
		job: BatchJob,
		options: BatchOptions,
	): Promise<void> {
		const results: any[] = [];

		for (const operation of batch) {
			// Validate operation if callback provided
			if (options.validationCallback && !options.validationCallback(operation)) {
				throw new Error(`Invalid operation: ${operation.query}`);
			}

			const result = await this.executeOperationWithRetry(
				null, // Use database service directly
				operation,
				options.retryAttempts!,
				options.retryDelay!,
			);

			results.push(result);
		}

		if (job.results) {
			job.results.push(...results);
		}
	}

	private async executeOperationWithRetry(
		connection: Database | null,
		operation: BatchOperation,
		retryAttempts: number,
		retryDelay: number,
	): Promise<any> {
		let lastError: Error | null = null;

		for (let attempt = 0; attempt <= retryAttempts; attempt++) {
			try {
				if (connection) {
					return await databaseService['runQuery'](
						connection,
						operation.query,
						operation.parameters || [],
					);
				} else {
					return await databaseService.execute(operation.query, operation.parameters || []);
				}
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));

				// Don't retry on certain errors
				if (this.isNonRetryableError(lastError)) {
					break;
				}

				// Wait before retry
				if (attempt < retryAttempts) {
					await new Promise((resolve) => setTimeout(resolve, retryDelay * 2 ** attempt));
				}
			}
		}

		throw lastError || new Error('Operation failed after retries');
	}

	private isNonRetryableError(error: Error): boolean {
		const nonRetryablePatterns = [
			/UNIQUE constraint failed/,
			/FOREIGN KEY constraint failed/,
			/NOT NULL constraint failed/,
			/CHECK constraint failed/,
			/no such table/,
			/no such column/,
			/syntax error/,
		];

		return nonRetryablePatterns.some((pattern) => pattern.test(error.message));
	}

	private async invalidateBatchCache(operations: BatchOperation[]): Promise<void> {
		const affectedTables = new Set<string>();

		for (const operation of operations) {
			const table = this.extractTableFromQuery(operation.query);
			const queryType = this.extractQueryType(operation.query);

			if (queryType !== 'SELECT') {
				affectedTables.add(table);
			}
		}

		// Invalidate database cache
		for (const table of affectedTables) {
			await cacheService.invalidatePattern(`query:*:*${table}*`, 'database-cache');
		}

		// Invalidate RAG cache if documents were modified
		if (affectedTables.has('rag_documents') || affectedTables.has('rag_document_chunks')) {
			await ragCacheService.invalidate('*'); // Invalidate all RAG cache
		}

		this.stats.cacheInvalidations += affectedTables.size;
	}

	private extractTableFromQuery(query: string): string {
		const tableMatch = query.match(/(?:FROM|INTO|UPDATE)\s+([a-z_][a-z0-9_]*)/i);
		return tableMatch ? tableMatch[1].toLowerCase() : 'unknown';
	}

	private extractQueryType(query: string): string {
		const upperQuery = query.trim().toUpperCase();
		if (upperQuery.startsWith('SELECT')) return 'SELECT';
		if (upperQuery.startsWith('INSERT')) return 'INSERT';
		if (upperQuery.startsWith('UPDATE')) return 'UPDATE';
		if (upperQuery.startsWith('DELETE')) return 'DELETE';
		return 'UNKNOWN';
	}

	private updateJobStats(jobTime: number): void {
		this.jobTimes.push(jobTime);
		if (this.jobTimes.length > 100) {
			this.jobTimes = this.jobTimes.slice(-100);
		}

		this.stats.averageJobTime =
			this.jobTimes.reduce((sum, time) => sum + time, 0) / this.jobTimes.length;

		// Calculate operations per second
		const totalOperations = Array.from(this.jobs.values())
			.filter((job) => job.status === 'completed')
			.reduce((sum, job) => sum + job.totalOperations, 0);

		const totalTime = Array.from(this.jobs.values())
			.filter((job) => job.status === 'completed' && job.startTime && job.endTime)
			.reduce((sum, job) => sum + (job.endTime!.getTime() - job.startTime!.getTime()), 0);

		if (totalTime > 0) {
			this.stats.operationsPerSecond = (totalOperations * 1000) / totalTime;
		}
	}

	private startCleanupInterval(): void {
		// Clean up completed jobs every hour
		this.cleanupInterval = setInterval(() => {
			this.cleanupCompletedJobs();
		}, 3600000);
	}

	private cleanupCompletedJobs(): void {
		const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

		for (const [jobId, job] of this.jobs) {
			if (job.status === 'completed' && job.endTime && job.endTime < cutoffTime) {
				this.jobs.delete(jobId);
			}
		}
	}

	// Public API methods
	public getJob(jobId: string): BatchJob | undefined {
		return this.jobs.get(jobId);
	}

	public getJobs(filter?: {
		status?: BatchJob['status'];
		name?: string;
		startDate?: Date;
		endDate?: Date;
	}): BatchJob[] {
		let jobs = Array.from(this.jobs.values());

		if (filter) {
			if (filter.status) {
				jobs = jobs.filter((job) => job.status === filter.status);
			}
			if (filter.name) {
				jobs = jobs.filter((job) => job.name.includes(filter.name as string));
			}
			if (filter.startDate) {
				jobs = jobs.filter((job) => job.startTime && job.startTime >= filter.startDate!);
			}
			if (filter.endDate) {
				jobs = jobs.filter((job) => job.startTime && job.startTime <= filter.endDate!);
			}
		}

		return jobs.sort((a, b) => {
			const timeA = a.startTime?.getTime() || 0;
			const timeB = b.startTime?.getTime() || 0;
			return timeB - timeA; // Most recent first
		});
	}

	public cancelJob(jobId: string): boolean {
		const job = this.jobs.get(jobId);
		if (job && job.status === 'running') {
			job.status = 'cancelled';
			job.endTime = new Date();
			this.activeJobs.delete(jobId);
			return true;
		}
		return false;
	}

	public getStats(): BatchStats {
		return { ...this.stats };
	}

	public resetStats(): void {
		this.stats = {
			totalJobs: 0,
			completedJobs: 0,
			failedJobs: 0,
			averageJobTime: 0,
			totalOperations: 0,
			operationsPerSecond: 0,
			cacheInvalidations: 0,
			transactionCommits: 0,
			transactionRollbacks: 0,
		};
		this.jobTimes = [];
	}

	// Convenience methods for common batch operations
	public async bulkInsert(
		table: string,
		records: Record<string, any>[],
		options: BatchOptions = {},
	): Promise<BatchJob> {
		const operations: BatchOperation[] = records.map((record) => {
			const { query, parameters } = databaseService.buildInsertQuery(table, record);
			return { query, parameters };
		});

		const job = this.createJob(`Bulk insert into ${table}`, operations, options);
		return await this.executeJob(job.id, options);
	}

	public async bulkUpdate(
		table: string,
		updates: Array<{
			data: Record<string, any>;
			where: Record<string, any>;
		}>,
		options: BatchOptions = {},
	): Promise<BatchJob> {
		const operations: BatchOperation[] = updates.map((update) => {
			const { query, parameters } = databaseService.buildUpdateQuery(
				table,
				update.data,
				update.where,
			);
			return { query, parameters };
		});

		const job = this.createJob(`Bulk update in ${table}`, operations, options);
		return await this.executeJob(job.id, options);
	}

	public async bulkDelete(
		table: string,
		conditions: Array<Record<string, any>>,
		options: BatchOptions = {},
	): Promise<BatchJob> {
		const operations: BatchOperation[] = conditions.map((where) => {
			const whereClause = Object.entries(where)
				.map(([key, value]) => `${key} = ?`)
				.join(' AND ');
			const query = `DELETE FROM ${table} WHERE ${whereClause}`;
			const parameters = Object.values(where);
			return { query, parameters };
		});

		const job = this.createJob(`Bulk delete from ${table}`, operations, options);
		return await this.executeJob(job.id, options);
	}

	// Advanced batch operations for RAG processing
	public async bulkDocumentIndexing(
		documents: Array<{
			id: string;
			content: string;
			metadata: Record<string, any>;
			chunks: Array<{
				content: string;
				chunkIndex: number;
				metadata: Record<string, any>;
			}>;
		}>,
		options: BatchOptions = {},
	): Promise<BatchJob> {
		const operations: BatchOperation[] = [];

		for (const document of documents) {
			// Insert document
			const docQuery = `
				INSERT OR REPLACE INTO rag_documents
				(id, user_id, filename, original_name, mime_type, size, total_chunks, processed, processing_status, metadata, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`;
			const docParams = [
				document.id,
				document.metadata.userId || 'system',
				document.metadata.filename || 'unknown',
				document.metadata.originalName || 'unknown',
				document.metadata.mimeType || 'text/plain',
				document.content.length,
				document.chunks.length,
				document.chunks.length,
				'completed',
				JSON.stringify(document.metadata),
				new Date().toISOString(),
				new Date().toISOString(),
			];
			operations.push({ query: docQuery, parameters: docParams });

			// Insert chunks
			for (const chunk of document.chunks) {
				const chunkQuery = `
					INSERT OR REPLACE INTO rag_document_chunks
					(id, document_id, content, chunk_index, start_page, end_page, token_count, metadata, created_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
				`;
				const chunkParams = [
					randomUUID(),
					document.id,
					chunk.content,
					chunk.chunkIndex,
					chunk.metadata.startPage,
					chunk.metadata.endPage,
					chunk.content.split(' ').length, // Simple token count
					JSON.stringify(chunk.metadata),
					new Date().toISOString(),
				];
				operations.push({ query: chunkQuery, parameters: chunkParams });
			}
		}

		const job = this.createJob('Bulk document indexing', operations, {
			...options,
			batchSize: 50, // Smaller batches for large documents
			transactionSize: 100, // Transaction per document
		});

		return await this.executeJob(job.id, options);
	}

	public async close(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}

		// Cancel all running jobs
		for (const jobId of this.activeJobs) {
			this.cancelJob(jobId);
		}
	}
}

// Export singleton instance
export const batchService = BatchService.getInstance();

// Export types and utilities
export type { BatchJob, BatchOptions, BatchStats };
export const createBatchJob = (
	name: string,
	operations: BatchOperation[],
	options?: BatchOptions,
): BatchJob => batchService.createJob(name, operations, options);
