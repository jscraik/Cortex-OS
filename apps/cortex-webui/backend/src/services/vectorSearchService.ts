import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import type {
	MultimodalChunk,
	MultimodalDocument,
	RagDocument,
	RagDocumentChunk,
} from '../db/schema.js';
import {
	multimodalChunks,
	multimodalDocuments,
	ragDocumentChunks,
	ragDocuments,
} from '../db/schema.js';
import type {
	MultimodalCitation,
	MultimodalPreview,
	MultimodalSearchRequest,
	MultimodalSearchResult,
} from '../types/multimodal.js';
import type { Citation, SearchRequest, SearchResponse, VectorSearchResult } from '../types/rag.js';
import logger from '../utils/logger.js';
import { embeddingService } from './embeddingService.js';

/**
 * Vector Search Service for RAG system
 * Handles semantic search with citation tracking
 */
export class VectorSearchService {
	private readonly embeddingService = embeddingService;

	/**
	 * Index documents for search
	 */
	async indexDocuments(chunks: Array<RagDocumentChunk & { document: RagDocument }>): Promise<void> {
		logger.info('vector:index_start', {
			chunkCount: chunks.length,
			brand: 'brAInwav',
		});

		try {
			// Generate embeddings for all chunks
			const texts = chunks.map((chunk) => chunk.content);
			const embeddings = await this.embeddingService.generateEmbeddings(texts);

			// Update chunks with embeddings
			for (let i = 0; i < chunks.length; i++) {
				const chunk = chunks[i];
				const embedding = embeddings[i];

				await db
					.update(ragDocumentChunks)
					.set({
						embedding: JSON.stringify(embedding),
					})
					.where(eq(ragDocumentChunks.id, chunk.id));

				logger.debug('vector:chunk_indexed', {
					chunkId: chunk.id,
					documentId: chunk.documentId,
					chunkIndex: chunk.chunkIndex,
				});
			}

			logger.info('vector:index_complete', {
				chunkCount: chunks.length,
				brand: 'brAInwav',
			});
		} catch (error) {
			logger.error('vector:index_failed', {
				chunkCount: chunks.length,
				error: error instanceof Error ? error.message : 'Unknown error',
				brand: 'brAInwav',
			});
			throw error;
		}
	}

	/**
	 * Search documents semantically with citations
	 */
	async search(request: SearchRequest, userId: string): Promise<SearchResponse> {
		const startTime = Date.now();

		logger.info('vector:search_start', {
			query: request.query,
			limit: request.limit || 10,
			userId,
			brand: 'brAInwav',
		});

		try {
			const limit = Math.min(request.limit || 10, 50); // Cap at 50 results
			const minScore = request.minScore || 0.7;

			// Generate query embedding
			const queryEmbedding = await this.embeddingService.generateEmbedding(request.query);

			// Search for similar chunks
			const similarChunks = await this.findSimilarChunks(queryEmbedding, userId, limit * 2); // Get more for filtering

			// Filter and format results
			const results: VectorSearchResult[] = [];

			for (const chunk of similarChunks) {
				// Calculate similarity score
				const chunkEmbedding = JSON.parse(chunk.embedding || '[]');
				const similarity = this.calculateCosineSimilarity(queryEmbedding, chunkEmbedding);

				if (similarity >= minScore) {
					// Filter by document IDs if specified
					if (request.documentIds && !request.documentIds.includes(chunk.documentId)) {
						continue;
					}

					const result = await this.formatSearchResult(chunk, similarity);
					results.push(result);
				}
			}

			// Sort by similarity score and limit results
			results.sort((a, b) => b.score - a.score);
			const finalResults = results.slice(0, limit);

			const processingTime = Date.now() - startTime;

			logger.info('vector:search_complete', {
				query: request.query,
				resultsFound: finalResults.length,
				totalCandidates: similarChunks.length,
				processingTime,
				userId,
				brand: 'brAInwav',
			});

			return {
				results: finalResults,
				total: finalResults.length,
				query: request.query,
				processingTime,
			};
		} catch (error) {
			logger.error('vector:search_failed', {
				query: request.query,
				error: error instanceof Error ? error.message : 'Unknown error',
				userId,
				brand: 'brAInwav',
			});

			const processingTime = Date.now() - startTime;

			return {
				results: [],
				total: 0,
				query: request.query,
				processingTime,
			};
		}
	}

	/**
	 * Find similar chunks using SQL FTS as fallback
	 */
	private async findSimilarChunks(
		queryEmbedding: number[],
		userId: string,
		limit: number,
	): Promise<Array<RagDocumentChunk & { document: RagDocument }>> {
		// For SQLite, we'll use text search as a base filtering mechanism
		// then apply vector similarity filtering in application code

		// Extract keywords from query for text search
		const keywords = this.extractKeywords(queryEmbedding);

		const queryBuilder = db
			.select({
				id: ragDocumentChunks.id,
				documentId: ragDocumentChunks.documentId,
				content: ragDocumentChunks.content,
				chunkIndex: ragDocumentChunks.chunkIndex,
				startPage: ragDocumentChunks.startPage,
				endPage: ragDocumentChunks.endPage,
				tokenCount: ragDocumentChunks.tokenCount,
				embedding: ragDocumentChunks.embedding,
				metadata: ragDocumentChunks.metadata,
				createdAt: ragDocumentChunks.createdAt,
				document: {
					id: ragDocuments.id,
					userId: ragDocuments.userId,
					filename: ragDocuments.filename,
					originalName: ragDocuments.originalName,
					mimeType: ragDocuments.mimeType,
					size: ragDocuments.size,
					totalChunks: ragDocuments.totalChunks,
					processed: ragDocuments.processed,
					processingStatus: ragDocuments.processingStatus,
					processingError: ragDocuments.processingError,
					metadata: ragDocuments.metadata,
					createdAt: ragDocuments.createdAt,
					updatedAt: ragDocuments.updatedAt,
				},
			})
			.from(ragDocumentChunks)
			.innerJoin(ragDocuments, eq(ragDocumentChunks.documentId, ragDocuments.id))
			.where(
				and(
					eq(ragDocuments.userId, userId),
					eq(ragDocuments.processed, true),
					sql`LENGTH(${ragDocumentChunks.embedding}) > 0`,
				),
			)
			.limit(limit);

		// Add text search conditions if keywords are available
		if (keywords.length > 0) {
			const searchConditions = keywords.map(
				(keyword) => sql`LOWER(${ragDocumentChunks.content}) LIKE LOWER(${`%${keyword}%`})`,
			);
			queryBuilder.where(
				and(
					eq(ragDocuments.userId, userId),
					eq(ragDocuments.processed, true),
					sql`LENGTH(${ragDocumentChunks.embedding}) > 0`,
					sql`(${sql.join(searchConditions, sql` OR `)})`,
				),
			);
		}

		return (await queryBuilder.execute()) as Array<RagDocumentChunk & { document: RagDocument }>;
	}

	/**
	 * Format search result with citations
	 */
	private async formatSearchResult(
		chunk: RagDocumentChunk & { document: RagDocument },
		similarity: number,
	): Promise<VectorSearchResult> {
		const citation: Citation = {
			documentId: chunk.documentId,
			documentName: chunk.document.originalName,
			filename: chunk.document.filename,
			page: chunk.startPage ?? undefined,
			text: chunk.content,
			score: similarity,
			startChar: chunk.metadata ? JSON.parse(chunk.metadata).startChar : undefined,
			endChar: chunk.metadata ? JSON.parse(chunk.metadata).endChar : undefined,
		};

		return {
			id: chunk.id,
			documentId: chunk.documentId,
			filename: chunk.document.filename,
			content: chunk.content,
			score: similarity,
			chunkIndex: chunk.chunkIndex,
			startPage: chunk.startPage ?? undefined,
			endPage: chunk.endPage ?? undefined,
			citations: [citation],
			metadata: chunk.metadata ? JSON.parse(chunk.metadata) : undefined,
		};
	}

	/**
	 * Calculate cosine similarity between two vectors
	 */
	private calculateCosineSimilarity(vector1: number[], vector2: number[]): number {
		if (vector1.length !== vector2.length) {
			return 0;
		}

		const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
		const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
		const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));

		if (magnitude1 === 0 || magnitude2 === 0) {
			return 0;
		}

		return dotProduct / (magnitude1 * magnitude2);
	}

	/**
	 * Extract keywords from embedding for text search
	 */
	private extractKeywords(_embedding: number[]): string[] {
		// For now, return empty array - in a real implementation,
		// you could use the embedding to identify important terms
		// or have a separate keyword extraction process
		return [];
	}

	/**
	 * Delete document from search index
	 */
	async deleteDocument(documentId: string): Promise<void> {
		logger.info('vector:delete_document', {
			documentId,
			brand: 'brAInwav',
		});

		try {
			// Chunks will be automatically deleted due to CASCADE constraint
			await db.delete(ragDocuments).where(eq(ragDocuments.id, documentId));

			logger.info('vector:delete_document_complete', {
				documentId,
				brand: 'brAInwav',
			});
		} catch (error) {
			logger.error('vector:delete_document_failed', {
				documentId,
				error: error instanceof Error ? error.message : 'Unknown error',
				brand: 'brAInwav',
			});
			throw error;
		}
	}

	/**
	 * Get document by ID with chunks
	 */
	async getDocument(
		documentId: string,
		userId: string,
	): Promise<(RagDocument & { chunks: RagDocumentChunk[] }) | null> {
		try {
			const document = await db
				.select()
				.from(ragDocuments)
				.where(and(eq(ragDocuments.id, documentId), eq(ragDocuments.userId, userId)))
				.limit(1);

			if (document.length === 0) {
				return null;
			}

			const chunks = await db
				.select()
				.from(ragDocumentChunks)
				.where(eq(ragDocumentChunks.documentId, documentId))
				.orderBy(ragDocumentChunks.chunkIndex);

			return {
				...document[0],
				chunks,
			};
		} catch (error) {
			logger.error('vector:get_document_failed', {
				documentId,
				error: error instanceof Error ? error.message : 'Unknown error',
				brand: 'brAInwav',
			});
			return null;
		}
	}

	/**
	 * List user documents
	 */
	async listUserDocuments(userId: string): Promise<RagDocument[]> {
		try {
			return await db
				.select()
				.from(ragDocuments)
				.where(eq(ragDocuments.userId, userId))
				.orderBy(desc(ragDocuments.createdAt));
		} catch (error) {
			logger.error('vector:list_documents_failed', {
				userId,
				error: error instanceof Error ? error.message : 'Unknown error',
				brand: 'brAInwav',
			});
			return [];
		}
	}

	/**
	 * Get search statistics
	 */
	async getSearchStats(userId: string): Promise<{
		totalDocuments: number;
		totalChunks: number;
		processedDocuments: number;
		indexedChunks: number;
	}> {
		try {
			// Get document counts
			const documentStats = await db
				.select({
					total: sql<number>`COUNT(*)`,
					processed: sql<number>`SUM(CASE WHEN processed = 1 THEN 1 ELSE 0 END)`,
				})
				.from(ragDocuments)
				.where(eq(ragDocuments.userId, userId));

			// Get chunk counts
			const chunkStats = await db
				.select({
					total: sql<number>`COUNT(*)`,
					indexed: sql<number>`SUM(CASE WHEN LENGTH(embedding) > 0 THEN 1 ELSE 0 END)`,
				})
				.from(ragDocumentChunks)
				.innerJoin(ragDocuments, eq(ragDocumentChunks.documentId, ragDocuments.id))
				.where(eq(ragDocuments.userId, userId));

			const docStats = documentStats[0];
			const cStats = chunkStats[0];

			return {
				totalDocuments: docStats.total || 0,
				totalChunks: cStats.total || 0,
				processedDocuments: docStats.processed || 0,
				indexedChunks: cStats.indexed || 0,
			};
		} catch (error) {
			logger.error('vector:get_stats_failed', {
				userId,
				error: error instanceof Error ? error.message : 'Unknown error',
				brand: 'brAInwav',
			});

			return {
				totalDocuments: 0,
				totalChunks: 0,
				processedDocuments: 0,
				indexedChunks: 0,
			};
		}
	}

	// ===== MULTIMODAL SEARCH METHODS =====

	/**
	 * Index multimodal documents for search
	 */
	async indexMultimodalDocuments(
		chunks: Array<MultimodalChunk & { document: MultimodalDocument }>,
	): Promise<void> {
		logger.info('vector:multimodal_index_start', {
			chunkCount: chunks.length,
			brand: 'brAInwav',
		});

		try {
			// Generate embeddings for all chunks
			const texts = chunks.map((chunk) => chunk.content);
			const embeddings = await this.embeddingService.generateEmbeddings(texts);

			// Update chunks with embeddings
			for (let i = 0; i < chunks.length; i++) {
				const chunk = chunks[i];
				const embedding = embeddings[i];

				await db
					.update(multimodalChunks)
					.set({
						embedding: JSON.stringify(embedding),
					})
					.where(eq(multimodalChunks.id, chunk.id));

				logger.debug('vector:multimodal_chunk_indexed', {
					chunkId: chunk.id,
					documentId: chunk.documentId,
					modality: chunk.modality,
					chunkIndex: chunk.chunkIndex,
				});
			}

			logger.info('vector:multimodal_index_complete', {
				chunkCount: chunks.length,
				brand: 'brAInwav',
			});
		} catch (error) {
			logger.error('vector:multimodal_index_failed', {
				chunkCount: chunks.length,
				error: error instanceof Error ? error.message : 'Unknown error',
				brand: 'brAInwav',
			});
			throw error;
		}
	}

	/**
	 * Search across multimodal content
	 */
	async searchMultimodal(
		request: MultimodalSearchRequest,
		userId: string,
	): Promise<{
		results: MultimodalSearchResult[];
		total: number;
		query: string;
		processingTime: number;
		filters: MultimodalSearchRequest['filters'];
		modalities?: string[];
	}> {
		const startTime = Date.now();

		try {
			logger.info('vector:multimodal_search_start', {
				query: request.query,
				userId,
				modalities: request.modalities,
				limit: request.limit,
				brand: 'brAInwav',
			});

			// Generate query embedding
			const queryEmbedding = await this.embeddingService.generateEmbedding(request.query);

			// Get relevant chunks based on filters
			const candidateChunks = await this.getMultimodalCandidateChunks(request, userId);

			// Calculate similarities and rank results
			const searchResults: MultimodalSearchResult[] = [];

			for (const chunk of candidateChunks) {
				if (!chunk.embedding) {
					continue;
				}

				const chunkEmbedding = JSON.parse(chunk.embedding);
				const similarity = this.calculateCosineSimilarity(queryEmbedding, chunkEmbedding);

				// Apply minimum score filter
				if (request.minScore && similarity < request.minScore) {
					continue;
				}

				const result = await this.formatMultimodalSearchResult(
					chunk,
					similarity,
					!!request.includeContent,
				);
				searchResults.push(result);
			}

			// Sort by similarity and apply limit
			searchResults.sort((a, b) => b.score - a.score);
			const limitedResults = searchResults.slice(0, request.limit || 20);

			const processingTime = Date.now() - startTime;

			const response: {
				results: MultimodalSearchResult[];
				total: number;
				query: string;
				processingTime: number;
				filters: MultimodalSearchRequest['filters'];
				modalities?: string[];
			} = {
				results: limitedResults,
				total: searchResults.length,
				query: request.query,
				processingTime,
				filters: request.filters,
				modalities: request.modalities,
			};

			logger.info('vector:multimodal_search_complete', {
				query: request.query,
				resultsFound: limitedResults.length,
				totalCandidates: candidateChunks.length,
				processingTime,
				brand: 'brAInwav',
			});

			return response;
		} catch (error) {
			logger.error('vector:multimodal_search_failed', {
				query: request.query,
				userId,
				error: error instanceof Error ? error.message : 'Unknown error',
				brand: 'brAInwav',
			});

			throw error;
		}
	}

	/**
	 * Get candidate chunks for multimodal search based on filters
	 */
	private async getMultimodalCandidateChunks(
		request: MultimodalSearchRequest,
		userId: string,
	): Promise<
		Array<
			MultimodalChunk &
				Pick<
					MultimodalDocument,
					| 'filename'
					| 'originalName'
					| 'mimeType'
					| 'size'
					| 'processed'
					| 'processingStatus'
					| 'processingError'
					| 'metadata'
					| 'createdAt'
					| 'updatedAt'
				>
		>
	> {
		// Start with base query
		let queryBuilder = db
			.select({
				// Multimodal chunk fields
				id: multimodalChunks.id,
				documentId: multimodalChunks.documentId,
				content: multimodalChunks.content,
				chunkIndex: multimodalChunks.chunkIndex,
				modality: multimodalChunks.modality,
				startPage: multimodalChunks.startPage,
				endPage: multimodalChunks.endPage,
				startTime: multimodalChunks.startTime,
				endTime: multimodalChunks.endTime,
				tokenCount: multimodalChunks.tokenCount,
				embedding: multimodalChunks.embedding,
				metadata: multimodalChunks.metadata,
				createdAt: multimodalChunks.createdAt,
				updatedAt: multimodalChunks.updatedAt,

				// Document fields
				filename: multimodalDocuments.filename,
				originalName: multimodalDocuments.originalName,
				mimeType: multimodalDocuments.mimeType,
				size: multimodalDocuments.size,
				processed: multimodalDocuments.processed,
				processingStatus: multimodalDocuments.processingStatus,
				processingError: multimodalDocuments.processingError,
				documentMetadata: multimodalDocuments.metadata,
				documentCreatedAt: multimodalDocuments.createdAt,
				documentUpdatedAt: multimodalDocuments.updatedAt,
			})
			.from(multimodalChunks)
			.innerJoin(multimodalDocuments, eq(multimodalChunks.documentId, multimodalDocuments.id))
			.where(
				and(
					eq(multimodalDocuments.userId, userId),
					eq(multimodalDocuments.processed, true),
					sql`LENGTH(${multimodalChunks.embedding}) > 0`,
				),
			)
			.limit(request.limit || 100);

		// Apply modality filter
		type ChunkModality = 'text' | 'image' | 'audio_transcript' | 'video_frame' | 'pdf_page_image';
		let mappedModalities: ChunkModality[] | undefined;
		if (request.modalities && request.modalities.length > 0) {
			// Map external modalities to chunk modality values used in the DB
			const modalityMap: Record<string, ChunkModality> = {
				text: 'text',
				image: 'image',
				audio: 'audio_transcript',
				video: 'video_frame',
				pdf_with_images: 'pdf_page_image',
			};
			mappedModalities = request.modalities
				.map((m) => modalityMap[m])
				.filter((m): m is ChunkModality => !!m);
			queryBuilder = queryBuilder.where(
				and(
					eq(multimodalDocuments.userId, userId),
					eq(multimodalDocuments.processed, true),
					sql`LENGTH(${multimodalChunks.embedding}) > 0`,
					inArray(multimodalChunks.modality, mappedModalities),
				),
			);
		}

		// Apply document ID filter
		if (request.documentIds && request.documentIds.length > 0) {
			queryBuilder = queryBuilder.where(
				and(
					eq(multimodalDocuments.userId, userId),
					eq(multimodalDocuments.processed, true),
					sql`LENGTH(${multimodalChunks.embedding}) > 0`,
					inArray(multimodalChunks.documentId, request.documentIds),
				),
			);
		}

		// Apply additional filters
		if (request.filters) {
			const filterConditions = [];

			if (request.filters.mimeType && request.filters.mimeType.length > 0) {
				filterConditions.push(inArray(multimodalDocuments.mimeType, request.filters.mimeType));
			}

			if (request.filters.dateRange) {
				filterConditions.push(
					sql`${multimodalDocuments.createdAt} >= ${request.filters.dateRange.start.getTime()} AND ${multimodalDocuments.createdAt} <= ${request.filters.dateRange.end.getTime()}`,
				);
			}

			// Add modality-specific filters
			if (request.filters.minDuration || request.filters.maxDuration) {
				// Filter by audio duration
				if (request.filters.minDuration) {
					filterConditions.push(
						sql`CAST(${multimodalChunks.endTime} AS INTEGER) - CAST(${multimodalChunks.startTime} AS INTEGER) >= ${request.filters.minDuration}`,
					);
				}
				if (request.filters.maxDuration) {
					filterConditions.push(
						sql`CAST(${multimodalChunks.endTime} AS INTEGER) - CAST(${multimodalChunks.startTime} AS INTEGER) <= ${request.filters.maxDuration}`,
					);
				}
			}

			if (filterConditions.length > 0) {
				const baseCondition =
					request.modalities && request.modalities.length > 0
						? and(
								eq(multimodalDocuments.userId, userId),
								eq(multimodalDocuments.processed, true),
								sql`LENGTH(${multimodalChunks.embedding}) > 0`,
								inArray(multimodalChunks.modality, mappedModalities ?? []),
								...filterConditions,
							)
						: and(
								eq(multimodalDocuments.userId, userId),
								eq(multimodalDocuments.processed, true),
								sql`LENGTH(${multimodalChunks.embedding}) > 0`,
								...filterConditions,
							);

				queryBuilder = queryBuilder.where(baseCondition);
			}
		}

		return (await queryBuilder.execute()) as Array<
			MultimodalChunk &
				Pick<
					MultimodalDocument,
					| 'filename'
					| 'originalName'
					| 'mimeType'
					| 'size'
					| 'processed'
					| 'processingStatus'
					| 'processingError'
					| 'metadata'
					| 'createdAt'
					| 'updatedAt'
				>
		>;
	}

	/**
	 * Format multimodal search result with citations
	 */
	private async formatMultimodalSearchResult(
		chunk: MultimodalChunk &
			Pick<
				MultimodalDocument,
				| 'filename'
				| 'originalName'
				| 'mimeType'
				| 'size'
				| 'processed'
				| 'processingStatus'
				| 'processingError'
				| 'metadata'
				| 'createdAt'
				| 'updatedAt'
			>,
		similarity: number,
		includeContent: boolean,
	): Promise<MultimodalSearchResult> {
		const citation: MultimodalCitation = {
			documentId: chunk.documentId,
			documentName: chunk.originalName,
			filename: chunk.filename,
			modality: chunk.modality,
			page: chunk.startPage ?? undefined,
			timestamp: chunk.startTime ?? undefined,
			text: chunk.content,
			score: similarity,
		};

		// Add modality-specific information
		let preview: MultimodalPreview;
		switch (chunk.modality) {
			case 'image':
			// fallthrough: same handling as pdf_page_image
			case 'pdf_page_image':
				preview = {
					type: 'image' as const,
					content: chunk.content,
				};
				break;
			case 'audio_transcript':
				preview = {
					type: 'audio_waveform' as const,
					content: chunk.content,
					duration: chunk.endTime && chunk.startTime ? chunk.endTime - chunk.startTime : undefined,
					timestamp: chunk.startTime ?? undefined,
				};
				break;
			default:
				preview = {
					type: 'text' as const,
					content: chunk.content.substring(0, 200) + (chunk.content.length > 200 ? '...' : ''),
				};
		}

		let contentForResult = chunk.content;
		if (!includeContent) {
			const truncated = chunk.content.substring(0, 500);
			contentForResult = truncated + (chunk.content.length > 500 ? '...' : '');
		}

		return {
			id: chunk.id,
			documentId: chunk.documentId,
			filename: chunk.filename,
			modality: chunk.modality,
			content: contentForResult,
			score: similarity,
			chunkIndex: chunk.chunkIndex,
			startPage: chunk.startPage ?? undefined,
			endPage: chunk.endPage ?? undefined,
			startTime: chunk.startTime ?? undefined,
			endTime: chunk.endTime ?? undefined,
			citations: [citation],
			metadata: chunk.metadata ? JSON.parse(chunk.metadata) : undefined,
			preview,
		};
	}

	/**
	 * Delete multimodal document from search index
	 */
	async deleteMultimodalDocument(documentId: string): Promise<void> {
		logger.info('vector:multimodal_delete_document', {
			documentId,
			brand: 'brAInwav',
		});

		try {
			// Chunks will be automatically deleted due to CASCADE constraint
			await db.delete(multimodalDocuments).where(eq(multimodalDocuments.id, documentId));

			logger.info('vector:multimodal_delete_document_complete', {
				documentId,
				brand: 'brAInwav',
			});
		} catch (error) {
			logger.error('vector:multimodal_delete_document_failed', {
				documentId,
				error: error instanceof Error ? error.message : 'Unknown error',
				brand: 'brAInwav',
			});
			throw error;
		}
	}
}

// Export singleton instance
export const vectorSearchService = new VectorSearchService();
