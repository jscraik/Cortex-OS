/**
 * @file_path src/rag/index/client.ts
 * @description TypeScript gRPC client for FAISS vector search sidecar service
 *
 * Provides a high-level client interface for the FAISS gRPC service with:
 * - Content-addressed index building
 * - Vector similarity search
 * - Error handling and timeouts
 * - Connection management
 */

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  BuildRequest,
  BuildResponse,
  DocumentEmbedding,
  IndexConfig,
  SearchFilters,
  SearchRequest,
  SearchResponse,
} from './types';

// ESM-friendly __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Protocol buffer type definitions
interface FaissServiceClient {
  BuildIndex: (
    request: BuildRequest,
    callback: grpc.requestCallback<BuildResponse>,
  ) => grpc.ClientUnaryCall;
  SearchIndex: (
    request: SearchRequest,
    callback: grpc.requestCallback<SearchResponse>,
  ) => grpc.ClientUnaryCall;
  GetBuildStatus: (
    request: { snapshot_id: string },
    callback: grpc.requestCallback<any>,
  ) => grpc.ClientUnaryCall;
  HealthCheck: (
    request: { component?: string },
    callback: grpc.requestCallback<any>,
  ) => grpc.ClientUnaryCall;
}

export interface FaissClientConfig {
  /** gRPC server endpoint (e.g., 'localhost:50051') */
  endpoint: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum retry attempts for failed requests */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
  /** gRPC client options */
  options?: grpc.ClientOptions;
}

export interface BuildIndexOptions extends Omit<BuildRequest, 'documents' | 'config'> {
  /** Documents to index with embeddings */
  documents: DocumentEmbedding[];
  /** Index configuration */
  config: IndexConfig;
  /** Request timeout override */
  timeout?: number;
}

export interface SearchIndexOptions extends Omit<SearchRequest, 'query_vector'> {
  /** Query vector for similarity search */
  queryVector: number[];
  /** Request timeout override */
  timeout?: number;
}

export class FaissClientError extends Error {
  constructor(
    message: string,
    public readonly code?: grpc.status,
    public readonly details?: string,
  ) {
    super(message);
    this.name = 'FaissClientError';
  }
}

/**
 * High-level TypeScript client for FAISS gRPC service
 */
export class FaissClient {
  private client: FaissServiceClient;
  private config: Required<FaissClientConfig>;

  constructor(config: FaissClientConfig) {
    this.config = {
      timeout: 30000, // 30 seconds default
      maxRetries: 3,
      retryDelay: 1000,
      options: {},
      ...config,
    };

    this.client = this.createClient();
  }

  /**
   * Create gRPC client instance
   */
  private createClient(): FaissServiceClient {
    try {
      // Load protocol buffer definition
      const PROTO_PATH = path.join(__dirname, 'faissd.proto');
      const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });

      const proto = grpc.loadPackageDefinition(packageDefinition) as any;

      // Create client with configuration
      const client = new proto.faissd.FaissService(
        this.config.endpoint,
        grpc.credentials.createInsecure(),
        this.config.options,
      );

      return client;
    } catch (error) {
      throw new FaissClientError(`Failed to create gRPC client: ${error}`, grpc.status.UNAVAILABLE);
    }
  }

  /**
   * Build a new FAISS index from document embeddings
   */
  async buildIndex(options: BuildIndexOptions): Promise<BuildResponse> {
    // Validate inputs before RPC
    if (!options.corpus_hash) {
      throw new FaissClientError('corpus_hash is required');
    }
    if (!options.embed_model) {
      throw new FaissClientError('embed_model is required');
    }
    if (
      !options.config ||
      typeof options.config.dimension !== 'number' ||
      options.config.dimension <= 0
    ) {
      throw new FaissClientError('config.dimension must be a positive number');
    }
    // Validate document embeddings against expected dimension
    FaissClient.validateDocuments(options.documents, options.config.dimension);

    const request: BuildRequest = {
      corpus_hash: options.corpus_hash,
      embed_model: options.embed_model,
      documents: options.documents,
      config: options.config,
      metadata: options.metadata || {},
    };

    const timeout = options.timeout || this.config.timeout;

    return this.withRetry(async () => {
      return new Promise<BuildResponse>((resolve, reject) => {
        const deadline = Date.now() + timeout;

        const call = this.client.BuildIndex(request, (error, response) => {
          if (error) {
            reject(
              new FaissClientError(
                `Build index failed: ${error.message}`,
                error.code,
                error.details,
              ),
            );
          } else if (response) {
            resolve(response);
          } else {
            reject(
              new FaissClientError(
                'Build index failed: no response received',
                grpc.status.INTERNAL,
              ),
            );
          }
        });

        call.deadline = deadline;
      });
    });
  }

  /**
   * Search for similar vectors in an existing index
   */
  async search(options: SearchIndexOptions): Promise<SearchResponse> {
    // Validate request before sending
    FaissClient.validateSearchRequest(options);
    const request: SearchRequest = {
      snapshot_id: options.snapshot_id,
      query_vector: options.queryVector,
      top_k: options.top_k,
      filters: options.filters,
      include_content: options.include_content || false,
    };

    const timeout = options.timeout || this.config.timeout;

    return this.withRetry(async () => {
      return new Promise<SearchResponse>((resolve, reject) => {
        const deadline = Date.now() + timeout;

        const call = this.client.SearchIndex(request, (error, response) => {
          if (error) {
            reject(
              new FaissClientError(`Search failed: ${error.message}`, error.code, error.details),
            );
          } else if (response) {
            resolve(response);
          } else {
            reject(
              new FaissClientError('Search failed: no response received', grpc.status.INTERNAL),
            );
          }
        });

        call.deadline = deadline;
      });
    });
  }

  /**
   * Get build status for a snapshot
   */
  async getBuildStatus(snapshotId: string): Promise<any> {
    const request = { snapshot_id: snapshotId };

    return this.withRetry(async () => {
      return new Promise((resolve, reject) => {
        const deadline = Date.now() + this.config.timeout;

        const call = this.client.GetBuildStatus(request, (error, response) => {
          if (error) {
            reject(
              new FaissClientError(
                `Get build status failed: ${error.message}`,
                error.code,
                error.details,
              ),
            );
          } else {
            resolve(response);
          }
        });

        call.deadline = deadline;
      });
    });
  }

  /**
   * Health check for the FAISS service
   */
  async healthCheck(component?: string): Promise<any> {
    const request = { component };

    return new Promise((resolve, reject) => {
      const deadline = Date.now() + this.config.timeout;

      const call = this.client.HealthCheck(request, (error, response) => {
        if (error) {
          reject(
            new FaissClientError(
              `Health check failed: ${error.message}`,
              error.code,
              error.details,
            ),
          );
        } else {
          resolve(response);
        }
      });

      call.deadline = deadline;
    });
  }

  /**
   * Test connection to the FAISS service
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Close the gRPC client connection
   */
  close(): void {
    if (this.client) {
      grpc.getClientChannel(this.client).close();
    }
  }

  /**
   * Retry wrapper for gRPC operations
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx status codes)
        if (
          error instanceof FaissClientError &&
          error.code &&
          error.code >= grpc.status.INVALID_ARGUMENT &&
          error.code <= grpc.status.UNAUTHENTICATED
        ) {
          throw error;
        }

        // Only retry if we have attempts left
        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate content hash for documents (client-side validation)
   */
  static generateContentHash(documents: DocumentEmbedding[], embedModel: string): string {
    // Sort documents by doc_id for deterministic hashing
    const sortedDocs = [...documents].sort((a, b) => a.doc_id.localeCompare(b.doc_id));

    // Create canonical representation
    const canonicalData = {
      embed_model: embedModel,
      documents: sortedDocs.map((doc) => ({
        doc_id: doc.doc_id,
        embedding: doc.embedding,
        content: doc.content || '',
        metadata: doc.metadata || {},
        source: doc.source || '',
      })),
    };

    // Create deterministic JSON string
    const canonicalJson = JSON.stringify(canonicalData, Object.keys(canonicalData).sort());

    // Simple hash implementation (in production, use crypto.createHash)
    let hash = 0;
    for (let i = 0; i < canonicalJson.length; i++) {
      const char = canonicalJson.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `sha256:${Math.abs(hash).toString(16).padStart(16, '0')}`;
  }

  /**
   * Validate document embeddings before sending
   */
  static validateDocuments(documents: DocumentEmbedding[], expectedDimension: number): void {
    if (!documents || documents.length === 0) {
      throw new FaissClientError('Documents array cannot be empty');
    }

    for (const doc of documents) {
      if (!doc.doc_id) {
        throw new FaissClientError('Document must have a doc_id');
      }

      if (!doc.embedding || !Array.isArray(doc.embedding)) {
        throw new FaissClientError(`Document ${doc.doc_id} must have an embedding array`);
      }

      if (doc.embedding.length !== expectedDimension) {
        throw new FaissClientError(
          `Document ${doc.doc_id} has embedding dimension ${doc.embedding.length}, expected ${expectedDimension}`,
        );
      }

      // Validate embedding contains only numbers
      if (!doc.embedding.every((val) => typeof val === 'number' && !isNaN(val))) {
        throw new FaissClientError(`Document ${doc.doc_id} contains invalid embedding values`);
      }
    }
  }

  /**
   * Validate search request parameters
   */
  static validateSearchRequest(request: SearchIndexOptions): void {
    if (!request.snapshot_id) {
      throw new FaissClientError('Snapshot ID is required for search');
    }

    if (!request.queryVector || !Array.isArray(request.queryVector)) {
      throw new FaissClientError('Query vector must be an array');
    }

    if (request.queryVector.length === 0) {
      throw new FaissClientError('Query vector cannot be empty');
    }

    if (!request.queryVector.every((val) => typeof val === 'number' && !isNaN(val))) {
      throw new FaissClientError('Query vector contains invalid values');
    }

    if (request.top_k <= 0 || request.top_k > 10000) {
      throw new FaissClientError('top_k must be between 1 and 10000');
    }
  }
}

/**
 * Factory function to create FaissClient with default configuration
 */
export function createFaissClient(
  endpoint: string,
  options?: Partial<FaissClientConfig>,
): FaissClient {
  return new FaissClient({
    endpoint,
    ...options,
  });
}

/**
 * Utility function to check if FAISS service is available
 */
export async function checkFaissService(endpoint: string, timeout = 5000): Promise<boolean> {
  const client = createFaissClient(endpoint, { timeout });

  try {
    const isConnected = await client.testConnection();
    client.close();
    return isConnected;
  } catch (error) {
    client.close();
    return false;
  }
}

// Export types for external use
export type {
  BuildRequest,
  BuildResponse,
  DocumentEmbedding,
  FaissServiceClient,
  FaissServiceClient,
  IndexConfig,
  SearchFilters,
};
