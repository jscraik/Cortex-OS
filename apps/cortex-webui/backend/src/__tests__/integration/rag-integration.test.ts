import type { Express, NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../server';

// Extend Request interface for user property
interface AuthenticatedRequest extends Request {
	user?: { id: string; email: string };
}

// Mock service types using Vitest Mock
type MockDocumentProcessingService = {
	processDocument: Mock;
	estimateTokenCount: Mock;
};

type MockVectorSearchService = {
	indexDocuments: Mock;
	search: Mock;
	deleteDocument: Mock;
	getDocument: Mock;
	listUserDocuments: Mock;
	getSearchStats: Mock;
};

type MockEmbeddingService = {
	generateEmbeddings: Mock;
	generateEmbedding: Mock;
	getEmbeddingDimensions: Mock;
	getCacheStats: Mock;
};

type MockDatabase = {
	select: Mock;
	insert: Mock;
	update: Mock;
	delete: Mock;
};

// Mock the services
vi.mock('../../services/documentProcessingService', () => ({
	documentProcessingService: {
		processDocument: vi.fn(),
		estimateTokenCount: vi.fn(),
	},
}));

vi.mock('../../services/vectorSearchService', () => ({
	vectorSearchService: {
		indexDocuments: vi.fn(),
		search: vi.fn(),
		deleteDocument: vi.fn(),
		getDocument: vi.fn(),
		listUserDocuments: vi.fn(),
		getSearchStats: vi.fn(),
	},
}));

vi.mock('../../services/embeddingService', () => ({
	embeddingService: {
		generateEmbedding: vi.fn(),
		generateEmbeddings: vi.fn(),
		getEmbeddingDimensions: vi.fn(),
		getCacheStats: vi.fn(),
	},
}));

// Mock the database
vi.mock('../../db/index', () => ({
	db: {
		insert: vi.fn(),
		select: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
	},
}));

describe('RAG Integration Tests', () => {
	let app: Express;
	let mockDocumentProcessingService: MockDocumentProcessingService;
	let mockVectorSearchService: MockVectorSearchService;
	let mockEmbeddingService: MockEmbeddingService;
	let mockDb: MockDatabase;

	beforeEach(async () => {
		app = createApp();

		// Get mock instances
		const documentProcessingModule = await import('../../services/documentProcessingService.js');
		const vectorSearchModule = await import('../../services/vectorSearchService.js');
		const embeddingModule = await import('../../services/embeddingService.js');
		const dbModule = await import('../../db/index.js');

		mockDocumentProcessingService = vi.mocked(documentProcessingModule.documentProcessingService);
		mockVectorSearchService = vi.mocked(vectorSearchModule.vectorSearchService);
		mockEmbeddingService = vi.mocked(embeddingModule.embeddingService);
		mockDb = dbModule.db;

		// Reset all mocks
		vi.clearAllMocks();

		// Setup default mock responses
		mockDocumentProcessingService.processDocument.mockResolvedValue({
			chunks: [
				{
					id: 'chunk1',
					documentId: 'doc1',
					content: 'Test chunk content',
					chunkIndex: 0,
					metadata: { startChar: 0, endChar: 50 },
				},
			],
			metadata: { title: 'Test Document' },
		});

		mockDocumentProcessingService.estimateTokenCount.mockReturnValue(25);

		mockVectorSearchService.indexDocuments.mockResolvedValue(undefined);
		mockVectorSearchService.search.mockResolvedValue({
			results: [
				{
					id: 'chunk1',
					documentId: 'doc1',
					filename: 'test.pdf',
					content: 'Relevant content',
					score: 0.95,
					chunkIndex: 0,
					startPage: 1,
					endPage: 1,
					citations: [
						{
							documentId: 'doc1',
							documentName: 'Test Document',
							filename: 'test.pdf',
							page: 1,
							text: 'Relevant content',
							score: 0.95,
						},
					],
				},
			],
			total: 1,
			query: 'test query',
			processingTime: 150,
		});

		mockVectorSearchService.listUserDocuments.mockResolvedValue([
			{
				id: 'doc1',
				userId: 'user1',
				filename: 'test.pdf',
				originalName: 'Test Document.pdf',
				mimeType: 'application/pdf',
				size: 1024,
				totalChunks: 2,
				processed: true,
				processingStatus: 'completed',
				metadata: '{}',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		]);

		mockVectorSearchService.getDocument.mockResolvedValue({
			id: 'doc1',
			userId: 'user1',
			filename: 'test.pdf',
			originalName: 'Test Document.pdf',
			mimeType: 'application/pdf',
			size: 1024,
			totalChunks: 2,
			processed: true,
			processingStatus: 'completed',
			metadata: '{}',
			createdAt: new Date(),
			updatedAt: new Date(),
			chunks: [
				{
					id: 'chunk1',
					documentId: 'doc1',
					content: 'First chunk',
					chunkIndex: 0,
					startPage: 1,
					endPage: 1,
					tokenCount: 25,
					embedding: JSON.stringify([]),
					metadata: JSON.stringify({}),
					createdAt: new Date(),
				},
			],
		});

		mockVectorSearchService.getSearchStats.mockResolvedValue({
			totalDocuments: 5,
			totalChunks: 50,
			processedDocuments: 4,
			indexedChunks: 45,
		});

		mockEmbeddingService.generateEmbedding.mockResolvedValue(
			new Array(384).fill(0).map(() => Math.random()),
		);
		mockEmbeddingService.generateEmbeddings.mockResolvedValue([
			new Array(384).fill(0).map(() => Math.random()),
		]);
		mockEmbeddingService.getEmbeddingDimensions.mockReturnValue(384);
		mockEmbeddingService.getCacheStats.mockReturnValue({ size: 10, maxSize: 1000 });

		// Mock database operations
		const mockInsert = {
			values: vi.fn().mockResolvedValue(undefined),
		};
		const mockUpdate = {
			set: vi.fn().mockReturnThis(),
			where: vi.fn().mockResolvedValue(undefined),
		};
		const mockSelect = {
			from: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			orderBy: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			innerJoin: vi.fn().mockReturnThis(),
		};
		const mockDelete = {
			where: vi.fn().mockResolvedValue(undefined),
		};

		mockDb.insert.mockReturnValue(mockInsert);
		mockDb.update.mockReturnValue(mockUpdate);
		mockDb.select.mockReturnValue(mockSelect);
		mockDb.delete.mockReturnValue(mockDelete);

		// Setup auth middleware mock
		vi.doMock('../../middleware/auth.js', () => ({
			authenticateToken: (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
				req.user = { id: 'user1', email: 'test@example.com' };
				next();
			},
		}));

		// Setup CSRF protection mock
		vi.doMock('../../middleware/security', () => ({
			customCsrfProtection: (_req: Request, _res: Response, next: NextFunction) => next(),
		}));
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('POST /api/v1/rag/documents/upload', () => {
		it('should upload and process document successfully', async () => {
			const response = await request(app)
				.post('/api/v1/rag/documents/upload')
				.set('Authorization', 'Bearer mock-token')
				.attach('document', Buffer.from('test content'), 'test.txt')
				.expect(200);

			expect(response.body).toMatchObject({
				documentId: expect.any(String),
				filename: 'test.txt',
				status: 'success',
				chunksCreated: 1,
			});

			expect(mockDocumentProcessingService.processDocument).toHaveBeenCalled();
			expect(mockVectorSearchService.indexDocuments).toHaveBeenCalled();
		});

		it('should handle missing file', async () => {
			const response = await request(app)
				.post('/api/v1/rag/documents/upload')
				.set('Authorization', 'Bearer mock-token')
				.expect(400);

			expect(response.body).toMatchObject({
				error: 'RAG System Error',
				message: 'No file provided',
				brand: 'brAInwav',
			});
		});

		it('should handle processing errors', async () => {
			mockDocumentProcessingService.processDocument.mockRejectedValue(
				new Error('Processing failed'),
			);

			const response = await request(app)
				.post('/api/v1/rag/documents/upload')
				.set('Authorization', 'Bearer mock-token')
				.attach('document', Buffer.from('test content'), 'test.txt')
				.expect(500);

			expect(response.body).toMatchObject({
				error: 'Document Upload Failed',
				brand: 'brAInwav',
			});
		});
	});

	describe('GET /api/v1/rag/documents', () => {
		it('should list user documents', async () => {
			const response = await request(app)
				.get('/api/v1/rag/documents')
				.set('Authorization', 'Bearer mock-token')
				.expect(200);

			expect(response.body).toMatchObject({
				documents: expect.any(Array),
				total: expect.any(Number),
			});

			expect(response.body.documents).toHaveLength(1);
			expect(response.body.documents[0]).toMatchObject({
				id: 'doc1',
				filename: 'Test Document.pdf',
				mimeType: 'application/pdf',
				processed: true,
			});

			expect(mockVectorSearchService.listUserDocuments).toHaveBeenCalledWith('user1');
		});
	});

	describe('GET /api/v1/rag/documents/:id', () => {
		it('should get document details', async () => {
			const response = await request(app)
				.get('/api/v1/rag/documents/doc1')
				.set('Authorization', 'Bearer mock-token')
				.expect(200);

			expect(response.body).toMatchObject({
				id: 'doc1',
				filename: 'Test Document.pdf',
				mimeType: 'application/pdf',
				chunks: expect.any(Array),
			});

			expect(mockVectorSearchService.getDocument).toHaveBeenCalledWith('doc1', 'user1');
		});

		it('should handle non-existent document', async () => {
			mockVectorSearchService.getDocument.mockResolvedValue(null);

			const response = await request(app)
				.get('/api/v1/rag/documents/nonexistent')
				.set('Authorization', 'Bearer mock-token')
				.expect(404);

			expect(response.body).toMatchObject({
				error: 'RAG System Error',
				message: 'Document not found',
				brand: 'brAInwav',
			});
		});
	});

	describe('DELETE /api/v1/rag/documents/:id', () => {
		it('should delete document', async () => {
			// Mock document exists check
			const mockSelect = {
				select: vi.fn().mockReturnThis(),
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockResolvedValue([{ id: 'doc1' }]),
			};
			mockDb.select.mockReturnValue(mockSelect);

			const response = await request(app)
				.delete('/api/v1/rag/documents/doc1')
				.set('Authorization', 'Bearer mock-token')
				.expect(200);

			expect(response.body).toMatchObject({
				message: 'Document deleted successfully',
				documentId: 'doc1',
			});

			expect(mockVectorSearchService.deleteDocument).toHaveBeenCalledWith('doc1');
		});

		it('should handle deletion of non-existent document', async () => {
			// Mock document not found
			const mockSelect = {
				select: vi.fn().mockReturnThis(),
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockResolvedValue([]),
			};
			mockDb.select.mockReturnValue(mockSelect);

			const response = await request(app)
				.delete('/api/v1/rag/documents/nonexistent')
				.set('Authorization', 'Bearer mock-token')
				.expect(404);

			expect(response.body).toMatchObject({
				error: 'RAG System Error',
				message: 'Document not found',
				brand: 'brAInwav',
			});
		});
	});

	describe('POST /api/v1/rag/search', () => {
		it('should perform semantic search', async () => {
			const response = await request(app)
				.post('/api/v1/rag/search')
				.set('Authorization', 'Bearer mock-token')
				.send({ query: 'test query' })
				.expect(200);

			expect(response.body).toMatchObject({
				results: expect.any(Array),
				total: expect.any(Number),
				query: 'test query',
				processingTime: expect.any(Number),
			});

			expect(response.body.results).toHaveLength(1);
			expect(response.body.results[0]).toMatchObject({
				id: 'chunk1',
				filename: 'test.pdf',
				score: 0.95,
				citations: expect.any(Array),
			});

			expect(mockVectorSearchService.search).toHaveBeenCalledWith(
				{ query: 'test query', limit: 10, minScore: 0.7, documentIds: undefined },
				'user1',
			);
		});

		it('should handle search with custom parameters', async () => {
			const _response = await request(app)
				.post('/api/v1/rag/search')
				.set('Authorization', 'Bearer mock-token')
				.send({
					query: 'test query',
					limit: 5,
					minScore: 0.8,
					documentIds: ['doc1', 'doc2'],
				})
				.expect(200);

			expect(mockVectorSearchService.search).toHaveBeenCalledWith(
				{
					query: 'test query',
					limit: 5,
					minScore: 0.8,
					documentIds: ['doc1', 'doc2'],
				},
				'user1',
			);
		});

		it('should handle invalid search parameters', async () => {
			const response = await request(app)
				.post('/api/v1/rag/search')
				.set('Authorization', 'Bearer mock-token')
				.send({ query: '' })
				.expect(400);

			expect(response.body).toMatchObject({
				error: 'RAG System Error',
				message: 'Invalid search parameters',
				brand: 'brAInwav',
			});
		});
	});

	describe('POST /api/v1/rag/query', () => {
		it('should perform RAG query', async () => {
			const response = await request(app)
				.post('/api/v1/rag/query')
				.set('Authorization', 'Bearer mock-token')
				.send({ query: 'What is this about?' })
				.expect(200);

			expect(response.body).toMatchObject({
				answer: expect.any(String),
				context: expect.any(Array),
				citations: expect.any(Array),
				sources: expect.any(Array),
				processingTime: expect.any(Number),
			});

			expect(response.body.context).toHaveLength(1);
			expect(response.body.citations.length).toBeGreaterThan(0);
			expect(response.body.sources).toContain('Test Document');
		});

		it('should handle RAG query with document filters', async () => {
			const _response = await request(app)
				.post('/api/v1/rag/query')
				.set('Authorization', 'Bearer mock-token')
				.send({
					query: 'What is this about?',
					documentIds: ['doc1'],
					maxChunks: 3,
					includeCitations: true,
				})
				.expect(200);

			expect(mockVectorSearchService.search).toHaveBeenCalledWith(
				{
					query: 'What is this about?',
					limit: 3,
					documentIds: ['doc1'],
				},
				'user1',
			);
		});
	});

	describe('GET /api/v1/rag/stats', () => {
		it('should get RAG statistics', async () => {
			const response = await request(app)
				.get('/api/v1/rag/stats')
				.set('Authorization', 'Bearer mock-token')
				.expect(200);

			expect(response.body).toMatchObject({
				documents: {
					totalDocuments: 5,
					totalChunks: 50,
					processedDocuments: 4,
					indexedChunks: 45,
				},
				embeddings: {
					size: 10,
					maxSize: 1000,
				},
				brand: 'brAInwav',
			});

			expect(mockVectorSearchService.getSearchStats).toHaveBeenCalledWith('user1');
			expect(mockEmbeddingService.getCacheStats).toHaveBeenCalled();
		});
	});

	describe('Authentication', () => {
		it('should require authentication for all RAG endpoints', async () => {
			// Test all endpoints without authentication
			const endpoints = [
				{ method: 'post', path: '/api/v1/rag/documents/upload' },
				{ method: 'get', path: '/api/v1/rag/documents' },
				{ method: 'get', path: '/api/v1/rag/documents/doc1' },
				{ method: 'delete', path: '/api/v1/rag/documents/doc1' },
				{ method: 'post', path: '/api/v1/rag/search' },
				{ method: 'post', path: '/api/v1/rag/query' },
				{ method: 'get', path: '/api/v1/rag/stats' },
			];

			for (const endpoint of endpoints) {
				let response: request.Response;
				switch (endpoint.method) {
					case 'get':
						response = await request(app).get(endpoint.path).expect(401);
						break;
					case 'post':
						response = await request(app).post(endpoint.path).expect(401);
						break;
					case 'delete':
						response = await request(app).delete(endpoint.path).expect(401);
						break;
					default:
						throw new Error(`Unsupported method: ${endpoint.method}`);
				}
				expect(response.body).toMatchObject({
					error: expect.any(String),
				});
			}
		});
	});

	describe('Error Handling', () => {
		it('should handle service errors gracefully', async () => {
			mockVectorSearchService.search.mockRejectedValue(new Error('Search service error'));

			const response = await request(app)
				.post('/api/v1/rag/search')
				.set('Authorization', 'Bearer mock-token')
				.send({ query: 'test query' })
				.expect(500);

			expect(response.body).toMatchObject({
				error: 'RAG System Error',
				message: 'Search failed',
				brand: 'brAInwav',
			});
		});

		it('should handle database errors gracefully', async () => {
			mockDb.select.mockImplementation(() => {
				throw new Error('Database connection error');
			});

			const response = await request(app)
				.get('/api/v1/rag/documents')
				.set('Authorization', 'Bearer mock-token')
				.expect(500);

			expect(response.body).toMatchObject({
				error: 'RAG System Error',
				message: 'Failed to retrieve documents',
				brand: 'brAInwav',
			});
		});
	});
});
