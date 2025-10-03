import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../server.ts';
import { runMultimodalMigration } from '../setup/multimodal-migration.ts';

// Mock external services for testing

vi.mock('../../services/imageProcessingService.ts', () => ({
	imageProcessingService: {
		processImage: vi
			.fn()
			.mockImplementation(
				async (input: Buffer | { size: number }, _filename: string, options: any) => ({
					metadata: {
						width: 800,
						height: 600,
						format: 'JPEG',
						ocrText: options.enableOCR ? 'Sample OCR text from image' : undefined,
						visionAnalysis: options.enableVisionAnalysis
							? {
									description: 'Sample vision analysis',
									objects: [
										{
											label: 'test object',
											confidence: 0.9,
											boundingBox: { x: 0, y: 0, width: 100, height: 100 },
										},
									],
									confidence: 0.9,
									analysisModel: 'test-model',
									processedAt: new Date(),
								}
							: undefined,
					},
					resizedBuffer: Buffer.isBuffer(input)
						? Buffer.from('resized-image')
						: Buffer.from('resized-image'),
					thumbnailBuffer: Buffer.isBuffer(input)
						? Buffer.from('thumbnail-image')
						: Buffer.from('thumbnail-image'),
				}),
			),
		isFormatSupported: vi.fn().mockReturnValue(true),
		generateImageHash: vi.fn().mockResolvedValue('test-image-hash'),
	},
}));

vi.mock('../../services/audioTranscriptionService.ts', () => ({
	audioTranscriptionService: {
		processAudio: vi
			.fn()
			.mockImplementation(
				async (_input: Buffer | { size: number }, _filename: string, options: any) => ({
					metadata: {
						duration: 120,
						format: 'MP3',
						sampleRate: 44100,
						channels: 2,
						transcript: options.enableTranscription ? 'Sample transcription text' : undefined,
						speakerDiarization:
							options.enableTranscription && options.enableSpeakerDiarization
								? [
										{
											speakerId: 'speaker_1',
											startTime: 0,
											endTime: 60,
											text: 'Part 1',
											confidence: 0.9,
										},
										{
											speakerId: 'speaker_2',
											startTime: 60,
											endTime: 120,
											text: 'Part 2',
											confidence: 0.85,
										},
									]
								: undefined,
					},
					transcription: options.enableTranscription
						? {
								text: 'Sample transcription text with speaker diarization',
								segments: options.enableSpeakerDiarization
									? [
											{
												start: 0,
												end: 5,
												text: 'Sample',
												speakerId: 'speaker_1',
												confidence: 0.95,
											},
											{
												start: 5,
												end: 10,
												text: 'transcription',
												speakerId: 'speaker_2',
												confidence: 0.88,
											},
										]
									: [{ start: 0, end: 10, text: 'Sample transcription text', confidence: 0.92 }],
								speakers: options.enableSpeakerDiarization
									? [
											{ id: 'speaker_1', segments: 1, totalSpeakingTime: 5 },
											{ id: 'speaker_2', segments: 1, totalSpeakingTime: 5 },
										]
									: [],
								processingTime: 2000,
								model: 'test-model',
								confidence: 0.92,
								language: 'en',
							}
						: undefined,
					waveformData: Array(200)
						.fill(0)
						.map(() => Math.random()),
				}),
			),
		isFormatSupported: vi.fn().mockReturnValue(true),
		generateAudioHash: vi.fn().mockResolvedValue('test-audio-hash'),
	},
}));

vi.mock('../../services/pdfWithImagesService.ts', () => ({
	pdfWithImagesService: {
		processPdfWithImages: vi
			.fn()
			.mockImplementation(
				async (_input: Buffer | { size: number }, _filename: string, _options: any) => ({
					metadata: {
						title: 'Test PDF Document',
						pages: [
							{
								pageNumber: 1,
								text: 'Page 1 content',
								images: [],
								layout: { hasText: true, hasImages: false },
							},
							{
								pageNumber: 2,
								text: 'Page 2 content',
								images: [],
								layout: { hasText: true, hasImages: false },
							},
						],
						totalImages: 0,
						totalText: 100,
						hasEmbeddedImages: false,
						layoutPreserved: true,
					},
					pages: [
						{
							pageNumber: 1,
							text: 'Page 1 content',
							images: [],
							layout: { hasText: true, hasImages: false },
						},
						{
							pageNumber: 2,
							text: 'Page 2 content',
							images: [],
							layout: { hasText: true, hasImages: false },
						},
					],
					extractedImages: [],
				}),
			),
		createLayoutAwareChunks: vi.fn().mockReturnValue([
			{
				content: 'Page 1 content',
				modality: 'text',
				pageNumber: 1,
				layoutContext: 'Page 1',
				images: [],
			},
			{
				content: 'Page 2 content',
				modality: 'text',
				pageNumber: 2,
				layoutContext: 'Page 2',
				images: [],
			},
		]),
		generatePdfHash: vi.fn().mockResolvedValue('test-pdf-hash'),
	},
}));

vi.mock('../../services/vectorSearchService.ts', () => ({
	vectorSearchService: {
		indexMultimodalDocuments: vi.fn().mockResolvedValue(undefined),
		searchMultimodal: vi.fn().mockImplementation(async (request: any, _userId: string) => ({
			results: [
				{
					id: 'chunk-1',
					documentId: 'doc-1',
					filename: 'test-file.jpg',
					modality: 'image',
					content: 'Sample image content with OCR text',
					score: 0.85,
					chunkIndex: 0,
					citations: [
						{
							documentId: 'doc-1',
							documentName: 'test-file.jpg',
							filename: 'test-file.jpg',
							modality: 'image',
							text: 'Sample image content with OCR text',
							score: 0.85,
						},
					],
					preview: { type: 'image', content: 'Sample image content' },
				},
			],
			total: 1,
			query: request.query,
			processingTime: 150,
			modalities: request.modalities,
		})),
		deleteMultimodalDocument: vi.fn().mockResolvedValue(undefined),
	},
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Multimodal Integration Tests', () => {
	let app: Express;
	let sqlite: Database.Database;
	let db: unknown;

	beforeAll(async () => {
		// Create test database
		const testDbPath = path.join(__dirname, '../../data/test-multimodal-integration.db');
		sqlite = new Database(testDbPath);
		db = drizzle(sqlite);

		// Run multimodal migration
		await runMultimodalMigration({ schema: db.schema } as any);

		// Mock authentication middleware to return a test user
		vi.doMock('../../middleware/auth.js', () => ({
			authenticateToken: (req: any, _res: any, next: any) => {
				req.user = { id: 'test-user-id' };
				next();
			},
		}));

		// Mock security middleware
		vi.doMock('../../middleware/security.ts', () => ({
			customCsrfProtection: (_req: any, _res: any, next: any) => next(),
		}));

		app = createApp();
	});

	afterAll(() => {
		sqlite.close();
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Complete Multimodal Workflow', () => {
		it('should handle image upload, processing, and search workflow', async () => {
			// Step 1: Upload an image
			const uploadResponse = await request(app)
				.post('/api/multimodal/upload')
				.set('Authorization', 'Bearer test-token')
				.attach('file', Buffer.from('fake-image-data'), 'test-image.jpg')
				.field(
					'options',
					JSON.stringify({
						enableOCR: true,
						enableVisionAnalysis: true,
						chunkSize: 500,
					}),
				);

			expect(uploadResponse.status).toBe(200);
			expect(uploadResponse.body).toMatchObject({
				status: 'success',
				modality: 'image',
				brand: 'brAInwav',
			});
			expect(uploadResponse.body.chunksCreated).toBeGreaterThan(0);

			const documentId = uploadResponse.body.documentId;

			// Step 2: List documents to verify upload
			const listResponse = await request(app)
				.get('/api/multimodal/documents')
				.set('Authorization', 'Bearer test-token');

			expect(listResponse.status).toBe(200);
			expect(listResponse.body.documents).toHaveLength(1);
			expect(listResponse.body.documents[0]).toMatchObject({
				id: documentId,
				modality: 'image',
				processed: true,
			});

			// Step 3: Search for the uploaded content
			const searchResponse = await request(app)
				.post('/api/multimodal/search')
				.set('Authorization', 'Bearer test-token')
				.send({
					query: 'Sample image content',
					modalities: ['image'],
					limit: 10,
				});

			expect(searchResponse.status).toBe(200);
			expect(searchResponse.body.results).toHaveLength(1);
			expect(searchResponse.body.results[0]).toMatchObject({
				modality: 'image',
				score: expect.any(Number),
			});

			// Step 4: Get document details
			const detailsResponse = await request(app)
				.get(`/api/multimodal/documents/${documentId}`)
				.set('Authorization', 'Bearer test-token');

			expect(detailsResponse.status).toBe(200);
			expect(detailsResponse.body.id).toBe(documentId);
			expect(detailsResponse.body.chunks).toBeDefined();

			// Step 5: Delete the document
			const deleteResponse = await request(app)
				.delete(`/api/multimodal/documents/${documentId}`)
				.set('Authorization', 'Bearer test-token');

			expect(deleteResponse.status).toBe(200);
			expect(deleteResponse.body).toMatchObject({
				message: 'Document deleted successfully',
				documentId,
			});
		});

		it('should handle audio file with transcription and speaker diarization', async () => {
			// Upload audio file with full processing
			const uploadResponse = await request(app)
				.post('/api/multimodal/upload')
				.set('Authorization', 'Bearer test-token')
				.attach('file', Buffer.from('fake-audio-data'), 'test-audio.mp3')
				.field(
					'options',
					JSON.stringify({
						enableTranscription: true,
						enableSpeakerDiarization: true,
						language: 'en',
						transcriptionModel: 'whisper-large',
					}),
				);

			expect(uploadResponse.status).toBe(200);
			expect(uploadResponse.body).toMatchObject({
				status: 'success',
				modality: 'audio',
				brand: 'brAInwav',
			});

			// Verify audio-specific summary
			expect(uploadResponse.body.summary).toMatchObject({
				audioDuration: 120,
				transcriptLength: expect.any(Number),
				speakersIdentified: 2,
			});

			// Search for transcribed content
			const searchResponse = await request(app)
				.post('/api/multimodal/search')
				.set('Authorization', 'Bearer test-token')
				.send({
					query: 'Sample transcription',
					modalities: ['audio_transcript'],
				});

			expect(searchResponse.status).toBe(200);
			expect(searchResponse.body.results).toBeDefined();
		});

		it('should handle PDF with images and layout preservation', async () => {
			// Upload PDF with enhanced processing
			const uploadResponse = await request(app)
				.post('/api/multimodal/upload')
				.set('Authorization', 'Bearer test-token')
				.attach('file', Buffer.from('fake-pdf-data'), 'test-document.pdf')
				.field(
					'options',
					JSON.stringify({
						enableOCR: true,
						enableVisionAnalysis: true,
						chunkSize: 1000,
					}),
				);

			expect(uploadResponse.status).toBe(200);
			expect(uploadResponse.body).toMatchObject({
				status: 'success',
				modality: 'pdf_with_images',
				brand: 'brAInwav',
			});

			// Verify PDF-specific summary
			expect(uploadResponse.body.summary).toMatchObject({
				pagesProcessed: 2,
				textLength: expect.any(Number),
				extractedImages: 0,
			});

			const _documentId = uploadResponse.body.documentId;

			// Search across PDF content
			const searchResponse = await request(app)
				.post('/api/multimodal/search')
				.set('Authorization', 'Bearer test-token')
				.send({
					query: 'Page content',
					modalities: ['text', 'pdf_page_image'],
				});

			expect(searchResponse.status).toBe(200);
			expect(searchResponse.body.results).toBeDefined();
		});

		it('should provide comprehensive multimodal statistics', async () => {
			// Upload multiple files of different types
			const files = [
				{ name: 'image1.jpg', data: Buffer.from('fake-image-1'), type: 'image' },
				{ name: 'image2.png', data: Buffer.from('fake-image-2'), type: 'image' },
				{ name: 'audio1.mp3', data: Buffer.from('fake-audio-1'), type: 'audio' },
				{ name: 'document1.pdf', data: Buffer.from('fake-pdf-1'), type: 'pdf_with_images' },
			];

			for (const file of files) {
				await request(app)
					.post('/api/multimodal/upload')
					.set('Authorization', 'Bearer test-token')
					.attach('file', file.data, file.name);
			}

			// Get comprehensive statistics
			const statsResponse = await request(app)
				.get('/api/multimodal/stats')
				.set('Authorization', 'Bearer test-token');

			expect(statsResponse.status).toBe(200);
			expect(statsResponse.body).toMatchObject({
				documents: {
					total: 4,
					byModality: expect.objectContaining({
						image: 2,
						audio: 1,
						pdf_with_images: 1,
					}),
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

		it('should handle cross-modal search across all content types', async () => {
			// Upload files of different modalities with related content
			await request(app)
				.post('/api/multimodal/upload')
				.set('Authorization', 'Bearer test-token')
				.attach('file', Buffer.from('solar-panel-image'), 'solar-panel.jpg')
				.field('options', JSON.stringify({ enableOCR: true }));

			await request(app)
				.post('/api/multimodal/upload')
				.set('Authorization', 'Bearer test-token')
				.attach('file', Buffer.from('solar-energy-audio'), 'solar-energy.mp3')
				.field('options', JSON.stringify({ enableTranscription: true }));

			await request(app)
				.post('/api/multimodal/upload')
				.set('Authorization', 'Bearer test-token')
				.attach('file', Buffer.from('renewable-energy-pdf'), 'renewable-energy.pdf');

			// Search across all modalities
			const searchResponse = await request(app)
				.post('/api/multimodal/search')
				.set('Authorization', 'Bearer test-token')
				.send({
					query: 'solar energy renewable',
					modalities: ['text', 'image', 'audio_transcript', 'pdf_page_image'],
					limit: 20,
					minScore: 0.5,
				});

			expect(searchResponse.status).toBe(200);
			expect(searchResponse.body.results).toBeDefined();
			expect(searchResponse.body.query).toBe('solar energy renewable');
			expect(searchResponse.body.modalities).toEqual([
				'text',
				'image',
				'audio_transcript',
				'pdf_page_image',
			]);

			// Verify results include different modalities
			const modalitiesInResults = new Set(searchResponse.body.results.map((r: any) => r.modality));
			expect(modalitiesInResults.size).toBeGreaterThan(0);
		});
	});

	describe('Error Handling and Edge Cases', () => {
		it('should handle invalid file types gracefully', async () => {
			const response = await request(app)
				.post('/api/multimodal/upload')
				.set('Authorization', 'Bearer test-token')
				.attach('file', Buffer.from('fake-text-data'), 'test.txt');

			// The file should be processed as 'text' modality (default fallback)
			expect(response.status).toBe(200);
			expect(response.body.modality).toBe('text');
		});

		it('should handle large files with size limits', async () => {
			// This would normally fail at the multer level, but we can test the service validation
			const { imageProcessingService } = await import('../../services/imageProcessingService.js');

			await expect(
				imageProcessingService.processImage(Buffer.alloc(60 * 1024 * 1024), 'large.jpg'),
			).rejects.toThrow('exceeds maximum allowed size');
		});

		it('should handle malformed or corrupted files', async () => {
			const { imageProcessingService } = await import('../../services/imageProcessingService.js');

			// Mock Sharp to throw an error for corrupted image
			const { default: sharp } = await import('sharp');
			vi.mocked(sharp).mockImplementation(() => {
				throw new Error('Corrupt image file');
			});

			await expect(
				imageProcessingService.processImage(Buffer.from('corrupted-data'), 'corrupt.jpg'),
			).rejects.toThrow('Invalid or corrupted image file');
		});

		it('should handle service failures gracefully', async () => {
			// Mock service to fail during processing
			const { imageProcessingService } = await import('../../services/imageProcessingService.js');
			vi.spyOn(imageProcessingService, 'processImage').mockRejectedValueOnce(
				new Error('Service unavailable'),
			);

			const response = await request(app)
				.post('/api/multimodal/upload')
				.set('Authorization', 'Bearer test-token')
				.attach('file', Buffer.from('fake-image-data'), 'test-image.jpg');

			expect(response.status).toBe(500);
			expect(response.body).toMatchObject({
				error: 'Multimodal System Error',
				brand: 'brAInwav',
			});
		});
	});

	describe('Performance and Scalability', () => {
		it('should handle concurrent uploads', async () => {
			const uploadPromises = Array(5)
				.fill(null)
				.map((_, index) =>
					request(app)
						.post('/api/multimodal/upload')
						.set('Authorization', 'Bearer test-token')
						.attach('file', Buffer.from(`concurrent-image-${index}`), `image-${index}.jpg`),
				);

			const responses = await Promise.all(uploadPromises);

			// All uploads should succeed
			responses.forEach((response) => {
				expect(response.status).toBe(200);
				expect(response.body).toMatchObject({
					status: 'success',
					brand: 'brAInwav',
				});
			});

			// Verify all documents are listed
			const listResponse = await request(app)
				.get('/api/multimodal/documents')
				.set('Authorization', 'Bearer test-token');

			expect(listResponse.status).toBe(200);
			expect(listResponse.body.documents).toHaveLength(5);
		});

		it('should handle search performance with many results', async () => {
			// Upload multiple files to create a larger dataset
			for (let i = 0; i < 10; i++) {
				await request(app)
					.post('/api/multimodal/upload')
					.set('Authorization', 'Bearer test-token')
					.attach('file', Buffer.from(`test-data-${i}`), `test-${i}.jpg`);
			}

			const startTime = Date.now();
			const searchResponse = await request(app)
				.post('/api/multimodal/search')
				.set('Authorization', 'Bearer test-token')
				.send({
					query: 'test',
					limit: 50,
				});

			const endTime = Date.now();
			const searchTime = endTime - startTime;

			expect(searchResponse.status).toBe(200);
			expect(searchTime).toBeLessThan(1000); // Should complete within 1 second
			expect(searchResponse.body.processingTime).toBeLessThan(500);
		});
	});
});
