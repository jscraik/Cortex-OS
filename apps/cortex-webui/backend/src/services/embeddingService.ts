import { createHash } from 'node:crypto';
import type { EmbeddingService as IEmbeddingService } from '../types/rag.js';
import logger from '../utils/logger.js';

/**
 * Configuration for embedding service
 */
interface EmbeddingConfig {
	provider: 'openai' | 'sentence-transformers' | 'mock';
	model: string;
	dimensions: number;
	apiKey?: string;
	apiBase?: string;
}

/**
 * Embedding Service for generating vector representations of text
 * Supports multiple embedding providers with fallback mechanisms
 */
export class EmbeddingService implements IEmbeddingService {
	private readonly config: EmbeddingConfig;
	private readonly cache = new Map<string, number[]>();

	constructor(config?: Partial<EmbeddingConfig>) {
		this.config = {
			provider: 'mock', // Default to mock for development
			model: 'all-MiniLM-L6-v2',
			dimensions: 384,
			...config,
		};

		logger.info('embedding:service_initialized', {
			provider: this.config.provider,
			model: this.config.model,
			dimensions: this.config.dimensions,
			brand: 'brAInwav',
		});
	}

	/**
	 * Generate embedding for a single text
	 */
	async generateEmbedding(text: string): Promise<number[]> {
		const cacheKey = this.getCacheKey(text);

		// Check cache first
		if (this.cache.has(cacheKey)) {
			logger.debug('embedding:cache_hit', { textLength: text.length });
			return this.cache.get(cacheKey)!;
		}

		try {
			let embedding: number[];

			switch (this.config.provider) {
				case 'openai':
					embedding = await this.generateOpenAIEmbedding(text);
					break;
				case 'sentence-transformers':
					embedding = await this.generateSentenceTransformersEmbedding(text);
					break;
				case 'mock':
					embedding = this.generateMockEmbedding(text);
					break;
				default:
					throw new Error(`Unsupported embedding provider: ${this.config.provider}`);
			}

			// Cache the result
			this.cache.set(cacheKey, embedding);

			// Manage cache size (keep last 1000 embeddings)
			if (this.cache.size > 1000) {
				const firstKey = this.cache.keys().next().value;
				this.cache.delete(firstKey);
			}

			logger.debug('embedding:generated', {
				provider: this.config.provider,
				textLength: text.length,
				dimensions: embedding.length,
			});

			return embedding;
		} catch (error) {
			logger.error('embedding:generation_failed', {
				provider: this.config.provider,
				error: error instanceof Error ? error.message : 'Unknown error',
				textLength: text.length,
				brand: 'brAInwav',
			});

			// Fallback to mock embedding
			const fallbackEmbedding = this.generateMockEmbedding(text);
			this.cache.set(cacheKey, fallbackEmbedding);
			return fallbackEmbedding;
		}
	}

	/**
	 * Generate embeddings for multiple texts (batch processing)
	 */
	async generateEmbeddings(texts: string[]): Promise<number[][]> {
		logger.info('embedding:batch_start', {
			textCount: texts.length,
			provider: this.config.provider,
		});

		try {
			const embeddings = await Promise.all(texts.map((text) => this.generateEmbedding(text)));

			logger.info('embedding:batch_complete', {
				textCount: texts.length,
				provider: this.config.provider,
				dimensions: this.config.dimensions,
			});

			return embeddings;
		} catch (error) {
			logger.error('embedding:batch_failed', {
				provider: this.config.provider,
				error: error instanceof Error ? error.message : 'Unknown error',
				textCount: texts.length,
				brand: 'brAInwav',
			});

			// Fallback to mock embeddings for all texts
			return texts.map((text) => this.generateMockEmbedding(text));
		}
	}

	/**
	 * Get embedding dimensions
	 */
	getEmbeddingDimensions(): number {
		return this.config.dimensions;
	}

	/**
	 * Generate OpenAI embedding
	 */
	private async generateOpenAIEmbedding(text: string): Promise<number[]> {
		if (!this.config.apiKey) {
			throw new Error('OpenAI API key is required for OpenAI embeddings');
		}

		const response = await fetch(
			`${this.config.apiBase || 'https://api.openai.com'}/v1/embeddings`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${this.config.apiKey}`,
				},
				body: JSON.stringify({
					input: text,
					model: this.config.model,
				}),
			},
		);

		if (!response.ok) {
			throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();
		return data.data[0].embedding;
	}

	/**
	 * Generate sentence-transformers embedding
	 * Note: This would require a Python backend or WASM implementation
	 * For now, using mock implementation
	 */
	private async generateSentenceTransformersEmbedding(text: string): Promise<number[]> {
		// TODO: Implement actual sentence-transformers integration
		// This would require either:
		// 1. Python subprocess call
		// 2. WASM implementation
		// 3. External microservice

		logger.warn('embedding:sentence_transformers_not_implemented', {
			message: 'Using mock embedding for sentence-transformers provider',
			brand: 'brAInwav',
		});

		return this.generateMockEmbedding(text);
	}

	/**
	 * Generate mock embedding for development/testing
	 */
	private generateMockEmbedding(text: string): number[] {
		const hash = createHash('sha256').update(text).digest('hex');
		const embedding: number[] = [];

		for (let i = 0; i < this.config.dimensions; i++) {
			// Generate deterministic pseudo-random values based on text hash
			const hashSegment = hash.substring(i * 2, (i + 1) * 2);
			const value = parseInt(hashSegment, 16) / 255;

			// Normalize to [-1, 1] range
			embedding.push((value - 0.5) * 2);
		}

		// Normalize the embedding vector
		return this.normalizeVector(embedding);
	}

	/**
	 * Normalize vector to unit length
	 */
	private normalizeVector(vector: number[]): number[] {
		const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));

		if (magnitude === 0) {
			return vector;
		}

		return vector.map((val) => val / magnitude);
	}

	/**
	 * Generate cache key for text
	 */
	private getCacheKey(text: string): string {
		return createHash('md5').update(text).digest('hex');
	}

	/**
	 * Clear embedding cache
	 */
	clearCache(): void {
		this.cache.clear();
		logger.info('embedding:cache_cleared', { brand: 'brAInwav' });
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { size: number; maxSize: number } {
		return {
			size: this.cache.size,
			maxSize: 1000,
		};
	}

	/**
	 * Calculate cosine similarity between two embeddings
	 */
	calculateSimilarity(embedding1: number[], embedding2: number[]): number {
		if (embedding1.length !== embedding2.length) {
			throw new Error('Embeddings must have the same dimensions');
		}

		const dotProduct = embedding1.reduce((sum, val, i) => sum + val * embedding2[i], 0);
		const magnitude1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
		const magnitude2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));

		return dotProduct / (magnitude1 * magnitude2);
	}

	/**
	 * Validate embedding format
	 */
	validateEmbedding(embedding: number[]): boolean {
		return (
			Array.isArray(embedding) &&
			embedding.length === this.config.dimensions &&
			embedding.every(
				(val) => typeof val === 'number' && !Number.isNaN(val) && Number.isFinite(val),
			)
		);
	}
}

// Create and export singleton instances for different providers
export const mockEmbeddingService = new EmbeddingService({
	provider: 'mock',
	model: 'mock-v1',
	dimensions: 384,
});

export const openaiEmbeddingService = new EmbeddingService({
	provider: 'openai',
	model: 'text-embedding-ada-002',
	dimensions: 1536,
	apiKey: process.env.OPENAI_API_KEY,
	apiBase: process.env.OPENAI_API_BASE,
});

// Export the configured service based on environment
export const embeddingService = process.env.OPENAI_API_KEY
	? openaiEmbeddingService
	: mockEmbeddingService;
