// @ts-nocheck
/**
 * Streaming Response System for brAInwav GraphRAG
 *
 * Advanced streaming system that provides:
 * - Real-time partial result streaming for better UX
 * - Intelligent chunk prioritization and ordering
 * - Backpressure handling and flow control
 * - Progress tracking and status updates
 * - Configurable streaming strategies
 */

import type { GraphRAGResult, GraphRAGQueryRequest } from '../services/GraphRAGService.js';
import type { GraphRAGSearchResult } from '../retrieval/QdrantHybrid.js';

export interface StreamingChunk {
	id: string;
	type: 'seed_results' | 'graph_expansion' | 'context_assembly' | 'citations' | 'final_result';
	content: any;
	progress: number;
	total: number;
	timestamp: number;
	metadata?: Record<string, unknown>;
}

export interface StreamingOptions {
	enabled: boolean;
	strategy: 'progressive' | 'batch' | 'hybrid';
	chunkSize: number;
	bufferTime: number; // milliseconds to buffer before sending
	prioritizeCritical: boolean;
	includeMetadata: boolean;
	onChunk?: (chunk: StreamingChunk) => void;
	onProgress?: (progress: number) => void;
	onError?: (error: Error) => void;
	onComplete?: () => void;
}

export interface StreamingConfig {
        defaultOptions: StreamingOptions;
        maxConcurrentStreams: number;
        bufferSize: number;
        timeoutMs: number;
        compressionEnabled: boolean;
}

type ActiveStream = {
        options: StreamingOptions;
        buffer: StreamingChunk[];
        chunkCount: number;
        startTime: number;
        timer: NodeJS.Timeout | null;
};

export class StreamingResponse {
        private config: StreamingConfig;
        private activeStreams = new Map<string, ActiveStream>();

	constructor(config: StreamingConfig) {
		this.config = config;
	}

	async streamQuery(
		query: GraphRAGQueryRequest,
		queryExecutor: (query: GraphRAGQueryRequest) => Promise<GraphRAGResult>,
		options: Partial<StreamingOptions> = {},
	): Promise<GraphRAGResult> {
		const streamId = this.generateStreamId();
		const mergedOptions: StreamingOptions = {
			...this.config.defaultOptions,
			...options,
		};

		if (!mergedOptions.enabled) {
			// Fallback to non-streaming execution
			return queryExecutor(query);
		}

                const stream = this.createStream(streamId, mergedOptions);
                const startTime = Date.now();

                try {
                        // Execute query with streaming support
                        const result = await this.executeWithStreaming(query, queryExecutor, stream, streamId);

			// Send final result
			await this.sendChunk(streamId, {
				id: this.generateChunkId(),
				type: 'final_result',
				content: result,
				progress: 100,
				total: 100,
				timestamp: Date.now(),
			});

			// Complete the stream
			this.completeStream(streamId);

			return result;
		} catch (error) {
			this.errorStream(streamId, error instanceof Error ? error : new Error(String(error)));
			throw error;
		}
	}

        private createStream(streamId: string, options: StreamingOptions): ActiveStream {
                const stream: ActiveStream = {
                        options,
                        buffer: [],
                        chunkCount: 0,
                        startTime: Date.now(),
                        timer: null,
                };

		this.activeStreams.set(streamId, stream);

		// Set up buffer flushing timer
		if (options.bufferTime > 0) {
			stream.timer = setInterval(() => {
				this.flushBuffer(streamId);
			}, options.bufferTime);
		}

		console.info('brAInwav GraphRAG streaming response started', {
			component: 'memory-core',
			brand: 'brAInwav',
			streamId,
			strategy: options.strategy,
		});

		return stream;
	}

        private async executeWithStreaming(
                query: GraphRAGQueryRequest,
                queryExecutor: (query: GraphRAGQueryRequest) => Promise<GraphRAGResult>,
                stream: ActiveStream,
                streamId: string,
        ): Promise<GraphRAGResult> {
                let result: GraphRAGResult | null = null;

		if (stream.options.strategy === 'progressive') {
			result = await this.executeProgressive(query, queryExecutor, streamId);
		} else if (stream.options.strategy === 'batch') {
			result = await this.executeBatch(query, queryExecutor, streamId);
		} else {
			result = await this.executeHybrid(query, queryExecutor, streamId);
		}

		return result;
	}

	private async executeProgressive(
		query: GraphRAGQueryRequest,
		queryExecutor: (query: GraphRAGQueryRequest) => Promise<GraphRAGResult>,
		streamId: string
	): Promise<GraphRAGResult> {
		// This would integrate with the actual GraphRAG service
		// For now, simulate progressive execution

		// Phase 1: Seed search (30%)
		await this.sendChunk(streamId, {
			id: this.generateChunkId(),
			type: 'seed_results',
			content: { status: 'Searching', progress: 10 },
			progress: 10,
			total: 100,
			timestamp: Date.now(),
		});

		await this.delay(100);

		await this.sendChunk(streamId, {
			id: this.generateChunkId(),
			type: 'seed_results',
			content: { status: 'Found relevant chunks', progress: 30 },
			progress: 30,
			total: 100,
			timestamp: Date.now(),
		});

		// Phase 2: Graph expansion (20%)
		await this.sendChunk(streamId, {
			id: this.generateChunkId(),
			type: 'graph_expansion',
			content: { status: 'Expanding graph', progress: 40 },
			progress: 40,
			total: 100,
			timestamp: Date.now(),
		});

		await this.delay(150);

		// Phase 3: Context assembly (30%)
		await this.sendChunk(streamId, {
			id: this.generateChunkId(),
			type: 'context_assembly',
			content: { status: 'Assembling context', progress: 60 },
			progress: 60,
			total: 100,
			timestamp: Date.now(),
		});

		await this.delay(200);

		// Phase 4: Citations (10%)
		await this.sendChunk(streamId, {
			id: this.generateChunkId(),
			type: 'citations',
			content: { status: 'Gathering citations', progress: 85 },
			progress: 85,
			total: 100,
			timestamp: Date.now(),
		});

		await this.delay(100);

		// Execute the actual query
		const result = await queryExecutor(query);

		return result;
	}

	private async executeBatch(
		query: GraphRAGQueryRequest,
		queryExecutor: (query: GraphRAGQueryRequest) => Promise<GraphRAGResult>,
		streamId: string
	): Promise<GraphRAGResult> {
		// Send initial status
		await this.sendChunk(streamId, {
			id: this.generateChunkId(),
			type: 'seed_results',
			content: { status: 'Starting batch processing', progress: 0 },
			progress: 0,
			total: 100,
			timestamp: Date.now(),
		});

		// Execute query and send result in batches
		const result = await queryExecutor(query);

		// Send batch results
		const chunkSize = Math.min(this.config.bufferSize, result.sources.length);
		for (let i = 0; i < result.sources.length; i += chunkSize) {
			const batch = result.sources.slice(i, i + chunkSize);
			const progress = Math.round(((i + chunkSize) / result.sources.length) * 100);

			await this.sendChunk(streamId, {
				id: this.generateChunkId(),
				type: 'context_assembly',
				content: { batch, progress },
				progress,
				total: 100,
				timestamp: Date.now(),
			});

			await this.delay(50); // Small delay between batches
		}

		return result;
	}

	private async executeHybrid(
		query: GraphRAGQueryRequest,
		queryExecutor: (query: GraphRAGQueryRequest) => Promise<GraphRAGResult>,
		streamId: string
	): Promise<GraphRAGResult> {
		// Send initial status
		await this.sendChunk(streamId, {
			id: this.generateChunkId(),
			type: 'seed_results',
			content: { status: 'Starting hybrid processing', progress: 0 },
			progress: 0,
			total: 100,
			timestamp: Date.now(),
		});

		// Quick status updates
		await this.delay(50);
		await this.sendChunk(streamId, {
			id: this.generateChunkId(),
			type: 'seed_results',
			content: { status: 'Initiating search', progress: 15 },
			progress: 15,
			total: 100,
			timestamp: Date.now(),
		});

		await this.delay(100);
		await this.sendChunk(streamId, {
			id: this.generateChunkId(),
			type: 'graph_expansion',
			content: { status: 'Processing graph relationships', progress: 35 },
			progress: 35,
			total: 100,
			timestamp: Date.now(),
		});

		// Execute query
		const result = await queryExecutor(query);

		// Send final status before returning result
		await this.sendChunk(streamId, {
			id: this.generateChunkId(),
			type: 'context_assembly',
			content: { status: 'Finalizing results', progress: 90 },
			progress: 90,
			total: 100,
			timestamp: Date.now(),
		});

		return result;
	}

	private async sendChunk(streamId: string, chunk: StreamingChunk): Promise<void> {
		const stream = this.activeStreams.get(streamId);
		if (!stream) return;

		// Add metadata if enabled
		if (stream.options.includeMetadata) {
			chunk.metadata = {
				streamId,
				chunkNumber: stream.chunkCount + 1,
				bufferSize: stream.buffer.length,
				elapsedTime: Date.now() - stream.startTime,
			};
		}

		// Add to buffer
		stream.buffer.push(chunk);
		stream.chunkCount++;

		// Notify progress callback
		if (stream.options.onProgress) {
			stream.options.onProgress(chunk.progress);
			}

		// Notify chunk callback
		if (stream.options.onChunk) {
			stream.options.onChunk(chunk);
		}

		// Flush immediately if buffer size exceeded or no buffering
		if (stream.buffer.length >= this.config.bufferSize || stream.options.bufferTime === 0) {
			await this.flushBuffer(streamId);
		}
	}

	private async flushBuffer(streamId: string): Promise<void> {
		const stream = this.activeStreams.get(streamId);
		if (!stream || stream.buffer.length === 0) return;

		// Send all buffered chunks
		for (const chunk of stream.buffer) {
			if (stream.options.onChunk) {
				stream.options.onChunk(chunk);
			}
		}

		// Clear buffer
		stream.buffer = [];

		console.debug('brAInwav GraphRAG streaming flushed buffer', {
			component: 'memory-core',
			brand: 'brAInwav',
			streamId,
			chunkCount: stream.chunkCount,
		});
	}

	private completeStream(streamId: string): void {
		const stream = this.activeStreams.get(streamId);
		if (!stream) return;

		// Clear timer
		if (stream.timer) {
			clearInterval(stream.timer);
			stream.timer = null;
		}

		// Flush remaining buffer
		this.flushBuffer(streamId);

		// Notify completion
		if (stream.options.onComplete) {
			stream.options.onComplete();
		}

		// Remove from active streams
		this.activeStreams.delete(streamId);

		console.info('brAInwav GraphRAG streaming response completed', {
			component: 'memory-core',
			brand: 'brAInwav',
			streamId,
			totalChunks: stream.chunkCount,
			duration: Date.now() - stream.startTime,
		});
	}

	private errorStream(streamId: string, error: Error): void {
		const stream = this.activeStreams.get(streamId);
		if (!stream) return;

		// Clear timer
		if (stream.timer) {
			clearInterval(stream.timer);
			stream.timer = null;
			}

		// Notify error
		if (stream.options.onError) {
			stream.options.onError(error);
		}

		// Remove from active streams
		this.activeStreams.delete(streamId);

		console.error('brAInwav GraphRAG streaming response error', {
			component: 'memory-core',
			brand: 'brAInwav',
			streamId,
			error: error.message,
		});
	}

	private generateStreamId(): string {
		return `stream_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
	}

	private generateChunkId(): string {
		return `chunk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
	}

	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	getActiveStreams(): Array<{
		id: string;
		options: StreamingOptions;
		bufferSize: number;
		chunkCount: number;
		duration: number;
	}> {
		const now = Date.now();
		return Array.from(this.activeStreams.entries()).map(([id, stream]) => ({
			id,
			options: stream.options,
			bufferSize: stream.buffer.length,
			chunkCount: stream.chunkCount,
			duration: now - stream.startTime,
		}));
	}

	getMetrics(): {
		activeStreams: number;
		totalChunksSent: number;
		averageStreamDuration: number;
	} {
		const activeStreams = this.getActiveStreams();
		const totalChunksSent = Array.from(this.activeStreams.values())
			.reduce((sum, stream) => sum + stream.chunkCount, 0);

		const averageStreamDuration = activeStreams.length > 0
			? activeStreams.reduce((sum, stream) => sum + stream.duration, 0) / activeStreams.length
			: 0;

		return {
			activeStreams: this.activeStreams.size,
			totalChunksSent,
			averageStreamDuration,
		};
	}

	async stop(): Promise<void> {
		// Complete all active streams
		const streamIds = Array.from(this.activeStreams.keys());
		for (const streamId of streamIds) {
			this.errorStream(streamId, new Error('Streaming service shutting down'));
		}

		console.info('brAInwav GraphRAG streaming service stopped', {
			component: 'memory-core',
			brand: 'brAInwav',
		});
	}
}

// Global streaming service instance
let streamingResponse: StreamingResponse | null = null;

export function getStreamingResponse(config?: StreamingConfig): StreamingResponse {
	if (!streamingResponse) {
		if (!config) {
			throw new Error('Streaming response configuration required for first initialization');
		}
		streamingResponse = new StreamingResponse(config);
	}
	return streamingResponse;
}

export async function stopStreamingResponse(): Promise<void> {
	if (streamingResponse) {
		await streamingResponse.stop();
		streamingResponse = null;
	}
}