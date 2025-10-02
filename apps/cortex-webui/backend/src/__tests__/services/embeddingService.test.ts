import { beforeEach, describe, expect, it } from 'vitest';
import { EmbeddingService } from '../../services/embeddingService.ts';

describe('EmbeddingService', () => {
	let service: EmbeddingService;

	beforeEach(() => {
		service = new EmbeddingService({
			provider: 'mock',
			model: 'test-model',
			dimensions: 384,
		});
	});

	describe('generateEmbedding', () => {
		it('should generate embedding for text', async () => {
			const text = 'This is a test text for embedding generation.';
			const embedding = await service.generateEmbedding(text);

			expect(embedding).toHaveLength(384);
			expect(embedding.every((val) => typeof val === 'number' && !Number.isNaN(val))).toBe(true);
		});

		it('should return same embedding for same text', async () => {
			const text = 'Consistent text input';
			const embedding1 = await service.generateEmbedding(text);
			const embedding2 = await service.generateEmbedding(text);

			expect(embedding1).toEqual(embedding2);
		});

		it('should return different embeddings for different texts', async () => {
			const text1 = 'First text';
			const text2 = 'Second text';
			const embedding1 = await service.generateEmbedding(text1);
			const embedding2 = await service.generateEmbedding(text2);

			expect(embedding1).not.toEqual(embedding2);
		});

		it('should handle empty text', async () => {
			const embedding = await service.generateEmbedding('');

			expect(embedding).toHaveLength(384);
		});

		it('should cache embeddings', async () => {
			const text = 'Text for caching test';

			// First call
			const embedding1 = await service.generateEmbedding(text);
			const cacheStats1 = service.getCacheStats();

			// Second call should hit cache
			const embedding2 = await service.generateEmbedding(text);
			const cacheStats2 = service.getCacheStats();

			expect(embedding1).toEqual(embedding2);
			expect(cacheStats2.size).toBe(cacheStats1.size);
		});
	});

	describe('generateEmbeddings', () => {
		it('should generate embeddings for multiple texts', async () => {
			const texts = [
				'First text for batch processing',
				'Second text for batch processing',
				'Third text for batch processing',
			];

			const embeddings = await service.generateEmbeddings(texts);

			expect(embeddings).toHaveLength(3);
			expect(embeddings.every((embedding) => embedding.length === 384)).toBe(true);
		});

		it('should handle empty array', async () => {
			const embeddings = await service.generateEmbeddings([]);

			expect(embeddings).toHaveLength(0);
		});
	});

	describe('getEmbeddingDimensions', () => {
		it('should return correct dimensions', () => {
			const dimensions = service.getEmbeddingDimensions();

			expect(dimensions).toBe(384);
		});
	});

	describe('calculateSimilarity', () => {
		it('should calculate cosine similarity correctly', () => {
			const vector1 = [1, 0, 0];
			const vector2 = [0, 1, 0];
			const vector3 = [1, 0, 0];

			const similarity12 = service.calculateSimilarity(vector1, vector2);
			const similarity13 = service.calculateSimilarity(vector1, vector3);

			expect(similarity12).toBeCloseTo(0, 5);
			expect(similarity13).toBeCloseTo(1, 5);
		});

		it('should handle orthogonal vectors', () => {
			const vector1 = [1, 0];
			const vector2 = [0, 1];

			const similarity = service.calculateSimilarity(vector1, vector2);

			expect(similarity).toBeCloseTo(0, 5);
		});

		it('should throw error for different dimensions', () => {
			const vector1 = [1, 0];
			const vector2 = [1, 0, 0];

			expect(() => {
				service.calculateSimilarity(vector1, vector2);
			}).toThrow('Embeddings must have the same dimensions');
		});
	});

	describe('validateEmbedding', () => {
		it('should validate correct embedding', () => {
			const embedding = new Array(384).fill(0).map(() => Math.random());

			const isValid = service.validateEmbedding(embedding);

			expect(isValid).toBe(true);
		});

		it('should reject wrong dimensions', () => {
			const embedding = new Array(100).fill(0).map(() => Math.random());

			const isValid = service.validateEmbedding(embedding);

			expect(isValid).toBe(false);
		});

		it('should reject non-array input', () => {
			const embedding = 'not an array';

			const isValid = service.validateEmbedding(embedding as any);

			expect(isValid).toBe(false);
		});

		it('should reject NaN values', () => {
			const embedding = new Array(384).fill(0);
			embedding[0] = NaN;

			const isValid = service.validateEmbedding(embedding);

			expect(isValid).toBe(false);
		});
	});

	describe('clearCache', () => {
		it('should clear embedding cache', async () => {
			// Add something to cache
			await service.generateEmbedding('test text');
			expect(service.getCacheStats().size).toBeGreaterThan(0);

			// Clear cache
			service.clearCache();
			expect(service.getCacheStats().size).toBe(0);
		});
	});

	describe('getCacheStats', () => {
		it('should return cache statistics', () => {
			const stats = service.getCacheStats();

			expect(stats).toHaveProperty('size');
			expect(stats).toHaveProperty('maxSize');
			expect(typeof stats.size).toBe('number');
			expect(typeof stats.maxSize).toBe('number');
		});
	});
});
