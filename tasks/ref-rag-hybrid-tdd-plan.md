# REF‑RAG Hybrid Tri-band Context System - TDD Plan

## Overview

This Test-Driven Development plan outlines the systematic approach to implementing the REF‑RAG (Risk-Enhanced Fact Retrieval) system with tri-band context management. The plan follows the TDD methodology of Red-Green-Refactor cycles with comprehensive test coverage.

## Phase 1: Core Foundation Tests

### 1.1 Type System Validation (packages/rag/src/ref-rag/types.ts)

**Red Phase: Failing Tests**
```typescript
// __tests__/ref-rag/types.test.ts
describe('REF‑RAG Types', () => {
  describe('RiskClass', () => {
    it('should have valid risk class values', () => {
      const risks = [RiskClass.LOW, RiskClass.MEDIUM, RiskClass.HIGH, RiskClass.CRITICAL];
      expect(risks).toHaveLength(4);
    });
  });

  describe('ContextBand', () => {
    it('should have three context bands', () => {
      const bands = [ContextBand.A, ContextBand.B, ContextBand.C];
      expect(bands).toHaveLength(3);
    });
  });

  describe('QueryGuardResult', () => {
    it('should validate query guard result structure', () => {
      const result: QueryGuardResult = {
        riskClass: RiskClass.MEDIUM,
        hardRequirements: ['Test requirement'],
        expansionHints: [],
        metadata: {
          confidence: 0.8,
          processingTimeMs: 100,
          detectedEntities: [],
          detectedDomains: [],
        },
      };
      expect(result.riskClass).toBe(RiskClass.MEDIUM);
    });
  });
});
```

**Green Phase: Minimal Implementation**
- Implement enums and basic interfaces
- Ensure type compilation

**Refactor Phase:**
- Add comprehensive JSDoc comments
- Ensure type safety with strict TypeScript

### 1.2 Budget Configuration Tests (packages/rag/src/ref-rag/budgets.ts)

**Red Phase: Failing Tests**
```typescript
// __tests__/ref-rag/budgets.test.ts
describe('Budget Configuration', () => {
  describe('DEFAULT_BUDGETS', () => {
    it('should provide valid budgets for all risk classes', () => {
      expect(DEFAULT_BUDGETS.low).toBeDefined();
      expect(DEFAULT_BUDGETS.medium.bandA).toBeGreaterThan(DEFAULT_BUDGETS.low.bandA);
      expect(DEFAULT_BUDGETS.high.bandA).toBeGreaterThan(DEFAULT_BUDGETS.medium.bandA);
      expect(DEFAULT_BUDGETS.critical.bandA).toBeGreaterThan(DEFAULT_BUDGETS.high.bandA);
    });

    it('should maintain reasonable budget ratios', () => {
      Object.values(DEFAULT_BUDGETS).forEach(budget => {
        const ratio = budget.bandA / budget.bandB;
        expect(ratio).toBeGreaterThan(0.25);
        expect(ratio).toBeLessThan(2.0);
      });
    });
  });

  describe('getBudgetForRiskClass', () => {
    it('should return appropriate budget for risk class', () => {
      const budget = getBudgetForRiskClass(RiskClass.HIGH);
      expect(budget.bandA).toBe(8000);
      expect(budget.bandB).toBe(16000);
      expect(budget.bandC).toBe(400);
    });

    it('should apply custom overrides', () => {
      const customBudgets = {
        high: { bandA: 10000, bandB: 20000, bandC: 500 },
      };
      const budget = getBudgetForRiskClass(RiskClass.HIGH, 'default', customBudgets);
      expect(budget.bandA).toBe(10000);
    });
  });

  describe('validateBudgets', () => {
    it('should detect invalid budget configurations', () => {
      const invalidBudgets = {
        ...DEFAULT_BUDGETS,
        high: { bandA: -1, bandB: 1000, bandC: 100 },
      };
      const errors = validateBudgets(invalidBudgets);
      expect(errors).toContain('high: bandA budget must be positive');
    });

    it('should accept valid budget configurations', () => {
      const errors = validateBudgets(DEFAULT_BUDGETS);
      expect(errors).toHaveLength(0);
    });
  });
});
```

**Green Phase:**
- Implement basic budget structures
- Add validation logic

**Refactor Phase:**
- Extract budget profile constants
- Add environment-based configuration

## Phase 2: Component Implementation Tests

### 2.1 Query Guard Tests (packages/rag/src/ref-rag/query-guard.ts)

**Red Phase: Failing Tests**
```typescript
// __tests__/ref-rag/query-guard.test.ts
describe('QueryGuard', () => {
  let queryGuard: QueryGuard;

  beforeEach(() => {
    queryGuard = createQueryGuard();
  });

  describe('analyzeQuery', () => {
    it('should classify low-risk general queries', async () => {
      const result = await queryGuard.analyzeQuery('What is machine learning?');
      expect(result.riskClass).toBe(RiskClass.LOW);
      expect(result.hardRequirements).toContain('Relevant and accurate information');
    });

    it('should classify high-risk medical queries', async () => {
      const result = await queryGuard.analyzeQuery('What medication should I take for my headache?');
      expect(result.riskClass).toBe(RiskClass.HIGH);
      expect(result.hardRequirements).toContain('Comprehensive coverage with citations');
      expect(result.hardRequirements).toContain('Highlight uncertainties and limitations');
    });

    it('should classify critical safety queries', async () => {
      const result = await queryGuard.analyzeQuery('Emergency procedures for chemical exposure');
      expect(result.riskClass).toBe(RiskClass.CRITICAL);
      expect(result.hardRequirements).toContain('Strong disclaimers about professional advice');
    });

    it('should generate appropriate expansion hints', async () => {
      const result = await queryGuard.analyzeQuery('Compare Python vs JavaScript performance');
      expect(result.expansionHints).toContainEqual({
        type: 'domain',
        value: 'technical',
        priority: expect.any(Number),
        mandatory: false,
      });
    });

    it('should detect entities in queries', async () => {
      const result = await queryGuard.analyzeQuery('Statistics for 2023 Q4 revenue of $1.5M');
      expect(result.metadata.detectedEntities).toContain('2023');
      expect(result.metadata.detectedEntities).toContain('$1.5M');
    });
  });

  describe('edge cases', () => {
    it('should handle empty queries', async () => {
      const result = await queryGuard.analyzeQuery('');
      expect(result.riskClass).toBe(RiskClass.LOW);
      expect(result.metadata.confidence).toBeLessThan(0.8);
    });

    it('should handle very long queries', async () => {
      const longQuery = 'test'.repeat(1000);
      const result = await queryGuard.analyzeQuery(longQuery);
      expect(result.riskClass).toBe(RiskClass.HIGH);
    });
  });
});
```

**Green Phase:**
- Implement basic keyword detection
- Add domain classification logic

**Refactor Phase:**
- Extract keyword patterns into configuration
- Optimize performance with caching

### 2.2 Fact Extractor Tests (packages/rag/src/ref-rag/fact-extractor.ts)

**Red Phase: Failing Tests**
```typescript
// __tests__/ref-rag/fact-extractor.test.ts
describe('FactExtractor', () => {
  let factExtractor: FactExtractor;

  beforeEach(() => {
    factExtractor = createFactExtractor();
  });

  describe('extractFacts', () => {
    it('should extract numeric facts with units', async () => {
      const text = 'The system processes 1.5GB of data in 2.3 seconds, costing $45.67 per month.';
      const result = await factExtractor.extractFacts(text, 'test-chunk-1');

      expect(result.facts).toContainEqual({
        id: expect.any(String),
        type: 'number',
        value: expect.any(Number),
        context: expect.any(String),
        chunkId: 'test-chunk-1',
        confidence: expect.any(Number),
        metadata: expect.objectContaining({
          unit: expect.any(String),
        }),
      });
    });

    it('should extract quoted text', async () => {
      const text = 'As the CEO stated, "Innovation drives our growth strategy for 2024."';
      const result = await factExtractor.extractFacts(text, 'test-chunk-2');

      const quoteFact = result.facts.find(fact => fact.type === 'quote');
      expect(quoteFact).toBeDefined();
      expect(quoteFact?.value).toBe('Innovation drives our growth strategy for 2024');
    });

    it('should extract code snippets', async () => {
      const text = 'Use `const result = await fetch(url)` for API calls and `processData(data)` for processing.';
      const result = await factExtractor.extractFacts(text, 'test-chunk-3');

      const codeFacts = result.facts.filter(fact => fact.type === 'code');
      expect(codeFacts).toHaveLength(2);
    });

    it('should respect confidence threshold', async () => {
      const config = { confidenceThreshold: 0.9 };
      const extractor = createFactExtractor(config);
      const result = await extractor.extractFacts('Simple text with few patterns', 'test-chunk-4');

      result.facts.forEach(fact => {
        expect(fact.confidence).toBeGreaterThanOrEqual(0.9);
      });
    });
  });

  describe('CompressionEncoder', () => {
    let encoder: CompressionEncoder;

    beforeEach(() => {
      encoder = createCompressionEncoder(64);
    });

    it('should compress embeddings to target dimensions', async () => {
      const embedding = new Array(1536).fill(0).map(() => Math.random());
      const result = await encoder.encode(embedding);

      expect(result.compressedEmbedding).toHaveLength(64);
      expect(result.metadata.originalDimensions).toBe(1536);
      expect(result.metadata.compressedDimensions).toBe(64);
      expect(result.metadata.compressionRatio).toBeLessThan(1);
    });
  });
});
```

**Green Phase:**
- Implement regex patterns for fact extraction
- Add basic compression logic

**Refactor Phase:**
- Optimize regex patterns for performance
- Add comprehensive fact type support

### 2.3 Relevance Policy Tests (packages/rag/src/ref-rag/relevance-policy.ts)

**Red Phase: Failing Tests**
```typescript
// __tests__/ref-rag/relevance-policy.test.ts
describe('RelevancePolicy', () => {
  let relevancePolicy: RelevancePolicy;
  let mockChunks: Chunk[];
  let mockQueryGuard: QueryGuardResult;

  beforeEach(() => {
    relevancePolicy = createRelevancePolicy();
    mockChunks = [
      {
        id: 'chunk1',
        text: 'This is recent medical research data from 2024.',
        source: 'medical-journal',
        updatedAt: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
        score: 0.9,
        metadata: {
          refRag: {
            contentAnalysis: {
              hasNumbers: true,
              hasQuotes: false,
              hasCode: false,
              hasDates: true,
              hasEntities: true,
              domains: ['medical'],
              entities: ['2024'],
            },
            qualityMetrics: {
              freshnessScore: 0.95,
              diversityScore: 0.8,
              completenessScore: 0.9,
              accuracyScore: 0.95,
            },
          },
        },
      },
    ];
    mockQueryGuard = {
      riskClass: RiskClass.HIGH,
      hardRequirements: ['Comprehensive coverage'],
      expansionHints: [{ type: 'domain', value: 'medical', priority: 0.9, mandatory: true }],
      metadata: {
        confidence: 0.8,
        processingTimeMs: 50,
        detectedEntities: ['2024'],
        detectedDomains: ['medical'],
      },
    };
  });

  describe('scoreChunks', () => {
    it('should calculate relevance scores with all components', () => {
      const queryEmbedding = new Array(1536).fill(0).map(() => Math.random());
      const scores = relevancePolicy.scoreChunks(mockChunks, queryEmbedding, mockQueryGuard);

      expect(scores).toHaveLength(1);
      expect(scores[0].score).toBeGreaterThan(0);
      expect(scores[0].components).toHaveProperty('similarity');
      expect(scores[0].components).toHaveProperty('freshness');
      expect(scores[0].components).toHaveProperty('diversity');
      expect(scores[0].components).toHaveProperty('domainBonus');
    });

    it('should recommend appropriate bands based on risk class', () => {
      const queryEmbedding = new Array(1536).fill(0).map(() => Math.random());
      const scores = relevancePolicy.scoreChunks(mockChunks, queryEmbedding, mockQueryGuard);

      // High-risk queries should prefer Band A for high-scoring chunks
      expect(scores[0].recommendedBand).toBe(ContextBand.A);
    });

    it('should apply duplication penalties', () => {
      const duplicateChunks = [
        ...mockChunks,
        { ...mockChunks[0], id: 'chunk2', text: 'This is recent medical research data from 2024.' },
      ];
      const queryEmbedding = new Array(1536).fill(0).map(() => Math.random());
      const penalizedScores = relevancePolicy.applyDuplicationPenalties(
        relevancePolicy.scoreChunks(duplicateChunks, queryEmbedding, mockQueryGuard),
        duplicateChunks,
      );

      // Second chunk should have penalty applied
      expect(penalizedScores[1].components.duplicationPenalty).toBeGreaterThan(0);
    });
  });
});
```

**Green Phase:**
- Implement scoring algorithms
- Add freshness and diversity calculations

**Refactor Phase:**
- Extract scoring weights into configuration
- Add advanced duplication detection

## Phase 3: Integration Tests

### 3.1 Pipeline Integration Tests

**Red Phase: Failing Tests**
```typescript
// __tests__/ref-rag/pipeline.integration.test.ts
describe('REF‑RAG Pipeline Integration', () => {
  let pipeline: RefRagPipeline;
  let mockEmbedder: Embedder;
  let mockStore: Store;
  let mockGenerator: Generator;
  let config: RefRagConfig;

  beforeEach(() => {
    config = createRefRagConfig({ enabled: true });
    mockEmbedder = {
      embed: vi.fn().mockResolvedValue([new Array(1536).fill(0).map(() => Math.random())]),
    };
    mockStore = {
      upsert: vi.fn(),
      query: vi.fn().mockResolvedValue([
        {
          id: 'chunk1',
          text: 'Test medical research from 2024 with important statistics.',
          source: 'journal',
          updatedAt: Date.now(),
          score: 0.9,
          metadata: {
            refRag: {
              structuredFacts: [
                { id: 'fact1', type: 'number', value: 2024, context: '2024', chunkId: 'chunk1', confidence: 0.9 },
              ],
            },
          },
        },
      ]),
    };
    mockGenerator = {
      generate: vi.fn().mockResolvedValue({
        content: 'Based on the medical research from 2024, here are the key findings...',
        provider: 'test-model',
        usage: { promptTokens: 1000, completionTokens: 500, totalTokens: 1500 },
      }),
    };

    pipeline = createRefRagPipeline(config, mockEmbedder, mockStore, mockGenerator);
  });

  describe('end-to-end processing', () => {
    it('should process high-risk medical query correctly', async () => {
      const result = await pipeline.process('What are the latest treatments for diabetes?');

      expect(result.answer).toContain('findings');
      expect(result.contextPack).toBeDefined();
      expect(result.contextPack.queryGuard.riskClass).toBe(RiskClass.HIGH);
      expect(result.contextPack.bandA).toHaveLength(1);
      expect(result.verification.passed).toBe(true);
      expect(result.trace.steps).toHaveLength(7);
      expect(result.trace.outcome).toBe('success');
    });

    it('should handle escalation when verification fails', async () => {
      // Mock generator to return low-quality answer
      mockGenerator.generate = vi.fn().mockResolvedValue({
        content: 'Short answer without citations',
        provider: 'test-model',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const result = await pipeline.process('Emergency medical procedures');

      expect(result.verification.passed).toBe(false);
      expect(result.verification.escalationRecommendation).not.toBe('none');
      expect(result.trace.outcome).toBe('escalated');
    });

    it('should respect budget constraints', async () => {
      const lowBudgetConfig = createRefRagConfig({
        enabled: true,
       	budgets: {
          ...config.budgets,
          high: { bandA: 1000, bandB: 2000, bandC: 50 },
        },
      });
      const lowBudgetPipeline = createRefRagPipeline(lowBudgetConfig, mockEmbedder, mockStore, mockGenerator);

      const result = await lowBudgetPipeline.process('What are the investment risks?');

      expect(result.contextPack.budgetUsage.bandA.usedBudget).toBeLessThanOrEqual(1000);
      expect(result.contextPack.budgetUsage.bandB.usedBudget).toBeLessThanOrEqual(2000);
      expect(result.contextPack.budgetUsage.bandC.usedBudget).toBeLessThanOrEqual(50);
    });
  });

  describe('error handling', () => {
    it('should handle embedder failures gracefully', async () => {
      mockEmbedder.embed = vi.fn().mockRejectedValue(new Error('Embedder failed'));

      await expect(pipeline.process('Test query')).rejects.toThrow('Embedder failed');
    });

    it('should handle empty store results', async () => {
      mockStore.query = vi.fn().mockResolvedValue([]);

      const result = await pipeline.process('Test query');

      expect(result.contextPack.bandA).toHaveLength(0);
      expect(result.contextPack.bandB).toHaveLength(0);
      expect(result.contextPack.bandC).toHaveLength(0);
    });
  });
});
```

**Green Phase:**
- Implement pipeline orchestration
- Add error handling and recovery

**Refactor Phase:**
- Extract pipeline steps into separate modules
- Add comprehensive telemetry

## Phase 4: Performance and Stress Tests

### 4.1 Performance Tests

```typescript
// __tests__/ref-rag/performance.test.ts
describe('REF‑RAG Performance', () => {
  it('should process queries within acceptable time limits', async () => {
    const startTime = Date.now();
    // Process multiple queries concurrently
    const promises = Array.from({ length: 10 }, (_, i) =>
      pipeline.process(`Test query ${i + 1}`)
    );
    await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    // Average should be less than 2 seconds per query
    expect(totalTime / 10).toBeLessThan(2000);
  });

  it('should handle memory efficiently with large contexts', async () => {
    const largeQuery = 'test '.repeat(1000);
    const initialMemory = process.memoryUsage().heapUsed;

    await pipeline.process(largeQuery);

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable (less than 100MB)
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
  });
});
```

## Phase 5: Security and Safety Tests

### 5.1 Security Tests

```typescript
// __tests__/ref-rag/security.test.ts
describe('REF‑RAG Security', () => {
  it('should handle malicious input safely', async () => {
    const maliciousQuery = '<script>alert("xss")</script> DROP TABLE users;';
    const result = await pipeline.process(maliciousQuery);

    expect(result.answer).not.toContain('<script>');
    expect(result.answer).not.toContain('DROP TABLE');
  });

  it('should redact sensitive information in logs', async () => {
    const queryWithSSN = 'My SSN is 123-45-6789, can you help?';

    // Check that SSN patterns are not logged in plain text
    expect(() => pipeline.process(queryWithSSN)).not.toThrow();
  });

  it('should enforce rate limits for high-risk queries', async () => {
    const highRiskQueries = Array.from({ length: 100 }, () =>
      'Emergency medical advice needed'
    );

    // Should handle gracefully without crashing
    const results = await Promise.allSettled(
      highRiskQueries.map(query => pipeline.process(query))
    );

    // Some should be rejected or throttled
    const rejected = results.filter(result => result.status === 'rejected');
    expect(rejected.length).toBeGreaterThan(0);
  });
});
```

## Testing Infrastructure

### Coverage Requirements
- **Unit Tests**: 95% line coverage minimum
- **Integration Tests**: 100% coverage of critical paths
- **E2E Tests**: All major user journeys

### Test Categories
1. **Unit Tests**: Individual component functionality
2. **Integration Tests**: Component interactions
3. **Contract Tests**: Interface compliance
4. **Performance Tests**: Speed and resource usage
5. **Security Tests**: Input validation and data protection
6. **Regression Tests**: Prevent feature breakage

### CI/CD Integration
```yaml
# .github/workflows/ref-rag-tests.yml
name: REF‑RAG Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:ref-rag:unit
      - run: npm run test:ref-rag:integration
      - run: npm run test:coverage:ref-rag
      - run: npm run test:security:ref-rag
```

## Success Criteria

### Phase Completion Criteria
1. **Phase 1**: All type definitions validated, 100% compilation success
2. **Phase 2**: All components unit tested, 95% coverage achieved
3. **Phase 3**: End-to-end scenarios passing, integration verified
4. **Phase 4**: Performance benchmarks met, memory usage optimized
5. **Phase 5**: Security scans pass, safety measures validated

### Definition of Done
- [ ] All tests passing
- [ ] Coverage thresholds met
- [ ] Performance benchmarks achieved
- [ ] Security scans clean
- [ ] Documentation updated
- [ ] Code review approved
- [ ] Integration tests verified

## Timeline and Milestones

**Week 1-2**: Phase 1 - Foundation
- Type system implementation
- Budget configuration
- Basic validation

**Week 3-4**: Phase 2 - Components
- Query guard implementation
- Fact extractor development
- Relevance policy creation

**Week 5-6**: Phase 3 - Integration
- Pipeline orchestration
- End-to-end testing
- Error handling

**Week 7**: Phase 4 - Performance
- Optimization
- Stress testing
- Memory management

**Week 8**: Phase 5 - Security
- Security validation
- Safety measures
- Final verification

This TDD plan ensures systematic, thorough development of the REF‑RAG system with comprehensive testing at each phase, guaranteeing reliability, performance, and security of the final implementation.