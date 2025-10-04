import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentProcessingService } from '../../services/documentProcessingService';
import type { DocumentParseResult } from '../../types/document';
import type { ChunkOptions, DocumentChunk } from '../../types/rag';

describe('DocumentProcessingService', () => {
	let service: DocumentProcessingService;

	beforeEach(() => {
		service = new DocumentProcessingService();
	});

	describe('processDocument', () => {
		it('should process document and create chunks successfully', async () => {
			const parseResult: DocumentParseResult = {
				type: 'text',
				text: 'This is a test document with multiple sentences.\n\nThis is the second paragraph.',
				fileName: 'test.txt',
				fileSize: 100,
				metadata: {
					encoding: 'utf-8',
					lines: 2,
				},
			};

			const result = await service.processDocument(parseResult, 'user123');

			expect(result.chunks).toHaveLength(2);
			expect(result.chunks[0].content).toContain('test document');
			expect(result.chunks[1].content).toContain('second paragraph');
			expect(result.chunks.every((chunk) => chunk.id)).toBeTruthy();
			expect(result.chunks.every((chunk) => chunk.documentId === '')).toBeTruthy();
		});

		it('should handle empty documents', async () => {
			const parseResult: DocumentParseResult = {
				type: 'text',
				text: '',
				fileName: 'empty.txt',
				fileSize: 0,
				metadata: {},
			};

			const result = await service.processDocument(parseResult, 'user123');

			expect(result.chunks).toHaveLength(0);
		});

		it('should handle very long documents', async () => {
			const longText = 'This is a sentence. '.repeat(1000);
			const parseResult: DocumentParseResult = {
				type: 'text',
				text: longText,
				fileName: 'long.txt',
				fileSize: longText.length,
				metadata: {},
			};

			const result = await service.processDocument(parseResult, 'user123');

			expect(result.chunks.length).toBeGreaterThan(1);
			expect(result.chunks.every((chunk) => chunk.content.length <= 2000)).toBeTruthy();
		});

		it('should handle processing errors', async () => {
			const parseResult: DocumentParseResult = {
				type: 'text',
				text: 'Valid text',
				fileName: 'test.txt',
				fileSize: 100,
				metadata: {},
			};

			// Mock the chunkText method to throw an error
			vi.spyOn(service as any, 'chunkText').mockImplementation(() => {
				throw new Error('Chunking failed');
			});

			await expect(service.processDocument(parseResult, 'user123')).rejects.toThrow(
				'Document processing failed',
			);
		});
	});

	describe('chunkText', () => {
		it('should create semantic chunks from paragraphs', () => {
			const text =
				'First paragraph with some content.\n\nSecond paragraph with more content.\n\nThird paragraph.';
			const options: ChunkOptions = {
				chunkSize: 100,
				chunkOverlap: 20,
				maxChunkSize: 200,
				minChunkSize: 50,
			};

			const chunks = (service as any).chunkText.call(service, text, options);

			expect(chunks).toHaveLength(3);
			expect(chunks[0].content).toContain('First paragraph');
			expect(chunks[1].content).toContain('Second paragraph');
			expect(chunks[2].content).toContain('Third paragraph');
		});

		it('should handle chunk overlap correctly', () => {
			const text = `${'A'.repeat(200)}\n\n${'B'.repeat(200)}`;
			const options: ChunkOptions = {
				chunkSize: 150,
				chunkOverlap: 50,
				maxChunkSize: 200,
				minChunkSize: 50,
			};

			const chunks = (service as any).chunkText.call(service, text, options);

			expect(chunks.length).toBeGreaterThan(1);
			// Check that there's overlap between chunks
			if (chunks.length > 1) {
				const firstChunkEnd = chunks[0].content.slice(-50);
				const secondChunkStart = chunks[1].content.slice(0, 50);
				expect(firstChunkEnd).toBe(secondChunkStart);
			}
		});

		it('should validate chunk size constraints', () => {
			const text = 'Test text';
			const invalidOptions: ChunkOptions = {
				chunkSize: 3000, // Exceeds maxChunkSize
				chunkOverlap: 200,
				maxChunkSize: 2000,
				minChunkSize: 200,
			};

			expect(() => {
				(service as any).chunkText.call(service, text, invalidOptions);
			}).toThrow('Chunk size 3000 is outside valid range');
		});
	});

	describe('estimateTokenCount', () => {
		it('should estimate token count correctly', () => {
			const text = 'This is a test sentence with 10 words.';

			const tokenCount = service.estimateTokenCount(text);

			expect(tokenCount).toBeGreaterThan(0);
			expect(tokenCount).toBeLessThan(text.length);
		});

		it('should handle empty text', () => {
			const tokenCount = service.estimateTokenCount('');

			expect(tokenCount).toBe(0);
		});
	});

	describe('validateChunk', () => {
		it('should validate good chunks', () => {
			const chunk: DocumentChunk = {
				id: 'test',
				documentId: 'doc1',
				content: 'This is a meaningful chunk of text with sufficient length and content.',
				chunkIndex: 0,
				metadata: {
					startChar: 0,
					endChar: 60,
					chunkType: 'semantic',
				},
			};

			const isValid = service.validateChunk(chunk);

			expect(isValid).toBe(true);
		});

		it('should reject chunks with insufficient content', () => {
			const chunk: DocumentChunk = {
				id: 'test',
				documentId: 'doc1',
				content: 'Short',
				chunkIndex: 0,
				metadata: {
					startChar: 0,
					endChar: 5,
					chunkType: 'semantic',
				},
			};

			const isValid = service.validateChunk(chunk);

			expect(isValid).toBe(false);
		});

		it('should reject chunks with missing metadata', () => {
			const chunk: DocumentChunk = {
				id: 'test',
				documentId: 'doc1',
				content: 'This is a meaningful chunk of text with sufficient length and content.',
				chunkIndex: 0,
			};

			const isValid = service.validateChunk(chunk);

			expect(isValid).toBe(false);
		});
	});

	describe('getProcessingStats', () => {
		it('should calculate processing statistics correctly', () => {
			const chunks: DocumentChunk[] = [
				{
					id: '1',
					documentId: 'doc1',
					content: 'Short chunk',
					chunkIndex: 0,
					tokenCount: 5,
				},
				{
					id: '2',
					documentId: 'doc1',
					content: 'This is a much longer chunk with significantly more content.',
					chunkIndex: 1,
					tokenCount: 15,
				},
			];

			const stats = service.getProcessingStats(chunks);

			expect(stats.totalChunks).toBe(2);
			expect(stats.totalTokens).toBe(20);
			expect(stats.averageChunkSize).toBeGreaterThan(10);
			expect(stats.maxChunkSize).toBeGreaterThan(stats.minChunkSize);
		});
	});
});
