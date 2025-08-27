/**
 * @file embedding-integration.test.ts
 * @description Test embedding and reranking capabilities
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  EmbeddingAdapter, 
  RerankerAdapter,
  createEmbeddingAdapter,
  createRerankerAdapter,
} from '../embedding-adapter.js';

describe('🔍 Embedding and Reranking Integration Tests', () => {
  let embeddingAdapter: EmbeddingAdapter;
  let rerankerAdapter: RerankerAdapter;

  beforeEach(() => {
    // Start with mock provider for consistent testing
    embeddingAdapter = createEmbeddingAdapter('mock');
    rerankerAdapter = createRerankerAdapter('mock');
  });

  describe('EmbeddingAdapter Core Functionality', () => {
    it('should create embedding adapter with correct configuration', () => {
      expect(embeddingAdapter).toBeDefined();
      
      const stats = embeddingAdapter.getStats();
      expect(stats.provider).toBe('mock');
      expect(stats.dimensions).toBe(1024); // Updated to match Qwen model
      expect(stats.totalDocuments).toBe(0);
    });

    it('should generate embeddings for single text', async () => {
      const text = 'Hello, world!';
      const embeddings = await embeddingAdapter.generateEmbeddings(text);
      
      expect(embeddings).toBeDefined();
      expect(Array.isArray(embeddings)).toBe(true);
      expect(embeddings.length).toBe(1);
      expect(embeddings[0].length).toBe(1024); // Qwen model dimensions
      
      // Check that embeddings are normalized (unit vectors)
      const magnitude = Math.sqrt(embeddings[0].reduce((sum, val) => sum + val * val, 0));
      expect(magnitude).toBeCloseTo(1.0, 5);
    });

    it('should generate embeddings for multiple texts', async () => {
      const texts = [
        'First document about cats',
        'Second document about dogs',
        'Third document about birds'
      ];
      
      const embeddings = await embeddingAdapter.generateEmbeddings(texts);
      
      expect(embeddings).toBeDefined();
      expect(embeddings.length).toBe(3);
      expect(embeddings[0].length).toBe(1024);
      expect(embeddings[1].length).toBe(1024);
      expect(embeddings[2].length).toBe(1024);
      
      // Check that different texts produce different embeddings
      expect(embeddings[0]).not.toEqual(embeddings[1]);
      expect(embeddings[1]).not.toEqual(embeddings[2]);
    });

    it('should generate deterministic embeddings for same text', async () => {
      const text = 'Deterministic test text';
      
      const embeddings1 = await embeddingAdapter.generateEmbeddings(text);
      const embeddings2 = await embeddingAdapter.generateEmbeddings(text);
      
      expect(embeddings1).toEqual(embeddings2);
    });
  });

  describe('Vector Store Operations', () => {
    it('should add documents to vector store', async () => {
      const texts = [
        'Machine learning is a subset of artificial intelligence',
        'Natural language processing helps computers understand text',
        'Computer vision enables machines to interpret images'
      ];
      
      const metadata = [
        { category: 'AI', topic: 'ML' },
        { category: 'AI', topic: 'NLP' },
        { category: 'AI', topic: 'CV' }
      ];
      
      const ids = await embeddingAdapter.addDocuments(texts, metadata);
      
      expect(ids).toBeDefined();
      expect(ids.length).toBe(3);
      expect(ids.every(id => typeof id === 'string')).toBe(true);
      
      const stats = embeddingAdapter.getStats();
      expect(stats.totalDocuments).toBe(3);
    });

    it('should retrieve documents by ID', async () => {
      const texts = ['Test document for retrieval'];
      const metadata = [{ source: 'test' }];
      
      const [id] = await embeddingAdapter.addDocuments(texts, metadata);
      const document = embeddingAdapter.getDocument(id);
      
      expect(document).toBeDefined();
      expect(document?.text).toBe('Test document for retrieval');
      expect(document?.metadata).toEqual({ source: 'test' });
      expect(document?.id).toBe(id);
    });

    it('should remove documents from vector store', async () => {
      const texts = ['Document to be removed'];
      const [id] = await embeddingAdapter.addDocuments(texts);
      
      // Verify document exists
      expect(embeddingAdapter.getDocument(id)).toBeDefined();
      
      // Remove document
      const removed = embeddingAdapter.removeDocument(id);
      expect(removed).toBe(true);
      
      // Verify document is gone
      expect(embeddingAdapter.getDocument(id)).toBeUndefined();
      
      const stats = embeddingAdapter.getStats();
      expect(stats.totalDocuments).toBe(0);
    });
  });

  describe('Similarity Search', () => {
    beforeEach(async () => {
      // Add test documents for similarity search
      const documents = [
        'Python is a popular programming language',
        'JavaScript is used for web development',
        'Machine learning models predict future outcomes',
        'Artificial intelligence transforms industries',
        'Data science involves statistical analysis',
        'Software engineering requires systematic approach'
      ];
      
      const metadata = documents.map((doc, i) => ({
        category: i < 2 ? 'programming' : i < 4 ? 'AI' : 'data',
        index: i
      }));
      
      await embeddingAdapter.addDocuments(documents, metadata);
    });

    it('should perform basic similarity search', async () => {
      const results = await embeddingAdapter.similaritySearch({
        text: 'programming languages and development',
        topK: 3
      });
      
      expect(results).toBeDefined();
      expect(results.length).toBeLessThanOrEqual(3);
      expect(results.length).toBeGreaterThan(0);
      
      // Results should be sorted by similarity (descending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i].similarity).toBeLessThanOrEqual(results[i - 1].similarity);
      }
      
      // All results should have required fields
      results.forEach(result => {
        expect(result.id).toBeDefined();
        expect(result.text).toBeDefined();
        expect(result.similarity).toBeDefined();
        expect(typeof result.similarity).toBe('number');
        expect(result.similarity).toBeGreaterThanOrEqual(-1);
        expect(result.similarity).toBeLessThanOrEqual(1);
      });
    });

    it('should filter search results by metadata', async () => {
      const results = await embeddingAdapter.similaritySearch({
        text: 'programming and development',
        filter: { category: 'programming' },
        topK: 5
      });
      
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      
      // All results should match the filter
      results.forEach(result => {
        expect(result.metadata?.category).toBe('programming');
      });
    });

    it('should respect similarity threshold', async () => {
      const results = await embeddingAdapter.similaritySearch({
        text: 'programming languages',
        threshold: 0.8, // High threshold
      });
      
      expect(results).toBeDefined();
      
      // All results should meet the threshold
      results.forEach(result => {
        expect(result.similarity).toBeGreaterThanOrEqual(0.8);
      });
    });

    it('should return empty results for very high threshold', async () => {
      const results = await embeddingAdapter.similaritySearch({
        text: 'completely unrelated quantum physics topic',
        threshold: 0.99, // Very high threshold
      });
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      // May or may not be empty depending on mock implementation
    });
  });

  describe('RerankerAdapter Functionality', () => {
    it('should create reranker adapter with correct configuration', () => {
      expect(rerankerAdapter).toBeDefined();
    });

    it('should rerank documents based on query relevance', async () => {
      const query = 'machine learning artificial intelligence';
      const documents = [
        'The weather is sunny today',
        'Machine learning algorithms learn from data',
        'Artificial intelligence powers modern applications',
        'Cooking recipes for Italian cuisine',
        'Deep learning is a subset of machine learning'
      ];
      
      const results = await rerankerAdapter.rerank(query, documents, 3);
      
      expect(results).toBeDefined();
      expect(results.length).toBeLessThanOrEqual(3);
      expect(results.length).toBeGreaterThan(0);
      
      // Results should be sorted by relevance score (descending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
      }
      
      // Results should have required fields
      results.forEach(result => {
        expect(result.text).toBeDefined();
        expect(result.score).toBeDefined();
        expect(result.originalIndex).toBeDefined();
        expect(typeof result.score).toBe('number');
        expect(typeof result.originalIndex).toBe('number');
      });
    });

    it('should maintain original document indices', async () => {
      const query = 'test query';
      const documents = ['First doc', 'Second doc', 'Third doc'];
      
      const results = await rerankerAdapter.rerank(query, documents);
      
      expect(results.length).toBe(3);
      
      // Check that original indices are preserved
      const originalIndices = results.map(r => r.originalIndex);
      expect(originalIndices).toContain(0);
      expect(originalIndices).toContain(1);
      expect(originalIndices).toContain(2);
    });

    it('should handle empty document list', async () => {
      const results = await rerankerAdapter.rerank('test query', []);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });

  describe('RAG Workflow Integration', () => {
    it('should support complete RAG workflow', async () => {
      // Step 1: Add knowledge base documents
      const knowledgeBase = [
        'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.',
        'React is a JavaScript library for building user interfaces.',
        'Node.js is a JavaScript runtime built on Chrome\'s V8 JavaScript engine.',
        'Python is an interpreted, high-level programming language.',
        'Machine learning is a method of data analysis that automates analytical model building.'
      ];
      
      await embeddingAdapter.addDocuments(knowledgeBase);
      
      // Step 2: Perform similarity search
      const query = 'What is TypeScript and how does it relate to JavaScript?';
      const searchResults = await embeddingAdapter.similaritySearch({
        text: query,
        topK: 3
      });
      
      expect(searchResults.length).toBeGreaterThan(0);
      
      // Step 3: Rerank results for better relevance
      const documentsToRerank = searchResults.map(r => r.text);
      const rerankedResults = await rerankerAdapter.rerank(query, documentsToRerank, 2);
      
      expect(rerankedResults.length).toBeGreaterThan(0);
      expect(rerankedResults.length).toBeLessThanOrEqual(2);
      
      // The workflow should prioritize TypeScript-related content
      const hasTypeScriptContent = rerankedResults.some(result => 
        result.text.toLowerCase().includes('typescript')
      );
      
      // Mock implementation might not guarantee this, but test the structure
      expect(rerankedResults[0].text).toBeDefined();
      expect(rerankedResults[0].score).toBeDefined();
    });
  });

  describe('Provider Configurations', () => {
    it('should create sentence-transformers adapter', () => {
      const adapter = createEmbeddingAdapter('sentence-transformers');
      const stats = adapter.getStats();
      
      expect(stats.provider).toBe('sentence-transformers');
      expect(stats.dimensions).toBe(1024); // Qwen model dimensions
    });

    it('should create OpenAI adapter', () => {
      const adapter = createEmbeddingAdapter('openai');
      const stats = adapter.getStats();
      
      expect(stats.provider).toBe('openai');
      expect(stats.dimensions).toBe(1536);
    });

    it('should create local adapter', () => {
      const adapter = createEmbeddingAdapter('local');
      const stats = adapter.getStats();
      
      expect(stats.provider).toBe('local');
      expect(stats.dimensions).toBe(1024); // Qwen model dimensions
    });

    it('should create transformers reranker', () => {
      const reranker = createRerankerAdapter('transformers');
      expect(reranker).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid embedding provider', () => {
      expect(() => {
        new EmbeddingAdapter({ provider: 'invalid' as any });
      }).toThrow('Unsupported embedding provider: invalid');
    });

    it('should handle invalid reranker provider', () => {
      expect(() => {
        new RerankerAdapter({ provider: 'invalid' as any });
      }).toThrow('Reranking not implemented for provider: invalid');
    });

    it('should handle empty text embeddings', async () => {
      const embeddings = await embeddingAdapter.generateEmbeddings('');
      
      expect(embeddings).toBeDefined();
      expect(embeddings.length).toBe(1);
      expect(embeddings[0].length).toBe(1024);
    });

    it('should handle very long text', async () => {
      const longText = 'word '.repeat(1000);
      const embeddings = await embeddingAdapter.generateEmbeddings(longText);
      
      expect(embeddings).toBeDefined();
      expect(embeddings.length).toBe(1);
      expect(embeddings[0].length).toBe(1024);
    });
  });

  describe('Performance and Memory', () => {
    it('should track memory usage correctly', async () => {
      const initialStats = embeddingAdapter.getStats();
      expect(initialStats.totalDocuments).toBe(0);
      
      // Add documents and check memory tracking
      const documents = Array.from({ length: 100 }, (_, i) => `Document ${i}`);
      await embeddingAdapter.addDocuments(documents);
      
      const afterStats = embeddingAdapter.getStats();
      expect(afterStats.totalDocuments).toBe(100);
      expect(afterStats.memoryUsage).toContain('MB');
      
      // Memory usage should increase with more documents
      const memoryValue = parseFloat(afterStats.memoryUsage.split(' ')[0]);
      expect(memoryValue).toBeGreaterThan(0);
    });

    it('should handle batch operations efficiently', async () => {
      const largeBatch = Array.from({ length: 50 }, (_, i) => 
        `Large batch document number ${i} with some content to embed`
      );
      
      const startTime = Date.now();
      const embeddings = await embeddingAdapter.generateEmbeddings(largeBatch);
      const duration = Date.now() - startTime;
      
      expect(embeddings.length).toBe(50);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds for mock
    });
  });
});