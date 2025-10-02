import { randomUUID } from 'node:crypto';
import type { DocumentParseResult } from '../types/document.js';
import type {
	ChunkOptions,
	DocumentChunk,
	DocumentMetadata,
	DocumentProcessingError,
} from '../types/rag.js';
import logger from '../utils/logger.js';

/**
 * Document Processing Service for RAG system
 * Handles document parsing, chunking, and preparation for vector indexing
 */
export class DocumentProcessingService {
	private readonly defaultChunkOptions: ChunkOptions = {
		chunkSize: 1000,
		chunkOverlap: 200,
		maxChunkSize: 2000,
		minChunkSize: 200,
	};

	/**
	 * Process uploaded document and create chunks
	 */
	async processDocument(
		parseResult: DocumentParseResult,
		userId: string,
		options: Partial<ChunkOptions> = {},
	): Promise<{ chunks: DocumentChunk[]; metadata: DocumentMetadata }> {
		const chunkOptions = { ...this.defaultChunkOptions, ...options };

		try {
			logger.info('document:processing_start', {
				filename: parseResult.fileName,
				fileSize: parseResult.fileSize,
				userId,
				brand: 'brAInwav',
			});

			// Create chunks
			const chunks = this.chunkText(parseResult.text, chunkOptions);

			// Add document metadata to chunks
			const chunksWithMetadata = chunks.map((chunk, index) => ({
				...chunk,
				id: randomUUID(),
				metadata: {
					...chunk.metadata,
					chunkType: 'semantic' as const,
					documentTitle: parseResult.metadata?.title,
					documentAuthor: parseResult.metadata?.author,
					chunkIndex: index,
					totalChunks: chunks.length,
				},
			}));

			logger.info('document:processing_complete', {
				filename: parseResult.fileName,
				chunksCreated: chunksWithMetadata.length,
				userId,
				brand: 'brAInwav',
			});

			return {
				chunks: chunksWithMetadata,
				metadata: parseResult.metadata || {},
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			logger.error('document:processing_failed', {
				filename: parseResult.fileName,
				error: errorMessage,
				userId,
				brand: 'brAInwav',
			});

			throw this.createProcessingError(
				`Document processing failed: ${errorMessage}`,
				parseResult.fileName,
			);
		}
	}

	/**
	 * Split text into chunks with overlapping windows
	 */
	private chunkText(text: string, options: ChunkOptions): DocumentChunk[] {
		const _chunks: DocumentChunk[] = [];
		const { chunkSize, maxChunkSize, minChunkSize } = options;

		// Validate chunk size constraints
		if (chunkSize > maxChunkSize || chunkSize < minChunkSize) {
			throw new Error(
				`Chunk size ${chunkSize} is outside valid range (${minChunkSize}-${maxChunkSize})`,
			);
		}

		// Clean and normalize text
		const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

		// Try semantic chunking first (paragraph/sentence aware)
		const semanticChunks = this.chunkTextSemantically(cleanText, options);

		if (semanticChunks.length > 0) {
			return semanticChunks;
		}

		// Fallback to fixed-size chunking
		return this.chunkTextFixedSize(cleanText, options);
	}

	/**
	 * Semantic text chunking based on paragraphs and sentences
	 */
	private chunkTextSemantically(text: string, options: ChunkOptions): DocumentChunk[] {
		const chunks: DocumentChunk[] = [];
		const { chunkSize, chunkOverlap } = options;

		// Split into paragraphs first
		const paragraphs = text.split(/\n\s*\n/);

		let currentChunk = '';
		let currentStart = 0;
		let chunkIndex = 0;

		for (let i = 0; i < paragraphs.length; i++) {
			const paragraph = paragraphs[i].trim();
			if (!paragraph) continue;

			// Check if adding this paragraph would exceed chunk size
			const potentialChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;

			if (potentialChunk.length <= chunkSize || !currentChunk) {
				// Add paragraph to current chunk
				if (currentChunk) {
					currentChunk = potentialChunk;
				} else {
					currentChunk = paragraph;
					currentStart = text.indexOf(paragraph);
				}
			} else {
				// Save current chunk and start new one
				if (currentChunk) {
					chunks.push(
						this.createChunk(
							currentChunk,
							chunkIndex++,
							currentStart,
							currentStart + currentChunk.length,
						),
					);
				}

				// Start new chunk with overlap
				const overlapStart = Math.max(0, currentStart + currentChunk.length - chunkOverlap);
				const overlapText = text.substring(overlapStart, text.indexOf(paragraph));
				currentChunk = overlapText ? `${overlapText}\n\n${paragraph}` : paragraph;
				currentStart = overlapStart;
			}
		}

		// Add final chunk
		if (currentChunk) {
			chunks.push(
				this.createChunk(
					currentChunk,
					chunkIndex++,
					currentStart,
					currentStart + currentChunk.length,
				),
			);
		}

		return chunks;
	}

	/**
	 * Fixed-size text chunking as fallback
	 */
	private chunkTextFixedSize(text: string, options: ChunkOptions): DocumentChunk[] {
		const chunks: DocumentChunk[] = [];
		const { chunkSize, chunkOverlap } = options;

		for (let start = 0; start < text.length; start += chunkSize - chunkOverlap) {
			const end = Math.min(start + chunkSize, text.length);
			const chunkText = text.substring(start, end);

			chunks.push(this.createChunk(chunkText, chunks.length, start, end));

			// Break if we've reached the end
			if (end === text.length) break;
		}

		return chunks;
	}

	/**
	 * Create a document chunk object
	 */
	private createChunk(
		content: string,
		chunkIndex: number,
		startChar: number,
		endChar: number,
	): DocumentChunk {
		// Estimate page numbers (rough approximation)
		const charsPerPage = 2000; // Rough estimate
		const startPage = Math.floor(startChar / charsPerPage) + 1;
		const endPage = Math.floor(endChar / charsPerPage) + 1;

		// Count sentences
		const sentenceCount = (content.match(/[.!?]+/g) || []).length;

		// Count paragraphs
		const paragraphCount = (content.match(/\n\s*\n/g) || []).length + 1;

		return {
			id: '', // Will be set by caller
			documentId: '', // Will be set by caller
			content,
			chunkIndex,
			startPage,
			endPage,
			metadata: {
				startChar,
				endChar,
				sentenceCount,
				paragraphCount,
				chunkType: 'semantic',
			},
		};
	}

	/**
	 * Estimate token count for a text chunk
	 */
	estimateTokenCount(text: string): number {
		// Rough estimation: ~4 characters per token for English text
		return Math.ceil(text.length / 4);
	}

	/**
	 * Validate chunk quality
	 */
	validateChunk(chunk: DocumentChunk): boolean {
		const { content, metadata } = chunk;

		// Check minimum content length
		if (content.trim().length < 50) {
			return false;
		}

		// Check for meaningful content (not just whitespace/punctuation)
		const meaningfulChars = content.replace(/[^\w\s]/g, '').length;
		if (meaningfulChars < 20) {
			return false;
		}

		// Check metadata completeness
		if (!metadata || metadata.startChar === undefined || metadata.endChar === undefined) {
			return false;
		}

		return true;
	}

	/**
	 * Create standardized error object
	 */
	private createProcessingError(message: string, filename?: string): DocumentProcessingError {
		return {
			error: 'Document Processing Error',
			message,
			filename,
			brand: 'brAInwav',
		};
	}

	/**
	 * Get processing statistics
	 */
	getProcessingStats(chunks: DocumentChunk[]) {
		const totalTokens = chunks.reduce((sum, chunk) => sum + (chunk.tokenCount || 0), 0);
		const avgChunkSize =
			chunks.reduce((sum, chunk) => sum + chunk.content.length, 0) / chunks.length;

		return {
			totalChunks: chunks.length,
			totalTokens,
			averageChunkSize: Math.round(avgChunkSize),
			maxChunkSize: Math.max(...chunks.map((c) => c.content.length)),
			minChunkSize: Math.min(...chunks.map((c) => c.content.length)),
		};
	}
}

// Export singleton instance
export const documentProcessingService = new DocumentProcessingService();
