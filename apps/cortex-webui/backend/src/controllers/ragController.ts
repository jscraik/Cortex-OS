import { randomUUID } from 'node:crypto';
import { promises as fs, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { and, eq } from 'drizzle-orm';
import type { Express, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { db } from '../db/index.js';
import { ragDocumentChunks, ragDocuments } from '../db/schema.js';
import { documentProcessingService } from '../services/documentProcessingService.js';
import { embeddingService } from '../services/embeddingService.js';
import { pdfWithImagesService } from '../services/pdfWithImagesService.js';
import { vectorSearchService } from '../services/vectorSearchService.js';
import type {
	DocumentProcessingError,
	RAGErrorResponse,
	RAGQueryResponse,
	SearchResponse,
	UploadResult,
} from '../types/rag.js';
import logger from '../utils/logger.js';

// File size limits (100MB for RAG documents)
const MAX_FILE_SIZE = 100 * 1024 * 1024;

const RAG_UPLOAD_DIR = join(tmpdir(), 'cortex-webui', 'rag');
mkdirSync(RAG_UPLOAD_DIR, { recursive: true });

const sanitizeFilename = (name: string): string => name.replace(/[^a-zA-Z0-9._-]/g, '_');

// Multer configuration for RAG document uploads (disk-based)
const storage = multer.diskStorage({
	destination: (_req, _file, cb) => cb(null, RAG_UPLOAD_DIR),
	filename: (_req, file, cb) => cb(null, `${Date.now()}-${sanitizeFilename(file.originalname)}`),
});
export const ragDocumentUploadMiddleware = multer({
	storage,
	limits: {
		fileSize: MAX_FILE_SIZE,
	},
	fileFilter: (_req, file, cb) => {
		const allowedMimes = [
			'application/pdf',
			'text/plain',
			'text/markdown',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
			'application/msword', // DOC
		];

		const allowedExtensions = ['.pdf', '.txt', '.md', '.markdown', '.docx', '.doc'];
		const extension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

		if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(extension)) {
			cb(null, true);
		} else {
			cb(new Error('Unsupported file type for RAG processing'));
		}
	},
});

// Validation schemas
const uploadDocumentSchema = z.object({
	options: z
		.object({
			chunkSize: z.number().min(100).max(4000).optional(),
			chunkOverlap: z.number().min(0).max(1000).optional(),
			embeddingModel: z.string().optional(),
		})
		.optional(),
});

const searchQuerySchema = z.object({
	query: z.string().min(1).max(1000),
	limit: z.number().min(1).max(50).optional(),
	minScore: z.number().min(0).max(1).optional(),
	documentIds: z.array(z.string()).optional(),
});

const ragQuerySchema = z.object({
	query: z.string().min(1).max(1000),
	documentIds: z.array(z.string()).optional(),
	maxContextLength: z.number().min(100).max(16000).optional(),
	maxChunks: z.number().min(1).max(20).optional(),
	includeCitations: z.boolean().optional(),
});

/**
 * Upload and index document for RAG
 */
export async function uploadRAGDocument(req: Request, res: Response) {
	const userId = req.user?.id;
	if (!userId) {
		return res.status(401).json(createErrorResponse('Authentication required'));
	}

	let filePath: string | undefined;

	try {
		// Validate request
		const validatedData = uploadDocumentSchema.parse(req.body);

		if (!req.file) {
			return res.status(400).json(createErrorResponse('No file provided'));
		}

		const file = req.file;
		filePath = (file as Express.Multer.File & { path?: string }).path;
		if (!filePath) {
			return res.status(500).json(createErrorResponse('Upload staging path unavailable'));
		}

		logger.info('rag:upload_start', {
			filename: file.originalname,
			fileSize: file.size,
			userId,
			brand: 'brAInwav',
		});

		let documentData: Record<string, unknown>;

		const fileSource = {
			path: filePath,
			size: file.size,
			mimeType: file.mimetype,
		};

		try {
			const fileName = file.originalname;
			const mimeType = file.mimetype;

			// Re-implement parsing logic from documentController
			if (mimeType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')) {
				const pdfResult = await pdfWithImagesService.processPdfWithImages(
					fileSource,
					file.originalname,
					{ enableOCR: false, enableVisionAnalysis: false },
				);

				documentData = {
					type: 'pdf',
					text: pdfResult.metadata.pages.map((page) => page.text ?? '').join('\n\n'),
					fileName,
					fileSize: file.size,
					pages: pdfResult.metadata.pages.length,
					metadata: {
						title: pdfResult.metadata.title,
						author: pdfResult.metadata.author,
						subject: pdfResult.metadata.subject,
						creator: pdfResult.metadata.creator,
						producer: pdfResult.metadata.producer,
						creationDate: pdfResult.metadata.creationDate,
						modDate: pdfResult.metadata.modificationDate,
					},
				};
			} else if (
				mimeType.startsWith('text/') ||
				fileName.toLowerCase().endsWith('.txt') ||
				fileName.toLowerCase().endsWith('.md') ||
				fileName.toLowerCase().endsWith('.markdown')
			) {
				const text = await fs.readFile(filePath, 'utf-8');
				const fileType =
					fileName.toLowerCase().endsWith('.md') || fileName.toLowerCase().endsWith('.markdown')
						? 'markdown'
						: 'text';
				documentData = {
					type: fileType,
					text,
					fileName,
					fileSize: file.size,
					metadata: {
						encoding: 'utf-8',
						lines: text.split('\n').length,
					},
				};
			} else {
				throw new Error('Unsupported file type for RAG processing');
			}
		} catch (parseError) {
			logger.error('rag:parse_failed', {
				filename: req.file?.originalname,
				error: parseError instanceof Error ? parseError.message : 'Unknown error',
				userId,
				brand: 'brAInwav',
			});

			return res.status(400).json({
				error: 'Document Parsing Failed',
				message: parseError instanceof Error ? parseError.message : 'Unknown error',
				filename: req.file?.originalname,
				brand: 'brAInwav',
			});
		}

		// Create document record
		const documentId = randomUUID();
		const documentRecord = {
			id: documentId,
			userId,
			filename: `${randomUUID()}_${req.file.originalname}`,
			originalName: req.file.originalname,
			mimeType: req.file.mimetype,
			size: req.file.size,
			totalChunks: 0, // Will be updated after processing
			processed: false,
			processingStatus: 'processing' as const,
			metadata: JSON.stringify(documentData.metadata || {}),
		};

		await db.insert(ragDocuments).values(documentRecord);

		// Process document and create chunks
		const { chunks, metadata: _metadata } = await documentProcessingService.processDocument(
			documentData,
			userId,
			validatedData.options,
		);

		// Save chunks to database
		const chunkRecords = chunks.map((chunk) => ({
			id: randomUUID(),
			documentId,
			content: chunk.content,
			chunkIndex: chunk.chunkIndex,
			startPage: chunk.startPage,
			endPage: chunk.endPage,
			tokenCount: documentProcessingService.estimateTokenCount(chunk.content),
			metadata: JSON.stringify(chunk.metadata),
		}));

		await db.insert(ragDocumentChunks).values(chunkRecords);

		// Generate embeddings for chunks
		const chunksWithEmbeddings = chunkRecords.map((chunk, index) => ({
			...chunk,
			...chunks[index],
			document: documentRecord,
		}));

		try {
			await vectorSearchService.indexDocuments(chunksWithEmbeddings);
		} catch (embeddingError) {
			logger.error('rag:embedding_failed', {
				documentId,
				error: embeddingError instanceof Error ? embeddingError.message : 'Unknown error',
				brand: 'brAInwav',
			});
			// Don't fail the upload, just mark as non-indexed
		}

		// Update document record
		await db
			.update(ragDocuments)
			.set({
				totalChunks: chunks.length,
				processed: true,
				processingStatus: 'completed',
				updatedAt: new Date(),
			})
			.where(eq(ragDocuments.id, documentId));

		const result: UploadResult = {
			documentId,
			filename: req.file.originalname,
			status: 'success',
			chunksCreated: chunks.length,
		};

		logger.info('rag:upload_complete', {
			documentId,
			filename: req.file.originalname,
			chunksCreated: chunks.length,
			userId,
			brand: 'brAInwav',
		});

		return res.json(result);
	} catch (error) {
		logger.error('rag:upload_failed', {
			filename: req.file?.originalname,
			error: error instanceof Error ? error.message : 'Unknown error',
			userId,
			brand: 'brAInwav',
		});

		const errorResponse: DocumentProcessingError = {
			error: 'Document Upload Failed',
			message: error instanceof Error ? error.message : 'Unknown error',
			filename: req.file?.originalname,
			brand: 'brAInwav',
		};

		return res.status(500).json(errorResponse);
	} finally {
		if (filePath) {
			await fs.unlink(filePath).catch(() => undefined);
		}
	}
}

/**
 * List RAG documents for user
 */
export async function listRAGDocuments(req: Request, res: Response) {
	const userId = req.user?.id;
	if (!userId) {
		return res.status(401).json(createErrorResponse('Authentication required'));
	}

	try {
		const documents = await vectorSearchService.listUserDocuments(userId);

		const formattedDocuments = documents.map((doc) => ({
			id: doc.id,
			filename: doc.originalName,
			mimeType: doc.mimeType,
			size: doc.size,
			totalChunks: doc.totalChunks,
			processed: doc.processed,
			processingStatus: doc.processingStatus,
			createdAt: doc.createdAt,
			updatedAt: doc.updatedAt,
		}));

		return res.json({
			documents: formattedDocuments,
			total: formattedDocuments.length,
		});
	} catch (error) {
		logger.error('rag:list_documents_failed', {
			userId,
			error: error instanceof Error ? error.message : 'Unknown error',
			brand: 'brAInwav',
		});

		return res.status(500).json(createErrorResponse('Failed to retrieve documents'));
	}
}

/**
 * Get RAG document details
 */
export async function getRAGDocument(req: Request, res: Response) {
	const userId = req.user?.id;
	if (!userId) {
		return res.status(401).json(createErrorResponse('Authentication required'));
	}

	const { id } = req.params;

	try {
		const document = await vectorSearchService.getDocument(id, userId);

		if (!document) {
			return res.status(404).json(createErrorResponse('Document not found'));
		}

		const formattedDocument = {
			id: document.id,
			filename: document.originalName,
			mimeType: document.mimeType,
			size: document.size,
			totalChunks: document.totalChunks,
			processed: document.processed,
			processingStatus: document.processingStatus,
			metadata: document.metadata ? JSON.parse(document.metadata) : {},
			createdAt: document.createdAt,
			updatedAt: document.updatedAt,
			chunks: document.chunks.map((chunk) => ({
				id: chunk.id,
				chunkIndex: chunk.chunkIndex,
				content: chunk.content,
				startPage: chunk.startPage,
				endPage: chunk.endPage,
				tokenCount: chunk.tokenCount,
				hasEmbedding: !!chunk.embedding,
				metadata: chunk.metadata ? JSON.parse(chunk.metadata) : {},
			})),
		};

		return res.json(formattedDocument);
	} catch (error) {
		logger.error('rag:get_document_failed', {
			documentId: id,
			userId,
			error: error instanceof Error ? error.message : 'Unknown error',
			brand: 'brAInwav',
		});

		return res.status(500).json(createErrorResponse('Failed to retrieve document'));
	}
}

/**
 * Delete RAG document
 */
export async function deleteRAGDocument(req: Request, res: Response) {
	const userId = req.user?.id;
	if (!userId) {
		return res.status(401).json(createErrorResponse('Authentication required'));
	}

	const { id } = req.params;

	try {
		// Check if document exists and belongs to user
		const document = await db
			.select()
			.from(ragDocuments)
			.where(and(eq(ragDocuments.id, id), eq(ragDocuments.userId, userId)))
			.limit(1);

		if (document.length === 0) {
			return res.status(404).json(createErrorResponse('Document not found'));
		}

		await vectorSearchService.deleteDocument(id);

		logger.info('rag:delete_document', {
			documentId: id,
			filename: document[0].originalName,
			userId,
			brand: 'brAInwav',
		});

		return res.json({
			message: 'Document deleted successfully',
			documentId: id,
		});
	} catch (error) {
		logger.error('rag:delete_document_failed', {
			documentId: id,
			userId,
			error: error instanceof Error ? error.message : 'Unknown error',
			brand: 'brAInwav',
		});

		return res.status(500).json(createErrorResponse('Failed to delete document'));
	}
}

/**
 * Semantic search with citations
 */
export async function searchRAGDocuments(req: Request, res: Response) {
	const userId = req.user?.id;
	if (!userId) {
		return res.status(401).json(createErrorResponse('Authentication required'));
	}

	try {
		const searchRequest = searchQuerySchema.parse(req.body);

		const searchResponse: SearchResponse = await vectorSearchService.search(searchRequest, userId);

		return res.json(searchResponse);
	} catch (error) {
		logger.error('rag:search_failed', {
			userId,
			query: req.body?.query,
			error: error instanceof Error ? error.message : 'Unknown error',
			brand: 'brAInwav',
		});

		if (error instanceof z.ZodError) {
			return res.status(400).json(createErrorResponse('Invalid search parameters', error.errors));
		}

		return res.status(500).json(createErrorResponse('Search failed'));
	}
}

/**
 * RAG query with context retrieval
 */
export async function queryRAG(req: Request, res: Response) {
	const userId = req.user?.id;
	if (!userId) {
		return res.status(401).json(createErrorResponse('Authentication required'));
	}

	try {
		const queryRequest = ragQuerySchema.parse(req.body);
		const startTime = Date.now();

		logger.info('rag:query_start', {
			query: queryRequest.query,
			userId,
			brand: 'brAInwav',
		});

		// Search for relevant context
		const searchResponse: SearchResponse = await vectorSearchService.search(
			{
				query: queryRequest.query,
				limit: queryRequest.maxChunks || 5,
				documentIds: queryRequest.documentIds,
			},
			userId,
		);

		// Format context for RAG
		const context = searchResponse.results.map((result) => result.content).join('\n\n');

		// Generate response (placeholder - would integrate with LLM)
		const answer = `Based on the provided context, here's information about "${queryRequest.query}":\n\n${context.substring(0, 1000)}...`;

		// Collect citations
		const citations = searchResponse.results.flatMap((result) => result.citations);
		const sources = [...new Set(citations.map((c) => c.documentName))];

		const processingTime = Date.now() - startTime;

		const response: RAGQueryResponse = {
			answer,
			context: searchResponse.results,
			citations,
			sources,
			processingTime,
		};

		logger.info('rag:query_complete', {
			query: queryRequest.query,
			contextCount: searchResponse.results.length,
			processingTime,
			userId,
			brand: 'brAInwav',
		});

		return res.json(response);
	} catch (error) {
		logger.error('rag:query_failed', {
			userId,
			query: req.body?.query,
			error: error instanceof Error ? error.message : 'Unknown error',
			brand: 'brAInwav',
		});

		if (error instanceof z.ZodError) {
			return res.status(400).json(createErrorResponse('Invalid query parameters', error.errors));
		}

		return res.status(500).json(createErrorResponse('Query failed'));
	}
}

/**
 * Get RAG statistics
 */
export async function getRAGStats(req: Request, res: Response) {
	const userId = req.user?.id;
	if (!userId) {
		return res.status(401).json(createErrorResponse('Authentication required'));
	}

	try {
		const searchStats = await vectorSearchService.getSearchStats(userId);
		const embeddingStats = embeddingService.getCacheStats();

		return res.json({
			documents: searchStats,
			embeddings: embeddingStats,
			brand: 'brAInwav',
		});
	} catch (error) {
		logger.error('rag:get_stats_failed', {
			userId,
			error: error instanceof Error ? error.message : 'Unknown error',
			brand: 'brAInwav',
		});

		return res.status(500).json(createErrorResponse('Failed to retrieve statistics'));
	}
}

/**
 * Create standardized error response
 */
function createErrorResponse(message: string, details?: any): RAGErrorResponse {
	return {
		error: 'RAG System Error',
		message,
		details,
		brand: 'brAInwav',
		timestamp: new Date().toISOString(),
	};
}
