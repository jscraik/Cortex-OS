import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryFactory, TestMemoryStore, createMemory } from '../test-utils.js';
import { MemoryStoreRAGAdapter, RAGEmbedderAdapter, RAGIntegration } from '../../src/adapters/rag-integration.js';
import type { Embedder, Store, Chunk } from '@cortex-os/rag';

// Mock embedder for testing
const createMockEmbedder = (): Embedder => ({
  embed: vi.fn().mockImplementation(async (texts: string[]) => {
    // Return simple embeddings based on text length
    return texts.map(text => [
      text.length / 100,
      Math.sin(text.length),
      Math.cos(text.length),
      0, 0, 0, 0, 0, 0, 0 // Pad to 10 dimensions
    ]);
  }),
});

describe('RAG Integration', () => {
  let memoryStore: TestMemoryStore;
  let mockEmbedder: Embedder;

  beforeEach(() => {
    memoryStore = new TestMemoryStore();
    mockEmbedder = createMockEmbedder();
    vi.clearAllMocks();
  });

  describe('MemoryStoreRAGAdapter', () => {
    it('should upsert chunks as memories', async () => {
      const adapter = new MemoryStoreRAGAdapter(memoryStore);
      const chunks: Chunk[] = [
        {
          id: 'chunk1',
          text: 'Test chunk 1',
          source: 'doc1.pdf',
          embedding: [0.1, 0.2, 0.3],
          updatedAt: Date.now(),
        },
        {
          id: 'chunk2',
          text: 'Test chunk 2',
          source: 'doc2.pdf',
          embedding: [0.4, 0.5, 0.6],
          metadata: { page: 1 },
        },
      ];

      await adapter.upsert(chunks);

      // Verify memories were created
      const memory1 = await memoryStore.get('chunk1');
      const memory2 = await memoryStore.get('chunk2');

      expect(memory1).toBeTruthy();
      expect(memory1?.kind).toBe('artifact');
      expect(memory1?.text).toBe('Test chunk 1');
      expect(memory1?.tags).toContain('source:doc1.pdf');
      expect(memory1?.metadata?.ragChunk).toBe(true);

      expect(memory2).toBeTruthy();
      expect(memory2?.metadata?.page).toBe(1);
    });

    it('should query memories and return as chunks', async () => {
      const adapter = new MemoryStoreRAGAdapter(memoryStore);

      // First insert some test data
      await memoryStore.upsert(createMemory({
        id: 'mem1',
        text: 'Test memory',
        vector: [0.1, 0.2, 0.3, 0, 0, 0, 0, 0, 0, 0],
        tags: ['source:test.pdf'],
        metadata: { ragChunk: true, page: 1 },
      }));

      const results = await adapter.query([0.1, 0.2, 0.3, 0, 0, 0, 0, 0, 0, 0], 5);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('mem1');
      expect(results[0].text).toBe('Test memory');
      expect(results[0].source).toBe('test.pdf');
      expect(results[0].metadata?.page).toBe(1);
    });
  });

  describe('RAGEmbedderAdapter', () => {
    it('should embed single text', async () => {
      const adapter = new RAGEmbedderAdapter(mockEmbedder);
      const embedding = await adapter.embedText('test text');

      expect(embedding).toHaveLength(10);
      expect(mockEmbedder.embed).toHaveBeenCalledWith(['test text']);
    });

    it('should embed multiple texts', async () => {
      const adapter = new RAGEmbedderAdapter(mockEmbedder);
      const texts = ['text1', 'text2', 'text3'];
      const embeddings = await adapter.embedTexts(texts);

      expect(embeddings).toHaveLength(3);
      expect(embeddings[0]).toHaveLength(10);
      expect(mockEmbedder.embed).toHaveBeenCalledWith(texts);
    });
  });

  describe('RAGIntegration', () => {
    let ragIntegration: RAGIntegration;

    beforeEach(() => {
      ragIntegration = new RAGIntegration(memoryStore, mockEmbedder);
    });

    it('should create store adapter', () => {
      const adapter = ragIntegration.createStoreAdapter();
      expect(adapter).toBeInstanceOf(MemoryStoreRAGAdapter);
    });

    it('should create embedder adapter', () => {
      const adapter = ragIntegration.createEmbedderAdapter();
      expect(adapter).toBeInstanceOf(RAGEmbedderAdapter);
    });

    it('should perform semantic search', async () => {
      // Insert test memories with embeddings similar to what the mock will generate
      await memoryStore.upsert(createMemory({
        id: 'mem1',
        text: 'machine learning algorithms',
        vector: [0.16, -0.29, -0.96, 0, 0, 0, 0, 0, 0, 0], // Similar to 'machine learning'
      }));

      await memoryStore.upsert(createMemory({
        id: 'mem2',
        text: 'deep learning neural networks',
        vector: [0.27, 0.96, 0.27, 0, 0, 0, 0, 0, 0, 0], // Similar to 'deep learning'
      }));

      const results = await ragIntegration.semanticSearch('machine learning', {
        limit: 5,
        threshold: -1, // Allow negative similarities
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeDefined();
      expect(mockEmbedder.embed).toHaveBeenCalledWith(['machine learning']);
    });

    it('should perform hybrid search', async () => {
      // Insert test memories
      await memoryStore.upsert(createMemory({
        id: 'mem1',
        text: 'excellent machine learning content',
      }));

      await memoryStore.upsert(createMemory({
        id: 'mem2',
        text: 'machine learning basics',
        vector: [0.09, 0.84, 0.14, 0, 0, 0, 0, 0, 0, 0],
      }));

      const results = await ragIntegration.hybridSearch('machine learning', {
        alpha: 0.5,
        limit: 5,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeDefined();
    });

    it('should store chunks', async () => {
      const chunks: Chunk[] = [
        {
          id: 'chunk1',
          text: 'Document chunk content',
          source: 'doc.pdf',
          embedding: [0.1, 0.2, 0.3],
        },
      ];

      await ragIntegration.storeChunks(chunks, {
        namespace: 'test',
        tags: ['document'],
      });

      const memory = await memoryStore.get('chunk1', 'test');
      expect(memory).toBeTruthy();
      expect(memory?.text).toBe('Document chunk content');
    });

    it('should fall back to text search without embedder', async () => {
      const ragNoEmbedder = new RAGIntegration(memoryStore);

      await memoryStore.upsert(createMemory({
        id: 'mem1',
        text: 'machine learning content',
      }));

      const results = await ragNoEmbedder.hybridSearch('machine learning');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('mem1');
    });

    it('should throw error for semantic search without embedder', async () => {
      const ragNoEmbedder = new RAGIntegration(memoryStore);

      await expect(ragNoEmbedder.semanticSearch('test'))
        .rejects.toThrow('Embedder is required for semantic search');
    });
  });

  describe('Reranking', () => {
    it('should rerank results when gateway is available', async () => {
      // Mock fetch for reranking
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          scores: [0.9, 0.7, 0.5],
          model: 'cross-encoder',
        }),
      });

      const ragIntegration = new RAGIntegration(memoryStore, mockEmbedder);
      const memories = [
        createMemory({ id: '1', text: 'Result 1' }),
        createMemory({ id: '2', text: 'Result 2' }),
        createMemory({ id: '3', text: 'Result 3' }),
      ];

      const results = await ragIntegration['rerankResults']('query', memories);

      expect(results[0].score).toBe(0.9);
      expect(results[1].score).toBe(0.7);
      expect(results[2].score).toBe(0.5);

      vi.restoreAllMocks();
    });

    it('should fall back to linear decay on rerank failure', async () => {
      // Mock fetch failure
      global.fetch = vi.fn().mockRejectedValue(new Error('Gateway unavailable'));

      const ragIntegration = new RAGIntegration(memoryStore, mockEmbedder);
      const memories = [
        createMemory({ id: '1', text: 'Result 1' }),
        createMemory({ id: '2', text: 'Result 2' }),
      ];

      const results = await ragIntegration['rerankResults']('query', memories);

      expect(results[0].score).toBeCloseTo(1.0);
      expect(results[1].score).toBeCloseTo(0.5);

      vi.restoreAllMocks();
    });
  });
});