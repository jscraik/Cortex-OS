# Test Specifications - Comprehensive RAG Enhancement

## Test Architecture Overview

Industrial-standard testing approach covering all aspects of the agentic RAG system with 90%+ coverage requirements and strict quality gates.

## Test Categories & Coverage

### 1. Unit Tests (70% of total test suite)

#### Core Pipeline Functions (`tests/core/`)

```typescript
// tests/core/pipeline.test.ts
describe('createRAGPipeline', () => {
  describe('configuration validation', () => {
    it('should validate required configuration fields', async () => {
      await expect(createRAGPipeline({})).rejects.toThrow('vectorStore is required');
      await expect(createRAGPipeline({ vectorStore: null })).rejects.toThrow();
    });

    it('should apply default configuration values', async () => {
      const pipeline = await createRAGPipeline({
        vectorStore: mockVectorStore,
        embeddings: mockEmbeddings,
        llm: mockLLM,
      });

      expect(pipeline.config.topK).toBe(5);
      expect(pipeline.config.similarityThreshold).toBe(0.7);
    });

    it('should override defaults with provided values', async () => {
      const pipeline = await createRAGPipeline({
        vectorStore: mockVectorStore,
        embeddings: mockEmbeddings,
        llm: mockLLM,
        topK: 10,
        similarityThreshold: 0.8,
      });

      expect(pipeline.config.topK).toBe(10);
      expect(pipeline.config.similarityThreshold).toBe(0.8);
    });
  });

  describe('retrieval functionality', () => {
    it('should handle empty queries gracefully', async () => {
      const pipeline = await createRAGPipeline(mockConfig);
      const result = await pipeline.retrieve('');
      expect(result).toEqual([]);
    });

    it('should handle whitespace-only queries', async () => {
      const pipeline = await createRAGPipeline(mockConfig);
      const result = await pipeline.retrieve('   ');
      expect(result).toEqual([]);
    });

    it('should retrieve documents with similarity scores', async () => {
      const pipeline = await createRAGPipeline(mockConfig);
      const result = await pipeline.retrieve('test query');

      expect(result).toHaveLength.greaterThan(0);
      expect(result[0]).toHaveProperty('content');
      expect(result[0]).toHaveProperty('score');
      expect(result[0].score).toBeGreaterThanOrEqual(0);
    });

    it('should respect topK parameter', async () => {
      const pipeline = await createRAGPipeline({ ...mockConfig, topK: 3 });
      const result = await pipeline.retrieve('test query');
      expect(result).toHaveLength.lessThanOrEqual(3);
    });

    it('should filter by similarity threshold', async () => {
      const pipeline = await createRAGPipeline({
        ...mockConfig,
        similarityThreshold: 0.9,
      });
      const result = await pipeline.retrieve('test query');
      result.forEach((doc) => {
        expect(doc.score).toBeGreaterThanOrEqual(0.9);
      });
    });
  });

  describe('generation functionality', () => {
    it('should generate answer from documents', async () => {
      const pipeline = await createRAGPipeline(mockConfig);
      const docs = [
        { content: 'Document 1 content', score: 0.9 },
        { content: 'Document 2 content', score: 0.8 },
      ];

      const answer = await pipeline.generate('test question', docs);
      expect(answer).toBeTruthy();
      expect(typeof answer).toBe('string');
    });

    it('should handle empty document list', async () => {
      const pipeline = await createRAGPipeline(mockConfig);
      const answer = await pipeline.generate('test question', []);
      expect(answer).toBe('');
    });

    it('should handle empty query with documents', async () => {
      const pipeline = await createRAGPipeline(mockConfig);
      const docs = [{ content: 'test', score: 0.9 }];
      const answer = await pipeline.generate('', docs);
      expect(answer).toBe('');
    });
  });

  describe('error handling', () => {
    it('should handle embedding service failures', async () => {
      const failingEmbeddings = {
        embed: vi.fn().mockRejectedValue(new Error('Embedding failed')),
      };

      const pipeline = await createRAGPipeline({
        ...mockConfig,
        embeddings: failingEmbeddings,
      });

      await expect(pipeline.retrieve('test')).rejects.toThrow('Embedding failed');
    });

    it('should handle vector store failures', async () => {
      const failingVectorStore = {
        similaritySearch: vi.fn().mockRejectedValue(new Error('Vector store failed')),
      };

      const pipeline = await createRAGPipeline({
        ...mockConfig,
        vectorStore: failingVectorStore,
      });

      await expect(pipeline.retrieve('test')).rejects.toThrow('Vector store failed');
    });

    it('should handle LLM generation failures', async () => {
      const failingLLM = {
        generate: vi.fn().mockRejectedValue(new Error('Generation failed')),
      };

      const pipeline = await createRAGPipeline({
        ...mockConfig,
        llm: failingLLM,
      });

      await expect(pipeline.generate('test', [{ content: 'doc', score: 0.9 }])).rejects.toThrow(
        'Generation failed',
      );
    });
  });
});
```

#### MLX Integration Tests (`tests/mlx/`)

```typescript
// tests/mlx/client.test.ts
describe('createMLXClient', () => {
  describe('initialization', () => {
    it('should initialize with valid configuration', async () => {
      const client = await createMLXClient({
        modelPath: 'mlx-community/Llama-3.2-1B-Instruct-4bit',
      });

      expect(client.isReady).toBe(true);
      expect(client.modelInfo).toBeDefined();
      await client.cleanup();
    });

    it('should handle missing model gracefully', async () => {
      await expect(
        createMLXClient({
          modelPath: 'nonexistent/model',
        }),
      ).rejects.toThrow('Model loading failed');
    });

    it('should validate configuration schema', async () => {
      await expect(
        createMLXClient({
          modelPath: '',
          maxTokens: -1,
        }),
      ).rejects.toThrow('Validation error');
    });

    it('should apply default values correctly', async () => {
      const client = await createMLXClient({
        modelPath: 'test/model',
      });

      expect(client.config.maxTokens).toBe(512);
      expect(client.config.temperature).toBe(0.7);
      await client.cleanup();
    });
  });

  describe('text generation', () => {
    let client: MLXClient;

    beforeAll(async () => {
      client = await createMLXClient({
        modelPath: 'mlx-community/Llama-3.2-1B-Instruct-4bit',
      });
    });

    afterAll(async () => {
      await client.cleanup();
    });

    it('should generate text for valid prompts', async () => {
      const response = await client.generate('Hello, world!');

      expect(response.text).toBeTruthy();
      expect(response.inputTokens).toBeGreaterThan(0);
      expect(response.outputTokens).toBeGreaterThan(0);
      expect(response.totalTokens).toBe(response.inputTokens + response.outputTokens);
    });

    it('should handle empty prompts', async () => {
      await expect(client.generate('')).rejects.toThrow('Prompt cannot be empty');
      await expect(client.generate('   ')).rejects.toThrow('Prompt cannot be empty');
    });

    it('should respect generation parameters', async () => {
      const response = await client.generate('Test prompt', {
        maxTokens: 50,
        temperature: 0.1,
      });

      expect(response.outputTokens).toBeLessThanOrEqual(50);
      // Note: Can't easily test temperature, but ensure it doesn't error
      expect(response.text).toBeTruthy();
    });

    it('should handle generation timeouts', async () => {
      const shortTimeoutClient = await createMLXClient({
        modelPath: 'test/model',
        timeout: 100,
      });

      await expect(
        shortTimeoutClient.generate('Very long prompt that should timeout'),
      ).rejects.toThrow('Request timeout');

      await shortTimeoutClient.cleanup();
    });

    it('should retry on failures', async () => {
      const mockClient = await createMLXClient({
        modelPath: 'test/model',
        retries: 2,
      });

      // Mock the sendRequest to fail then succeed
      let attempts = 0;
      const originalSendRequest = mockClient['sendRequest'];
      mockClient['sendRequest'] = vi.fn().mockImplementation(async (req) => {
        attempts++;
        if (attempts === 1) {
          throw new Error('Temporary failure');
        }
        return originalSendRequest.call(mockClient, req);
      });

      const response = await mockClient.generate('Test');
      expect(attempts).toBe(2);

      await mockClient.cleanup();
    });
  });

  describe('embedding generation', () => {
    let client: MLXClient;

    beforeAll(async () => {
      client = await createMLXClient({
        modelPath: 'test/model',
        embeddingModel: 'mlx-community/bge-small-en-v1.5-mlx',
      });
    });

    afterAll(async () => {
      await client.cleanup();
    });

    it('should generate embeddings for single text', async () => {
      const response = await client.embed('Test document');

      expect(response.embeddings).toHaveLength(1);
      expect(response.embeddings[0]).toBeInstanceOf(Array);
      expect(response.dimensions).toBeGreaterThan(0);
      expect(response.count).toBe(1);
    });

    it('should generate embeddings for multiple texts', async () => {
      const texts = ['Document 1', 'Document 2', 'Document 3'];
      const response = await client.embed(texts);

      expect(response.embeddings).toHaveLength(3);
      expect(response.count).toBe(3);
      response.embeddings.forEach((embedding) => {
        expect(embedding).toBeInstanceOf(Array);
        expect(embedding.length).toBe(response.dimensions);
      });
    });

    it('should handle empty text arrays', async () => {
      const response = await client.embed([]);

      expect(response.embeddings).toHaveLength(0);
      expect(response.count).toBe(0);
    });

    it('should handle embedding model not configured', async () => {
      const noEmbeddingClient = await createMLXClient({
        modelPath: 'test/model',
        // No embeddingModel specified
      });

      await expect(noEmbeddingClient.embed('test')).rejects.toThrow(
        'Embedding model not configured',
      );

      await noEmbeddingClient.cleanup();
    });
  });

  describe('health checks', () => {
    it('should report health status', async () => {
      const client = await createMLXClient({
        modelPath: 'test/model',
        embeddingModel: 'test/embedding',
      });

      const health = await client.health();

      expect(health.status).toBe('ready');
      expect(health.model).toBe('test/model');
      expect(health.embeddingModel).toBe('test/embedding');

      await client.cleanup();
    });
  });

  describe('cleanup and resource management', () => {
    it('should cleanup resources properly', async () => {
      const client = await createMLXClient({
        modelPath: 'test/model',
      });

      expect(client.isReady).toBe(true);

      await client.cleanup();

      expect(client.isReady).toBe(false);
      await expect(client.generate('test')).rejects.toThrow('MLX client not ready');
    });

    it('should handle multiple cleanup calls', async () => {
      const client = await createMLXClient({
        modelPath: 'test/model',
      });

      await client.cleanup();
      await client.cleanup(); // Should not throw
    });
  });
});
```

#### Planning Agent Tests (`tests/agents/`)

```typescript
// tests/agents/planning.test.ts
describe('createPlanningAgent', () => {
  describe('plan creation', () => {
    it('should create plans for simple queries', async () => {
      const planner = await createPlanningAgent({ llm: mockMLXClient });

      const plan = await planner.createPlan('What is authentication?');

      expect(plan.steps).toHaveLength(1);
      expect(plan.steps[0].action).toContain('search');
      expect(plan.steps[0].tool).toBe('semantic_search');
      expect(plan.query).toBe('What is authentication?');
    });

    it('should decompose complex queries', async () => {
      const planner = await createPlanningAgent({ llm: mockMLXClient });

      const plan = await planner.createPlan(
        'Analyze the authentication system and find security vulnerabilities',
      );

      expect(plan.steps).toHaveLength.greaterThan(1);
      expect(plan.steps.some((s) => s.tool === 'code_analysis')).toBe(true);
      expect(plan.steps.some((s) => s.tool === 'semantic_search')).toBe(true);
    });

    it('should handle empty queries', async () => {
      const planner = await createPlanningAgent({ llm: mockMLXClient });

      await expect(planner.createPlan('')).rejects.toThrow('Query cannot be empty');
    });

    it('should include dependencies in complex plans', async () => {
      const planner = await createPlanningAgent({ llm: mockMLXClient });

      const plan = await planner.createPlan(
        'Find all authentication functions and analyze their security',
      );

      const hasDependent = plan.steps.some((step) => step.dependencies.length > 0);
      expect(hasDependent).toBe(true);
    });

    it('should estimate execution time', async () => {
      const planner = await createPlanningAgent({ llm: mockMLXClient });

      const plan = await planner.createPlan('Simple query');

      expect(plan.estimatedTime).toBeGreaterThan(0);
      expect(plan.estimatedTime).toBe(plan.steps.length * 30);
    });
  });

  describe('plan execution', () => {
    it('should execute single-step plans', async () => {
      const planner = await createPlanningAgent({
        llm: mockMLXClient,
        vectorStore: mockVectorStore,
        textSearch: mockTextSearch,
      });

      const plan = {
        query: 'test',
        steps: [
          {
            id: 0,
            action: 'search for test',
            tool: 'semantic_search',
            reasoning: 'need to search',
            dependencies: [],
            status: 'pending' as const,
          },
        ],
        estimatedTime: 30,
      };

      const results = await planner.executePlan(plan);

      expect(results).toHaveLength(1);
      expect(results[0]).toBeDefined();
    });

    it('should execute multi-step plans with dependencies', async () => {
      const planner = await createPlanningAgent({
        llm: mockMLXClient,
        vectorStore: mockVectorStore,
        textSearch: mockTextSearch,
      });

      const plan = {
        query: 'complex query',
        steps: [
          {
            id: 0,
            action: 'initial search',
            tool: 'semantic_search',
            reasoning: 'first step',
            dependencies: [],
            status: 'pending' as const,
          },
          {
            id: 1,
            action: 'analyze results',
            tool: 'code_analysis',
            reasoning: 'analyze search results',
            dependencies: [0],
            status: 'pending' as const,
          },
        ],
        estimatedTime: 60,
      };

      const results = await planner.executePlan(plan);

      expect(results).toHaveLength(2);
      expect(results[0]).toBeDefined();
      expect(results[1]).toBeDefined();
    });

    it('should handle dependency failures', async () => {
      const failingPlanner = await createPlanningAgent({
        llm: mockMLXClient,
        vectorStore: mockFailingVectorStore,
      });

      const plan = {
        query: 'test',
        steps: [
          {
            id: 0,
            action: 'failing search',
            tool: 'semantic_search',
            reasoning: 'will fail',
            dependencies: [],
            status: 'pending' as const,
          },
          {
            id: 1,
            action: 'dependent action',
            tool: 'keyword_search',
            reasoning: 'depends on step 0',
            dependencies: [0],
            status: 'pending' as const,
          },
        ],
        estimatedTime: 60,
      };

      await expect(failingPlanner.executePlan(plan)).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle LLM failures during planning', async () => {
      const failingPlanner = await createPlanningAgent({
        llm: mockFailingMLXClient,
      });

      await expect(failingPlanner.createPlan('test query')).rejects.toThrow('Generation failed');
    });

    it('should fallback for invalid LLM responses', async () => {
      const invalidResponseLLM = {
        generate: vi.fn().mockResolvedValue({
          text: 'invalid json response',
        }),
      };

      const planner = await createPlanningAgent({
        llm: invalidResponseLLM,
      });

      const plan = await planner.createPlan('simple query');

      // Should fallback to default single-step plan
      expect(plan.steps).toHaveLength(1);
      expect(plan.steps[0].tool).toBe('semantic_search');
    });
  });
});
```

### 2. Integration Tests (20% of total test suite)

#### Full Pipeline Integration (`tests/integration/`)

```typescript
// tests/integration/full-pipeline.test.ts
describe('Full RAG Pipeline Integration', () => {
  let system: any;

  beforeAll(async () => {
    system = await createFullRAGSystem({
      mlxModelPath: 'mlx-community/Llama-3.2-1B-Instruct-4bit',
      embeddingModelPath: 'mlx-community/bge-small-en-v1.5-mlx',
      vectorStorePath: './test-vector-store',
    });
  });

  afterAll(async () => {
    await system.pipeline.cleanup?.();
    await system.sessionManager.destroy();
    await system.eventStream.destroy();
  });

  describe('end-to-end query processing', () => {
    it('should process simple queries through complete pipeline', async () => {
      const result = await executeAgenticQuery('What is user authentication?', system);

      expect(result).toBeDefined();
      expect(result.answer).toBeTruthy();
      expect(result.steps).toHaveLength.greaterThan(0);
      expect(result.sources).toBeDefined();
      expect(result.metadata.duration).toBeGreaterThan(0);
    });

    it('should handle complex multi-step queries', async () => {
      const result = await executeAgenticQuery(
        'Find authentication vulnerabilities in the codebase and suggest fixes',
        system,
      );

      expect(result).toBeDefined();
      expect(result.steps).toHaveLength.greaterThan(2);
      expect(result.steps.some((s) => s.type === 'planning')).toBe(true);
      expect(result.steps.some((s) => s.type === 'execution')).toBe(true);
    });

    it('should emit streaming events during processing', async () => {
      const events: any[] = [];

      system.eventStream.subscribe('thinking', (event: any) => {
        events.push({ type: 'thinking', ...event });
      });

      system.eventStream.subscribe('searching', (event: any) => {
        events.push({ type: 'searching', ...event });
      });

      system.eventStream.subscribe('complete', (event: any) => {
        events.push({ type: 'complete', ...event });
      });

      await executeAgenticQuery('test query', system);

      expect(events).toHaveLength.greaterThan(0);
      expect(events.some((e) => e.type === 'thinking')).toBe(true);
      expect(events.some((e) => e.type === 'complete')).toBe(true);
    });
  });

  describe('session management integration', () => {
    it('should create and manage analysis sessions', async () => {
      const session = await system.sessionManager.createSession({
        type: 'codebase_analysis',
        config: { rootPath: '/test/project' },
      });

      expect(session.id).toBeTruthy();
      expect(session.type).toBe('codebase_analysis');

      const retrieved = await system.sessionManager.getSession(session.id);
      expect(retrieved).toEqual(session);
    });

    it('should handle session-based incremental analysis', async () => {
      const session = await system.sessionManager.createSession({
        type: 'incremental_analysis',
        config: {},
      });

      // Process first query
      await system.sessionManager.updateSession(session.id, {
        processedFiles: ['file1.ts', 'file2.ts'],
      });

      // Process second query
      await system.sessionManager.updateSession(session.id, {
        processedFiles: ['file1.ts', 'file2.ts', 'file3.ts'],
      });

      const updated = await system.sessionManager.getSession(session.id);
      expect(updated?.state.processedFiles).toContain('file3.ts');
    });
  });

  describe('tool coordination integration', () => {
    it('should coordinate multiple tools in sequence', async () => {
      const toolResults: any[] = [];

      // Mock tool execution tracking
      const originalExecute = system.toolRegistry.execute;
      system.toolRegistry.execute = vi.fn().mockImplementation(async (...args) => {
        const result = await originalExecute(...args);
        toolResults.push({ tool: args[0], result });
        return result;
      });

      await executeAgenticQuery('Analyze authentication patterns and find common issues', system);

      expect(toolResults).toHaveLength.greaterThan(1);

      const toolsUsed = toolResults.map((r) => r.tool);
      expect(toolsUsed).toContain('semantic_search');
    });
  });

  describe('error resilience integration', () => {
    it('should handle partial tool failures gracefully', async () => {
      // Mock one tool to fail
      const originalExecute = system.toolRegistry.execute;
      system.toolRegistry.execute = vi.fn().mockImplementation(async (name, params) => {
        if (name === 'code_analysis') {
          throw new Error('Tool temporarily unavailable');
        }
        return originalExecute(name, params);
      });

      const result = await executeAgenticQuery('Find authentication code and analyze it', system);

      // Should still return results from successful tools
      expect(result).toBeDefined();
      expect(result.answer).toBeTruthy();
    });

    it('should recover from MLX client disconnections', async () => {
      // Simulate client disconnection and recovery
      const originalGenerate = system.pipeline.config.llm.generate;
      let callCount = 0;

      system.pipeline.config.llm.generate = vi.fn().mockImplementation(async (...args) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Connection lost');
        }
        return originalGenerate(...args);
      });

      const result = await executeAgenticQuery('test query', system);

      expect(result).toBeDefined();
      expect(callCount).toBeGreaterThan(1); // Indicates retry occurred
    });
  });
});
```

### 3. Performance Tests (5% of total test suite)

#### Performance Benchmarks (`tests/performance/`)

```typescript
// tests/performance/benchmarks.test.ts
describe('Performance Benchmarks', () => {
  describe('query processing performance', () => {
    it('should process simple queries under 2 seconds', async () => {
      const system = await createFullRAGSystem(testConfig);

      const startTime = Date.now();
      await executeAgenticQuery('What is authentication?', system);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000);

      await system.pipeline.cleanup?.();
    }, 10000);

    it('should process complex queries under 10 seconds', async () => {
      const system = await createFullRAGSystem(testConfig);

      const startTime = Date.now();
      await executeAgenticQuery(
        'Analyze authentication system, find vulnerabilities, and suggest improvements',
        system,
      );
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10000);

      await system.pipeline.cleanup?.();
    }, 15000);

    it('should handle concurrent queries efficiently', async () => {
      const system = await createFullRAGSystem(testConfig);

      const queries = [
        'Query 1: authentication',
        'Query 2: authorization',
        'Query 3: validation',
        'Query 4: security',
        'Query 5: encryption',
      ];

      const startTime = Date.now();
      const results = await Promise.all(queries.map((q) => executeAgenticQuery(q, system)));
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.answer).toBeTruthy();
      });

      // Should not be 5x slower than sequential
      expect(duration).toBeLessThan(15000);

      await system.pipeline.cleanup?.();
    }, 20000);
  });

  describe('memory usage benchmarks', () => {
    it('should maintain memory usage under limits', async () => {
      const memoryManager = createMemoryManager();
      const initialStats = await memoryManager.getStats();

      const system = await createFullRAGSystem(testConfig);

      // Process multiple queries
      for (let i = 0; i < 10; i++) {
        await executeAgenticQuery(`Test query ${i}`, system);
      }

      const finalStats = await memoryManager.getStats();
      const memoryIncrease = finalStats.processMemory.rss - initialStats.processMemory.rss;

      // Should not increase by more than 500MB
      expect(memoryIncrease).toBeLessThan(500 * 1024 * 1024);

      await system.pipeline.cleanup?.();
      memoryManager.cleanup();
    });

    it('should handle memory pressure gracefully', async () => {
      const memoryManager = createMemoryManager();

      // Set low memory thresholds
      memoryManager.setThresholds(100, 50); // 100MB warning, 50MB critical

      let warningEmitted = false;
      memoryManager.on('warning', () => {
        warningEmitted = true;
      });

      const system = await createFullRAGSystem(testConfig);

      // Process queries until memory warning
      for (let i = 0; i < 50; i++) {
        await executeAgenticQuery(`Memory test ${i}`, system);
        if (warningEmitted) break;
      }

      // System should still be responsive
      const result = await executeAgenticQuery('Final test query', system);
      expect(result).toBeDefined();

      await system.pipeline.cleanup?.();
      memoryManager.cleanup();
    });
  });

  describe('MLX performance benchmarks', () => {
    it('should initialize MLX client under 30 seconds', async () => {
      const startTime = Date.now();

      const client = await createMLXClient({
        modelPath: 'mlx-community/Llama-3.2-1B-Instruct-4bit',
      });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(30000);
      expect(client.isReady).toBe(true);

      await client.cleanup();
    }, 45000);

    it('should generate embeddings efficiently', async () => {
      const client = await createMLXClient({
        modelPath: 'test/model',
        embeddingModel: 'mlx-community/bge-small-en-v1.5-mlx',
      });

      const texts = Array.from({ length: 100 }, (_, i) => `Test document ${i}`);

      const startTime = Date.now();
      const response = await client.embed(texts);
      const duration = Date.now() - startTime;

      expect(response.count).toBe(100);
      expect(duration).toBeLessThan(5000); // 50ms per document average

      await client.cleanup();
    });
  });
});
```

### 4. End-to-End Tests (5% of total test suite)

#### Full System E2E (`tests/e2e/`)

```typescript
// tests/e2e/system.test.ts
describe('End-to-End System Tests', () => {
  describe('real codebase analysis', () => {
    it('should analyze TypeScript project structure', async () => {
      const system = await createFullRAGSystem(testConfig);

      // Register code analysis tool
      const codeAnalyzer = createCodeStructureAnalyzer();
      system.toolRegistry.register('code_analysis', codeAnalyzer);

      const result = await executeAgenticQuery(
        'Analyze the TypeScript project structure and identify main components',
        system,
      );

      expect(result.answer).toContain('TypeScript');
      expect(result.sources).toHaveLength.greaterThan(0);
      expect(result.steps.some((s) => s.step?.tool === 'code_analysis')).toBe(true);

      await system.pipeline.cleanup?.();
    });

    it('should perform session-based incremental analysis', async () => {
      const system = await createFullRAGSystem(testConfig);

      // Create analysis session
      const session = await system.sessionManager.createSession({
        type: 'codebase_analysis',
        config: { rootPath: './test-project' },
      });

      // First analysis pass
      const result1 = await executeAgenticQuery('Analyze authentication files', {
        ...system,
        sessionId: session.id,
      });

      // Second analysis pass with different focus
      const result2 = await executeAgenticQuery('Now analyze authorization patterns', {
        ...system,
        sessionId: session.id,
      });

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();

      // Session should maintain context
      const updatedSession = await system.sessionManager.getSession(session.id);
      expect(updatedSession?.state).toBeDefined();

      await system.pipeline.cleanup?.();
    });
  });

  describe('repository-to-knowledge transformation', () => {
    it('should transform Git repository into searchable knowledge', async () => {
      const system = await createFullRAGSystem(testConfig);

      // Mock git-mcp-style repository processing
      const repoProcessor = createRepositoryProcessor();
      const knowledgeBase = await repoProcessor.processRepository('./test-repo');

      // Index knowledge in vector store
      await system.pipeline.config.vectorStore.addDocuments(knowledgeBase.documents);

      const result = await executeAgenticQuery(
        'Find all functions related to user management',
        system,
      );

      expect(result.sources).toHaveLength.greaterThan(0);
      expect(result.answer).toBeTruthy();

      await system.pipeline.cleanup?.();
    });
  });

  describe('multi-user scenarios', () => {
    it('should handle multiple concurrent users', async () => {
      const system = await createFullRAGSystem(testConfig);

      // Simulate 5 concurrent users
      const userSessions = await Promise.all(
        Array.from({ length: 5 }, async (_, i) => {
          return system.sessionManager.createSession({
            type: 'user_analysis',
            config: { userId: `user-${i}` },
          });
        }),
      );

      // Each user makes queries
      const userQueries = userSessions.map(async (session, i) => {
        return executeAgenticQuery(`User ${i} query: analyze authentication patterns`, {
          ...system,
          sessionId: session.id,
        });
      });

      const results = await Promise.all(userQueries);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.answer).toBeTruthy();
      });

      await system.pipeline.cleanup?.();
    });
  });
});
```

## Test Infrastructure & Utilities

### Test Configuration (`tests/setup/`)

```typescript
// tests/setup/global-setup.ts
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createMLXClient } from '../../src/mlx/client';
import { createMemoryManager } from '../../src/mlx/memory-manager';
import { checkMLXSystemRequirements } from '../../src/mlx/memory-manager';

export const testConfig = {
  mlxModelPath: process.env.TEST_MLX_MODEL || 'test/mock-model',
  embeddingModelPath: process.env.TEST_EMBEDDING_MODEL || 'test/mock-embedding',
  vectorStorePath: './test-data/vector-store',
  timeout: 30000,
  retries: 2,
};

export const mockVectorStore = {
  similaritySearch: vi.fn().mockResolvedValue([
    { content: 'Mock document 1', score: 0.9 },
    { content: 'Mock document 2', score: 0.8 },
  ]),
  addDocuments: vi.fn().mockResolvedValue(true),
};

export const mockEmbeddings = {
  embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  batchEmbed: vi.fn().mockResolvedValue([
    [0.1, 0.2],
    [0.3, 0.4],
  ]),
};

export const mockMLXClient = {
  generate: vi.fn().mockResolvedValue({
    text: 'Mock generated response',
    inputTokens: 10,
    outputTokens: 15,
    totalTokens: 25,
  }),
  embed: vi.fn().mockResolvedValue({
    embeddings: [[0.1, 0.2, 0.3]],
    dimensions: 3,
    count: 1,
  }),
  health: vi.fn().mockResolvedValue({
    status: 'ready',
    model: 'test/model',
  }),
  isReady: true,
  modelInfo: { model: 'test' },
  cleanup: vi.fn().mockResolvedValue(undefined),
};

// Global test setup
beforeAll(async () => {
  // Check system requirements for integration tests
  if (process.env.RUN_INTEGRATION_TESTS === 'true') {
    const requirements = await checkMLXSystemRequirements();
    if (!requirements.compatible) {
      console.warn('MLX system requirements not met:', requirements.issues);
    }
  }

  // Setup test database/vector store
  await setupTestVectorStore();

  // Initialize memory monitoring
  const memoryManager = createMemoryManager();
  memoryManager.startMonitoring(5000);

  global.testMemoryManager = memoryManager;
});

afterAll(async () => {
  // Cleanup test resources
  await cleanupTestVectorStore();

  if (global.testMemoryManager) {
    global.testMemoryManager.cleanup();
  }
});

beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks();
});

const setupTestVectorStore = async () => {
  // Implementation for test vector store setup
};

const cleanupTestVectorStore = async () => {
  // Implementation for test cleanup
};
```

## Quality Gates & Success Metrics

### Coverage Requirements

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
      exclude: ['tests/**', 'scripts/**', '**/*.d.ts', 'dist/**'],
    },
    timeout: 30000,
    hookTimeout: 30000,
    setupFiles: ['tests/setup/global-setup.ts'],
  },
});
```

### Performance Thresholds

- **Simple queries**: <2s response time
- **Complex queries**: <10s response time
- **Memory usage**: <500MB baseline growth
- **MLX initialization**: <30s startup time
- **Concurrent users**: 50+ simultaneous sessions

### Error Rate Targets

- **System availability**: 99.9% uptime
- **Query success rate**: 99.5% successful responses
- **MLX client stability**: <1% disconnection rate
- **Memory leak rate**: 0% over 24h operation

This comprehensive test specification ensures industrial-grade quality with complete coverage of all RAG enhancement features.
