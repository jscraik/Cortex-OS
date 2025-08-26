/**
 * @file_path src/rag/index/integration.test.ts
 * @description Integration tests for FAISS gRPC service with deterministic indexing
 *
 * Tests the complete end-to-end workflow:
 * - Content-addressed snapshot storage
 * - Deterministic index building
 * - Vector similarity search
 * - Cache hit behavior
 * - Error handling and recovery
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { FaissClient, createFaissClient, checkFaissService } from './client';
import type { DocumentEmbedding, IndexConfig } from './faissd.test';

const FAISS_SERVICE_ENDPOINT = 'localhost:50051';
const SERVICE_STARTUP_TIMEOUT = 30000; // 30 seconds
const TEST_TIMEOUT = 60000; // 60 seconds for each test

describe('FAISS gRPC Service Integration Tests', () => {
  let faissProcess: ChildProcess | null = null;
  let client: FaissClient;

  beforeAll(async () => {
    // Check if service is already running
    const isServiceRunning = await checkFaissService(FAISS_SERVICE_ENDPOINT, 5000);

    if (!isServiceRunning) {
      // Start FAISS service using Docker Compose
      console.log('Starting FAISS service...');
      faissProcess = spawn(
        'docker-compose',
        ['-f', 'docker-compose.faiss.yml', 'up', '--build', 'faissd'],
        {
          stdio: 'pipe',
          detached: false,
        },
      );

      // Wait for service to be ready
      const startTime = Date.now();
      let serviceReady = false;

      while (!serviceReady && Date.now() - startTime < SERVICE_STARTUP_TIMEOUT) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        serviceReady = await checkFaissService(FAISS_SERVICE_ENDPOINT, 5000);

        if (!serviceReady) {
          console.log('Waiting for FAISS service to start...');
        }
      }

      if (!serviceReady) {
        throw new Error(`FAISS service failed to start within ${SERVICE_STARTUP_TIMEOUT}ms`);
      }

      console.log('FAISS service started successfully');
    } else {
      console.log('FAISS service already running');
    }

    client = createFaissClient(FAISS_SERVICE_ENDPOINT, {
      timeout: 30000,
      maxRetries: 3,
    });
  }, SERVICE_STARTUP_TIMEOUT + 10000);

  afterAll(async () => {
    if (client) {
      client.close();
    }

    if (faissProcess) {
      console.log('Stopping FAISS service...');
      spawn('docker-compose', ['-f', 'docker-compose.faiss.yml', 'down'], {
        stdio: 'inherit',
      });

      faissProcess.kill('SIGTERM');
      faissProcess = null;
    }
  });

  describe('Service Health and Connectivity', () => {
    it(
      'should connect to FAISS service successfully',
      async () => {
        const isConnected = await client.testConnection();
        expect(isConnected).toBe(true);
      },
      TEST_TIMEOUT,
    );

    it(
      'should return healthy status from health check',
      async () => {
        const healthResponse = await client.healthCheck();

        expect(healthResponse.status).toBe('healthy');
        expect(healthResponse.version).toBe('1.0.0');
        expect(healthResponse.uptime_seconds).toBeGreaterThan(0);
        expect(healthResponse.memory_usage_bytes).toBeGreaterThan(0);
      },
      TEST_TIMEOUT,
    );

    it(
      'should return component-specific health check',
      async () => {
        const storageHealth = await client.healthCheck('storage');
        expect(storageHealth.status).toMatch(/healthy|degraded/);

        const memoryHealth = await client.healthCheck('memory');
        expect(memoryHealth.status).toMatch(/healthy|degraded/);
      },
      TEST_TIMEOUT,
    );
  });

  describe('Content-Addressed Index Building', () => {
    const testDocuments: DocumentEmbedding[] = [
      {
        doc_id: 'doc_001',
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        content: 'This is the first test document about artificial intelligence.',
        metadata: { category: 'AI', importance: 'high' },
        source: '/docs/ai/intro.md',
      },
      {
        doc_id: 'doc_002',
        embedding: [0.2, 0.3, 0.4, 0.5, 0.6],
        content: 'Machine learning algorithms and their applications.',
        metadata: { category: 'ML', importance: 'medium' },
        source: '/docs/ml/algorithms.md',
      },
      {
        doc_id: 'doc_003',
        embedding: [0.3, 0.4, 0.5, 0.6, 0.7],
        content: 'Vector databases and similarity search techniques.',
        metadata: { category: 'DB', importance: 'high' },
        source: '/docs/db/vectors.md',
      },
      {
        doc_id: 'doc_004',
        embedding: [0.4, 0.5, 0.6, 0.7, 0.8],
        content: 'Neural networks and deep learning fundamentals.',
        metadata: { category: 'DL', importance: 'high' },
        source: '/docs/dl/networks.md',
      },
      {
        doc_id: 'doc_005',
        embedding: [0.5, 0.6, 0.7, 0.8, 0.9],
        content: 'Natural language processing and text analysis.',
        metadata: { category: 'NLP', importance: 'medium' },
        source: '/docs/nlp/text.md',
      },
    ];

    const indexConfig: IndexConfig = {
      dimension: 5,
      index_type: 'IndexFlatIP',
      distance_metric: 'cosine',
      n_clusters: 2,
    };

    it(
      'should build new index successfully',
      async () => {
        const corpusHash = FaissClient.generateContentHash(testDocuments, 'test-embeddings-v1');

        const buildResponse = await client.buildIndex({
          corpus_hash: corpusHash,
          embed_model: 'test-embeddings-v1',
          documents: testDocuments,
          config: indexConfig,
          metadata: {
            test_run: 'integration_test_1',
            created_by: 'integration_tests',
          },
        });

        expect(buildResponse.snapshot_id).toMatch(/^sha256:[a-f0-9]{64}$/);
        expect(buildResponse.cache_hit).toBe(false);
        expect(buildResponse.document_count).toBe(testDocuments.length);
        expect(buildResponse.stats.total_vectors).toBe(testDocuments.length);
        expect(buildResponse.stats.build_duration_ms).toBeGreaterThan(0);
        expect(buildResponse.warnings).toEqual([]);
      },
      TEST_TIMEOUT,
    );

    it(
      'should produce deterministic snapshot IDs for identical inputs',
      async () => {
        const corpusHash = FaissClient.generateContentHash(testDocuments, 'test-embeddings-v2');

        // Build index first time
        const response1 = await client.buildIndex({
          corpus_hash: corpusHash,
          embed_model: 'test-embeddings-v2',
          documents: testDocuments,
          config: indexConfig,
        });

        // Build index second time with identical input
        const response2 = await client.buildIndex({
          corpus_hash: corpusHash,
          embed_model: 'test-embeddings-v2',
          documents: [...testDocuments], // Same documents, different array
          config: { ...indexConfig }, // Same config, different object
        });

        expect(response1.snapshot_id).toBe(response2.snapshot_id);
        expect(response2.cache_hit).toBe(true);
      },
      TEST_TIMEOUT,
    );

    it(
      'should produce different snapshot IDs for different configurations',
      async () => {
        const corpusHash = FaissClient.generateContentHash(testDocuments, 'test-embeddings-v3');

        const config1: IndexConfig = {
          dimension: 5,
          index_type: 'IndexFlatIP',
          distance_metric: 'cosine',
        };

        const config2: IndexConfig = {
          dimension: 5,
          index_type: 'IndexFlatL2',
          distance_metric: 'euclidean',
        };

        const [response1, response2] = await Promise.all([
          client.buildIndex({
            corpus_hash: corpusHash,
            embed_model: 'test-embeddings-v3',
            documents: testDocuments,
            config: config1,
          }),
          client.buildIndex({
            corpus_hash: corpusHash,
            embed_model: 'test-embeddings-v3',
            documents: testDocuments,
            config: config2,
          }),
        ]);

        expect(response1.snapshot_id).not.toBe(response2.snapshot_id);
        expect(response1.cache_hit).toBe(false);
        expect(response2.cache_hit).toBe(false);
      },
      TEST_TIMEOUT,
    );

    it(
      'should handle document order independence',
      async () => {
        const shuffledDocuments = [...testDocuments].reverse(); // Different order

        const corpusHash1 = FaissClient.generateContentHash(testDocuments, 'test-embeddings-v4');
        const corpusHash2 = FaissClient.generateContentHash(
          shuffledDocuments,
          'test-embeddings-v4',
        );

        // Corpus hashes should be identical despite different order
        expect(corpusHash1).toBe(corpusHash2);

        const response = await client.buildIndex({
          corpus_hash: corpusHash1,
          embed_model: 'test-embeddings-v4',
          documents: shuffledDocuments,
          config: indexConfig,
        });

        expect(response.snapshot_id).toMatch(/^sha256:[a-f0-9]{64}$/);
        expect(response.document_count).toBe(testDocuments.length);
      },
      TEST_TIMEOUT,
    );
  });

  describe('Vector Similarity Search', () => {
    let snapshotId: string;

    beforeEach(async () => {
      // Build a test index
      const testDocs: DocumentEmbedding[] = [
        {
          doc_id: 'search_doc_1',
          embedding: [1.0, 0.0, 0.0],
          content: 'Document about cats and felines.',
          metadata: { topic: 'animals', type: 'mammals' },
        },
        {
          doc_id: 'search_doc_2',
          embedding: [0.0, 1.0, 0.0],
          content: 'Document about dogs and canines.',
          metadata: { topic: 'animals', type: 'mammals' },
        },
        {
          doc_id: 'search_doc_3',
          embedding: [0.0, 0.0, 1.0],
          content: 'Document about birds and flight.',
          metadata: { topic: 'animals', type: 'birds' },
        },
        {
          doc_id: 'search_doc_4',
          embedding: [0.7, 0.7, 0.0],
          content: 'Document about pets and companionship.',
          metadata: { topic: 'pets', type: 'general' },
        },
        {
          doc_id: 'search_doc_5',
          embedding: [0.0, 0.7, 0.7],
          content: 'Document about wildlife and nature.',
          metadata: { topic: 'wildlife', type: 'general' },
        },
      ];

      const corpusHash = FaissClient.generateContentHash(testDocs, 'search-test-v1');
      const buildResponse = await client.buildIndex({
        corpus_hash: corpusHash,
        embed_model: 'search-test-v1',
        documents: testDocs,
        config: {
          dimension: 3,
          index_type: 'IndexFlatIP',
          distance_metric: 'cosine',
        },
      });

      snapshotId = buildResponse.snapshot_id;
    });

    it(
      'should perform basic similarity search',
      async () => {
        const queryVector = [0.9, 0.1, 0.0]; // Close to first document

        const searchResponse = await client.search({
          snapshot_id: snapshotId,
          queryVector,
          top_k: 3,
          include_content: true,
        });

        expect(searchResponse.results).toHaveLength(3);
        expect(searchResponse.search_latency_ms).toBeGreaterThan(0);
        expect(searchResponse.total_documents).toBe(5);

        // Results should be ordered by score (highest first)
        const scores = searchResponse.results.map((r) => r.score);
        for (let i = 1; i < scores.length; i++) {
          expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
        }

        // First result should be most similar
        expect(searchResponse.results[0].doc_id).toBe('search_doc_1');
        expect(searchResponse.results[0].rank).toBe(1);
        expect(searchResponse.results[0].content).toContain('cats');
        expect(searchResponse.results[0].metadata.topic).toBe('animals');
      },
      TEST_TIMEOUT,
    );

    it(
      'should search without content when include_content is false',
      async () => {
        const queryVector = [0.0, 0.9, 0.1];

        const searchResponse = await client.search({
          snapshot_id: snapshotId,
          queryVector,
          top_k: 2,
          include_content: false,
        });

        expect(searchResponse.results).toHaveLength(2);
        expect(searchResponse.results[0].content).toBe('');
        expect(searchResponse.results[0].doc_id).toBeDefined();
        expect(searchResponse.results[0].metadata).toBeDefined();
      },
      TEST_TIMEOUT,
    );

    it(
      'should respect top_k parameter',
      async () => {
        const queryVector = [0.5, 0.5, 0.5];

        const response1 = await client.search({
          snapshot_id: snapshotId,
          queryVector,
          top_k: 1,
        });

        const response2 = await client.search({
          snapshot_id: snapshotId,
          queryVector,
          top_k: 5,
        });

        expect(response1.results).toHaveLength(1);
        expect(response2.results).toHaveLength(5);
        expect(response1.results[0].doc_id).toBe(response2.results[0].doc_id);
      },
      TEST_TIMEOUT,
    );

    it(
      'should handle search with filters',
      async () => {
        const queryVector = [0.3, 0.3, 0.3];

        const searchResponse = await client.search({
          snapshot_id: snapshotId,
          queryVector,
          top_k: 10,
          filters: {
            metadata_filters: { type: 'mammals' },
          },
        });

        // Should only return documents with type: 'mammals'
        expect(searchResponse.results.length).toBeGreaterThan(0);
        searchResponse.results.forEach((result) => {
          expect(result.metadata.type).toBe('mammals');
        });
      },
      TEST_TIMEOUT,
    );

    it(
      'should return search metadata',
      async () => {
        const queryVector = [0.1, 0.2, 0.3];

        const searchResponse = await client.search({
          snapshot_id: snapshotId,
          queryVector,
          top_k: 5,
        });

        expect(searchResponse.search_metadata).toBeDefined();
        expect(searchResponse.search_metadata.query_dimension).toBe('3');
        expect(searchResponse.search_metadata.index_type).toBeDefined();
      },
      TEST_TIMEOUT,
    );

    it(
      'should handle search for non-existent snapshot',
      async () => {
        const nonExistentSnapshotId = 'sha256:' + '0'.repeat(64);

        await expect(
          client.search({
            snapshot_id: nonExistentSnapshotId,
            queryVector: [0.1, 0.2, 0.3],
            top_k: 5,
          }),
        ).rejects.toThrow(/not found/i);
      },
      TEST_TIMEOUT,
    );
  });

  describe('Build Status Monitoring', () => {
    it(
      'should return completed status for existing snapshot',
      async () => {
        // Build a test index first
        const testDocs: DocumentEmbedding[] = [
          {
            doc_id: 'status_test_doc',
            embedding: [0.1, 0.2, 0.3],
            content: 'Test document for status monitoring.',
          },
        ];

        const corpusHash = FaissClient.generateContentHash(testDocs, 'status-test-v1');
        const buildResponse = await client.buildIndex({
          corpus_hash: corpusHash,
          embed_model: 'status-test-v1',
          documents: testDocs,
          config: {
            dimension: 3,
            index_type: 'IndexFlatIP',
            distance_metric: 'cosine',
          },
        });

        const statusResponse = await client.getBuildStatus(buildResponse.snapshot_id);

        expect(statusResponse.status).toBe('completed');
        expect(statusResponse.progress).toBe(100.0);
        expect(statusResponse.current_stage).toBe('completed');
        expect(statusResponse.error_message).toBe('');
      },
      TEST_TIMEOUT,
    );

    it(
      'should return not_found status for non-existent snapshot',
      async () => {
        const nonExistentSnapshotId = 'sha256:' + 'f'.repeat(64);

        const statusResponse = await client.getBuildStatus(nonExistentSnapshotId);

        expect(statusResponse.status).toBe('not_found');
        expect(statusResponse.progress).toBe(0.0);
        expect(statusResponse.error_message).toContain('not found');
      },
      TEST_TIMEOUT,
    );
  });

  describe('Error Handling and Recovery', () => {
    it(
      'should handle malformed embedding dimensions',
      async () => {
        const invalidDocs: DocumentEmbedding[] = [
          {
            doc_id: 'invalid_doc',
            embedding: [0.1, 0.2], // 2D instead of 3D
            content: 'Invalid document',
          },
        ];

        const corpusHash = FaissClient.generateContentHash(invalidDocs, 'invalid-test');

        await expect(
          client.buildIndex({
            corpus_hash: corpusHash,
            embed_model: 'invalid-test',
            documents: invalidDocs,
            config: {
              dimension: 3, // Expects 3D but docs are 2D
              index_type: 'IndexFlatIP',
              distance_metric: 'cosine',
            },
          }),
        ).rejects.toThrow();
      },
      TEST_TIMEOUT,
    );

    it(
      'should handle empty document list',
      async () => {
        const emptyDocs: DocumentEmbedding[] = [];
        const corpusHash = FaissClient.generateContentHash(emptyDocs, 'empty-test');

        await expect(
          client.buildIndex({
            corpus_hash: corpusHash,
            embed_model: 'empty-test',
            documents: emptyDocs,
            config: {
              dimension: 3,
              index_type: 'IndexFlatIP',
              distance_metric: 'cosine',
            },
          }),
        ).rejects.toThrow();
      },
      TEST_TIMEOUT,
    );

    it(
      'should handle search query dimension mismatch',
      async () => {
        // Build a 3D index
        const testDocs: DocumentEmbedding[] = [
          {
            doc_id: 'dim_test_doc',
            embedding: [0.1, 0.2, 0.3],
            content: 'Test document',
          },
        ];

        const corpusHash = FaissClient.generateContentHash(testDocs, 'dim-test');
        const buildResponse = await client.buildIndex({
          corpus_hash: corpusHash,
          embed_model: 'dim-test',
          documents: testDocs,
          config: {
            dimension: 3,
            index_type: 'IndexFlatIP',
            distance_metric: 'cosine',
          },
        });

        // Try to search with 2D query vector
        await expect(
          client.search({
            snapshot_id: buildResponse.snapshot_id,
            queryVector: [0.1, 0.2], // 2D instead of 3D
            top_k: 1,
          }),
        ).rejects.toThrow();
      },
      TEST_TIMEOUT,
    );
  });

  describe('Performance and Scalability', () => {
    it(
      'should handle moderate-sized document collections',
      async () => {
        const moderateDocs: DocumentEmbedding[] = Array.from({ length: 1000 }, (_, i) => ({
          doc_id: `perf_doc_${i.toString().padStart(4, '0')}`,
          embedding: Array.from({ length: 128 }, () => Math.random() - 0.5),
          content: `Performance test document ${i} with some content to index.`,
          metadata: {
            batch: Math.floor(i / 100).toString(),
            index: i.toString(),
          },
        }));

        const startTime = Date.now();
        const corpusHash = FaissClient.generateContentHash(moderateDocs, 'perf-test-v1');

        const buildResponse = await client.buildIndex({
          corpus_hash: corpusHash,
          embed_model: 'perf-test-v1',
          documents: moderateDocs,
          config: {
            dimension: 128,
            index_type: 'IndexFlatIP',
            distance_metric: 'cosine',
          },
        });

        const buildTime = Date.now() - startTime;

        expect(buildResponse.document_count).toBe(1000);
        expect(buildResponse.stats.total_vectors).toBe(1000);
        expect(buildTime).toBeLessThan(30000); // Should complete within 30 seconds

        // Test search performance
        const searchStartTime = Date.now();
        const searchResponse = await client.search({
          snapshot_id: buildResponse.snapshot_id,
          queryVector: Array.from({ length: 128 }, () => Math.random() - 0.5),
          top_k: 10,
        });
        const searchTime = Date.now() - searchStartTime;

        expect(searchResponse.results).toHaveLength(10);
        expect(searchTime).toBeLessThan(1000); // Search should be fast
        expect(searchResponse.search_latency_ms).toBeLessThan(100);
      },
      TEST_TIMEOUT * 2,
    );

    it(
      'should maintain search accuracy with different index types',
      async () => {
        const accuracyDocs: DocumentEmbedding[] = [
          {
            doc_id: 'exact_match',
            embedding: [1.0, 0.0, 0.0],
            content: 'Exact match document',
          },
          {
            doc_id: 'close_match',
            embedding: [0.9, 0.1, 0.0],
            content: 'Close match document',
          },
          {
            doc_id: 'distant_match',
            embedding: [0.0, 0.0, 1.0],
            content: 'Distant match document',
          },
        ];

        const configs = [
          { index_type: 'IndexFlatIP', distance_metric: 'cosine' },
          { index_type: 'IndexFlatL2', distance_metric: 'euclidean' },
        ];

        const results = await Promise.all(
          configs.map(async (configParams) => {
            const corpusHash = FaissClient.generateContentHash(
              accuracyDocs,
              `accuracy-${configParams.index_type}`,
            );
            const buildResponse = await client.buildIndex({
              corpus_hash: corpusHash,
              embed_model: `accuracy-${configParams.index_type}`,
              documents: accuracyDocs,
              config: {
                dimension: 3,
                ...configParams,
              },
            });

            const searchResponse = await client.search({
              snapshot_id: buildResponse.snapshot_id,
              queryVector: [1.0, 0.0, 0.0], // Should match 'exact_match' best
              top_k: 3,
            });

            return searchResponse;
          }),
        );

        // All index types should return 'exact_match' as the top result
        results.forEach((result) => {
          expect(result.results[0].doc_id).toBe('exact_match');
          expect(result.results[0].rank).toBe(1);
        });
      },
      TEST_TIMEOUT,
    );
  });
});
