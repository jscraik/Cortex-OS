
import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Document with relevance score for reranking
 */
export interface RerankDocument {
  id: string;
  text: string;
  score?: number;
}

/**
 * Interface for reranking documents based on query relevance
 */
export interface Reranker {
  /**
   * Rerank documents based on relevance to the query
   * @param query The search query
   * @param documents Documents to rerank
   * @param topK Number of top documents to return
   * @returns Reranked documents with relevance scores
   */
  rerank(query: string, documents: RerankDocument[], topK?: number): Promise<RerankDocument[]>;
}

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Configuration for Qwen3 reranker
 */
export interface Qwen3RerankOptions {
  /** Model path or identifier */
  modelPath?: string;
  /** Maximum sequence length for input */
  maxLength?: number;
  /** Number of top documents to return */
  topK?: number;
  /** Batch size for processing */
  batchSize?: number;
  /** Cache directory for model files */
  cacheDir?: string;
  /** Custom Python executable path */
  pythonPath?: string;
  /** Timeout in milliseconds for Python process */
  timeoutMs?: number;
}

/**
 * Qwen3-4B reranker for improved document relevance scoring
 *
 * Uses the Qwen3-Reranker-4B model to provide more accurate relevance
 * scoring between queries and documents compared to simple cosine similarity.
 */
export class Qwen3Reranker implements Reranker {
  private readonly modelPath: string;
  private readonly maxLength: number;
  private readonly topK: number;
  private readonly batchSize: number;
  private readonly cacheDir: string;
  private readonly pythonPath: string;
  private readonly timeoutMs: number;

  constructor(options: Qwen3RerankOptions = {}) {

    const defaultPath =
      process.env.QWEN_RERANKER_MODEL_PATH ||
      path.resolve(process.cwd(), 'models/Qwen3-Reranker-4B');
    this.modelPath = options.modelPath || defaultPath;
    this.maxLength = options.maxLength || 512;
    this.topK = options.topK || 10;
    this.batchSize = options.batchSize || 32;

    this.cacheDir =
      options.cacheDir || join(process.env.HF_HOME || tmpdir(), 'qwen3-reranker-cache');
    this.pythonPath = options.pythonPath || 'python3';
    this.timeoutMs = options.timeoutMs ?? 30000;

  }

  /**
   * Rerank documents using Qwen3-Reranker-4B model
   */
  async rerank(
    query: string,
    documents: RerankDocument[],
    topK?: number,
  ): Promise<RerankDocument[]> {
    if (documents.length === 0) {
      return [];
    }

    const actualTopK = topK || this.topK;
    const batches = this.createBatches(documents, this.batchSize);
    const allScores: number[] = [];

    // Process documents in batches
    for (const batch of batches) {
      const batchScores = await this.scoreBatch(query, batch);
      allScores.push(...batchScores);
    }

    // Combine documents with scores and sort by relevance
    const scoredDocs = documents.map((doc, index) => ({
      ...doc,
      score: allScores[index] || 0,
    }));

    // Sort by score (highest first) and return top K
    scoredDocs.sort((a, b) => (b.score || 0) - (a.score || 0));
    return scoredDocs.slice(0, actualTopK);
  }

  /**
   * Score a batch of documents against the query
   */
  private async scoreBatch(query: string, documents: RerankDocument[]): Promise<number[]> {

    return new Promise((resolve, reject) => {
      const pythonScript = this.getPythonScript();
      const child = spawn(this.pythonPath, ['-c', pythonScript], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          TRANSFORMERS_CACHE: this.cacheDir,
          HF_HOME: this.cacheDir,
        },
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        child.kill();
        reject(new Error('Qwen3 reranker timed out'));
      }, this.timeoutMs);

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(new Error(`Qwen3 reranker failed with code ${code}: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout.trim());
          if (result.error) {
            reject(new Error(`Qwen3 reranker error: ${result.error}`));
          } else {
            resolve(result.scores || []);
          }
        } catch (err) {
          reject(new Error(`Failed to parse Qwen3 reranker output: ${err}`));
        }
      });

      child.on('error', (err) => {
        reject(new Error(`Failed to spawn Qwen3 reranker process: ${err}`));
      });

      // Send input data
      const input = {
        query,
        documents: documents.map((doc) => doc.text),
        model_path: this.modelPath,
        max_length: this.maxLength,
      };

      child.stdin?.write(JSON.stringify(input));
      child.stdin?.end();

    });
    return result.scores || [];
  }

  /**
   * Create batches from documents array
   */
  private createBatches(documents: RerankDocument[], batchSize: number): RerankDocument[][] {
    const batches: RerankDocument[][] = [];
    for (let i = 0; i < documents.length; i += batchSize) {
      batches.push(documents.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Get the Python script for Qwen3 reranking
   */
  private getPythonScript(): string {

    return `
import json
import sys
import torch
from transformers import AutoTokenizer, AutoModel
import os
import tempfile

import os.path as osp


def rerank_documents():
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        query = input_data['query']
        documents = input_data['documents']
        model_path = input_data['model_path']
        max_length = input_data.get('max_length', 512)

        # Set up cache directory

        cache_dir = os.getenv('TRANSFORMERS_CACHE') or osp.join(os.getenv('HF_HOME', tempfile.gettempdir()), 'qwen3-reranker-cache')

        os.makedirs(cache_dir, exist_ok=True)

        # Load model and tokenizer
        tokenizer = AutoTokenizer.from_pretrained(
            model_path,
            cache_dir=cache_dir,
            trust_remote_code=True
        )
        model = AutoModel.from_pretrained(
            model_path,
            cache_dir=cache_dir,
            trust_remote_code=True,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32
        )
        
        if torch.cuda.is_available():
            model = model.cuda()
        elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            model = model.to('mps')
        
        model.eval()
        
        scores = []
        
        with torch.no_grad():
            for doc_text in documents:
                # Create query-document pairs for reranking
                inputs = tokenizer(
                    query,
                    doc_text,
                    return_tensors='pt',
                    max_length=max_length,
                    truncation=True,
                    padding=True
                )
                
                # Move to appropriate device
                if torch.cuda.is_available():
                    inputs = {k: v.cuda() for k, v in inputs.items()}
                elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
                    inputs = {k: v.to('mps') for k, v in inputs.items()}
                
                # Get relevance score
                outputs = model(**inputs)
                
                # Extract relevance score (model-specific)
                # For Qwen3-Reranker, the score is typically in the last hidden state
                if hasattr(outputs, 'logits'):
                    score = torch.sigmoid(outputs.logits).item()
                elif hasattr(outputs, 'last_hidden_state'):
                    # Use CLS token representation for scoring
                    cls_embedding = outputs.last_hidden_state[:, 0, :]
                    score = torch.sigmoid(cls_embedding.mean()).item()
                else:
                    # Fallback: use mean of hidden states
                    score = torch.sigmoid(outputs.last_hidden_state.mean()).item()
                
                scores.append(float(score))
        
        # Return scores as JSON
        result = {"scores": scores}
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {"error": str(e)}
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    rerank_documents()
`;

  }

  /**
   * Cleanup resources if needed
   */
  async close(): Promise<void> {
    // No persistent resources to cleanup
  }
}

/**
 * Factory function for easy Qwen3 reranker creation
 */
export function createQwen3Reranker(options?: Qwen3RerankOptions): Qwen3Reranker {
  return new Qwen3Reranker(options);
}

/**
 * Preset configurations for different use cases
 */
export const Qwen3RerankPresets = {
  /** Fast reranking with smaller batch size */
  fast: {
    batchSize: 16,
    maxLength: 256,
    topK: 5,
  },

  /** Balanced performance and accuracy */
  balanced: {
    batchSize: 32,
    maxLength: 512,
    topK: 10,
  },

  /** High accuracy with larger context */
  accurate: {
    batchSize: 8,
    maxLength: 1024,
    topK: 20,
  },
} as const;
