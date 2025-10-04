import { randomUUID } from 'node:crypto';
import { promises as fs, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { and, desc, eq } from 'drizzle-orm';
import type { Express, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { db } from '../db/index.js';
import { multimodalChunks, multimodalDocuments } from '../db/schema.js';
import type { AuthRequest } from '../middleware/better-auth.js';
import { audioTranscriptionService } from '../services/audioTranscriptionService.js';
import { documentProcessingService } from '../services/documentProcessingService.js';
import { imageProcessingService } from '../services/imageProcessingService.js';
import { pdfWithImagesService } from '../services/pdfWithImagesService.js';
import { vectorSearchService } from '../services/vectorSearchService.js';
import type {
	MultimodalErrorResponse,
	MultimodalSearchResponse,
	MultimodalStats,
	MultimodalSummary,
	MultimodalUploadResult,
} from '../types/multimodal.js';
import logger from '../utils/logger.js';

// File size limits (200MB for multimodal content)
const MAX_FILE_SIZE = 200 * 1024 * 1024;

const MULTIMODAL_UPLOAD_DIR = join(tmpdir(), 'cortex-webui', 'multimodal');
mkdirSync(MULTIMODAL_UPLOAD_DIR, { recursive: true });

const sanitizeFilename = (name: string): string => name.replace(/[^a-zA-Z0-9._-]/g, '_');

// Multer configuration for multimodal uploads (disk-based to avoid high RSS spikes)
const storage = multer.diskStorage({
	destination: (_req, _file, cb) => cb(null, MULTIMODAL_UPLOAD_DIR),
	filename: (_req, file, cb) => {
		cb(null, `${Date.now()}-${sanitizeFilename(file.originalname)}`);
	},
});
export const multimodalUploadMiddleware = multer({
	storage,
	limits: {
		fileSize: MAX_FILE_SIZE,
	},
	fileFilter: (_req, file, cb) => {
		const allowedMimes = [
			// Images
			'image/jpeg',
			'image/jpg',
			'image/png',
			'image/gif',
			'image/webp',
			// Audio
			'audio/mpeg',
			'audio/mp3',
			'audio/wav',
			'audio/x-wav',
			'audio/m4a',
			'audio/ogg',
			'audio/flac',
			// PDFs
			'application/pdf',
		];

		const allowedExtensions = [
			// Images
			'.jpg',
			'.jpeg',
			'.png',
			'.gif',
			'.webp',
			// Audio
			'.mp3',
			'.wav',
			'.m4a',
			'.ogg',
			'.flac',
			// PDF
			'.pdf',
		];

		const extension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

		if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(extension)) {
			cb(null, true);
		} else {
			cb(new Error('Unsupported file type for multimodal processing'));
		}
	},
});

// Validation schemas
const multimodalUploadSchema = z.object({
	options: z
		.object({
			chunkSize: z.number().min(100).max(4000).optional(),
			chunkOverlap: z.number().min(0).max(1000).optional(),
			enableOCR: z.boolean().optional(),
			enableVisionAnalysis: z.boolean().optional(),
			enableTranscription: z.boolean().optional(),
			enableSpeakerDiarization: z.boolean().optional(),
			language: z.string().optional(),
			visionModel: z.string().optional(),
			transcriptionModel: z.string().optional(),
		})
		.optional(),
});

const multimodalSearchSchema = z.object({
	query: z.string().min(1).max(1000),
	modalities: z.array(z.enum(['text', 'image', 'audio', 'video', 'pdf_with_images'])).optional(),
	limit: z.number().min(1).max(50).optional(),
	minScore: z.number().min(0).max(1).optional(),
	documentIds: z.array(z.string()).optional(),
	includeContent: z.boolean().optional(),
	filters: z
		.object({
			mimeType: z.array(z.string()).optional(),
			minDuration: z.number().optional(),
			maxDuration: z.number().optional(),
			minWidth: z.number().optional(),
			maxWidth: z.number().optional(),
			minHeight: z.number().optional(),
			maxHeight: z.number().optional(),
			language: z.string().optional(),
			speakerCount: z.number().optional(),
			dateRange: z
				.object({
					start: z.date(),
					end: z.date(),
				})
				.optional(),
		})
		.optional(),
});

/**
 * Upload and process multimodal document
 */
export async function uploadMultimodalDocument(req: AuthRequest, res: Response) {
	const userId = req.user?.id;
	if (!userId) {
		return res.status(401).json(createErrorResponse('Authentication required'));
	}

	try {
		// Validate request
		const validatedData = multimodalUploadSchema.parse(req.body);

		if (!req.file) {
			return res.status(400).json(createErrorResponse('No file provided'));
		}

		const file = req.file;
		const filePath = (file as Express.Multer.File & { path?: string }).path;
		if (!filePath) {
			return res.status(500).json(createErrorResponse('Upload staging path unavailable'));
		}

		const startTime = Date.now();

		logger.info('multimodal:upload_start', {
			filename: file.originalname,
			fileSize: file.size,
			mimeType: file.mimetype,
			userId,
			brand: 'brAInwav',
		});

		const fileSource = {
			path: filePath,
			size: file.size,
			mimeType: file.mimetype,
		};

		try {
			const modality = determineModality(file.mimetype, file.originalname);

			const documentId = randomUUID();
			const documentRecord = {
				id: documentId,
				userId,
				filename: `${randomUUID()}_${file.originalname}`,
				originalName: file.originalname,
				mimeType: file.mimetype,
				modality,
				size: file.size,
				totalChunks: 0,
				processed: false,
				processingStatus: 'processing' as const,
				metadata: '{}',
			};

			await db.insert(multimodalDocuments).values(documentRecord);

			let processResult: Record<string, unknown>;
			let chunks: any[] = [];

			switch (modality) {
				case 'image':
					processResult = await imageProcessingService.processImage(
						fileSource,
						file.originalname,
						validatedData.options,
					);
					chunks = await createImageChunks(processResult, documentId);
					break;
				case 'audio':
					processResult = await audioTranscriptionService.processAudio(
						fileSource,
						file.originalname,
						validatedData.options,
					);
					chunks = await createAudioChunks(processResult, documentId);
					break;
				case 'pdf_with_images':
					processResult = await pdfWithImagesService.processPdfWithImages(
						fileSource,
						file.originalname,
						validatedData.options,
					);
					chunks = await createPdfWithImagesChunks(processResult, documentId);
					break;
				default:
					throw new Error(`Unsupported modality: ${modality}`);
			}

			const chunkRecords = chunks.map((chunk) => ({
				id: randomUUID(),
				documentId,
				content: chunk.content,
				chunkIndex: chunk.chunkIndex,
				modality: chunk.modality,
				startPage: chunk.startPage,
				endPage: chunk.endPage,
				startTime: chunk.startTime,
				endTime: chunk.endTime,
				tokenCount: documentProcessingService.estimateTokenCount(chunk.content),
				metadata: JSON.stringify(chunk.metadata || {}),
			}));

			await db.insert(multimodalChunks).values(chunkRecords);

			const chunksWithEmbeddings = chunkRecords.map((chunk, index) => ({
				...chunk,
				...chunks[index],
			}));

			try {
				await vectorSearchService.indexMultimodalDocuments(chunksWithEmbeddings);
			} catch (embeddingError) {
				logger.error('multimodal:embedding_failed', {
					documentId,
					error: embeddingError instanceof Error ? embeddingError.message : 'Unknown error',
					brand: 'brAInwav',
				});
			}

			await db
				.update(multimodalDocuments)
				.set({
					totalChunks: chunks.length,
					processed: true,
					processingStatus: 'completed',
					metadata: JSON.stringify(processResult.metadata),
					updatedAt: new Date(),
				})
				.where(eq(multimodalDocuments.id, documentId));

			const summary = createProcessingSummary(modality, processResult, chunks);
			const processingTime = Date.now() - startTime;

			const result: MultimodalUploadResult = {
				documentId,
				filename: file.originalname,
				modality,
				status: 'success',
				chunksCreated: chunks.length,
				processingTime,
				summary,
				brand: 'brAInwav',
			};

			logger.info('multimodal:upload_complete', {
				documentId,
				filename: file.originalname,
				modality,
				chunksCreated: chunks.length,
				processingTime,
				userId,
				brand: 'brAInwav',
			});

			return res.json(result);
		} finally {
			await fs.unlink(filePath).catch(() => undefined);
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		logger.error('multimodal:upload_failed', {
			filename: req.file?.originalname,
			error: errorMessage,
			userId,
			brand: 'brAInwav',
		});

		return res
			.status(500)
			.json(createErrorResponse('Multimodal document upload failed', errorMessage));
	}
}

/**
 * List multimodal documents for user
 */
export async function listMultimodalDocuments(req: AuthRequest, res: Response) {
	const userId = req.user?.id;
	if (!userId) {
		return res.status(401).json(createErrorResponse('Authentication required'));
	}

	try {
		const documents = await db
			.select()
			.from(multimodalDocuments)
			.where(eq(multimodalDocuments.userId, userId))
			.orderBy(desc(multimodalDocuments.createdAt));

		const formattedDocuments = documents.map((doc) => ({
			id: doc.id,
			filename: doc.originalName,
			mimeType: doc.mimeType,
			modality: doc.modality,
			size: doc.size,
			totalChunks: doc.totalChunks,
			processed: doc.processed,
			processingStatus: doc.processingStatus,
			metadata: doc.metadata ? JSON.parse(doc.metadata) : {},
			createdAt: doc.createdAt,
			updatedAt: doc.updatedAt,
		}));

		return res.json({
			documents: formattedDocuments,
			total: formattedDocuments.length,
		});
	} catch (error) {
		logger.error('multimodal:list_documents_failed', {
			userId,
			error: error instanceof Error ? error.message : 'Unknown error',
			brand: 'brAInwav',
		});

		return res.status(500).json(createErrorResponse('Failed to retrieve documents'));
	}
}

/**
 * Get multimodal document details
 */
export async function getMultimodalDocument(req: AuthRequest, res: Response) {
	const userId = req.user?.id;
	if (!userId) {
		return res.status(401).json(createErrorResponse('Authentication required'));
	}

	const { id } = req.params;

	try {
		const document = await db
			.select()
			.from(multimodalDocuments)
			.where(and(eq(multimodalDocuments.id, id), eq(multimodalDocuments.userId, userId)))
			.limit(1);

		if (document.length === 0) {
			return res.status(404).json(createErrorResponse('Document not found'));
		}

		// Get chunks for this document
		const chunks = await db
			.select()
			.from(multimodalChunks)
			.where(eq(multimodalChunks.documentId, id))
			.orderBy(multimodalChunks.chunkIndex);

		const formattedDocument = {
			...document[0],
			metadata: document[0].metadata ? JSON.parse(document[0].metadata) : {},
			chunks: chunks.map((chunk) => ({
				...chunk,
				metadata: chunk.metadata ? JSON.parse(chunk.metadata) : {},
			})),
		};

		return res.json(formattedDocument);
	} catch (error) {
		logger.error('multimodal:get_document_failed', {
			documentId: id,
			userId,
			error: error instanceof Error ? error.message : 'Unknown error',
			brand: 'brAInwav',
		});

		return res.status(500).json(createErrorResponse('Failed to retrieve document'));
	}
}

/**
 * Delete multimodal document
 */
export async function deleteMultimodalDocument(req: AuthRequest, res: Response) {
	const userId = req.user?.id;
	if (!userId) {
		return res.status(401).json(createErrorResponse('Authentication required'));
	}

	const { id } = req.params;

	try {
		// Check if document exists and belongs to user
		const document = await db
			.select()
			.from(multimodalDocuments)
			.where(and(eq(multimodalDocuments.id, id), eq(multimodalDocuments.userId, userId)))
			.limit(1);

		if (document.length === 0) {
			return res.status(404).json(createErrorResponse('Document not found'));
		}

		// Delete from vector search
		await vectorSearchService.deleteMultimodalDocument(id);

		// Delete from database (cascade will handle chunks)
		await db.delete(multimodalDocuments).where(eq(multimodalDocuments.id, id));

		logger.info('multimodal:delete_document', {
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
		logger.error('multimodal:delete_document_failed', {
			documentId: id,
			userId,
			error: error instanceof Error ? error.message : 'Unknown error',
			brand: 'brAInwav',
		});

		return res.status(500).json(createErrorResponse('Failed to delete document'));
	}
}

/**
 * Search across multimodal content
 */
export async function searchMultimodal(req: AuthRequest, res: Response) {
	const userId = req.user?.id;
	if (!userId) {
		return res.status(401).json(createErrorResponse('Authentication required'));
	}

	try {
		const searchRequest = multimodalSearchSchema.parse(req.body);

		const searchResponse: MultimodalSearchResponse = await vectorSearchService.searchMultimodal(
			searchRequest,
			userId,
		);

		return res.json(searchResponse);
	} catch (error) {
		logger.error('multimodal:search_failed', {
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
 * Get multimodal statistics
 */
export async function getMultimodalStats(req: AuthRequest, res: Response) {
	const userId = req.user?.id;
	if (!userId) {
		return res.status(401).json(createErrorResponse('Authentication required'));
	}

	try {
		// Get documents by modality
		const documents = await db
			.select({
				modality: multimodalDocuments.modality,
				count: db.fn.count(multimodalDocuments.id).as('count'),
				totalSize: db.fn.sum(multimodalDocuments.size).as('totalSize'),
			})
			.from(multimodalDocuments)
			.where(eq(multimodalDocuments.userId, userId))
			.groupBy(multimodalDocuments.modality);

		// Get chunks by modality
		const chunks = await db
			.select({
				modality: multimodalChunks.modality,
				count: db.fn.count(multimodalChunks.id).as('count'),
				embeddings: db.fn.sum(db.fn.length(multimodalChunks.embedding)).as('embeddings'),
			})
			.from(multimodalChunks)
			.innerJoin(multimodalDocuments, eq(multimodalChunks.documentId, multimodalDocuments.id))
			.where(eq(multimodalDocuments.userId, userId))
			.groupBy(multimodalChunks.modality);

		// Get processing status
		const processing = await db
			.select({
				status: multimodalDocuments.processingStatus,
				count: db.fn.count(multimodalDocuments.id).as('count'),
			})
			.from(multimodalDocuments)
			.where(eq(multimodalDocuments.userId, userId))
			.groupBy(multimodalDocuments.processingStatus);

		// Format stats
		const stats: MultimodalStats = {
			documents: {
				total: documents.reduce((sum, doc) => sum + Number(doc.count), 0),
				byModality: documents.reduce(
					(acc, doc) => {
						acc[doc.modality] = Number(doc.count);
						return acc;
					},
					{} as Record<string, number>,
				),
				totalSize: documents.reduce((sum, doc) => sum + Number(doc.totalSize || 0), 0),
				totalDuration: 0, // Would need to calculate from metadata
			},
			chunks: {
				total: chunks.reduce((sum, chunk) => sum + Number(chunk.count), 0),
				withEmbeddings: chunks.reduce((sum, chunk) => sum + Number(chunk.embeddings || 0), 0),
				byModality: chunks.reduce(
					(acc, chunk) => {
						acc[chunk.modality] = Number(chunk.count);
						return acc;
					},
					{} as Record<string, number>,
				),
			},
			processing: {
				completed: Number(processing.find((p) => p.status === 'completed')?.count || 0),
				failed: Number(processing.find((p) => p.status === 'failed')?.count || 0),
				pending: Number(processing.find((p) => p.status === 'pending')?.count || 0),
				averageProcessingTime: 0, // Would need to track processing times
			},
			brand: 'brAInwav',
		};

		return res.json(stats);
	} catch (error) {
		logger.error('multimodal:get_stats_failed', {
			userId,
			error: error instanceof Error ? error.message : 'Unknown error',
			brand: 'brAInwav',
		});

		return res.status(500).json(createErrorResponse('Failed to retrieve statistics'));
	}
}

/**
 * Helper functions
 */

function determineModality(
	mimeType: string,
	filename: string,
): 'text' | 'image' | 'audio' | 'video' | 'pdf_with_images' {
	const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));

	if (
		mimeType.startsWith('image/') ||
		['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension)
	) {
		return 'image';
	}

	if (
		mimeType.startsWith('audio/') ||
		['.mp3', '.wav', '.m4a', '.ogg', '.flac'].includes(extension)
	) {
		return 'audio';
	}

	if (mimeType === 'application/pdf' || extension === '.pdf') {
		return 'pdf_with_images';
	}

	// Default to text for unsupported types
	return 'text';
}

async function createImageChunks(processResult: any, documentId: string): Promise<any[]> {
	const chunks = [];

	// Create text chunk from OCR/vision analysis
	const textContent = [
		processResult.metadata.ocrText ? `OCR Text: ${processResult.metadata.ocrText}` : '',
		processResult.metadata.visionAnalysis
			? `Vision Analysis: ${processResult.metadata.visionAnalysis.description}`
			: '',
	]
		.filter(Boolean)
		.join('\n\n');

	if (textContent) {
		chunks.push({
			documentId,
			content: textContent,
			chunkIndex: 0,
			modality: 'text' as const,
			metadata: {
				imageWidth: processResult.metadata.width,
				imageHeight: processResult.metadata.height,
				imageFormat: processResult.metadata.format,
			},
		});
	}

	// Create image chunk
	const imageContent = [
		`Image: ${processResult.metadata.width}x${processResult.metadata.height} ${processResult.metadata.format}`,
		processResult.metadata.visionAnalysis?.objects.map((obj: any) => obj.label).join(', ') || '',
	]
		.filter(Boolean)
		.join(' - ');

	if (imageContent) {
		chunks.push({
			documentId,
			content: imageContent,
			chunkIndex: chunks.length,
			modality: 'image' as const,
			metadata: {
				width: processResult.metadata.width,
				height: processResult.metadata.height,
				format: processResult.metadata.format,
			},
		});
	}

	return chunks;
}

async function createAudioChunks(processResult: any, documentId: string): Promise<any[]> {
	const chunks = [];

	if (processResult.transcription) {
		// Create chunks from transcription segments
		const segments = processResult.transcription.segments;
		const segmentChunks = [];

		for (let i = 0; i < segments.length; i++) {
			const segment = segments[i];
			segmentChunks.push({
				documentId,
				content: segment.text,
				chunkIndex: i,
				modality: 'audio_transcript' as const,
				startTime: Math.round(segment.start),
				endTime: Math.round(segment.end),
				metadata: {
					speakerId: segment.speakerId,
					confidence: segment.confidence,
					duration: segment.end - segment.start,
				},
			});
		}

		chunks.push(...segmentChunks);
	}

	return chunks;
}

async function createPdfWithImagesChunks(processResult: any, documentId: string): Promise<any[]> {
	const chunks = [];

	// Create layout-aware chunks
	const layoutChunks = pdfWithImagesService.createLayoutAwareChunks(processResult.pages);

	for (let i = 0; i < layoutChunks.length; i++) {
		const layoutChunk = layoutChunks[i];
		chunks.push({
			documentId,
			content: layoutChunk.content,
			chunkIndex: i,
			modality: layoutChunk.modality,
			startPage: layoutChunk.pageNumber,
			endPage: layoutChunk.pageNumber,
			metadata: {
				layoutContext: layoutChunk.layoutContext,
				hasImages: layoutChunk.images.length > 0,
				imageCount: layoutChunk.images.length,
			},
		});
	}

	return chunks;
}

function createProcessingSummary(
	modality: string,
	processResult: any,
	_chunks: any[],
): MultimodalSummary {
	const summary: MultimodalSummary = {};

	switch (modality) {
		case 'image':
			summary.imageCount = 1;
			summary.textLength = processResult.metadata.ocrText?.length || 0;
			summary.objectsDetected = processResult.metadata.visionAnalysis?.objects?.length || 0;
			break;

		case 'audio':
			summary.audioDuration = processResult.metadata.duration;
			summary.transcriptLength = processResult.transcription?.text.length || 0;
			summary.speakersIdentified = processResult.transcription?.speakers?.length || 0;
			break;

		case 'pdf_with_images':
			summary.pagesProcessed = processResult.pages?.length || 0;
			summary.textLength = processResult.metadata.totalText || 0;
			summary.extractedImages = processResult.metadata.totalImages || 0;
			break;
	}

	return summary;
}

function createErrorResponse(message: string, details?: any): MultimodalErrorResponse {
	return {
		error: 'Multimodal System Error',
		message,
		details,
		brand: 'brAInwav',
		timestamp: new Date().toISOString(),
	};
}
