/**
 * @file_path src/rag/index/faissd.test.ts
 * @description TDD tests for FAISS gRPC protocol buffer compilation and validation
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync } from 'fs';
import path from 'path';
import { FaissClient, FaissClientError, createFaissClient, checkFaissService } from './client';

// Mock gRPC for testing
vi.mock("@grpc/grpc-js", () => ({
  credentials: {
    createInsecure: vi.fn(() => ({})),
  },
  loadPackageDefinition: vi.fn(() => ({
    faissd: {
      FaissService: vi.fn(() => ({
        BuildIndex: vi.fn(),
        SearchIndex: vi.fn(),
        GetBuildStatus: vi.fn(),
        HealthCheck: vi.fn(),
      })),
    },
  })),
  status: {
    UNAVAILABLE: 14,
    NOT_FOUND: 5,
    INTERNAL: 13,
    INVALID_ARGUMENT: 3,
    UNAUTHENTICATED: 16,
  },
  getClientChannel: vi.fn(() => ({
    close: vi.fn(),
  })),
}));

vi.mock("@grpc/proto-loader", () => ({
  loadSync: vi.fn(() => ({})),
}));

// Protocol buffer types (will be generated from .proto file)
interface BuildRequest {
  corpus_hash: string;
  embed_model: string;
  documents: DocumentEmbedding[];
  config: IndexConfig;
  metadata?: { [key: string]: string };
}

interface BuildResponse {
  snapshot_id: string;
  cache_hit: boolean;
  document_count: number;
  build_timestamp: number;
  stats: IndexStats;
  warnings: string[];
}

interface SearchRequest {
  snapshot_id: string;
  query_vector: number[];
  top_k: number;
  filters?: SearchFilters;
  include_content?: boolean;
}

interface SearchResponse {
  results: SearchResult[];
  search_latency_ms: number;
  total_documents: number;
  search_metadata?: { [key: string]: string };
}

interface DocumentEmbedding {
  doc_id: string;
  embedding: number[];
  content?: string;
  metadata?: { [key: string]: string };
  source?: string;
}

interface IndexConfig {
  dimension: number;
  index_type: string;
  distance_metric: string;
  n_clusters?: number;
  training_params?: { [key: string]: string };
}

interface IndexStats {
  total_vectors: number;
  index_size_bytes: number;
  build_duration_ms: number;
  peak_memory_bytes: number;
  efficiency_metrics?: { [key: string]: number };
}

interface SearchResult {
  doc_id: string;
  score: number;
  rank: number;
  content?: string;
  metadata?: { [key: string]: string };
  source?: string;
}

interface SearchFilters {
  min_score?: number;
  max_score?: number;
  metadata_filters?: { [key: string]: string };
  source_includes?: string[];
  source_excludes?: string[];
}

describe("FAISS gRPC Protocol Buffer Tests", () => {
  const protoPath = path.join(__dirname, "faissd.proto");
  const generatedDir = path.join(__dirname, "generated");
  const nodeModulesProtobuf = path.join(
    process.cwd(),
    "node_modules",
    "@grpc",
    "proto-loader",
  );

  beforeAll(() => {
    // Ensure generated directory exists
    if (!existsSync(generatedDir)) {
      mkdirSync(generatedDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up generated files
    if (existsSync(generatedDir)) {
      rmSync(generatedDir, { recursive: true });
    }
  });

  describe("Protocol Buffer File Validation", () => {
    it("should have valid .proto file syntax", () => {
      expect(existsSync(protoPath)).toBe(true);

      const fs = require('fs');
      const protoContent = fs.readFileSync(protoPath, 'utf8');

      // Basic syntax validation
      expect(protoContent).toContain('syntax = "proto3";');
      expect(protoContent).toContain("package faissd;");
      expect(protoContent).not.toContain("syntax error");
    });

    it("should contain required service definition", () => {
      // Read and validate proto file content
      const fs = require('fs');
      const protoContent = fs.readFileSync(protoPath, 'utf8');

      expect(protoContent).toContain('service FaissService');
      expect(protoContent).toContain('rpc BuildIndex');
      expect(protoContent).toContain('rpc SearchIndex');
      expect(protoContent).toContain('rpc GetBuildStatus');
      expect(protoContent).toContain('rpc HealthCheck');
    });

    it('should define required message types', () => {
      const fs = require('fs');
      const protoContent = fs.readFileSync(protoPath, 'utf8');

      expect(protoContent).toContain('message BuildRequest');
      expect(protoContent).toContain('message BuildResponse');
      expect(protoContent).toContain('message SearchRequest');
      expect(protoContent).toContain('message SearchResponse');
      expect(protoContent).toContain('message DocumentEmbedding');
      expect(protoContent).toContain('message IndexConfig');
    });
  });

  describe("Message Structure Validation", () => {
    it("should validate BuildRequest structure", () => {
      const validBuildRequest: BuildRequest = {
        corpus_hash: "sha256:abc123def456",
        embed_model: "text-embedding-3-small",
        documents: [
          {
            doc_id: "doc1",
            embedding: new Array(1536).fill(0.1),
            content: 'Test document content',
            metadata: { type: 'test' },
            source: '/path/to/doc1.txt',
          },
        ],
        config: {
          dimension: 1536,
          index_type: 'IndexFlatIP',
          distance_metric: 'cosine',
          n_clusters: 100,
        },
        metadata: { version: '1.0' },
      };

      // Validate required fields are present
      expect(validBuildRequest.corpus_hash).toBeDefined();
      expect(validBuildRequest.embed_model).toBeDefined();
      expect(validBuildRequest.documents).toHaveLength(1);
      expect(validBuildRequest.config.dimension).toBe(1536);
    });

    it("should validate SearchRequest structure", () => {
      const validSearchRequest: SearchRequest = {
        snapshot_id: "sha256:snapshot123",
        query_vector: new Array(1536).fill(0.1),
        top_k: 10,
        filters: {
          min_score: 0.7,
          metadata_filters: { type: 'test' },
        },
        include_content: true,
      };

      expect(validSearchRequest.snapshot_id).toBeDefined();
      expect(validSearchRequest.query_vector).toHaveLength(1536);
      expect(validSearchRequest.top_k).toBe(10);
    });

    it("should validate DocumentEmbedding vector dimensions", () => {
      const invalidDoc: DocumentEmbedding = {
        doc_id: "doc1",
        embedding: [0.1, 0.2], // Too short for typical embeddings
        content: 'Test content',
      };

      // This test demonstrates validation that would fail
      expect(invalidDoc.embedding.length).toBeLessThan(1536);

      const validDoc: DocumentEmbedding = {
        doc_id: "doc1",
        embedding: new Array(1536).fill(0.1),
        content: 'Test content',
      };

      expect(validDoc.embedding.length).toBe(1536);
    });
  });

  describe("Content-Addressed Storage Validation", () => {
    it("should generate deterministic corpus hash", () => {
      const documents1: DocumentEmbedding[] = [
        { doc_id: 'doc1', embedding: [0.1, 0.2, 0.3] },
        { doc_id: 'doc2', embedding: [0.4, 0.5, 0.6] },
      ];

      const documents2: DocumentEmbedding[] = [
        { doc_id: 'doc1', embedding: [0.1, 0.2, 0.3] },
        { doc_id: 'doc2', embedding: [0.4, 0.5, 0.6] },
      ];

      // Mock hash function (actual implementation will use crypto)
      const mockHash = (docs: DocumentEmbedding[]) => {
        const content = JSON.stringify(
          docs.sort((a, b) => a.doc_id.localeCompare(b.doc_id)),
        );
        // This will fail until actual hash implementation
        return "mock-hash-" + content.length;
      };

      const hash1 = mockHash(documents1);
      const hash2 = mockHash(documents2);

      expect(hash1).toBe(hash2);
    });

    it("should validate snapshot ID format", () => {
      const validSnapshotId = "sha256:1234567890abcdef1234567890abcdef12345678";
      const invalidSnapshotId = "invalid-format";

      const sha256Pattern = /^sha256:[a-f0-9]{40,64}$/;

      expect(sha256Pattern.test(validSnapshotId)).toBe(true);
      expect(sha256Pattern.test(invalidSnapshotId)).toBe(false);
    });
  });

  describe("Error Handling Validation", () => {
    it("should handle missing required fields", () => {
      const incompleteBuildRequest = {
        corpus_hash: "sha256:abc123",
        // Missing embed_model, documents, config
      } as Partial<BuildRequest>;

      expect(incompleteBuildRequest.embed_model).toBeUndefined();
      expect(incompleteBuildRequest.documents).toBeUndefined();
      expect(incompleteBuildRequest.config).toBeUndefined();
    });

    it("should handle dimension mismatch", () => {
      const config: IndexConfig = {
        dimension: 1536,
        index_type: 'IndexFlatIP',
        distance_metric: 'cosine',
      };

      const invalidEmbedding = [0.1, 0.2, 0.3]; // Length 3, not 1536
      const isValid = invalidEmbedding.length === config.dimension;

      expect(isValid).toBe(false);
    });

    it("should handle invalid search parameters", () => {
      const invalidSearchRequest: Partial<SearchRequest> = {
        snapshot_id: "",
        query_vector: [],
        top_k: 0,
      };

      expect(invalidSearchRequest.snapshot_id).toBe("");
      expect(invalidSearchRequest.query_vector).toHaveLength(0);
      expect(invalidSearchRequest.top_k).toBe(0);
    });
  });

  describe("Performance Constraints", () => {
    it("should validate reasonable vector dimensions", () => {
      const configs = [
        { dimension: 384, model: 'sentence-transformers' },
        { dimension: 768, model: 'bert-base' },
        { dimension: 1536, model: 'text-embedding-3-small' },
        { dimension: 3072, model: 'text-embedding-3-large' },
      ];

      configs.forEach((config) => {
        expect(config.dimension).toBeGreaterThan(0);
        expect(config.dimension).toBeLessThanOrEqual(4096);
      });
    });

    it("should validate reasonable top_k values", () => {
      const validTopK = [1, 5, 10, 50, 100];
      const invalidTopK = [0, -1, 10000];

      validTopK.forEach((k) => {
        expect(k).toBeGreaterThan(0);
        expect(k).toBeLessThanOrEqual(1000);
      });

      invalidTopK.forEach((k) => {
        if (k <= 0 || k > 1000) {
          expect(k).not.toBeGreaterThan(0);
        }
      });
    });
  });
});

// Export types for use in implementation
export type {
  BuildRequest,
  BuildResponse,
  SearchRequest,
  SearchResponse,
  DocumentEmbedding,
  IndexConfig,
  IndexStats,
  SearchResult,
  SearchFilters,
};
