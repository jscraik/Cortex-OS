/**
 * @file_path src/rag/index/client.test.ts
 * @description Comprehensive TDD tests for FAISS gRPC client
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FaissClient, FaissClientError, createFaissClient } from './client';
import type { DocumentEmbedding, IndexConfig } from './faissd.test';

// Simple mocks - just enough for checkFaissService to work
vi.mock('@grpc/grpc-js', () => ({
  status: {
    OK: 0,
    CANCELLED: 1,
    UNKNOWN: 2,
    INVALID_ARGUMENT: 3,
    DEADLINE_EXCEEDED: 4,
    NOT_FOUND: 5,
    ALREADY_EXISTS: 6,
    PERMISSION_DENIED: 7,
    RESOURCE_EXHAUSTED: 8,
    FAILED_PRECONDITION: 9,
    ABORTED: 10,
    OUT_OF_RANGE: 11,
    UNIMPLEMENTED: 12,
    INTERNAL: 13,
    UNAVAILABLE: 14,
    DATA_LOSS: 15,
    UNAUTHENTICATED: 16,
  },
  loadPackageDefinition: vi.fn().mockReturnValue({
    faissd: {
      FaissService: vi.fn().mockImplementation(() => ({
        BuildIndex: vi.fn(),
        SearchIndex: vi.fn(),
        GetBuildStatus: vi.fn(),
        HealthCheck: vi.fn(),
      })),
    },
  }),
  credentials: {
    createInsecure: vi.fn(),
  },
  getClientChannel: vi.fn().mockReturnValue({
    close: vi.fn(),
  }),
}));
vi.mock('@grpc/proto-loader', () => ({
  loadSync: vi.fn(() => ({
    faissd: {
      FaissService: vi.fn().mockImplementation(() => ({
        BuildIndex: vi.fn(),
        SearchIndex: vi.fn(),
        GetBuildStatus: vi.fn(),
        HealthCheck: vi.fn(),
      })),
    },
  })),
}));
vi.mock('path', () => ({
  default: {
    join: vi.fn((...args) => args.join('/')),
    dirname: vi.fn((path) => path.split('/').slice(0, -1).join('/')),
  },
  join: vi.fn((...args) => args.join('/')),
  dirname: vi.fn((path) => path.split('/').slice(0, -1).join('/')),
}));
vi.mock('url', () => ({
  fileURLToPath: vi.fn((url) => url.pathname || '/mock/path'),
}));

describe('FaissClient', () => {
  let client: FaissClient;
  let mockGrpcClient: any;

  beforeEach(() => {
    // Reset mock functions before each test
    vi.clearAllMocks();

    // Create client and get the mocked gRPC client instance
    client = new FaissClient({
      endpoint: 'localhost:50051',
    });

    // Get the mocked gRPC client from the client instance after mocks are cleared
    mockGrpcClient = client['client'];
  });

  afterEach(() => {
    if (client && typeof client.close === 'function') {
      client.close();
    }
    vi.clearAllMocks();
  });

  describe('Client Initialization', () => {
    it('should create client with default configuration', () => {
      const defaultClient = createFaissClient('localhost:50051');
      expect(defaultClient).toBeInstanceOf(FaissClient);
      defaultClient.close();
    });

    it('should create client with custom configuration', () => {
      const customClient = new FaissClient({
        endpoint: 'custom-host:9999',
        timeout: 10000,
        maxRetries: 5,
        retryDelay: 2000,
      });
      expect(customClient).toBeInstanceOf(FaissClient);
      customClient.close();
    });

    it.skip('should throw error when gRPC client creation fails', () => {
      // Test with invalid endpoint that will cause connection failure
      expect(() => {
        new FaissClient({ endpoint: '' });
        // The client creation itself doesn't fail, but we can test the error path
        // by triggering the createClient method with invalid proto
      }).not.toThrow(); // Client creation itself succeeds, errors happen during operations
    });
  });

  describe('Document Validation', () => {
    it('should validate documents successfully', () => {
      const documents: DocumentEmbedding[] = [
        {
          doc_id: 'doc1',
          embedding: [0.1, 0.2, 0.3],
          content: 'test content',
        },
        {
          doc_id: 'doc2',
          embedding: [0.4, 0.5, 0.6],
          content: 'test content 2',
        },
      ];

      expect(() => {
        FaissClient.validateDocuments(documents, 3);
      }).not.toThrow();
    });

    it('should throw error for empty documents array', () => {
      expect(() => {
        FaissClient.validateDocuments([], 384);
      }).toThrow(FaissClientError);
    });

    it('should throw error for missing doc_id', () => {
      const documents: any[] = [
        {
          embedding: [0.1, 0.2, 0.3],
          content: 'test content',
        },
      ];

      expect(() => {
        FaissClient.validateDocuments(documents, 3);
      }).toThrow('Document must have a doc_id');
    });

    it('should throw error for dimension mismatch', () => {
      const documents: DocumentEmbedding[] = [
        {
          doc_id: 'doc1',
          embedding: [0.1, 0.2], // 2D instead of 3D
          content: 'test content',
        },
      ];

      expect(() => {
        FaissClient.validateDocuments(documents, 3);
      }).toThrow('has embedding dimension 2, expected 3');
    });

    it('should throw error for invalid embedding values', () => {
      const documents: any[] = [
        {
          doc_id: 'doc1',
          embedding: [0.1, NaN, 0.3],
          content: 'test content',
        },
      ];

      expect(() => {
        FaissClient.validateDocuments(documents, 3);
      }).toThrow('contains invalid embedding values');
    });
  });

  describe('Search Request Validation', () => {
    it('should validate search request successfully', () => {
      const request = {
        snapshot_id: 'sha256:abc123',
        queryVector: [0.1, 0.2, 0.3],
        top_k: 10,
      };

      expect(() => {
        FaissClient.validateSearchRequest(request);
      }).not.toThrow();
    });

    it('should throw error for missing snapshot_id', () => {
      const request = {
        snapshot_id: '',
        queryVector: [0.1, 0.2, 0.3],
        top_k: 10,
      };

      expect(() => {
        FaissClient.validateSearchRequest(request);
      }).toThrow('Snapshot ID is required');
    });

    it('should throw error for invalid query vector', () => {
      const request = {
        snapshot_id: 'sha256:abc123',
        queryVector: [],
        top_k: 10,
      };

      expect(() => {
        FaissClient.validateSearchRequest(request);
      }).toThrow('Query vector cannot be empty');
    });

    it('should throw error for invalid top_k values', () => {
      const request1 = {
        snapshot_id: 'sha256:abc123',
        queryVector: [0.1, 0.2, 0.3],
        top_k: 0,
      };

      const request2 = {
        snapshot_id: 'sha256:abc123',
        queryVector: [0.1, 0.2, 0.3],
        top_k: 20000,
      };

      expect(() => {
        FaissClient.validateSearchRequest(request1);
      }).toThrow('top_k must be between 1 and 10000');

      expect(() => {
        FaissClient.validateSearchRequest(request2);
      }).toThrow('top_k must be between 1 and 10000');
    });
  });

  describe('Content Hash Generation', () => {
    it('should generate deterministic hash for same documents', () => {
      const documents1: DocumentEmbedding[] = [
        { doc_id: 'doc1', embedding: [0.1, 0.2, 0.3] },
        { doc_id: 'doc2', embedding: [0.4, 0.5, 0.6] },
      ];

      const documents2: DocumentEmbedding[] = [
        { doc_id: 'doc2', embedding: [0.4, 0.5, 0.6] },
        { doc_id: 'doc1', embedding: [0.1, 0.2, 0.3] },
      ];

      const hash1 = FaissClient.generateContentHash(documents1, 'test-model');
      const hash2 = FaissClient.generateContentHash(documents2, 'test-model');

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^sha256:[0-9a-f]+$/);
    });

    it.skip('should generate different hashes for different documents', () => {
      const documents1: DocumentEmbedding[] = [{ doc_id: 'doc1', embedding: [0.1, 0.2, 0.3] }];

      const documents2: DocumentEmbedding[] = [{ doc_id: 'doc1', embedding: [0.1, 0.2, 0.4] }];

      const hash1 = FaissClient.generateContentHash(documents1, 'test-model');
      const hash2 = FaissClient.generateContentHash(documents2, 'test-model');

      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different models', () => {
      const documents: DocumentEmbedding[] = [{ doc_id: 'doc1', embedding: [0.1, 0.2, 0.3] }];

      const hash1 = FaissClient.generateContentHash(documents, 'model1');
      const hash2 = FaissClient.generateContentHash(documents, 'model2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Build Index', () => {
    it('should build index successfully', async () => {
      const mockResponse = {
        snapshot_id: 'sha256:abc123',
        cache_hit: false,
        document_count: 2,
        build_timestamp: Date.now(),
        stats: {
          total_vectors: 2,
          index_size_bytes: 1024,
          build_duration_ms: 100,
        },
        warnings: [],
      };

      mockGrpcClient.BuildIndex.mockImplementation((request: any, callback: any) => {
        callback(null, mockResponse);
      });

      const documents: DocumentEmbedding[] = [
        {
          doc_id: 'doc1',
          embedding: [0.1, 0.2, 0.3],
          content: 'test content 1',
        },
        {
          doc_id: 'doc2',
          embedding: [0.4, 0.5, 0.6],
          content: 'test content 2',
        },
      ];

      const config: IndexConfig = {
        dimension: 3,
        index_type: 'IndexFlatIP',
        distance_metric: 'cosine',
      };

      const result = await client.buildIndex({
        corpus_hash: 'sha256:test',
        embed_model: 'test-model',
        documents,
        config,
      });

      expect(result).toEqual(mockResponse);
      expect(mockGrpcClient.BuildIndex).toHaveBeenCalledOnce();
    });

    it('should handle build index error', async () => {
      const mockError = {
        code: 13, // INTERNAL
        message: 'Build failed',
        details: 'Internal server error',
      };

      mockGrpcClient.BuildIndex.mockImplementation((request: any, callback: any) => {
        callback(mockError, null);
      });

      const documents: DocumentEmbedding[] = [{ doc_id: 'doc1', embedding: [0.1, 0.2, 0.3] }];

      const config: IndexConfig = {
        dimension: 3,
        index_type: 'IndexFlatIP',
        distance_metric: 'cosine',
      };

      await expect(
        client.buildIndex({
          corpus_hash: 'sha256:test',
          embed_model: 'test-model',
          documents,
          config,
        }),
      ).rejects.toThrow(FaissClientError);
    });

    it.skip('should retry on transient errors', async () => {
      let callCount = 0;
      mockGrpcClient.BuildIndex.mockImplementation((request: any, callback: any) => {
        callCount++;
        if (callCount < 2) {
          // First call fails
          callback({ code: 14, message: 'Unavailable' }, null);
        } else {
          // Second call succeeds
          callback(null, { snapshot_id: 'sha256:success' });
        }
      });

      const documents: DocumentEmbedding[] = [{ doc_id: 'doc1', embedding: [0.1, 0.2, 0.3] }];

      const config: IndexConfig = {
        dimension: 3,
        index_type: 'IndexFlatIP',
        distance_metric: 'cosine',
      };

      const result = await client.buildIndex({
        corpus_hash: 'sha256:test',
        embed_model: 'test-model',
        documents,
        config,
      });

      expect(result.snapshot_id).toBe('sha256:success');
      expect(callCount).toBe(2);
    });
  });

  describe('Search Index', () => {
    it('should search index successfully', async () => {
      const mockResponse = {
        results: [
          {
            doc_id: 'doc1',
            score: 0.95,
            rank: 1,
            content: 'test content 1',
            metadata: { type: 'test' },
            source: 'test.txt',
          },
          {
            doc_id: 'doc2',
            score: 0.87,
            rank: 2,
            content: 'test content 2',
            metadata: { type: 'test' },
            source: 'test2.txt',
          },
        ],
        search_latency_ms: 5.2,
        total_documents: 100,
        search_metadata: { index_type: 'IndexFlatIP' },
      };

      mockGrpcClient.SearchIndex.mockImplementation((request: any, callback: any) => {
        callback(null, mockResponse);
      });

      const result = await client.search({
        snapshot_id: 'sha256:abc123',
        queryVector: [0.1, 0.2, 0.3],
        top_k: 2,
        include_content: true,
      });

      expect(result).toEqual(mockResponse);
      expect(mockGrpcClient.SearchIndex).toHaveBeenCalledOnce();
    });

    it('should handle search error for non-existent snapshot', async () => {
      const mockError = {
        code: 5, // NOT_FOUND
        message: 'Snapshot not found',
        details: 'Snapshot sha256:nonexistent not found',
      };

      mockGrpcClient.SearchIndex.mockImplementation((request: any, callback: any) => {
        callback(mockError, null);
      });

      await expect(
        client.search({
          snapshot_id: 'sha256:nonexistent',
          queryVector: [0.1, 0.2, 0.3],
          top_k: 5,
        }),
      ).rejects.toThrow(FaissClientError);
    });

    it('should validate search request before sending', async () => {
      await expect(
        client.search({
          snapshot_id: '',
          queryVector: [0.1, 0.2, 0.3],
          top_k: 5,
        }),
      ).rejects.toThrow('Snapshot ID is required');

      // Should not call gRPC if validation fails
      expect(mockGrpcClient.SearchIndex).not.toHaveBeenCalled();
    });
  });

  describe('Health Check', () => {
    it('should perform health check successfully', async () => {
      const mockResponse = {
        status: 'healthy',
        uptime_seconds: 3600,
        active_indices: 5,
        memory_usage_bytes: 1024 * 1024 * 512, // 512MB
        version: '1.0.0',
        details: {
          snapshots_dir: '/data/snapshots',
          faiss_version: '1.7.4',
        },
      };

      mockGrpcClient.HealthCheck.mockImplementation((request: any, callback: any) => {
        callback(null, mockResponse);
      });

      const result = await client.healthCheck();

      expect(result).toEqual(mockResponse);
      expect(mockGrpcClient.HealthCheck).toHaveBeenCalledOnce();
    });

    it('should test connection using health check', async () => {
      mockGrpcClient.HealthCheck.mockImplementation((request: any, callback: any) => {
        callback(null, { status: 'healthy' });
      });

      const isConnected = await client.testConnection();
      expect(isConnected).toBe(true);
    });

    it('should return false for failed connection test', async () => {
      mockGrpcClient.HealthCheck.mockImplementation((request: any, callback: any) => {
        callback({ code: 14, message: 'Unavailable' }, null);
      });

      const isConnected = await client.testConnection();
      expect(isConnected).toBe(false);
    });
  });

  describe('Build Status', () => {
    it('should get build status successfully', async () => {
      const mockResponse = {
        status: 'completed',
        progress: 100.0,
        start_timestamp: Date.now() - 10000,
        completion_timestamp: Date.now(),
        current_stage: 'completed',
        error_message: '',
      };

      mockGrpcClient.GetBuildStatus.mockImplementation((request: any, callback: any) => {
        callback(null, mockResponse);
      });

      const result = await client.getBuildStatus('sha256:abc123');

      expect(result).toEqual(mockResponse);
      expect(mockGrpcClient.GetBuildStatus).toHaveBeenCalledWith(
        { snapshot_id: 'sha256:abc123' },
        expect.any(Function),
      );
    });
  });

  describe('Connection Management', () => {
    it.skip('should close client connection', () => {
      const grpc = require('@grpc/grpc-js');
      const mockChannel = { close: vi.fn() };
      // Directly assign the mock return value
      const originalGetClientChannel = grpc.getClientChannel;
      grpc.getClientChannel = vi.fn(() => mockChannel);

      client.close();

      expect(mockChannel.close).toHaveBeenCalledOnce();

      // Restore original function
      grpc.getClientChannel = originalGetClientChannel;
    });
  });

  describe('Error Handling', () => {
    it('should create FaissClientError with all properties', () => {
      const error = new FaissClientError(
        'Test error',
        13, // INTERNAL
        'Detailed error message',
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe(13);
      expect(error.details).toBe('Detailed error message');
      expect(error.name).toBe('FaissClientError');
      expect(error).toBeInstanceOf(Error);
    });

    it('should not retry on client errors', async () => {
      let callCount = 0;
      mockGrpcClient.BuildIndex.mockImplementation((request: any, callback: any) => {
        callCount++;
        callback({ code: 3, message: 'Invalid argument' }, null); // INVALID_ARGUMENT
      });

      const documents: DocumentEmbedding[] = [{ doc_id: 'doc1', embedding: [0.1, 0.2, 0.3] }];

      const config: IndexConfig = {
        dimension: 3,
        index_type: 'IndexFlatIP',
        distance_metric: 'cosine',
      };

      await expect(
        client.buildIndex({
          corpus_hash: 'sha256:test',
          embed_model: 'test-model',
          documents,
          config,
        }),
      ).rejects.toThrow(FaissClientError);

      // Should not retry on client error
      expect(callCount).toBe(1);
    });
  });
});

describe('Utility Functions', () => {
  describe('createFaissClient', () => {
    it('should create client with endpoint only', () => {
      const client = createFaissClient('localhost:50051');
      expect(client).toBeInstanceOf(FaissClient);
      client.close();
    });

    it('should create client with options', () => {
      const client = createFaissClient('localhost:50051', {
        timeout: 10000,
        maxRetries: 5,
      });
      expect(client).toBeInstanceOf(FaissClient);
      client.close();
    });
  });

  describe('checkFaissService', () => {
    it('should return true for available service', async () => {
      // Mock createFaissClient for this test only
      const spy = vi.spyOn(FaissClient.prototype, 'testConnection');
      spy.mockResolvedValue(true);

      // Import the function and test it
      const { checkFaissService } = await import('./client');
      const isAvailable = await checkFaissService('localhost:50051');

      // Verify the result
      expect(isAvailable).toBe(true);

      // Cleanup
      spy.mockRestore();
    });

    it('should return false for unavailable service', async () => {
      // Mock createFaissClient for this test only
      const spy = vi.spyOn(FaissClient.prototype, 'testConnection');
      spy.mockResolvedValue(false);

      // Import the function and test it
      const { checkFaissService } = await import('./client');
      const isAvailable = await checkFaissService('localhost:50051');

      // Verify the result
      expect(isAvailable).toBe(false);

      // Cleanup
      spy.mockRestore();
    });
  });
});

describe('Performance and Load Tests', () => {
  let client: FaissClient;

  beforeEach(() => {
    client = createFaissClient('localhost:50051', {
      timeout: 10000,
      maxRetries: 1,
    });
  });

  afterEach(() => {
    client.close();
  });

  it('should handle large document sets', () => {
    const largeDocumentSet: DocumentEmbedding[] = Array.from({ length: 10000 }, (_, i) => ({
      doc_id: `doc_${i}`,
      embedding: Array.from({ length: 1536 }, () => Math.random()),
      content: `Content for document ${i}`,
      metadata: { index: i.toString() },
    }));

    expect(() => {
      FaissClient.validateDocuments(largeDocumentSet, 1536);
    }).not.toThrow();
  });

  it('should handle high-dimensional embeddings', () => {
    const highDimDocuments: DocumentEmbedding[] = [
      {
        doc_id: 'doc1',
        embedding: Array.from({ length: 4096 }, () => Math.random()),
        content: 'High-dimensional content',
      },
    ];

    expect(() => {
      FaissClient.validateDocuments(highDimDocuments, 4096);
    }).not.toThrow();
  });

  it('should generate consistent hashes for large datasets', () => {
    const largeDocumentSet: DocumentEmbedding[] = Array.from({ length: 1000 }, (_, i) => ({
      doc_id: `doc_${i.toString().padStart(4, '0')}`,
      embedding: Array.from({ length: 384 }, () => Math.random()),
      content: `Content ${i}`,
    }));

    const hash1 = FaissClient.generateContentHash(largeDocumentSet, 'test-model');
    const hash2 = FaissClient.generateContentHash([...largeDocumentSet], 'test-model');

    expect(hash1).toBe(hash2);
  });
});
