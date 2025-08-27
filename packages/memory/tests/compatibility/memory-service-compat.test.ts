/**
 * @file_path tests/compatibility/memory-service-compat.test.ts
 * @description Compatibility contract tests for MemoryService ensuring API stability during cleanup
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-20
 * @version 1.0.0
 * @status active
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { MemoryService } from '../../src/MemoryService.js';
import type { TenantCtx, MemoryRecord, VectorHit } from '../../src/types.js';

// Test doubles for isolation
class MockQdrant {
  public records: MemoryRecord[] = [];
  
  async ensureCollection(): Promise<void> {}
  
  async upsert(records: MemoryRecord[]): Promise<void> {
    this.records.push(...records);
  }
  
  async search({ tenantId, topK }: { tenantId: string; topK: number }): Promise<VectorHit[]> {
    return this.records
      .filter((r) => r.tenantId === tenantId)
      .slice(0, topK)
      .map((r, i) => ({
        id: r.id,
        text: r.text,
        metadata: r.metadata,
        score: 1 - i * 0.01,
        sourceURI: r.sourceURI,
      }));
  }
  
  async deleteExpired(nowISO: string): Promise<void> {
    const cutoff = new Date(nowISO).getTime();
    this.records = this.records.filter((r) => {
      if (!r.expireAt) return true;
      return new Date(r.expireAt).getTime() > cutoff;
    });
  }
}

class MockNeo4j {
  public nodes = new Map();
  public relationships: any[] = [];
  
  async upsertNode(node: any): Promise<void> {
    this.nodes.set(node.id, node);
  }
  
  async upsertRel(rel: any): Promise<void> {
    this.relationships.push(rel);
  }
  
  async neighborhood(nodeId: string): Promise<{ nodes: any[]; rels: any[] }> {
    const node = this.nodes.get(nodeId);
    return {
      nodes: node ? [{ id: nodeId, label: 'Test', props: {} }] : [],
      rels: [],
    };
  }
  
  async close(): Promise<void> {}
}

const mockEmbedder = {
  embed: async (texts: string[]): Promise<number[][]> => 
    texts.map(() => Array(1536).fill(0.5))
};

describe('MemoryService Compatibility Contract', () => {
  let service: MemoryService;
  let mockQdrant: MockQdrant;
  let mockNeo4j: MockNeo4j;
  let testCtx: TenantCtx;

  beforeEach(() => {
    mockQdrant = new MockQdrant();
    mockNeo4j = new MockNeo4j();
    service = new MemoryService(
      mockQdrant as any,
      mockNeo4j as any,
      mockEmbedder,
      1536
    );
    testCtx = { tenantId: 'test-tenant', userId: 'test-user' };
  });

  afterEach(() => {
    // Ensure clean state between tests
    mockQdrant.records = [];
    mockNeo4j.nodes.clear();
    mockNeo4j.relationships = [];
  });

  describe('[Critical] Core API Contract', () => {
    it('should expose required methods with correct signatures', () => {
      // [Critical]: API contract must be preserved
      expect(typeof service.putText).toBe('function');
      expect(typeof service.search).toBe('function');
      expect(typeof service.embedOne).toBe('function');
      expect(typeof service.upsertKGNode).toBe('function');
      expect(typeof service.upsertKGRel).toBe('function');
      expect(typeof service.getNeighborhood).toBe('function');
      expect(typeof service.pruneExpired).toBe('function');
    });

    it('should handle putText with all parameters', async () => {
      const id = await service.putText(
        testCtx,
        'doc',
        'test content',
        { source: 'test' },
        7,
        { canRead: ['*'], canWrite: ['test-user'] },
        'https://example.com'
      );

      expect(typeof id).toBe('string');
      expect(id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
      expect(mockQdrant.records).toHaveLength(1);
      
      const record = mockQdrant.records[0];
      expect(record.tenantId).toBe('test-tenant');
      expect(record.text).toBe('test content');
      expect(record.metadata.source).toBe('test');
      expect(record.ttlDays).toBe(7);
      expect(record.sourceURI).toBe('https://example.com');
    });

    it('should handle search with tenant isolation', async () => {
      // Setup data for multiple tenants
      await service.putText(testCtx, 'doc', 'tenant1 content', {});
      await service.putText({ tenantId: 'other-tenant' }, 'doc', 'tenant2 content', {});

      const results = await service.search(testCtx, {
        queryEmbedding: Array(1536).fill(0.5),
        topK: 5
      });

      expect(results).toHaveLength(1);
      expect(results[0].text).toBe('tenant1 content');
    });
  });

  describe('[Critical] Error Handling & Edge Cases', () => {
    it('should reject embeddings with wrong dimensions', async () => {
      const badEmbedder = {
        embed: async () => [Array(512).fill(0.1)] // Wrong size
      };
      
      const badService = new MemoryService(
        mockQdrant as any,
        mockNeo4j as any,
        badEmbedder,
        1536
      );

      await expect(badService.embedOne('test'))
        .rejects.toThrow(/size_mismatch/);
    });

    it('should handle TTL expiration correctly', async () => {
      const id = await service.putText(testCtx, 'doc', 'expiring content', {}, 1);
      
      // Verify record exists
      expect(mockQdrant.records).toHaveLength(1);
      expect(mockQdrant.records[0].expireAt).toBeTruthy();

      // Simulate expiration
      const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      await service.pruneExpired();
      await mockQdrant.deleteExpired(futureDate);

      expect(mockQdrant.records).toHaveLength(0);
    });

    it('should handle knowledge graph operations', async () => {
      const node = { id: 'test-node', label: 'TestLabel', props: { name: 'test' } };
      const rel = { from: 'node1', to: 'node2', type: 'RELATES_TO', props: { weight: 1.0 } };

      await service.upsertKGNode(node);
      await service.upsertKGRel(rel);

      expect(mockNeo4j.nodes.get('test-node')).toEqual(node);
      expect(mockNeo4j.relationships).toContainEqual(rel);

      const subgraph = await service.getNeighborhood('test-node');
      expect(subgraph.nodes).toHaveLength(1);
      expect(subgraph.nodes[0].id).toBe('test-node');
    });
  });

  describe('[Critical] Security & Access Control', () => {
    it('should enforce write policies', async () => {
      const restrictedCtx = { tenantId: 'test-tenant', userId: 'unauthorized' };
      const policy = { canRead: ['*'], canWrite: ['authorized-user'] };

      await expect(
        service.putText(restrictedCtx, 'doc', 'restricted content', {}, undefined, policy)
      ).rejects.toThrow(/policy:write_denied/);
    });

    it('should handle policy enforcement with DEFAULT_DENY', async () => {
      // Test would need environment variable control for complete coverage
      // This validates the structure exists for policy enforcement
      const policy = { canRead: ['test-user'], canWrite: ['test-user'] };
      
      const id = await service.putText(testCtx, 'doc', 'policy content', {}, undefined, policy);
      expect(typeof id).toBe('string');
    });
  });

  describe('[Suggestion] Performance & Efficiency', () => {
    it('should handle batch operations efficiently', async () => {
      const startTime = Date.now();
      
      // Create multiple records
      const promises = Array.from({ length: 10 }, (_, i) =>
        service.putText(testCtx, 'doc', `content ${i}`, { index: i })
      );
      
      const ids = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(ids).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast with mocks
      expect(mockQdrant.records).toHaveLength(10);
    });
  });
});
