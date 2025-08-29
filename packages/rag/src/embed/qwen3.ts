/**
 * Enhanced Qwen3 Embedding Integration for Cortex RAG
 * Supports all Qwen3-Embedding models (0.6B, 4B, 8B)
 */


import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { type Embedder } from '../index.js';
import { runProcess } from '../../../../src/lib/run-process.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export type Qwen3ModelSize = '0.6B' | '4B' | '8B';

export interface Qwen3EmbedOptions {
  modelSize?: Qwen3ModelSize;
  modelPath?: string;
  maxTokens?: number;
  batchSize?: number;
  useGPU?: boolean;
}

export class Qwen3Embedder implements Embedder {
  private readonly modelSize: Qwen3ModelSize;
  private readonly modelPath: string;
  private readonly cacheDir: string;
  private readonly maxTokens: number;
  private readonly batchSize: number;

  constructor(options: Qwen3EmbedOptions = {}) {
    this.modelSize = options.modelSize || '4B';
    const defaultBase = process.env.QWEN_EMBED_MODEL_PATH || path.resolve(process.cwd(), 'models');
    this.modelPath =
      options.modelPath || path.join(defaultBase, `Qwen3-Embedding-${this.modelSize}`);
    this.cacheDir = path.dirname(this.modelPath);
    this.maxTokens = options.maxTokens || 512;
    this.batchSize = options.batchSize || 32;

    if (!fs.existsSync(this.modelPath)) {
      throw new Error(`Embedding model path does not exist: ${this.modelPath}`);
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    // Process in batches for memory efficiency
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const batchResults = await this.embedBatch(batch);
      results.push(...batchResults);
    }

    return results;
  }

  private async embedBatch(texts: string[]): Promise<number[][]> {
    return this.embedWithModel(texts);
  }


  private async embedWithModel(texts: string[]): Promise<number[][]> {
    return new Promise((resolve, reject) => {
      const python = spawn('python3', ['-c', this.getPythonScript(this.modelPath, texts)], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, TRANSFORMERS_CACHE: this.cacheDir },
      });

      let stdout = '';
      let stderr = '';

      python.stdout?.on('data', (data) => (stdout += data.toString()));
      python.stderr?.on('data', (data) => (stderr += data.toString()));

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result.embeddings);
          } catch (error) {
            reject(new Error(`Failed to parse embedding result: ${error}`));
          }
        } else {
          reject(new Error(`Python embedding process failed: ${stderr}`));
        }
      });

      python.on('error', reject);

    });
    return result.embeddings;
  }


  private getPythonScript(modelPath: string, texts: string[]): string {
    return `
import json
import sys
import torch
from transformers import AutoTokenizer, AutoModel
import numpy as np

def mean_pooling(model_output, attention_mask):
    token_embeddings = model_output[0]
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

try:
    # Load model and tokenizer
    tokenizer = AutoTokenizer.from_pretrained("${modelPath}")
    model = AutoModel.from_pretrained("${modelPath}")

    texts = ${JSON.stringify(texts)}

    # Tokenize and encode
    encoded_input = tokenizer(texts, padding=True, truncation=True, max_length=${this.maxTokens}, return_tensors='pt')

    # Generate embeddings
    with torch.no_grad():
        model_output = model(**encoded_input)

    # Apply mean pooling
    embeddings = mean_pooling(model_output, encoded_input['attention_mask'])

    # Normalize embeddings
    embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=1)

    # Convert to list and output
    result = {
        "embeddings": embeddings.cpu().numpy().tolist(),
        "model": "${modelPath}",
        "dimension": embeddings.shape[1]
    }
    print(json.dumps(result))

except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;

  }

  async close(): Promise<void> {
    // No persistent process to cleanup - using spawn for each batch
  }
}

/**
 * Factory function for easy Qwen3 embedder creation
 */
export function createQwen3Embedder(options?: Qwen3EmbedOptions): Qwen3Embedder {
  return new Qwen3Embedder(options);
}

/**
 * Optimized embedder configurations for different use cases
 */
export const Qwen3Presets = {
  // Fast development/testing
  development: (): Qwen3Embedder =>
    createQwen3Embedder({
      modelSize: '0.6B',
      batchSize: 64,
    }),

  // Balanced production
  production: (): Qwen3Embedder =>
    createQwen3Embedder({
      modelSize: '4B',
      batchSize: 32,
    }),

  // High-quality research
  research: (): Qwen3Embedder =>
    createQwen3Embedder({
      modelSize: '8B',
      batchSize: 16,
    }),
} as const;
