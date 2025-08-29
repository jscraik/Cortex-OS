/**
 * Enhanced Qwen3 Embedding Integration for Cortex RAG
 * Supports all Qwen3-Embedding models (0.6B, 4B, 8B)
 */

import { type Embedder } from '../index.js';
import { runProcess } from '../../../../src/lib/run-process.js';

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

    const script = this.getPythonScript(modelPath, texts);
    const result = await runProcess<{ embeddings: number[][] }>('python3', ['-c', script], {
      env: { ...process.env, TRANSFORMERS_CACHE: this.cacheDir },

    });
    return result.embeddings;
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
