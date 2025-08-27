/**
 * @file AI Adapter Interface Tests
 * @description Tests for the AIModelAdapter interface and base functionality
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AIModelAdapter,
  AIRequest,
  AIResponse,
  AIResponseSchema,
  EmbeddingRequest,
  EmbeddingResponse,
  EmbeddingResponseSchema,
  RerankingRequest,
  RerankingResponse,
  RerankingResponseSchema,
} from '../src/ai/adapter.js';
import { AICapability } from '../src/ai/config.js';

// Mock adapter for testing
const createMockAdapter = (): AIModelAdapter => ({
  getName: vi.fn(() => 'MockAdapter'),
  getVersion: vi.fn(() => '1.0.0'),
  isHealthy: vi.fn(() => Promise.resolve(true)),
  generateText: vi.fn(() =>
    Promise.resolve({
      content: 'Mock response',
      confidence: 0.9,
      modelUsed: 'MockAdapter',
      processingTime: 100,
      success: true,
    }),
  ),
  generateEmbedding: vi.fn(() =>
    Promise.resolve({
      embedding: [0.1, 0.2, 0.3],
      dimensions: 3,
      modelUsed: 'MockAdapter',
      processingTime: 50,
      success: true,
    }),
  ),
  rerank: vi.fn(() =>
    Promise.resolve({
      rankedItems: [
        { index: 0, score: 0.9, content: 'First item' },
        { index: 1, score: 0.8, content: 'Second item' },
      ],
      modelUsed: 'MockAdapter',
      processingTime: 75,
      success: true,
    }),
  ),
  getStats: vi.fn(() => ({
    totalRequests: 10,
    successfulRequests: 9,
    averageResponseTime: 75,
    lastUsed: new Date(),
    isAvailable: true,
  })),
  cleanup: vi.fn(() => Promise.resolve()),
});

describe('AIModelAdapter Interface', () => {
  let mockAdapter: AIModelAdapter;

  beforeEach(() => {
    mockAdapter = createMockAdapter();
  });

  describe('getName()', () => {
    it('should return adapter name', () => {
      const name = mockAdapter.getName();
      expect(name).toBe('MockAdapter');
      expect(mockAdapter.getName).toHaveBeenCalledTimes(1);
    });
  });

  describe('getVersion()', () => {
    it('should return adapter version', () => {
      const version = mockAdapter.getVersion();
      expect(version).toBe('1.0.0');
      expect(mockAdapter.getVersion).toHaveBeenCalledTimes(1);
    });
  });

  describe('isHealthy()', () => {
    it('should return health status', async () => {
      const isHealthy = await mockAdapter.isHealthy();
      expect(isHealthy).toBe(true);
      expect(mockAdapter.isHealthy).toHaveBeenCalledTimes(1);
    });

    it('should handle unhealthy state', async () => {
      const unhealthyAdapter = createMockAdapter();
      vi.mocked(unhealthyAdapter.isHealthy).mockResolvedValue(false);

      const isHealthy = await unhealthyAdapter.isHealthy();
      expect(isHealthy).toBe(false);
    });
  });

  describe('generateText()', () => {
    it('should generate text response', async () => {
      const request: AIRequest = {
        prompt: 'Test prompt',
        capability: AICapability.SEMANTIC_ROUTING,
        maxTokens: 100,
        temperature: 0.7,
      };

      const response = await mockAdapter.generateText(request);

      expect(response).toEqual({
        content: 'Mock response',
        confidence: 0.9,
        modelUsed: 'MockAdapter',
        processingTime: 100,
        success: true,
      });
      expect(mockAdapter.generateText).toHaveBeenCalledWith(request);
    });

    it('should validate response schema', async () => {
      const request: AIRequest = {
        prompt: 'Test prompt',
        capability: AICapability.SEMANTIC_ROUTING,
      };

      const response = await mockAdapter.generateText(request);
      const validation = AIResponseSchema.safeParse(response);

      expect(validation.success).toBe(true);
    });
  });

  describe('generateEmbedding()', () => {
    it('should generate embeddings', async () => {
      const request: EmbeddingRequest = {
        text: 'Test text for embedding',
      };

      const response = await mockAdapter.generateEmbedding(request);

      expect(response).toEqual({
        embedding: [0.1, 0.2, 0.3],
        dimensions: 3,
        modelUsed: 'MockAdapter',
        processingTime: 50,
        success: true,
      });
      expect(mockAdapter.generateEmbedding).toHaveBeenCalledWith(request);
    });

    it('should validate embedding response schema', async () => {
      const request: EmbeddingRequest = {
        text: 'Test text',
      };

      const response = await mockAdapter.generateEmbedding(request);
      const validation = EmbeddingResponseSchema.safeParse(response);

      expect(validation.success).toBe(true);
    });
  });

  describe('rerank()', () => {
    it('should rerank items', async () => {
      const request: RerankingRequest = {
        query: 'Test query',
        items: ['First item', 'Second item', 'Third item'],
        topK: 2,
      };

      const response = await mockAdapter.rerank(request);

      expect(response).toEqual({
        rankedItems: [
          { index: 0, score: 0.9, content: 'First item' },
          { index: 1, score: 0.8, content: 'Second item' },
        ],
        modelUsed: 'MockAdapter',
        processingTime: 75,
        success: true,
      });
      expect(mockAdapter.rerank).toHaveBeenCalledWith(request);
    });

    it('should validate reranking response schema', async () => {
      const request: RerankingRequest = {
        query: 'Test query',
        items: ['Item 1', 'Item 2'],
      };

      const response = await mockAdapter.rerank(request);
      const validation = RerankingResponseSchema.safeParse(response);

      expect(validation.success).toBe(true);
    });
  });

  describe('getStats()', () => {
    it('should return adapter statistics', () => {
      const stats = mockAdapter.getStats();

      expect(stats).toEqual({
        totalRequests: 10,
        successfulRequests: 9,
        averageResponseTime: 75,
        lastUsed: expect.any(Date),
        isAvailable: true,
      });
      expect(mockAdapter.getStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup()', () => {
    it('should cleanup resources', async () => {
      await mockAdapter.cleanup();
      expect(mockAdapter.cleanup).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Response Schemas', () => {
  describe('AIResponseSchema', () => {
    it('should validate valid AI response', () => {
      const validResponse: AIResponse = {
        content: 'Generated text',
        confidence: 0.85,
        modelUsed: 'TestModel',
        processingTime: 150,
        success: true,
      };

      const result = AIResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should reject invalid confidence', () => {
      const invalidResponse = {
        content: 'Generated text',
        confidence: 1.5, // Invalid: should be 0-1
        modelUsed: 'TestModel',
        processingTime: 150,
        success: true,
      };

      const result = AIResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should reject negative processing time', () => {
      const invalidResponse = {
        content: 'Generated text',
        confidence: 0.8,
        modelUsed: 'TestModel',
        processingTime: -50, // Invalid: should be positive
        success: true,
      };

      const result = AIResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });

  describe('EmbeddingResponseSchema', () => {
    it('should validate valid embedding response', () => {
      const validResponse: EmbeddingResponse = {
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        dimensions: 5,
        modelUsed: 'TestModel',
        processingTime: 100,
        success: true,
      };

      const result = EmbeddingResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should reject mismatched dimensions', () => {
      const invalidResponse = {
        embedding: [0.1, 0.2, 0.3],
        dimensions: 5, // Mismatch with actual embedding length
        modelUsed: 'TestModel',
        processingTime: 100,
        success: true,
      };

      const result = EmbeddingResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });

  describe('RerankingResponseSchema', () => {
    it('should validate valid reranking response', () => {
      const validResponse: RerankingResponse = {
        rankedItems: [
          { index: 0, score: 0.9, content: 'First item' },
          { index: 1, score: 0.7, content: 'Second item' },
        ],
        modelUsed: 'TestModel',
        processingTime: 120,
        success: true,
      };

      const result = RerankingResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should reject invalid score range', () => {
      const invalidResponse = {
        rankedItems: [
          { index: 0, score: 1.5, content: 'First item' }, // Invalid: should be 0-1
        ],
        modelUsed: 'TestModel',
        processingTime: 120,
        success: true,
      };

      const result = RerankingResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });
});
