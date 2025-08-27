/**
 * @file qwen-embedding-real.test.ts
 * @description Test real Qwen embedding functionality
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EmbeddingAdapter, createEmbeddingAdapter, AVAILABLE_EMBEDDING_MODELS } from '../embedding-adapter.js';

describe('🔥 Real Qwen Embedding Tests', () => {
  let embeddingAdapter: EmbeddingAdapter;

  beforeEach(() => {
    // Use sentence-transformers with Qwen model
    embeddingAdapter = createEmbeddingAdapter('sentence-transformers');
  });

  describe('Qwen Model Integration', () => {
    it('should create adapter with Qwen configuration', () => {
      const stats = embeddingAdapter.getStats();
      
      expect(stats.provider).toBe('sentence-transformers');
      expect(stats.dimensions).toBe(1024);
      expect(stats.totalDocuments).toBe(0);
    });

    it('should generate real Qwen embeddings', async () => {
      const text = 'Machine learning is transforming artificial intelligence.';
      const embeddings = await embeddingAdapter.generateEmbeddings(text);
      
      expect(embeddings).toBeDefined();
      expect(Array.isArray(embeddings)).toBe(true);
      expect(embeddings.length).toBe(1);
      expect(embeddings[0].length).toBe(1024);
      
      // Check embedding values are reasonable
      const values = embeddings[0];
      const hasNonZero = values.some(v => v !== 0);
      expect(hasNonZero).toBe(true);
      
      // Check normalization (should be close to unit vector)
      const magnitude = Math.sqrt(values.reduce((sum, val) => sum + val * val, 0));
      expect(magnitude).toBeGreaterThan(0.9);
      expect(magnitude).toBeLessThan(1.1);
    }, 30000); // Allow 30 seconds for model loading

    it('should generate different embeddings for different texts', async () => {
      const texts = [
        'Artificial intelligence powers modern applications',
        'The weather is sunny today',
        'Python is a programming language'
      ];
      
      const embeddings = await embeddingAdapter.generateEmbeddings(texts);
      
      expect(embeddings.length).toBe(3);
      expect(embeddings[0].length).toBe(1024);
      expect(embeddings[1].length).toBe(1024);
      expect(embeddings[2].length).toBe(1024);
      
      // Embeddings should be different
      expect(embeddings[0]).not.toEqual(embeddings[1]);
      expect(embeddings[1]).not.toEqual(embeddings[2]);
      
      // Calculate similarities to verify semantic meaning
      const similarity01 = cosineSimilarity(embeddings[0], embeddings[1]);
      const similarity02 = cosineSimilarity(embeddings[0], embeddings[2]);
      
      // Both should be valid similarities
      expect(similarity01).toBeGreaterThan(-1);
      expect(similarity01).toBeLessThan(1);
      expect(similarity02).toBeGreaterThan(-1);
      expect(similarity02).toBeLessThan(1);
    }, 30000);

    it('should work with local transformers provider', async () => {
      const localAdapter = createEmbeddingAdapter('local');
      
      const text = 'Testing local transformers with Qwen model';
      const embeddings = await localAdapter.generateEmbeddings(text);
      
      expect(embeddings).toBeDefined();
      expect(embeddings.length).toBe(1);
      expect(embeddings[0].length).toBe(1024);
    }, 30000);
  });

  describe('Semantic Search with Qwen', () => {
    beforeEach(async () => {
      // Add a knowledge base for testing
      const documents = [
        'Machine learning algorithms can predict future outcomes based on historical data.',
        'Natural language processing enables computers to understand and generate human language.',
        'Computer vision allows machines to interpret and analyze visual information from images.',
        'Deep learning uses neural networks with multiple layers to learn complex patterns.',
        'Artificial intelligence encompasses various technologies that mimic human intelligence.',
        'Data science involves extracting insights from large datasets using statistical methods.',
        'Python is a popular programming language for data science and machine learning.',
        'JavaScript is primarily used for web development and frontend applications.',
        'The weather forecast predicts rain for tomorrow afternoon.',
        'Cooking Italian pasta requires boiling water and adding salt.'
      ];
      
      await embeddingAdapter.addDocuments(documents);
    }, 60000);

    it('should find semantically similar documents', async () => {
      const query = 'neural networks and deep learning';
      const results = await embeddingAdapter.similaritySearch({
        text: query,
        topK: 3
      });
      
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(3);
      
      // Results should be sorted by similarity
      for (let i = 1; i < results.length; i++) {
        expect(results[i].similarity).toBeLessThanOrEqual(results[i - 1].similarity);
      }
      
      // The top result should be about deep learning/neural networks
      const topResult = results[0];
      expect(topResult.text.toLowerCase()).toMatch(/deep learning|neural network/);
      expect(topResult.similarity).toBeGreaterThan(0.5); // Should be reasonably similar
    }, 45000);

    it('should handle domain-specific queries', async () => {
      const programmingQuery = 'coding and software development languages';
      const results = await embeddingAdapter.similaritySearch({
        text: programmingQuery,
        topK: 2
      });
      
      expect(results.length).toBeGreaterThan(0);
      
      // Should prioritize programming-related content
      const programmingRelated = results.some(r => 
        r.text.toLowerCase().includes('python') || 
        r.text.toLowerCase().includes('javascript')
      );
      expect(programmingRelated).toBe(true);
    }, 30000);

    it('should filter unrelated content', async () => {
      const aiQuery = 'artificial intelligence and machine learning';
      const results = await embeddingAdapter.similaritySearch({
        text: aiQuery,
        threshold: 0.3 // Moderate threshold
      });
      
      expect(results).toBeDefined();
      
      // Should not include cooking or weather content at reasonable threshold
      const hasUnrelated = results.some(r => 
        r.text.toLowerCase().includes('cooking') || 
        r.text.toLowerCase().includes('weather')
      );
      expect(hasUnrelated).toBe(false);
    }, 30000);
  });

  describe('Performance with Real Model', () => {
    it('should handle batch embeddings efficiently', async () => {
      const texts = Array.from({ length: 10 }, (_, i) => 
        `This is test document number ${i} for batch processing evaluation.`
      );
      
      const startTime = Date.now();
      const embeddings = await embeddingAdapter.generateEmbeddings(texts);
      const duration = Date.now() - startTime;
      
      expect(embeddings.length).toBe(10);
      expect(embeddings[0].length).toBe(1024);
      
      // Should complete within reasonable time (model loading + inference)
      expect(duration).toBeLessThan(60000); // 60 seconds max
      
      console.log(`Batch embedding (10 texts) took ${duration}ms`);
    }, 90000);

    it('should generate consistent embeddings', async () => {
      const text = 'Consistency test for embedding generation';
      
      const embeddings1 = await embeddingAdapter.generateEmbeddings(text);
      const embeddings2 = await embeddingAdapter.generateEmbeddings(text);
      
      // Should be very similar (accounting for any non-determinism)
      const similarity = cosineSimilarity(embeddings1[0], embeddings2[0]);
      expect(similarity).toBeGreaterThan(0.99); // Very high similarity expected
    }, 30000);
  });
});

// Helper function for cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}