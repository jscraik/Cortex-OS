import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db/index';
import { multimodalChunks, multimodalDocuments } from '../../db/schema';
import { createApp } from '../../server';
import { audioTranscriptionService } from '../../services/audioTranscriptionService';
import { imageProcessingService } from '../../services/imageProcessingService';
import { vectorSearchService } from '../../services/vectorSearchService';

// Database mock interfaces
interface MockDbInsert {
	values: () => { execute: () => Promise<void> };
}

interface MockDbUpdate {
	set: () => { where: () => { execute: () => Promise<void> } };
}

interface MockDbDelete {
	where: () => { execute: () => Promise<void> };
}

interface MockDbSelect {
	from: () => { where: () => { execute: () => Promise<unknown[]> } };
}

// Mock logger to avoid noise in tests
vi.mock('../../utils/logger', () => ({
	default: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	},
}));

// Mock services
vi.mock('../../services/imageProcessingService', () => ({
	imageProcessingService: {
		processImage: vi.fn(),
		isFormatSupported: vi.fn().mockReturnValue(true),
	},
}));

vi.mock('../../services/audioTranscriptionService', () => ({
	audioTranscriptionService: {
		processAudio: vi.fn(),
		isFormatSupported: vi.fn().mockReturnValue(true),
	},
}));

vi.mock('../../services/pdfWithImagesService', () => ({
	pdfWithImagesService: {
		processPdfWithImages: vi.fn(),
		createLayoutAwareChunks: vi.fn().mockReturnValue([]),
	},
}));

vi.mock('../../services/vectorSearchService', () => ({
	vectorSearchService: {
		indexMultimodalDocuments: vi.fn(),
		searchMultimodal: vi.fn(),
		deleteMultimodalDocument: vi.fn(),
	},
}));

vi.mock('../../services/documentProcessingService', () => ({
	documentProcessingService: {
		estimateTokenCount: vi.fn().mockReturnValue(100),
	},
}));

// Mock database
vi.mock('../../db/index', () => ({
	db: {
		insert: vi.fn(),
		select: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
	},
}));

describe('Multimodal Controller', () => {
	let app: Express;

	beforeEach(() => {
		vi.clearAllMocks();
		app = createApp();

		// Setup default database mocks
		vi.mocked(db.insert).mockReturnValue({
			values: vi.fn().mockReturnValue({
				execute: vi.fn().mockResolvedValue(undefined),
			}),
		} as MockDbInsert);

		vi.mocked(db.update).mockReturnValue({
			set: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					execute: vi.fn().mockResolvedValue(undefined),
				}),
			}),
		} as MockDbUpdate);

		vi.mocked(db.delete).mockReturnValue({
			where: vi.fn().mockReturnValue({
				execute: vi.fn().mockResolvedValue(undefined),
			}),
		} as MockDbDelete);
	});

	describe('POST /api/multimodal/upload', () => {
		it('should upload and process an image successfully', async () => {
			// Arrange
			const mockImageProcess = vi.mocked(imageProcessingService.processImage).mockResolvedValue({
				metadata: {
					width: 800,
					height: 600,
					format: 'JPEG',
					ocrText: 'Sample OCR text',
					visionAnalysis: {
						description: 'Image description',
						objects: [],
						confidence: 0.9,
						analysisModel: 'test-model',
						processedAt: new Date(),
					},
				},
				resizedBuffer: Buffer.from('resized-image'),
				thumbnailBuffer: Buffer.from('thumbnail-image'),
			});

			const _mockDbSelect = vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([]),
					}),
				}),
			} as MockDbSelect);

			// Act
			const response = await request(app)
				.post('/api/multimodal/upload')
				.set('Authorization', 'Bearer valid-token')
				.attach('file', Buffer.from('fake-image-data'), 'test-image.jpg')
				.field(
					'options',
					JSON.stringify({
						enableOCR: true,
						enableVisionAnalysis: true,
					}),
				);

			// Assert
			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				status: 'success',
				modality: 'image',
				chunksCreated: expect.any(Number),
				processingTime: expect.any(Number),
				brand: 'brAInwav',
			});
			expect(mockImageProcess).toHaveBeenCalledWith(
				expect.any(Buffer),
				'test-image.jpg',
				expect.objectContaining({
					enableOCR: true,
					enableVisionAnalysis: true,
				}),
			);
			expect(vi.mocked(db.insert)).toHaveBeenCalledWith(multimodalDocuments);
			expect(vi.mocked(db.insert)).toHaveBeenCalledWith(multimodalChunks);
		});

		it('should upload and process an audio file successfully', async () => {
			// Arrange
			const mockAudioProcess = vi.mocked(audioTranscriptionService.processAudio).mockResolvedValue({
				metadata: {
					duration: 120,
					format: 'MP3',
					sampleRate: 44100,
					channels: 2,
					transcript: 'Sample transcription',
				},
				transcription: {
					text: 'Sample transcription text',
					segments: [
						{ start: 0, end: 5, text: 'Sample', speakerId: 'speaker_1', confidence: 0.95 },
					],
					speakers: [{ id: 'speaker_1', segments: 1, totalSpeakingTime: 5 }],
					processingTime: 2000,
					model: 'test-model',
					confidence: 0.95,
					language: 'en',
				},
				waveformData: [0.1, 0.2, 0.3],
			});

			// Act
			const response = await request(app)
				.post('/api/multimodal/upload')
				.set('Authorization', 'Bearer valid-token')
				.attach('file', Buffer.from('fake-audio-data'), 'test-audio.mp3')
				.field(
					'options',
					JSON.stringify({
						enableTranscription: true,
						enableSpeakerDiarization: true,
					}),
				);

			// Assert
			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				status: 'success',
				modality: 'audio',
				brand: 'brAInwav',
			});
			expect(response.body.summary).toMatchObject({
				audioDuration: 120,
				transcriptLength: expect.any(Number),
				speakersIdentified: 1,
			});
			expect(mockAudioProcess).toHaveBeenCalledWith(
				expect.any(Buffer),
				'test-audio.mp3',
				expect.objectContaining({
					enableTranscription: true,
					enableSpeakerDiarization: true,
				}),
			);
		});

		it('should return 400 when no file is provided', async () => {
			// Act
			const response = await request(app)
				.post('/api/multimodal/upload')
				.set('Authorization', 'Bearer valid-token');

			// Assert
			expect(response.status).toBe(400);
			expect(response.body).toMatchObject({
				error: 'Multimodal System Error',
				message: 'No file provided',
				brand: 'brAInwav',
			});
		});

		it('should return 401 when no authentication is provided', async () => {
			// Act
			const response = await request(app)
				.post('/api/multimodal/upload')
				.attach('file', Buffer.from('fake-image-data'), 'test-image.jpg');

			// Assert
			expect(response.status).toBe(401);
		});

		it('should handle processing errors gracefully', async () => {
			// Arrange
			vi.mocked(imageProcessingService.processImage).mockRejectedValue(
				new Error('Image processing failed'),
			);

			// Act
			const response = await request(app)
				.post('/api/multimodal/upload')
				.set('Authorization', 'Bearer valid-token')
				.attach('file', Buffer.from('fake-image-data'), 'test-image.jpg');

			// Assert
			expect(response.status).toBe(500);
			expect(response.body).toMatchObject({
				error: 'Multimodal System Error',
				message: 'Multimodal document upload failed',
				brand: 'brAInwav',
			});
		});
	});

	describe('GET /api/multimodal/documents', () => {
		it('should list multimodal documents for authenticated user', async () => {
			// Arrange
			const mockDocuments = [
				{
					id: 'doc-1',
					originalName: 'test-image.jpg',
					mimeType: 'image/jpeg',
					modality: 'image',
					size: 1024000,
					totalChunks: 2,
					processed: true,
					processingStatus: 'completed',
					metadata: '{}',
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			];

			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						orderBy: vi.fn().mockResolvedValue(mockDocuments),
					}),
				}),
			} as MockDbSelect);

			// Act
			const response = await request(app)
				.get('/api/multimodal/documents')
				.set('Authorization', 'Bearer valid-token');

			// Assert
			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				documents: expect.arrayContaining([
					expect.objectContaining({
						id: 'doc-1',
						filename: 'test-image.jpg',
						modality: 'image',
					}),
				]),
				total: 1,
			});
		});

		it('should return 401 when no authentication is provided', async () => {
			// Act
			const response = await request(app).get('/api/multimodal/documents');

			// Assert
			expect(response.status).toBe(401);
		});
	});

	describe('POST /api/multimodal/search', () => {
		it('should search multimodal content successfully', async () => {
			// Arrange
			const mockSearchResults = {
				results: [
					{
						id: 'chunk-1',
						documentId: 'doc-1',
						filename: 'test-image.jpg',
						modality: 'image',
						content: 'Image content with text',
						score: 0.85,
						chunkIndex: 0,
						citations: [
							{
								documentId: 'doc-1',
								documentName: 'test-image.jpg',
								filename: 'test-image.jpg',
								modality: 'image',
								text: 'Image content with text',
								score: 0.85,
							},
						],
					},
				],
				total: 1,
				query: 'test query',
				processingTime: 150,
				modalities: ['image'],
			};

			vi.mocked(vectorSearchService.searchMultimodal).mockResolvedValue(mockSearchResults);

			// Act
			const response = await request(app)
				.post('/api/multimodal/search')
				.set('Authorization', 'Bearer valid-token')
				.send({
					query: 'test query',
					modalities: ['image'],
					limit: 10,
					minScore: 0.7,
				});

			// Assert
			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				results: expect.arrayContaining([
					expect.objectContaining({
						id: 'chunk-1',
						modality: 'image',
						score: 0.85,
					}),
				]),
				total: 1,
				query: 'test query',
				processingTime: 150,
			});
			expect(vi.mocked(vectorSearchService.searchMultimodal)).toHaveBeenCalledWith(
				expect.objectContaining({
					query: 'test query',
					modalities: ['image'],
					limit: 10,
					minScore: 0.7,
				}),
				expect.any(String), // userId
			);
		});

		it('should return 400 for invalid search parameters', async () => {
			// Act
			const response = await request(app)
				.post('/api/multimodal/search')
				.set('Authorization', 'Bearer valid-token')
				.send({
					query: '', // Empty query should fail validation
				});

			// Assert
			expect(response.status).toBe(400);
			expect(response.body).toMatchObject({
				error: 'Multimodal System Error',
				message: 'Invalid search parameters',
				brand: 'brAInwav',
			});
		});

		it('should return 401 when no authentication is provided', async () => {
			// Act
			const response = await request(app).post('/api/multimodal/search').send({
				query: 'test query',
			});

			// Assert
			expect(response.status).toBe(401);
		});
	});

	describe('GET /api/multimodal/stats', () => {
		it('should return multimodal statistics', async () => {
			// Arrange
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						groupBy: vi.fn().mockResolvedValue([
							{ modality: 'image', count: 5, totalSize: 5000000 },
							{ modality: 'audio', count: 3, totalSize: 15000000 },
						]),
					}),
				}),
			} as MockDbSelect);

			// Mock chunks query
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							groupBy: vi.fn().mockResolvedValue([
								{ modality: 'text', count: 8, embeddings: 7 },
								{ modality: 'image', count: 3, embeddings: 3 },
							]),
						}),
					}),
				}),
			} as MockDbSelect);

			// Mock processing status query
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						groupBy: vi.fn().mockResolvedValue([
							{ status: 'completed', count: 7 },
							{ status: 'failed', count: 1 },
						]),
					}),
				}),
			} as MockDbSelect);

			// Act
			const response = await request(app)
				.get('/api/multimodal/stats')
				.set('Authorization', 'Bearer valid-token');

			// Assert
			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				documents: {
					total: expect.any(Number),
					byModality: expect.any(Object),
					totalSize: expect.any(Number),
				},
				chunks: {
					total: expect.any(Number),
					withEmbeddings: expect.any(Number),
					byModality: expect.any(Object),
				},
				processing: {
					completed: expect.any(Number),
					failed: expect.any(Number),
					pending: expect.any(Number),
				},
				brand: 'brAInwav',
			});
		});

		it('should return 401 when no authentication is provided', async () => {
			// Act
			const response = await request(app).get('/api/multimodal/stats');

			// Assert
			expect(response.status).toBe(401);
		});
	});

	describe('DELETE /api/multimodal/documents/:id', () => {
		it('should delete a multimodal document successfully', async () => {
			// Arrange
			const documentId = 'doc-123';

			// Mock document existence check
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ id: documentId }]),
					}),
				}),
			} as MockDbSelect);

			// Act
			const response = await request(app)
				.delete(`/api/multimodal/documents/${documentId}`)
				.set('Authorization', 'Bearer valid-token');

			// Assert
			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				message: 'Document deleted successfully',
				documentId,
			});
			expect(vi.mocked(vectorSearchService.deleteMultimodalDocument)).toHaveBeenCalledWith(
				documentId,
			);
		});

		it('should return 404 for non-existent document', async () => {
			// Arrange
			const documentId = 'non-existent-doc';

			// Mock document not found
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([]),
					}),
				}),
			} as MockDbSelect);

			// Act
			const response = await request(app)
				.delete(`/api/multimodal/documents/${documentId}`)
				.set('Authorization', 'Bearer valid-token');

			// Assert
			expect(response.status).toBe(404);
			expect(response.body).toMatchObject({
				error: 'Multimodal System Error',
				message: 'Document not found',
				brand: 'brAInwav',
			});
		});

		it('should return 401 when no authentication is provided', async () => {
			// Act
			const response = await request(app).delete('/api/multimodal/documents/doc-123');

			// Assert
			expect(response.status).toBe(401);
		});
	});
});
