/**
 * @file_path packages/memory/index.test.ts
 * @description Integration test for MemoryService (Neo4j + Qdrant)
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-01
 * @version 0.1.0
 * @status active
 * @ai_generated_by copilot
 * @ai_provenance_hash N/A
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Memory, MemoryService } from './index';

const testMemory: Memory = {
  id: 'test-1',
  text: 'Hello, Cortex OS!',
  embedding: Array(1536).fill(0.5),
  metadata: { source: 'integration-test' },
};

let service: MemoryService;

const runIntegration = process.env.MEMORY_INTEGRATION === 'true';

(runIntegration ? describe : describe.skip)('MemoryService (integration)', () => {
  beforeAll(async () => {
    service = new MemoryService({
      neo4jUrl: 'bolt://localhost:7687',
      neo4jUser: 'neo4j',
      neo4jPassword: 'password',
      qdrantUrl: 'http://localhost:6333',
      collection: 'memories',
    });
    await service.init({ vectorSize: 1536, distance: 'Cosine' });
    });

  afterAll(async () => {
    await service.close();
  });

  it('should add and retrieve a memory', async () => {
    await service.addMemory(testMemory);
    const results = await service.searchMemories(testMemory.embedding, 1);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe(testMemory.id);
    expect(results[0].text).toBe(testMemory.text);
    expect(results[0].metadata.source).toBe('integration-test');
  });
});
