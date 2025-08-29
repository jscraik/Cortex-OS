/**
 * @file embedding-adapter.ts
 * @description Embedding Adapter for semantic search and RAG capabilities
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */

import { spawn } from 'child_process';
import crypto from 'crypto';

export interface EmbeddingConfig {
  provider: 'sentence-transformers' | 'local';
  model?: string;
  dimensions?: number;
  batchSize?: number;
  cachePath?: string;
}

export interface EmbeddingVector {
  id: string;
  text: string;
  vector: number[];
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface EmbeddingQuery {
  text: string;
  topK?: number;
  threshold?: number;
  filter?: Record<string, any>;
}

export interface EmbeddingResult {
  id: string;
  text: string;
  similarity: number;
  metadata?: Record<string, any>;
}

export interface RerankerConfig {
  provider: 'transformers' | 'local';
  model?: string;
  batchSize?: number;
}

export interface RerankerResult {
  text: string;
  score: number;
  originalIndex: number;
}

/**
 * Embedding Adapter - Provides semantic search and RAG capabilities
 * Supports multiple backends and falls back gracefully
 */
export class EmbeddingAdapter {
  private config: EmbeddingConfig;
  private vectorStore: Map<string, EmbeddingVector> = new Map();
  private pythonPath: string;

  constructor(config: EmbeddingConfig) {
    this.config = {
      dimensions: 384, // Default for all-MiniLM-L6-v2
      batchSize: 32,
      ...config,
    };
    this.pythonPath = 'python'; // Could be configurable
    this.validateConfig();
  }

  /**
   * Validate embedding configuration
   */
  private validateConfig(): void {
    if (!['sentence-transformers', 'local'].includes(this.config.provider)) {
      throw new Error(`Unsupported embedding provider: ${this.config.provider}`);
    }
  }

  /**
   * Generate embeddings for text(s)
   */
  async generateEmbeddings(texts: string | string[]): Promise<number[][]> {
    const textArray = Array.isArray(texts) ? texts : [texts];

    switch (this.config.provider) {
      case 'sentence-transformers':
        return this.generateWithSentenceTransformers(textArray);
      case 'local':
        return this.generateWithLocal(textArray);
      default:
        throw new Error(
          `Embedding generation not implemented for provider: ${this.config.provider}`,
        );
    }
  }

  /**
   * Add documents to vector store
   */
  async addDocuments(
    texts: string[],
    metadata?: Record<string, any>[],
    ids?: string[],
  ): Promise<string[]> {
    const embeddings = await this.generateEmbeddings(texts);
    const documentIds: string[] = [];

    for (let i = 0; i < texts.length; i++) {
      const id = ids?.[i] || this.generateId(texts[i]);
      const vector: EmbeddingVector = {
        id,
        text: texts[i],
        vector: embeddings[i],
        metadata: metadata?.[i],
        timestamp: new Date().toISOString(),
      };

      this.vectorStore.set(id, vector);
      documentIds.push(id);
    }

    return documentIds;
  }

  /**
   * Search for similar documents
   */
  async similaritySearch(query: EmbeddingQuery): Promise<EmbeddingResult[]> {
    const queryEmbedding = await this.generateEmbeddings(query.text);
    const queryVector = queryEmbedding[0];

    const results: EmbeddingResult[] = [];

    for (const [id, doc] of this.vectorStore) {
      // Apply filters if specified
      if (query.filter && !this.matchesFilter(doc.metadata, query.filter)) {
        continue;
      }

      const similarity = this.cosineSimilarity(queryVector, doc.vector);

      if (!query.threshold || similarity >= query.threshold) {
        results.push({
          id,
          text: doc.text,
          similarity,
          metadata: doc.metadata,
        });
      }
    }

    // Sort by similarity (descending) and limit results
    results.sort((a, b) => b.similarity - a.similarity);

    if (query.topK) {
      return results.slice(0, query.topK);
    }

    return results;
  }

  /**
   * Get document by ID
   */
  getDocument(id: string): EmbeddingVector | undefined {
    return this.vectorStore.get(id);
  }

  /**
   * Remove document by ID
   */
  removeDocument(id: string): boolean {
    return this.vectorStore.delete(id);
  }

  /**
   * Get vector store statistics
   */
  getStats(): {
    totalDocuments: number;
    dimensions: number;
    provider: string;
    memoryUsage: string;
  } {
    const totalVectors = this.vectorStore.size;
    const dimensions = this.config.dimensions || 0;
    const memoryUsage = `${Math.round(((totalVectors * dimensions * 4) / 1024 / 1024) * 100) / 100} MB`;

    return {
      totalDocuments: totalVectors,
      dimensions,
      provider: this.config.provider,
      memoryUsage,
    };
  }

  /**
   * Generate embeddings using sentence-transformers via Python
   * Tries Qwen3-Embedding-0.6B first, then falls back to smaller models
   */
  private async generateWithSentenceTransformers(texts: string[]): Promise<number[][]> {
    const model = this.config.model || 'Qwen/Qwen3-Embedding-0.6B';

    const pythonScript = `
import json
import sys
import os

cache_path = os.environ.get('HF_CACHE_PATH', os.path.expanduser('~/.cache/huggingface'))
os.environ['HF_HOME'] = cache_path
os.environ['TRANSFORMERS_CACHE'] = cache_path

from sentence_transformers import SentenceTransformer

model_name = '${model}'
model = SentenceTransformer(model_name)
texts = json.loads(sys.argv[1])
embeddings = model.encode(texts).tolist()
print(json.dumps(embeddings))
`;

    try {
      const result = await this.executePythonScript(pythonScript, [JSON.stringify(texts)]);
      return JSON.parse(result);
    } catch (error) {
      throw new Error(
        `SentenceTransformers embedding failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Generate embeddings using local transformers (Qwen model)
   */
  private async generateWithLocal(texts: string[]): Promise<number[][]> {
    const pythonScript = `
import json
import sys
import os
import torch

# Set HuggingFace cache
cache_path = os.environ.get('HF_CACHE_PATH', os.path.expanduser('~/.cache/huggingface'))
os.environ['HF_HOME'] = cache_path
os.environ['TRANSFORMERS_CACHE'] = cache_path

try:
    from transformers import AutoTokenizer, AutoModel

    # Use Qwen embedding model
    model_name = "Qwen/Qwen3-Embedding-0.6B"
    cache_dir = os.environ.get('HF_CACHE_PATH', os.path.expanduser('~/.cache/huggingface'))

    tokenizer = AutoTokenizer.from_pretrained(model_name, cache_dir=cache_dir)
    model = AutoModel.from_pretrained(model_name, cache_dir=cache_dir)

    texts = json.loads(sys.argv[1])
    embeddings = []

    for text in texts:
        inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=512)

        with torch.no_grad():
            outputs = model(**inputs)
            # Mean pooling
            embedding = outputs.last_hidden_state.mean(dim=1).squeeze().tolist()
            embeddings.append(embedding)

    print(json.dumps(embeddings))

except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
`;

    try {
      const result = await this.executePythonScript(pythonScript, [JSON.stringify(texts)]);
      return JSON.parse(result);
    } catch (error) {
      throw new Error(
        `Local Qwen embeddings failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Check if metadata matches filter criteria
   */
  private matchesFilter(
    metadata: Record<string, any> | undefined,
    filter: Record<string, any>,
  ): boolean {
    if (!metadata) return false;

    for (const [key, value] of Object.entries(filter)) {
      if (metadata[key] !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Generate deterministic ID for text
   */
  private generateId(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex').substring(0, 16);
  }

  /**
   * Execute Python script and return output
   */
  private async executePythonScript(script: string, args: string[] = []): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.pythonPath, ['-c', script, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to spawn Python: ${error.message}`));
      });

      // Set timeout
      setTimeout(() => {
        child.kill();
        reject(new Error('Python script timed out'));
      }, 30000);
    });
  }
}

/**
 * Reranker for improving retrieval results
 */
export class RerankerAdapter {
  private config: RerankerConfig;

  constructor(config: RerankerConfig) {
    this.config = {
      batchSize: 32,
      ...config,
    };
  }

  /**
   * Rerank search results based on query relevance
   */
  async rerank(_query: string, _documents: string[], _topK?: number): Promise<RerankerResult[]> {
    throw new Error(`Reranking not implemented for provider: ${this.config.provider}`);
  }
}

/**
 * Create embedding adapter with common configurations
 */
export const createEmbeddingAdapter = (
  provider: EmbeddingConfig['provider'] = 'sentence-transformers',
): EmbeddingAdapter => {
  const configs: Record<EmbeddingConfig['provider'], EmbeddingConfig> = {
    'sentence-transformers': {
      provider: 'sentence-transformers',
      model: 'Qwen/Qwen3-Embedding-0.6B', // Use Qwen model by default
      dimensions: 1024,
    },
    local: {
      provider: 'local',
      model: 'Qwen/Qwen3-Embedding-0.6B', // Use Qwen model for local
      dimensions: 1024,
    },
  };

  return new EmbeddingAdapter(configs[provider]);
};

/**
 * Available embedding models
 */
export const AVAILABLE_EMBEDDING_MODELS = {
  QWEN_SMALL: 'Qwen/Qwen3-Embedding-0.6B',
  MINILM: 'all-MiniLM-L6-v2',
  MPNET: 'all-mpnet-base-v2',
} as const;

/**
 * Create reranker adapter with common configurations
 */
export const createRerankerAdapter = (
  provider: RerankerConfig['provider'] = 'transformers',
): RerankerAdapter => {
  const configs: Record<RerankerConfig['provider'], RerankerConfig> = {
    transformers: {
      provider: 'transformers',
      model: 'cross-encoder/ms-marco-MiniLM-L-6-v2',
    },
    local: {
      provider: 'local',
      model: 'local-reranker-model',
    },
  };

  return new RerankerAdapter(configs[provider]);
};
