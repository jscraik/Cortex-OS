/**
 * Enhanced Qwen3 Embedding Integration for Cortex RAG
 * Supports all Qwen3-Embedding models (0.6B, 4B, 8B)
 */

import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { type Embedder } from '../index.js';

export type Qwen3ModelSize = '0.6B' | '4B' | '8B';

export interface Qwen3EmbedOptions {
  modelSize?: Qwen3ModelSize;
  maxTokens?: number;
  batchSize?: number;
  useGPU?: boolean;
  cacheDir?: string;
}

export class Qwen3Embedder implements Embedder {
  private readonly modelSize: Qwen3ModelSize;
  private readonly cacheDir: string;
  private readonly maxTokens: number;
  private readonly batchSize: number;
  private readonly useGPU: boolean;

  constructor(options: Qwen3EmbedOptions = {}) {
    this.modelSize = options.modelSize || '4B';
    this.cacheDir =
      options.cacheDir || join(process.env.HF_HOME || tmpdir(), 'qwen3-embedding-cache');
    this.maxTokens = options.maxTokens || 512;
    this.batchSize = options.batchSize || 32;
    this.useGPU = options.useGPU ?? false;
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
    return this.embedWithModel(texts, this.modelSize);
  }

  private async embedWithModel(texts: string[], modelSize: Qwen3ModelSize): Promise<number[][]> {
    const modelPath = `${this.cacheDir}/models/Qwen3-Embedding-${modelSize}`;

    return new Promise((resolve, reject) => {
      const python = spawn('python3', ['-c', this.getPythonScript(modelPath, texts, this.useGPU)], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, TRANSFORMERS_CACHE: this.cacheDir, HF_HOME: this.cacheDir },
      });

      let stdout = '';
      let stderr = '';

      python.stdout?.on('data', (data) => (stdout += data.toString()));
      python.stderr?.on('data', (data) => (stderr += data.toString()));

      const timer = setTimeout(() => {
        python.kill();
        reject(new Error('Qwen3 embedder timed out'));
      }, 30000);

      python.on('close', (code) => {
        clearTimeout(timer);
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

      python.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  private getPythonScript(modelPath: string, texts: string[], useGPU: boolean): string {
    return `
import json
import sys
import torch
from transformers import AutoTokenizer, AutoModel
import numpy as np

use_gpu = ${useGPU ? 'True' : 'False'}
device = 'cuda' if use_gpu and torch.cuda.is_available() else 'cpu'

def mean_pooling(model_output, attention_mask):
    token_embeddings = model_output[0]
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

try:
    # Load model and tokenizer
    tokenizer = AutoTokenizer.from_pretrained("${modelPath}")
    model = AutoModel.from_pretrained("${modelPath}")
    model = model.to(device)

    texts = ${JSON.stringify(texts)}

    # Tokenize and encode
    encoded_input = tokenizer(texts, padding=True, truncation=True, max_length=${this.maxTokens}, return_tensors='pt')
    encoded_input = {k: v.to(device) for k, v in encoded_input.items()}

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
