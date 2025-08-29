/**
 * @file embedding-integration.test.ts
 * @description Test embedding and reranking capabilities without mock providers
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
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
    embeddingAdapter = createEmbeddingAdapter('sentence-transformers');
    vi.spyOn(embeddingAdapter, 'generateEmbeddings').mockImplementation(
      async (texts: string | string[]) => {
        const arr = Array.isArray(texts) ? texts : [texts];
        const dims = 1024;
        return arr.map((text) => {
          const hash = crypto.createHash('md5').update(text).digest('hex');
          const embedding: number[] = [];
          for (let i = 0; i < dims; i++) {
            const byte = parseInt(hash.substring(i % hash.length, (i % hash.length) + 1), 16) || 0;
            embedding.push(byte / 15 - 0.5);
          }
          const mag = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
          return embedding.map((v) => v / mag);
        });
      },
    );
    rerankerAdapter = createRerankerAdapter('transformers');
  });

  describe('EmbeddingAdapter Core Functionality', () => {
    it('should create embedding adapter with correct configuration', () => {
      const stats = embeddingAdapter.getStats();
      expect(stats.provider).toBe('sentence-transformers');
      expect(stats.dimensions).toBe(1024);
      expect(stats.totalDocuments).toBe(0);
    });

    it('should add and retrieve documents from vector store', async () => {
      const ids = await embeddingAdapter.addDocuments(['Test document']);
      expect(ids).toHaveLength(1);
      const doc = embeddingAdapter.getDocument(ids[0]);
      expect(doc?.text).toBe('Test document');
    });

    it('should perform similarity search', async () => {
      await embeddingAdapter.addDocuments(['cat', 'dog']);
      const results = await embeddingAdapter.similaritySearch({ text: 'cat', topK: 1 });
      expect(results[0].text).toBe('cat');
    });
  });

  describe('RerankerAdapter', () => {
    it('should throw when reranking with unsupported provider', async () => {
      await expect(rerankerAdapter.rerank('query', ['doc1'])).rejects.toThrow(
        'Reranking not implemented for provider: transformers',
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw for unsupported embedding provider', () => {
      expect(() => createEmbeddingAdapter('mock' as any)).toThrow(
        'Unsupported embedding provider: mock',
      );
    });

    it('should throw for unsupported reranker provider', async () => {
      const adapter = new RerankerAdapter({ provider: 'invalid' as any });
      await expect(adapter.rerank('q', ['d'])).rejects.toThrow(
        'Reranking not implemented for provider: invalid',
      );
    });
  });
});
