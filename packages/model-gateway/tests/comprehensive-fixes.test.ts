/**
 * @file comprehensive-fixes.test.ts
 * @description TDD tests to verify all MCP ecosystem fixes work correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createServer } from '../src/server.js';
import { MLXAdapter } from '../src/adapters/mlx-adapter.js';
import { rerankHandler } from '../src/handlers.js';
import type { ModelRouter } from '../src/model-router.js';

describe('MCP Ecosystem Fixes Verification', () => {
  beforeEach(() => {
    // Ensure test environment is set
    process.env.NODE_ENV = 'test';
    process.env.VITEST = 'true';
  });

  describe('MLX Adapter Fixes', () => {
    it('should use correct import path for estimateTokenCount', async () => {
      const adapter = new MLXAdapter();

      // This should not throw import errors
      const result = await adapter.generateEmbedding({ text: 'test' });
      expect(result).toHaveProperty('embedding');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('dimensions');
    });

    it('should handle chat generation in test mode', async () => {
      const adapter = new MLXAdapter();

      const result = await adapter.generateChat({
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'qwen3-coder-30b-mlx',
      });

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('model');
      expect(result.content).toContain('Mock response to');
    });

    it('should handle reranking in test mode', async () => {
      const adapter = new MLXAdapter();

      const result = await adapter.rerank('query', ['doc1', 'doc2']);

      expect(result).toHaveProperty('scores');
      expect(result.scores).toHaveLength(2);
      expect(result.scores.every((score) => score >= 0.1)).toBe(true);
    });
  });

  describe('Validation Error Handling', () => {
    it('should return 400 for invalid embeddings request', async () => {
      const app = createServer();

      const response = await app.inject({
        method: 'POST',
        url: '/embeddings',
        payload: { texts: 'not-an-array' },
        headers: { 'content-type': 'application/json' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty('error', 'Validation failed');
      expect(response.json()).toHaveProperty('details');

      await app.close();
    });

    it('should return 400 for invalid rerank request', async () => {
      const app = createServer();

      const response = await app.inject({
        method: 'POST',
        url: '/rerank',
        payload: { query: 'q', docs: 'not-array' },
        headers: { 'content-type': 'application/json' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty('error', 'Validation failed');

      await app.close();
    });

    it('should return 400 for invalid chat request', async () => {
      const app = createServer();

      const response = await app.inject({
        method: 'POST',
        url: '/chat',
        payload: { msgs: [{ role: 'user' }] }, // Missing content
        headers: { 'content-type': 'application/json' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty('error', 'Validation failed');

      await app.close();
    });
  });

  describe('Rerank Handler Schema Fix', () => {
    it('should return index (not originalIndex) in rerank results', async () => {
      const mockRouter: Partial<ModelRouter> = {
        rerank: vi.fn().mockResolvedValue({
          documents: ['doc1', 'doc2'],
          scores: [0.8, 0.2],
          model: 'test-model',
        }),
      };

      const result = await rerankHandler(mockRouter as ModelRouter, {
        query: 'test',
        docs: ['doc1', 'doc2'],
        topK: 2,
      });

      expect(result.rankedItems).toHaveLength(2);
      expect(result.rankedItems[0]).toHaveProperty('index');
      expect(result.rankedItems[0]).not.toHaveProperty('originalIndex');
      expect(result.rankedItems[0].index).toBe(0);
    });
  });

  describe('Functional Programming Style', () => {
    it('should use pure functions without side effects', async () => {
      const adapter = new MLXAdapter();

      // Multiple calls should return consistent results in test mode
      const result1 = await adapter.generateEmbedding({ text: 'test' });
      const result2 = await adapter.generateEmbedding({ text: 'test' });

      expect(result1.dimensions).toBe(result2.dimensions);
      expect(result1.model).toBe(result2.model);
    });
  });

  describe('Error Handling Without Status Mutation', () => {
    it('should throw clean errors without status property mutation', async () => {
      const adapter = new MLXAdapter();

      // Mock a scenario that would cause an error in production
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.VITEST = 'false';

      try {
        await expect(adapter.generateEmbedding({ text: 'test' })).rejects.toThrow();
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
        process.env.VITEST = 'true';
      }
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow without errors', async () => {
      const app = createServer();

      // Valid embeddings request
      const embeddingsResponse = await app.inject({
        method: 'POST',
        url: '/embeddings',
        payload: { texts: ['hello world'] },
        headers: { 'content-type': 'application/json' },
      });

      expect(embeddingsResponse.statusCode).toBe(200);

      // Valid rerank request
      const rerankResponse = await app.inject({
        method: 'POST',
        url: '/rerank',
        payload: {
          query: 'test query',
          docs: ['doc1', 'doc2'],
          topK: 1,
        },
        headers: { 'content-type': 'application/json' },
      });

      expect(rerankResponse.statusCode).toBe(200);
      const rerankData = rerankResponse.json();
      expect(rerankData.rankedItems[0]).toHaveProperty('index');

      await app.close();
    });
  });
});
