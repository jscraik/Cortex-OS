import { describe, it, expect, vi } from 'vitest';
import { MemoryService, Embedder } from '../src/MemoryService';
import { IQdrant } from '../src/adapters/qdrant';
import { INeo4j } from '../src/adapters/neo4j';

// Mock Implementations
class MockQdrant implements IQdrant {
  ensureCollection = vi.fn();
  upsert = vi.fn();
  search = vi.fn();
  deleteExpired = vi.fn();
}

class MockNeo4j implements INeo4j {
  upsertNode = vi.fn();
  upsertRel = vi.fn();
  neighborhood = vi.fn();
}

const mockEmbedder: Embedder = {
  embed: vi.fn(),
};

describe('MemoryService Decoupling', () => {
  it('should fail to construct via fromEnv in a test environment due to tight coupling', async () => {
    // This test proves that fromEnv is not easily testable because it tries to 
    // instantiate real services and connect to databases, which will fail in a 
    // test run without proper environment variables.
    await expect(MemoryService.fromEnv(mockEmbedder)).rejects.toThrow();
  });

  it('should be constructible with any adapter that implements the interface', () => {
    // This test demonstrates the desired dependency injection pattern.
    const q = new MockQdrant();
    const n = new MockNeo4j();
    const service = new MemoryService(q, n, mockEmbedder, 128);
    expect(service).toBeInstanceOf(MemoryService);
  });
});
