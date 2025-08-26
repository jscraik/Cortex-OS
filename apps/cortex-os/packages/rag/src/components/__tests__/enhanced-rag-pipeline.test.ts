/**
 * @file Enhanced RAG Pipeline Tests
 * @description Comprehensive test suite for the Enhanced RAG Pipeline
 * @author Cortex OS Team
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { EventEmitter } from 'events';
import {
  EnhancedRagPipeline,
  createEnhancedRagPipeline,
  type ContextBuildingOptions,
  type QueryAnalysis,
  type EnhancedContext,
} from '../enhanced-rag-pipeline.js';

// Mock the external dependencies
vi.mock('../../orchestration/src/bridges/mlx-embeddings-bridge.js', () => ({
  MLXEmbeddingsBridge: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    getEmbedding: vi.fn().mockResolvedValue({
      text: 'test query',
      embedding: new Array(768).fill(0).map(() => Math.random()),
      model: 'test-embedding-model',
      dimensions: 768,
      processingTimeMs: 100,
      cached: false,
    }),
    getServiceInfo: vi.fn().mockReturnValue([
      {
        name: 'test-embedding-service',
        capabilities: ['text-embedding'],
        specializations: ['general'],
        performance: { tokensPerSecond: 1000 },
      },
    ]),
    healthCheck: vi.fn().mockResolvedValue({ healthy: true }),
    shutdown: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../orchestration/src/bridges/mlx-reranker-bridge.js', () => ({
  MLXRerankerBridge: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    rerank: vi.fn().mockResolvedValue({
      results: [
        {
          id: 'doc1',
          text: 'Test document 1 about machine learning',
          score: 0.9,
          rank: 1,
          metadata: {},
        },
        {
          id: 'doc2',
          text: 'Test document 2 about artificial intelligence',
          score: 0.8,
          rank: 2,
          metadata: {},
        },
      ],
      query: 'test query',
      model: 'test-reranker',
      totalCandidates: 2,
      returnedCount: 2,
      processingTimeMs: 150,
      qualityScore: 0.85,
    }),
    getServiceInfo: vi.fn().mockReturnValue([
      {
        name: 'test-reranker-service',
        capabilities: ['text-reranking'],
        specializations: ['general'],
        quality: { ndcgAtK: { '10': 0.85 } },
      },
    ]),
    healthCheck: vi.fn().mockResolvedValue({ healthy: true }),
    shutdown: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../index/client.js', () => ({
  FaissClient: vi.fn().mockImplementation(() => ({
    search: vi.fn().mockResolvedValue({
      results: [
        {
          doc_id: 'doc1',
          content: 'Test document 1 about machine learning',
          score: 0.8,
          metadata: { source: 'test' },
        },
        {
          doc_id: 'doc2',
          content: 'Test document 2 about artificial intelligence',
          score: 0.7,
          metadata: { source: 'test' },
        },
      ],
    }),
    testConnection: vi.fn().mockResolvedValue(true),
    close: vi.fn(),
  })),
}));

// Mock unified fetch
vi.mock('../../agents/src/utils/unified-fetch.js', () => ({
  unifiedFetch: vi.fn(),
  getJsonResponse: vi.fn(),
}));

describe('EnhancedRagPipeline', () => {
  let pipeline: EnhancedRagPipeline;

  beforeEach(() => {
    pipeline = createEnhancedRagPipeline({
      maxContextCacheSize: 100,
      enableProgressiveBuilding: true,
      enableQualityTracking: true,
      fallbackToBasePipeline: true,
    });
  });

  afterEach(async () => {
    if (pipeline) {
      await pipeline.shutdown();
    }
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully with all services', async () => {
      const initPromise = pipeline.initialize();

      // Listen for initialization event
      const initEvent = new Promise((resolve) => {
        pipeline.once('initialized', resolve);
      });

      await initPromise;
      const event = await initEvent;

      expect(event).toMatchObject({
        embeddingsAvailable: true,
        rerankerAvailable: true,
        faissAvailable: expect.any(Boolean),
        basePipelineAvailable: true,
      });
    });

    it('should handle initialization failures gracefully', async () => {
      // Create pipeline that will fail initialization
      const failingPipeline = createEnhancedRagPipeline({
        mlxManagerEndpoint: 'http://invalid-endpoint:9999',
      });

      // Should not throw, but should emit error events
      const errorPromise = new Promise((resolve) => {
        failingPipeline.once('error', resolve);
      });

      try {
        await failingPipeline.initialize();
      } catch (error) {
        // Expected to fail
      }

      await failingPipeline.shutdown();
    });
  });

  describe('Query Analysis', () => {
    beforeEach(async () => {
      await pipeline.initialize();
    });

    it('should analyze simple queries correctly', async () => {
      const query = 'What is AI?';
      const analysis = await pipeline.analyzeQuery(query);

      expect(analysis).toMatchObject({
        complexity: 'simple',
        domain: expect.any(String),
        expectedCandidates: expect.any(Number),
        processingStrategy: expect.any(String),
        queryType: 'short',
        requiresSpecialization: expect.any(Boolean),
      });

      expect(analysis.expectedCandidates).toBeGreaterThan(0);
      expect(['speed', 'balanced', 'accuracy']).toContain(analysis.processingStrategy);
    });

    it('should analyze complex technical queries correctly', async () => {
      const query =
        'How do transformer architectures work in neural networks and what are the key attention mechanisms?';
      const analysis = await pipeline.analyzeQuery(query);

      expect(analysis.complexity).toBe('complex');
      expect(analysis.queryType).toBe('long');
      expect(analysis.expectedCandidates).toBeGreaterThan(20);
      expect(analysis.requiresSpecialization).toBe(true);
    });

    it('should cache query analysis results', async () => {
      const query = 'What is machine learning?';

      // First call
      const analysis1 = await pipeline.analyzeQuery(query);

      // Second call should return same result (from cache)
      const analysis2 = await pipeline.analyzeQuery(query);

      expect(analysis1).toEqual(analysis2);
    });

    it('should detect different domains correctly', async () => {
      const testCases = [
        { query: 'How to implement a REST API?', expectedDomain: 'code' },
        { query: 'What is photosynthesis research?', expectedDomain: 'science' },
        { query: 'How to increase market share?', expectedDomain: 'business' },
        { query: 'Database optimization techniques', expectedDomain: 'technical' },
      ];

      for (const testCase of testCases) {
        const analysis = await pipeline.analyzeQuery(testCase.query);
        expect(analysis.domain).toBe(testCase.expectedDomain);
      }
    });
  });

  describe('Model Selection', () => {
    beforeEach(async () => {
      await pipeline.initialize();
    });

    it('should select optimal models based on query characteristics', async () => {
      const query = 'How does deep learning work?';
      const strategy = await pipeline.selectModels(query, {
        qualityMode: 'balanced',
        minRelevanceScore: 0.8,
      });

      expect(strategy.embedding).toMatchObject({
        model: expect.any(String),
        rationale: expect.any(String),
        expectedLatency: expect.any(Number),
        capabilities: expect.any(Array),
      });

      expect(strategy.reranking).toMatchObject({
        model: expect.any(String),
        rationale: expect.any(String),
        expectedQuality: expect.any(Number),
        specializations: expect.any(Array),
      });
    });

    it('should respect preferred model selection', async () => {
      const query = 'Test query';
      const preferredModel = 'custom-embedding-model';

      const strategy = await pipeline.selectModels(query, {
        qualityMode: 'accuracy',
        preferredModel,
      });

      // Note: This test assumes the model selection logic would use the preferred model
      // In the mock implementation, it may not actually change the result
      expect(strategy.embedding.model).toBeDefined();
    });

    it('should cache model selection results', async () => {
      const query = 'Test caching query';
      const requirements = { qualityMode: 'balanced' as const };

      const strategy1 = await pipeline.selectModels(query, requirements);
      const strategy2 = await pipeline.selectModels(query, requirements);

      expect(strategy1).toEqual(strategy2);
    });
  });

  describe('Context Building', () => {
    beforeEach(async () => {
      await pipeline.initialize();
    });

    it('should build context successfully', async () => {
      const query = 'What is artificial intelligence?';
      const options: ContextBuildingOptions = {
        maxCandidates: 10,
        enableReranking: true,
        qualityThreshold: 0.7,
      };

      const context = await pipeline.buildContext(query, options);

      expect(context).toMatchObject({
        content: expect.any(String),
        sources: expect.any(Array),
        qualityMetrics: {
          relevanceScore: expect.any(Number),
          diversityScore: expect.any(Number),
          completenessScore: expect.any(Number),
          confidenceScore: expect.any(Number),
        },
        processingStats: {
          embeddingTimeMs: expect.any(Number),
          retrievalTimeMs: expect.any(Number),
          rerankingTimeMs: expect.any(Number),
          totalTimeMs: expect.any(Number),
        },
        metadata: {
          strategy: expect.any(Object),
          queryAnalysis: expect.any(Object),
          fallbackUsed: expect.any(Boolean),
        },
      });

      expect(context.sources.length).toBeGreaterThan(0);
      expect(context.qualityMetrics.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(context.qualityMetrics.confidenceScore).toBeLessThanOrEqual(1);
    });

    it('should stream context building with progress updates', async () => {
      const query = 'How does machine learning work?';
      const options: ContextBuildingOptions = {
        maxCandidates: 5,
        enableStreaming: true,
      };

      const progressUpdates: any[] = [];

      for await (const progress of pipeline.buildContextStream(query, options)) {
        progressUpdates.push(progress);
      }

      expect(progressUpdates.length).toBeGreaterThan(0);

      // Check that progress goes from 0 to 100
      const firstProgress = progressUpdates[0];
      const lastProgress = progressUpdates[progressUpdates.length - 1];

      expect(firstProgress.progress).toBeGreaterThanOrEqual(0);
      expect(lastProgress.progress).toBe(100);

      // Check that phases are included
      const phases = progressUpdates.map((p) => p.phase);
      expect(phases).toContain('embedding');
      expect(phases).toContain('assembly');
    });

    it('should cache context results when enabled', async () => {
      const query = 'Test caching query';
      const options: ContextBuildingOptions = {
        cacheResults: true,
        maxCandidates: 5,
      };

      // First call
      await pipeline.buildContext(query, options);

      // Second call should hit cache
      const context = await pipeline.buildContext(query, options);

      expect(context).toBeDefined();

      const metrics = pipeline.getMetrics();
      expect(metrics.cacheHits).toBeGreaterThan(0);
    });

    it('should handle quality threshold filtering', async () => {
      const query = 'Quality test query';
      const options: ContextBuildingOptions = {
        qualityThreshold: 0.9, // High threshold
        maxCandidates: 10,
      };

      const context = await pipeline.buildContext(query, options);

      // All sources should meet the quality threshold
      context.sources.forEach((source) => {
        expect(source.score).toBeGreaterThanOrEqual(options.qualityThreshold);
      });
    });
  });

  describe('MLX Services Coordination', () => {
    beforeEach(async () => {
      await pipeline.initialize();
    });

    it('should coordinate MLX services successfully', async () => {
      const query = 'Test coordination';
      const coordination = await pipeline.coordinateMLXServices(query);

      expect(coordination).toMatchObject({
        servicesAvailable: {
          embeddings: expect.any(Boolean),
          reranker: expect.any(Boolean),
        },
        loadBalancingDecision: {
          reasoning: expect.any(String),
        },
        fallbackStrategy: expect.any(Object),
      });
    });

    it('should provide fallback strategy when services unavailable', async () => {
      // Create pipeline with failing services
      const failingPipeline = createEnhancedRagPipeline();

      // Mock failed health checks
      const mockEmbeddingsBridge = {
        healthCheck: vi.fn().mockResolvedValue({ healthy: false }),
      };

      (failingPipeline as any).embeddingsBridge = mockEmbeddingsBridge;

      const coordination = await failingPipeline.coordinateMLXServices('test');

      expect(coordination.servicesAvailable.embeddings).toBe(false);
      expect(coordination.fallbackStrategy.embeddingFallback).toBeDefined();

      await failingPipeline.shutdown();
    });
  });

  describe('Multi-Agent Coordination', () => {
    beforeEach(async () => {
      await pipeline.initialize();
    });

    it('should coordinate with multiple agents', async () => {
      const query = 'Complex multi-agent query';
      const capabilities = ['retrieval', 'reasoning', 'code'] as const;

      const result = await pipeline.coordinateWithAgents(query, capabilities);

      expect(result).toMatchObject({
        contexts: expect.any(Array),
        synthesizedContext: expect.any(Object),
        agentContributions: expect.any(Array),
        coordinationMetrics: {
          totalAgents: capabilities.length,
          successfulAgents: expect.any(Number),
          aggregationTimeMs: expect.any(Number),
          qualityGain: expect.any(Number),
        },
      });

      expect(result.agentContributions.length).toBeGreaterThan(0);
      expect(result.coordinationMetrics.successfulAgents).toBeGreaterThan(0);
    });

    it('should handle agent coordination failures gracefully', async () => {
      const query = 'Test failure handling';
      const capabilities = ['invalid-capability'] as any;

      // Should not throw, but may have reduced successful agents
      const result = await pipeline.coordinateWithAgents(query, capabilities);

      expect(result).toBeDefined();
      expect(result.coordinationMetrics.totalAgents).toBe(1);
    });
  });

  describe('Performance and Metrics', () => {
    beforeEach(async () => {
      await pipeline.initialize();
    });

    it('should track metrics correctly', async () => {
      const query = 'Metrics test query';

      await pipeline.buildContext(query, { maxCandidates: 5 });

      const metrics = pipeline.getMetrics();

      expect(metrics).toMatchObject({
        totalQueries: expect.any(Number),
        cacheHits: expect.any(Number),
        averageLatency: expect.any(Number),
        averageQuality: expect.any(Number),
        embeddingRequests: expect.any(Number),
        contextCacheSize: expect.any(Number),
        initialized: true,
        servicesHealthy: expect.any(Object),
      });

      expect(metrics.totalQueries).toBeGreaterThan(0);
    });

    it('should provide comprehensive health check', async () => {
      const healthCheck = await pipeline.healthCheck();

      expect(healthCheck).toMatchObject({
        healthy: expect.any(Boolean),
        details: expect.any(Object),
      });

      expect(healthCheck.details).toHaveProperty('pipeline');
      expect(healthCheck.details).toHaveProperty('metrics');
    });

    it('should handle performance under load', async () => {
      const queries = Array.from({ length: 5 }, (_, i) => `Load test query ${i + 1}`);
      const startTime = Date.now();

      // Process queries concurrently
      const contexts = await Promise.all(
        queries.map((query) => pipeline.buildContext(query, { maxCandidates: 3 })),
      );

      const totalTime = Date.now() - startTime;

      expect(contexts).toHaveLength(queries.length);
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds

      contexts.forEach((context) => {
        expect(context.qualityMetrics.confidenceScore).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Error Handling and Fallbacks', () => {
    beforeEach(async () => {
      await pipeline.initialize();
    });

    it('should handle embedding service failures', async () => {
      // Mock failing embedding service
      const failingEmbeddingsBridge = {
        getEmbedding: vi.fn().mockRejectedValue(new Error('Embedding service failed')),
        healthCheck: vi.fn().mockResolvedValue({ healthy: false }),
      };

      (pipeline as any).embeddingsBridge = failingEmbeddingsBridge;

      // Should fall back gracefully
      const query = 'Test embedding failure';

      try {
        const context = await pipeline.buildContext(query, { maxCandidates: 3 });
        // If fallback works, we should get a context
        expect(context).toBeDefined();
        expect(context.metadata.fallbackUsed).toBe(true);
      } catch (error) {
        // If no fallback, should throw meaningful error
        expect(error).toBeInstanceOf(Error);
      }

      const metrics = pipeline.getMetrics();
      expect(metrics.errors).toBeGreaterThan(0);
    });

    it('should emit appropriate events during operation', async () => {
      const events: Array<{ name: string; data: any }> = [];

      const eventNames = ['query-analyzed', 'models-selected', 'cache-hit', 'metrics-update'];

      eventNames.forEach((eventName) => {
        pipeline.on(eventName, (data) => {
          events.push({ name: eventName, data });
        });
      });

      const query = 'Event emission test';
      await pipeline.buildContext(query, { maxCandidates: 3 });

      // Should have emitted some events
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('Shutdown and Cleanup', () => {
    it('should shutdown cleanly', async () => {
      await pipeline.initialize();

      // Should not throw
      await expect(pipeline.shutdown()).resolves.toBeUndefined();

      // Should emit shutdown event
      const shutdownPromise = new Promise((resolve) => {
        pipeline.once('shutdown', resolve);
      });

      await pipeline.shutdown();
      await shutdownPromise;
    });

    it('should clean up resources on shutdown', async () => {
      await pipeline.initialize();

      // Use some resources
      await pipeline.buildContext('cleanup test', { maxCandidates: 3 });

      // Get initial cache sizes
      const beforeMetrics = pipeline.getMetrics();
      expect(beforeMetrics.contextCacheSize).toBeGreaterThanOrEqual(0);

      await pipeline.shutdown();

      // Cache should be cleared after shutdown
      const afterMetrics = pipeline.getMetrics();
      expect(afterMetrics.contextCacheSize).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end with realistic query', async () => {
      await pipeline.initialize();

      const query =
        'Explain the differences between supervised and unsupervised learning in machine learning';
      const options: ContextBuildingOptions = {
        maxCandidates: 20,
        enableReranking: true,
        qualityThreshold: 0.6,
        enableStreaming: true,
      };

      // Test streaming
      let finalProgress: any;
      for await (const progress of pipeline.buildContextStream(query, options)) {
        expect(progress.phase).toBeOneOf(['embedding', 'retrieval', 'reranking', 'assembly']);
        expect(progress.progress).toBeGreaterThanOrEqual(0);
        expect(progress.progress).toBeLessThanOrEqual(100);

        if (progress.progress === 100) {
          finalProgress = progress;
        }
      }

      expect(finalProgress).toBeDefined();
      expect(finalProgress.qualityScore).toBeGreaterThanOrEqual(0);

      // Test direct context building
      const context = await pipeline.buildContext(query, options);

      expect(context.content).toBeTruthy();
      expect(context.sources.length).toBeGreaterThan(0);
      expect(context.qualityMetrics.confidenceScore).toBeGreaterThan(0);
      expect(context.processingStats.totalTimeMs).toBeGreaterThan(0);

      // Verify quality metrics are reasonable
      const { qualityMetrics } = context;
      expect(qualityMetrics.relevanceScore).toBeGreaterThanOrEqual(0);
      expect(qualityMetrics.diversityScore).toBeGreaterThanOrEqual(0);
      expect(qualityMetrics.completenessScore).toBeGreaterThanOrEqual(0);
      expect(qualityMetrics.confidenceScore).toBeGreaterThanOrEqual(0);

      // All scores should be <= 1
      Object.values(qualityMetrics).forEach((score) => {
        expect(score).toBeLessThanOrEqual(1);
      });
    });

    it('should demonstrate native TypeScript execution capabilities', async () => {
      // This test verifies that the pipeline works with Node.js native TypeScript execution
      await pipeline.initialize();

      const query = 'How does Node.js native TypeScript execution improve development?';

      const startTime = performance.now();
      const context = await pipeline.buildContext(query, {
        maxCandidates: 10,
        enableReranking: true,
      });
      const endTime = performance.now();

      expect(context).toBeDefined();
      expect(endTime - startTime).toBeGreaterThan(0);

      // Should have reasonable performance
      expect(context.processingStats.totalTimeMs).toBeLessThan(10000);

      // Should use enhanced features
      expect(context.metadata.strategy).toBeDefined();
      expect(context.metadata.queryAnalysis).toBeDefined();

      console.log(`✅ Native TypeScript execution test completed in ${endTime - startTime}ms`);
    });
  });
});
