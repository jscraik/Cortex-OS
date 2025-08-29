/**
 * Enhanced Qwen3 Embedding Integration for Cortex RAG
 * Supports all Qwen3-Embedding models (0.6B, 4B, 8B)
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { type Embedder } from '../index.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

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

  constructor(options: Qwen3EmbedOptions = {}) {
    this.modelSize = options.modelSize || '4B';
    this.cacheDir = options.cacheDir || '/Volumes/ExternalSSD/.cache/huggingface';
    this.maxTokens = options.maxTokens || 512;
    this.batchSize = options.batchSize || 32;
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
      const python = spawn('python3', ['-c', this.getPythonScript()], {
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

      const input = {
        model_path: modelPath,
        texts,
        max_tokens: this.maxTokens,
      };
      python.stdin?.write(JSON.stringify(input));
      python.stdin?.end();
    });
  }

  private getPythonScript(): string {
    const scriptPath = path.join(packageRoot, 'python', 'qwen3_embed.py');
    return readFileSync(scriptPath, 'utf8');
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
