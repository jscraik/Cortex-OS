# RAG Package Production Readiness TDD Improvement Plan

## Executive Summary

This document outlines a comprehensive Test-Driven Development (TDD) plan to address the production readiness issues identified in the RAG package technical review, enhanced with valuable components mined from the Archon repository. The plan integrates proven architectural patterns and advanced RAG capabilities while following strict software engineering principles with clear acceptance criteria and validation gates.

## Key Enhancements from Archon Repository Analysis

Based on analysis of <https://github.com/coleam00/Archon.git>, we've identified high-value components to integrate:

1. **Multi-dimensional Embedding Architecture**: Support for 5 embedding dimensions (384, 768, 1024, 1536, 3072)
2. **Hybrid Search System**: Vector similarity + PostgreSQL full-text search
3. **Contextual Embedding Enhancement**: Document-aware chunk processing
4. **Agentic RAG for Code**: Specialized code example extraction
5. **Advanced Error Handling**: Graceful degradation with comprehensive recovery
6. **Performance Optimizations**: Batch processing, multi-level caching, parallel operations

## Advanced Chunking Strategies Enhancement

Based on the Weaviate blog post "Chunking Strategies for RAG", we've identified cutting-edge chunking approaches that significantly outperform traditional methods:

### 1. **Late Chunking** (P1 - High)

**Innovation**: Embed full documents first, then derive chunk embeddings to preserve global context.

**Benefits**:

- Preserves document-level semantic context
- Improves coherence of related chunks
- Outperforms traditional chunk-first approaches

**Implementation**:

```typescript
// New file: src/chunkers/late-chunker.ts
class LateChunker implements Chunker {
  async chunk(file: ProcessingFile, config: ProcessingConfig): Promise<DocumentChunk[]> {
    // Step 1: Get embedding for full document
    const fullDocEmbedding = await this.embedFullDocument(file.content);

    // Step 2: Create semantic chunks
    const chunks = await this.createSemanticChunks(file.content);

    // Step 3: Derive chunk embeddings from full document
    return chunks.map((chunk, index) => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        fullDocEmbedding,
        chunkPosition: index,
        totalChunks: chunks.length,
        strategy: 'late_chunking'
      }
    }));
  }
}
```

### 2. **Semantic Chunking** (P1 - High)

**Innovation**: Use embeddings to find natural semantic boundaries rather than fixed sizes.

**Benefits**:

- Chunks align with meaning, not arbitrary character counts
- Better preservation of conceptual integrity
- Improved retrieval relevance

**Implementation**:

```typescript
// New file: src/chunkers/semantic-chunker.ts
class SemanticChunker implements Chunker {
  async chunk(file: ProcessingFile, config: ProcessingConfig): Promise<DocumentChunk[]> {
    const sentences = this.extractSentences(file.content);
    const chunks: DocumentChunk[] = [];
    let currentChunk: string[] = [];

    for (const sentence of sentences) {
      const testChunk = [...currentChunk, sentence];
      const embedding = await this.embedText(testChunk.join(' '));

      if (this.isSemanticBoundary(currentChunk, embedding)) {
        if (currentChunk.length > 0) {
          chunks.push(this.createChunk(currentChunk, file, chunks.length));
        }
        currentChunk = [sentence];
      } else {
        currentChunk.push(sentence);
      }
    }

    return chunks;
  }
}
```

### 3. **Agentic Chunking** (P2 - Medium)

**Innovation**: AI dynamically chooses optimal chunking strategy per document.

**Benefits**:

- Adaptive to content complexity and structure
- Optimal strategy selection without manual configuration
- Handles heterogeneous document collections

**Implementation**:

```typescript
// Enhance ProcessingDispatcher with AI decision-making
class AgenticProcessingDispatcher extends ProcessingDispatcher {
  async dispatch(file: ProcessingFile, strategy?: StrategyDecision): Promise<DispatchResult> {
    // If no strategy provided, use AI to decide
    if (!strategy) {
      strategy = await this.determineOptimalStrategy(file);
    }

    return super.dispatch(file, strategy);
  }

  private async determineOptimalStrategy(file: ProcessingFile): Promise<StrategyDecision> {
    const analysis = await this.analyzeDocumentStructure(file);

    // Use LLM to determine best chunking approach
    const prompt = this.buildStrategyPrompt(analysis);
    const decision = await this.llm.complete(prompt);

    return this.parseStrategyDecision(decision);
  }
}
```

### 4. **Hierarchical Chunking** (P2 - Medium)

**Innovation**: Multi-level chunks (document → sections → paragraphs) for context-aware retrieval.

**Benefits**:

- Enables retrieval at different granularities
- Preserves structural relationships
- Improves context window utilization

**Implementation**:

```typescript
// New file: src/chunkers/hierarchical-chunker.ts
interface HierarchicalChunk extends DocumentChunk {
  level: 'document' | 'section' | 'paragraph';
  parentId?: string;
  childrenIds?: string[];
}

class HierarchicalChunker implements Chunker {
  async chunk(file: ProcessingFile, config: ProcessingConfig): Promise<HierarchicalChunk[]> {
    const chunks: HierarchicalChunk[] = [];

    // Document level
    const docChunk: HierarchicalChunk = {
      id: `${file.path}-doc`,
      content: file.content.toString('utf-8').substring(0, 500), // Summary
      metadata: { type: 'document_summary', level: 'document' },
      level: 'document'
    };
    chunks.push(docChunk);

    // Section level
    const sections = this.extractSections(file.content);
    sections.forEach((section, index) => {
      const sectionChunk: HierarchicalChunk = {
        id: `${file.path}-section-${index}`,
        content: section.content,
        metadata: {
          type: 'section',
          level: 'section',
          heading: section.heading,
          parentId: docChunk.id
        },
        level: 'section',
        parentId: docChunk.id
      };
      chunks.push(sectionChunk);

      // Paragraph level within section
      const paragraphs = this.extractParagraphs(section.content);
      paragraphs.forEach((para, paraIndex) => {
        chunks.push({
          id: `${file.path}-section-${index}-para-${paraIndex}`,
          content: para,
          metadata: {
            type: 'paragraph',
            level: 'paragraph',
            parentId: sectionChunk.id
          },
          level: 'paragraph',
          parentId: sectionChunk.id
        });
      });
    });

    return chunks;
  }
}
```

### 5. **Post-chunking** (P2 - Medium)

**Innovation**: Create chunks dynamically at query time based on query context.

**Benefits**:

- Optimized for specific query needs
- Reduces storage requirements
- Adapts to different query types

**Implementation**:

```typescript
// New file: src/chunkers/post-chunker.ts
class PostChunker implements Chunker {
  async chunk(file: ProcessingFile, config: ProcessingConfig & { query?: string }): Promise<DocumentChunk[]> {
    if (!config.query) {
      // Fallback to default chunking
      return this.defaultChunk(file, config);
    }

    // Analyze query to determine optimal chunking
    const queryAnalysis = await this.analyzeQuery(config.query);

    // Create query-specific chunks
    return this.createQueryAwareChunks(file, queryAnalysis);
  }

  private async analyzeQuery(query: string): Promise<QueryAnalysis> {
    // Determine if query needs:
    // - Broad context (summarization)
    // - Specific details (extraction)
    // - Comparative analysis (multiple sections)
    // - Step-by-step (procedural content)
  }
}
```

## Current State Assessment

### Critical Issues Identified

1. **Test Coverage**: 40.43% (target: 90%)
2. **Security Vulnerabilities**: Command injection, prototype pollution
3. **Production Readiness**: No persistent storage, missing error handling
4. **Performance**: O(n) vector search, memory leaks
5. **Reliability**: No retry logic, circuit breakers, or health checks

### Health Score by Category

- **Architecture**: 7/10
- **Security**: 4/10
- **Performance**: 5/10
- **Reliability**: 5/10
- **Test Coverage**: 4/10
- **Overall**: 5/10

## Improvement Modules

### Module 1: Security Hardening (P0 - Critical)

#### 1.1 Command Injection Vulnerability Fix

**Files**: `src/embed/qwen3.ts`, `src/integrations/archon-mcp.ts`

**TDD Approach**:

```typescript
// Test: Should sanitize shell commands
test('should sanitize shell commands in qwen3 embedder', async () => {
  const embedder = new Qwen3Embedder();
  const maliciousInput = 'test; rm -rf /';

  await expect(embedder.embed([maliciousInput]))
    .rejects.toThrow('Invalid input');
});

// Test: Should validate metadata for prototype pollution
test('should detect and prevent prototype pollution', () => {
  const maliciousMetadata = {
    toString: 'evil',
    __proto__: { polluted: true }
  };

  expect(() => sanitizeMetadata(maliciousMetadata))
    .toThrow('Prototype pollution detected');
});
```

**Implementation Steps**:

1. Create input sanitizer utility
2. Add shell command validation
3. Implement deep metadata sanitization
4. Add security tests

**Validation Gate**:

```bash
pnpm test:security
pnpm security:scan
```

#### 1.2 Input Validation Enhancement

**Files**: `src/mcp/tools.ts`, `src/lib/types.ts`

**TDD Approach**:

```typescript
// Test: Should validate embedding dimensions
test('should reject invalid embedding dimensions', async () => {
  const invalidEmbedding = new Array(1025).fill(0.1);

  await expect(validateEmbedding(invalidEmbedding))
    .rejects.toThrow('Invalid embedding dimension');
});

// Test: Should enforce size limits
test('should enforce content size limits', () => {
  const largeContent = 'x'.repeat(26000);

  expect(() => validateContentSize(largeContent))
    .toThrow('Content exceeds maximum size');
});
```

### Module 2: Test Coverage Improvement (P0 - Critical)

#### 2.1 Core Components Coverage

**Target Files with 0% Coverage**:

- `src/enhanced-pipeline.ts`
- `src/embed/qwen3.ts`
- `src/pipeline/qwen3-reranker.ts`
- `src/generation/multi-model.ts`

**TDD Approach**:

```typescript
// Enhanced Pipeline Tests
describe('EnhancedPipeline', () => {
  test('should handle empty document batches', async () => {
    const pipeline = new EnhancedPipeline();
    const result = await pipeline.ingestBatch([]);

    expect(result.processed).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  test('should retry failed embedding requests', async () => {
    const mockEmbedder = createMockEmbedder();
    mockEmbedder.embed
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce([[0.1, 0.2]]);

    const pipeline = new EnhancedPipeline({ embedder: mockEmbedder });
    const result = await pipeline.ingestBatch(['test']);

    expect(result.processed).toBe(1);
  });
});
```

**Implementation Strategy**:

1. Create test harness for each component
2. Mock external dependencies
3. Test error scenarios
4. Add performance tests

**Validation Gate**:

```bash
pnpm test --coverage
# Verify each module reaches 80%+ coverage
```

#### 2.2 Integration Test Suite

**Files**: New `__tests__/integration/` directory

**TDD Approach**:

```typescript
// End-to-end pipeline test
test('should process document through entire pipeline', async () => {
  const pipeline = new RAGPipeline();

  // Ingest document
  await pipeline.ingest('Test document content');

  // Query and verify results
  const results = await pipeline.query('test');

  expect(results).toHaveLength(1);
  expect(results[0].score).toBeGreaterThan(0.5);
});

// MCP integration test
test('should handle MCP tool timeouts', async () => {
  const slowTool = createSlowTool(2000);
  const mcpTools = new RAGMCPTools({ timeout: 1000 });

  await expect(mcpTools.ragQuery({ query: 'test' }))
    .rejects.toThrow('Timeout');
});
```

### Module 3: Production Storage Backend (P1 - High)

#### 3.1 Vector Database Integration

**Files**: New `src/store/vector-db.ts`, `src/store/postgres.ts`

**TDD Approach**:

```typescript
// Test: Should persist embeddings to database
test('should store and retrieve embeddings from vector database', async () => {
  const store = new VectorDBStore();

  // Store embedding
  await store.add({
    id: 'test-1',
    text: 'test content',
    embedding: [0.1, 0.2, 0.3],
    metadata: { source: 'test' }
  });

  // Search similar
  const results = await store.search([0.1, 0.2, 0.3], { k: 5 });

  expect(results).toHaveLength(1);
  expect(results[0].id).toBe('test-1');
});

// Test: Should handle connection failures gracefully
test('should fallback to in-memory on database failure', async () => {
  const store = new VectorDBStore();
  await store.disconnect();

  const results = await store.search([0.1, 0.2, 0.3], { k: 5 });

  expect(results).toHaveLength(0);
  expect(store.getState()).toBe('degraded');
});
```

**Implementation Options**:

1. PostgreSQL with pgvector extension
2. Dedicated vector database (Weaviate, Pinecone)
3. SQLite with vector extension (for lightweight deployments)

### Module 4: Reliability Patterns (P1 - High)

#### 4.1 Circuit Breaker Implementation

**Files**: New `src/lib/circuit-breaker.ts`, `src/lib/retry.ts`

**TDD Approach**:

```typescript
// Circuit breaker tests
describe('CircuitBreaker', () => {
  test('should open circuit after failure threshold', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 5000
    });

    // Fail 3 times
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failingOperation))
        .rejects.toThrow();
    }

    // Circuit should be open
    await expect(breaker.execute(anyOperation))
      .rejects.toThrow('Circuit open');
  });

  test('should attempt reset after timeout', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeout: 100
    });

    await breaker.execute(failingOperation);
    await expect(breaker.execute(anyOperation))
      .rejects.toThrow('Circuit open');

    // Wait for reset timeout
    await sleep(150);

    // Should attempt reset
    const result = await breaker.execute(successfulOperation);
    expect(result).toBe('success');
  });
});
```

#### 4.2 Retry Mechanism

**TDD Approach**:

```typescript
// Retry with exponential backoff
test('should retry with exponential backoff', async () => {
  const attempts: number[] = [];
  const operation = vi.fn()
    .mockRejectedValueOnce(new Error('Fail 1'))
    .mockRejectedValueOnce(new Error('Fail 2'))
    .mockResolvedValue('success');

  const result = await withRetry(operation, {
    maxAttempts: 3,
    baseDelay: 100
  }, (attempt, delay) => {
    attempts.push(attempt);
  });

  expect(result).toBe('success');
  expect(attempts).toEqual([1, 2]);
  expect(operation).toHaveBeenCalledTimes(3);
});
```

### Module 5: Advanced Chunking Strategy Implementation (P1 - High)

#### 5.1 Late Chunking Implementation

**Files**: `src/chunkers/late-chunker.ts`, `src/chunkers/semantic-chunker.ts`

**TDD Approach**:

```typescript
// Late chunking tests
describe('LateChunker', () => {
  test('should preserve document context in chunks', async () => {
    const chunker = new LateChunker();
    const file = createTestFile('Large document content...');

    const chunks = await chunker.chunk(file, {});

    // All chunks should reference the full document embedding
    chunks.forEach(chunk => {
      expect(chunk.metadata.fullDocEmbedding).toBeDefined();
      expect(chunk.metadata.strategy).toBe('late_chunking');
    });

    // Verify chunks maintain relationship
    expect(chunks[0].metadata.chunkPosition).toBe(0);
    expect(chunks[0].metadata.totalChunks).toBe(chunks.length);
  });

  test('should outperform traditional chunking', async () => {
    const lateChunker = new LateChunker();
    const traditionalChunker = new TextChunker();

    const file = createTestFile('Complex document with multiple themes...');

    // Test retrieval relevance
    const lateChunks = await lateChunker.chunk(file, {});
    const traditionalChunks = await traditionalChunker.chunk(file, {
      chunker: 'structured'
    });

    const query = 'theme about specific concept';

    const lateRelevance = await measureRelevance(query, lateChunks);
    const traditionalRelevance = await measureRelevance(query, traditionalChunks);

    expect(lateRelevance.avgScore).toBeGreaterThan(traditionalRelevance.avgScore);
  });
});
```

#### 5.2 Semantic Chunking Implementation

**Files**: `src/chunkers/semantic-chunker.ts`, `src/lib/similarity.ts`

**TDD Approach**:

```typescript
// Semantic chunking tests
describe('SemanticChunker', () => {
  test('should detect semantic boundaries', async () => {
    const chunker = new SemanticChunker();
    const content = `
      First topic with multiple sentences explaining concept A.
      More details about concept A and its implications.

      Second topic introducing concept B with examples.
      Further explanation of concept B.
    `;
    const file = createTestFile(content);

    const chunks = await chunker.chunk(file, {});

    // Should create separate chunks for different topics
    expect(chunks.length).toBe(2);
    expect(chunks[0].content).toContain('concept A');
    expect(chunks[1].content).toContain('concept B');
  });

  test('should handle variable length chunks naturally', async () => {
    const chunker = new SemanticChunker();
    const file = createComplexTestFile();

    const chunks = await chunker.chunk(file, {});

    // Verify chunks have meaningful variance in length
    const lengths = chunks.map(c => c.content.length);
    const variance = calculateVariance(lengths);

    expect(variance).toBeGreaterThan(100); // Significant variance expected
  });
});
```

#### 5.3 Agentic Chunking Implementation

**Files**: `src/chunkers/agentic-dispatcher.ts`, `src/lib/document-analyzer.ts`

**TDD Approach**:

```typescript
// Agentic chunking tests
describe('AgenticProcessingDispatcher', () => {
  test('should select optimal strategy per document', async () => {
    const dispatcher = new AgenticProcessingDispatcher();

    // Test different document types
    const markdownFile = createMarkdownFile();
    const codeFile = createCodeFile();
    const pdfFile = createPdfFile();

    const mdResult = await dispatcher.dispatch(markdownFile);
    const codeResult = await dispatcher.dispatch(codeFile);
    const pdfResult = await dispatcher.dispatch(pdfFile);

    // Should choose different strategies
    expect(mdResult.strategy).not.toBe(codeResult.strategy);
    expect(codeResult.strategy).not.toBe(pdfResult.strategy);
  });

  test('should learn from performance feedback', async () => {
    const dispatcher = new AgenticProcessingDispatcher();
    const file = createTestFile();

    // Initial processing
    const result1 = await dispatcher.dispatch(file);

    // Provide feedback on performance
    await dispatcher.recordFeedback(result1.metadata.chunker, 0.8);

    // Should adapt strategy based on feedback
    const result2 = await dispatcher.dispatch(file);
    const adaptation = await dispatcher.getAdaptationInfo();

    expect(adaptation.hasLearned).toBe(true);
  });
});
```

#### 5.4 Hierarchical Chunking Implementation

**Files**: `src/chunkers/hierarchical-chunker.ts`, `src/store/hierarchical-store.ts`

**TDD Approach**:

```typescript
// Hierarchical chunking tests
describe('HierarchicalChunker', () => {
  test('should create multi-level chunk hierarchy', async () => {
    const chunker = new HierarchicalChunker();
    const file = createStructuredDocument();

    const chunks = await chunker.chunk(file, {});

    // Verify hierarchy exists
    const docLevel = chunks.filter(c => c.level === 'document');
    const sectionLevel = chunks.filter(c => c.level === 'section');
    const paraLevel = chunks.filter(c => c.level === 'paragraph');

    expect(docLevel).toHaveLength(1);
    expect(sectionLevel.length).toBeGreaterThan(0);
    expect(paraLevel.length).toBeGreaterThan(sectionLevel.length);

    // Verify parent-child relationships
    sectionLevel.forEach(section => {
      expect(section.parentId).toBe(docLevel[0].id);
    });
  });

  test('should enable hierarchical retrieval', async () => {
    const store = new HierarchicalStore();
    await store.ingestHierarchicalChunks(chunks);

    // Query with context expansion
    const results = await store.search('specific concept', {
      expandContext: true,
      maxLevels: 2
    });

    // Should include parent context
    expect(results[0].context).toContain('parent section content');
  });
});
```

#### 5.5 Post-chunking Implementation

**Files**: `src/chunkers/post-chunker.ts`, `src/lib/query-analyzer.ts`

**TDD Approach**:

```typescript
// Post-chunking tests
describe('PostChunker', () => {
  test('should adapt chunks to query type', async () => {
    const chunker = new PostChunker();
    const file = createTestFile('Comprehensive document content...');

    // Test different query types
    const summaryQuery = 'summarize this document';
    const detailQuery = 'what are the specific technical requirements';

    const summaryChunks = await chunker.chunk(file, { query: summaryQuery });
    const detailChunks = await chunker.chunk(file, { query: detailQuery });

    // Summary should have fewer, broader chunks
    expect(summaryChunks.length).toBeLessThan(detailChunks.length);
    expect(summaryChunks[0].content.length).toBeGreaterThan(detailChunks[0].content.length);
  });

  test('should handle query-time chunking efficiently', async () => {
    const chunker = new PostChunker();
    const file = createLargeTestFile();

    const startTime = performance.now();
    const chunks = await chunker.chunk(file, {
      query: 'specific information about topic X'
    });
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(1000); // Should be fast
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every(c => c.content.includes('topic X'))).toBe(true);
  });
});
```

### Module 6: Advanced RAG Capabilities (P1 - High) - Enhanced with Archon Patterns

#### 6.1 Vector Indexing Implementation

**Files**: `src/store/hnsw-index.ts`, `src/store/quantization.ts`

**TDD Approach**:

```typescript
// HNSW index tests
describe('HNSWIndex', () => {
  test('should build index efficiently', async () => {
    const index = new HNSWIndex({ dim: 768, M: 16, ef: 200 });

    // Add 1000 vectors
    for (let i = 0; i < 1000; i++) {
      const vector = generateRandomVector(768);
      await index.add(i, vector);
    }

    expect(index.size()).toBe(1000);
    expect(index.buildTime).toBeLessThan(5000);
  });

  test('should search faster than linear scan', async () => {
    const index = new HNSWIndex({ dim: 768 });
    const linearStore = new MemoryStore();

    // Add same vectors to both
    const vectors = generateTestVectors(10000);
    for (let i = 0; i < vectors.length; i++) {
      await index.add(i, vectors[i]);
      await linearStore.add({
        id: i.toString(),
        embedding: vectors[i]
      });
    }

    const query = generateRandomVector(768);

    // Benchmark both
    const indexTime = await benchmark(() =>
      index.search(query, { k: 10 })
    );
    const linearTime = await benchmark(() =>
      linearStore.search(query, { k: 10 })
    );

    expect(indexTime).toBeLessThan(linearTime / 10);
  });
});
```

#### 5.2 Process Pool for Embedding

**Files**: `src/embed/process-pool.ts`

**TDD Approach**:

```typescript
// Process pool tests
describe('EmbeddingProcessPool', () => {
  test('should reuse processes for multiple batches', async () => {
    const pool = new EmbeddingProcessPool({
      minWorkers: 2,
      maxWorkers: 4
    });

    // Process multiple batches
    const results = await Promise.all([
      pool.embed(['batch 1']),
      pool.embed(['batch 2']),
      pool.embed(['batch 3'])
    ]);

    expect(pool.getActiveWorkers()).toBeLessThanOrEqual(4);
    expect(results).toHaveLength(3);
  });

  test('should scale workers based on load', async () => {
    const pool = new EmbeddingProcessPool({
      minWorkers: 1,
      maxWorkers: 3,
      scaleThreshold: 2
    });

    // Initial state
    expect(pool.getActiveWorkers()).toBe(1);

    // High load
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(pool.embed([`text ${i}`]));
    }

    // Should scale up
    await sleep(100);
    expect(pool.getActiveWorkers()).toBeGreaterThan(1);

    await Promise.all(promises);
  });
});
```

### Module 7: Observability and Monitoring (P2 - Medium)

#### 7.1 Metrics Collection

**Files**: `src/lib/metrics.ts`, `src/lib/health-check.ts`

**TDD Approach**:

```typescript
// Metrics tests
describe('RAGMetrics', () => {
  test('should track query latency', () => {
    const metrics = new RAGMetrics();

    return metrics.timeQuery('test-query', async () => {
      await sleep(100);
      return 'result';
    }).then(() => {
      const latency = metrics.getQueryLatency('test-query');
      expect(latency.count).toBe(1);
      expect(latency.avg).toBeGreaterThan(90);
    });
  });

  test('should track error rates', () => {
    const metrics = new RAGMetrics();

    // Record some errors
    metrics.recordError('embedding');
    metrics.recordError('embedding');
    metrics.recordSuccess('embedding');

    const rate = metrics.getErrorRate('embedding');
    expect(rate).toBe(0.66); // 2/3
  });
});

// Health check tests
test('should report overall system health', async () => {
  const health = new RAGHealthCheck();

  // Add components
  health.addComponent('embedder', new MockEmbedder());
  health.addComponent('store', new MockStore());

  const status = await health.check();

  expect(status.overall).toBe('healthy');
  expect(status.components).toHaveProperty('embedder');
  expect(status.components).toHaveProperty('store');
});
```

### Module 8: Configuration Management (P3 - Low)

#### 8.1 Dynamic Configuration

**Files**: `src/lib/config.ts`, `src/lib/validation.ts`

**TDD Approach**:

```typescript
// Configuration tests
describe('RAGConfig', () => {
  test('should validate configuration schema', () => {
    const config = new RAGConfig();

    expect(() => config.load({
      embedding: {
        batchSize: 'invalid' // Should be number
      }
    })).toThrow('Invalid configuration');
  });

  test('should support hot reload', async () => {
    const config = new RAGConfig();
    await config.load(validConfig);

    // Subscribe to changes
    const updates: any[] = [];
    config.onUpdate((newConfig) => {
      updates.push(newConfig);
    });

    // Update configuration
    await config.update({
      ...validConfig,
      embedding: { ...validConfig.embedding, batchSize: 64 }
    });

    expect(updates).toHaveLength(1);
    expect(updates[0].embedding.batchSize).toBe(64);
  });
});
```

## Implementation Timeline

### Phase 1 (Weeks 1-2): Security & Testing

- [ ] Fix all security vulnerabilities (Module 1)
- [ ] Achieve 70%+ test coverage (Module 2)
- [ ] Add integration test suite

### Phase 2 (Weeks 3-4): Production Storage

- [ ] Implement persistent vector storage (Module 3)
- [ ] Add migration tools from memory store
- [ ] Update all tests to use new storage

### Phase 3 (Weeks 5-6): Reliability

- [ ] Implement circuit breakers (Module 4.1)
- [ ] Add retry mechanisms (Module 4.2)
- [ ] Add health checks

### Phase 4 (Weeks 7-10): Advanced Chunking Strategies

- [ ] Implement Late Chunking (Module 5.1) - P1 High
- [ ] Implement Semantic Chunking (Module 5.2) - P1 High
- [ ] Implement Agentic Chunking (Module 5.3) - P2 Medium
- [ ] Implement Hierarchical Chunking (Module 5.4) - P2 Medium
- [ ] Implement Post-chunking (Module 5.5) - P2 Medium
- [ ] Performance benchmarking for all strategies
- [ ] A/B testing framework for chunking strategies

### Phase 5 (Weeks 11-12): Advanced RAG Capabilities

- [ ] Implement vector indexing (Module 6.1)
- [ ] Add process pooling (Module 6.2)
- [ ] Hybrid search implementation

### Phase 6 (Weeks 13-14): Observability

- [ ] Add metrics collection (Module 7.1)
- [ ] Implement health monitoring
- [ ] Add alerting integration
- [ ] Chunking strategy performance dashboard

## Validation Gates

### Pre-commit Checks

```bash
# Must pass before committing
pnpm lint
pnpm test
pnpm typecheck
pnpm security:scan:diff
```

### Pre-merge Checks

```bash
# Must pass before merging
pnpm test:coverage  # 90% threshold
pnpm test:integration
pnpm security:scan:all
pnpm structure:validate
```

### Release Criteria

- [ ] All modules complete
- [ ] Test coverage ≥ 90%
- [ ] Security scan clean
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Integration tests passing
- [ ] Advanced chunking strategies implemented and tested
- [ ] A/B testing results showing improvement over baseline
- [ ] Chunking strategy performance dashboard operational

## Success Metrics

### Quality Metrics

- **Test Coverage**: 40.43% → 90%
- **Security Vulnerabilities**: 6 critical → 0
- **Test Failures**: 9 failing → 0 failing

### Performance Metrics

- **Query Latency**: <200ms for 10K documents
- **Memory Usage**: O(log n) growth pattern
- **Throughput**: 1000+ queries/minute
- **Availability**: 99.9% uptime

### Chunking Strategy Metrics

- **Late Chunking**: 15-20% improvement in retrieval relevance
- **Semantic Chunking**: 25-30% reduction in irrelevant chunks
- **Agentic Chunking**: 40% improvement in optimal strategy selection
- **Hierarchical Chunking**: 35% better context preservation
- **Post-chunking**: 50% reduction in storage requirements for query-specific use cases

### Production Readiness

- **Persistent Storage**: ✅
- **Error Handling**: ✅
- **Monitoring**: ✅
- **Documentation**: ✅

## Rollback Plan

Each module includes feature flags for safe deployment:

```typescript
// Feature flags for gradual rollout
const FEATURES = {
  VECTOR_INDEX: process.env.RAG_ENABLE_VECTOR_INDEX === 'true',
  PROCESS_POOL: process.env.RAG_ENABLE_PROCESS_POOL === 'true',
  CIRCUIT_BREAKER: process.env.RAG_ENABLE_CIRCUIT_BREAKER === 'true'
};
```

If issues arise, disable features via environment variables and rollback to previous stable state.

## Resources Required

### Development Resources

- **Backend Engineer**: 10 weeks
- **Security Engineer**: 2 weeks (Module 1)
- **Performance Engineer**: 2 weeks (Module 5)

### Infrastructure Resources

- **Vector Database**: PostgreSQL with pgvector or dedicated service
- **Monitoring**: Prometheus/Grafana stack
- **Testing**: CI/CD pipeline enhancements

## Conclusion

This enhanced TDD plan provides a comprehensive approach to transforming the RAG package into a production-ready system with cutting-edge chunking capabilities. By incorporating the advanced strategies from the Weaviate blog post, we can significantly improve retrieval accuracy, context preservation, and overall system performance.

The plan now includes:

1. **Five advanced chunking strategies** that outperform traditional approaches
2. **Extended timeline** to properly implement and validate these innovations
3. **Specific metrics** to measure improvement over baseline chunking
4. **A/B testing framework** to continuously optimize chunking performance

The integration of late chunking, semantic chunking, agentic chunking, hierarchical chunking, and post-chunking represents a significant leap forward in RAG technology. These approaches, particularly late chunking which embeds full documents first, have demonstrated substantial improvements in retrieval relevance and context coherence.

## MLX-First Model Integration Architecture

### Overview

This section outlines the MLX-first model integration strategy for the RAG package, implementing a hierarchical approach: **MLX (primary) → Ollama (fallback) → Frontier APIs (optional)**. This architecture leverages Apple Silicon's MLX framework for optimal performance while maintaining reliability through fallback mechanisms.

### Model Integration Strategy

#### 1. **Embedding Layer Enhancement** (`src/embed/`)

**Current State**: Python subprocess with Qwen3 models
**Target State**: Native MLX implementation with fallback chains

```typescript
// New: src/embed/mlx-embedder.ts
export class MLXEmbedder implements Embedder {
  private model: MLXEmbeddingModel;
  private fallback: OllamaEmbedder;

  constructor(config: EmbedConfig) {
    // Load MLX model natively (qwen3-4b default)
    this.model = new MLXEmbeddingModel(config.model);
    this.fallback = new OllamaEmbedder('nomic-embed-text:v1.5');
  }

  async embed(texts: string[]): Promise<number[][]> {
    try {
      return await this.model.embed(texts);
    } catch (error) {
      // Fallback to Ollama
      return await this.fallback.embed(texts);
    }
  }
}
```

**TDD Implementation**:

```typescript
// Tests for MLX embedding with fallback
describe('MLXEmbedder', () => {
  test('should use MLX for embedding by default', async () => {
    const embedder = new MLXEmbedder({ model: 'qwen3-4b' });
    const result = await embedder.embed(['test text']);

    expect(result[0].length).toBe(768);
    expect(embedder.getLastBackend()).toBe('mlx');
  });

  test('should fallback to Ollama when MLX fails', async () => {
    const embedder = new MLXEmbedder({ model: 'qwen3-4b' });
    await embedder.setModelFailure(true);

    const result = await embedder.embed(['test text']);

    expect(embedder.getLastBackend()).toBe('ollama');
  });
});
```

#### 2. **Reranking Layer Modernization** (`src/pipeline/`)

**Current State**: Basic word overlap scoring
**Target State**: MLX-based reranking with smart fallback

```typescript
// Enhanced: src/pipeline/qwen3-reranker.ts
export class SmartReranker implements Reranker {
  private models: ModelChain;

  constructor() {
    this.models = new ModelChain([
      { backend: 'mlx', model: 'qwen3-reranker', priority: 100 },
      { backend: 'ollama', model: 'cross-encoder', priority: 50 },
      { backend: 'api', model: 'cohere-rerank', priority: 25 }
    ]);
  }

  async rerank(query: string, docs: Document[]): Promise<Document[]> {
    const model = await this.models.getBestAvailable();
    return model.rerank(query, docs);
  }
}
```

#### 3. **Generation Layer Optimization** (`src/generation/`)

**Current State**: MultiModelGenerator with basic routing
**Target State**: Intelligent model selection with resource awareness

```typescript
// Enhanced: src/generation/smart-router.ts
export class SmartModelRouter {
  private registry: ModelRegistry;
  private resourceMonitor: ResourceMonitor;

  async selectForTask(task: Task, context: Context): Promise<ModelConfig> {
    // Model hierarchy based on task and resources
    const candidates = this.registry.getModelsForTask(task);

    // Filter by available memory (MLX models need more RAM)
    const available = candidates.filter(m =>
      this.resourceMonitor.canLoad(m)
    );

    // Select best available
    return available.sort((a, b) => b.priority - a.priority)[0];
  }
}
```

### Model Registry Implementation

#### 4. **Unified Model Registry** (`src/lib/model-registry.ts`)

```typescript
export class ModelRegistry {
  private models = new Map<string, ModelChain>();

  constructor() {
    // Embedding models
    this.register('embedding', {
      primary: { backend: 'mlx', model: 'qwen3-4b', dimensions: 768 },
      fallback: [
        { backend: 'ollama', model: 'nomic-embed-text:v1.5', dimensions: 768 },
        { backend: 'api', model: 'text-embedding-3-small', dimensions: 1536 }
      ]
    });

    // Coding models
    this.register('coding', {
      primary: { backend: 'mlx', model: 'glm-4.5', context: 32768 },
      fallback: [
        { backend: 'ollama', model: 'deepseek-coder:6.7b', context: 16384 },
        { backend: 'api', model: 'claude-3.5-sonnet', context: 200000 }
      ]
    });

    // Large context models
    this.register('large-context', {
      primary: { backend: 'mlx', model: 'qwen3-coder-30b', context: 32768 },
      fallback: [
        { backend: 'ollama', model: 'qwen3-coder:30b', context: 32768 },
        { backend: 'api', model: 'gpt-4o', context: 128000 }
      ]
    });
  }
}
```

### Resource Management for MLX

#### 5. **MLX Resource Manager** (`src/lib/mlx-manager.ts`)

```typescript
export class MLXResourceManager {
  private loadedModels = new Map<string, MLXModel>();
  private memoryBudget: number;
  private alwaysOn = new Set(['gemma-3-270m']); // 270MB model

  constructor() {
    // Calculate available memory on Apple Silicon
    this.memoryBudget = this.getUnifiedMemory();
  }

  async loadModel(modelId: string): Promise<MLXModel> {
    if (this.loadedModels.has(modelId)) {
      return this.loadedModels.get(modelId)!;
    }

    // Check memory availability
    const model = this.getModelConfig(modelId);
    if (model.memoryGB > this.getAvailableMemory()) {
      // Unload least recently used
      await this.evictLRU();
    }

    // Load model
    const mlxModel = await MLXModel.load(model);
    this.loadedModels.set(modelId, mlxModel);

    return mlxModel;
  }
}
```

### Enhanced Pipeline Integration

#### 6. **MLX-Optimized RAG Pipeline** (`src/rag-pipeline.ts`)

```typescript
export class MLXOptimizedPipeline extends RAGPipeline {
  private modelRegistry: ModelRegistry;
  private mlxManager: MLXResourceManager;

  async query(query: string, options: QueryOptions): Promise<QueryResult> {
    // 1. Embedding with MLX-first
    const embedModel = await this.modelRegistry.getBest('embedding');
    const queryEmbedding = await embedModel.embed([query]);

    // 2. Retrieve from vector store
    const candidates = await this.vectorStore.search(queryEmbedding[0], {
      k: options.topK || 20
    });

    // 3. Rerank with available model
    if (candidates.length > 5) {
      const reranker = await this.modelRegistry.getBest('reranker');
      candidates = await reranker.rerank(query, candidates);
    }

    // 4. Generate with context-aware model selection
    const generator = await this.modelRegistry.getBestForContext(
      'generation',
      {
        contextSize: candidates.reduce((sum, doc) => sum + doc.content.length, 0),
        task: this.inferTask(query),
        requiresCode: this.detectCodeNeed(query)
      }
    );

    return generator.generate(query, candidates.slice(0, 5));
  }
}
```

### Performance Optimization Strategies

#### 7. **MLX-Specific Optimizations**

**Memory Management**:

- Preload small models (gemma-3-270m) for instant responses
- Implement LRU caching for larger models
- Use unified memory efficiently on Apple Silicon

**Batch Processing**:

- Leverage MLX's batch processing capabilities
- Implement dynamic batching for embedding requests
- Use async streaming for generation

**Quantization Strategies**:

- Use 4-bit quantization for large models (30B)
- Native precision for smaller models (< 8B)
- Dynamic quantization based on available memory

### Implementation Phases for MLX Integration

#### Phase 1: Core MLX Infrastructure (Weeks 1-2)

- [ ] Implement native MLX embedder
- [ ] Create MLX resource manager
- [ ] Build model registry with fallback chains
- [ ] Update embedding pipeline to use MLX-first

#### Phase 2: Enhanced Reranking (Weeks 3-4)

- [ ] Replace word overlap with MLX reranker
- [ ] Implement model-based reranking
- [ ] Add reranking fallback chains
- [ ] Performance benchmarking

#### Phase 3: Smart Generation Routing (Weeks 5-6)

- [ ] Enhance model router with resource awareness
- [ ] Implement context-aware model selection
- [ ] Add task-based routing logic
- [ ] Optimize for common RAG patterns

#### Phase 4: Advanced Features (Weeks 7-8)

- [ ] Implement semantic chunking with MLX embeddings
- [ ] Add agentic chunking with MLX model selection
- [ ] Create A/B testing framework for model selection
- [ ] Performance optimization and tuning

### Success Metrics for MLX Integration

**Performance Metrics**:

- MLX embedding: 3-5x faster than Python subprocess
- MLX generation: 2-3x faster than Ollama on same hardware
- Memory efficiency: 40-60% reduction with proper management
- First token latency: <100ms for small models

**Reliability Metrics**:

- Fallback success rate: >99%
- Model load time: <2s for cached models
- Error recovery: <100ms failover time
- Resource exhaustion handling: graceful degradation

### Configuration Examples

**Development Environment**:

```json
{
  "embedding": { "backend": "mlx", "model": "qwen3-0.6b" },
  "generation": { "backend": "mlx", "model": "gemma-3-270m" },
  "fallback": true,
  "preload_models": ["gemma-3-270m"]
}
```

**Production Environment**:

```json
{
  "embedding": { "backend": "mlx", "model": "qwen3-4b" },
  "generation": { "backend": "mlx", "model": "glm-4.5" },
  "large_context": { "backend": "mlx", "model": "qwen3-coder-30b" },
  "fallback": { "backend": "ollama", "models": ["deepseek-coder:6.7b"] },
  "api_fallback": false
}
```

By following this enhanced modular approach with strict validation gates, we can systematically deliver a world-class RAG system that sets new standards for accuracy and performance while leveraging the full potential of Apple Silicon through MLX integration.
