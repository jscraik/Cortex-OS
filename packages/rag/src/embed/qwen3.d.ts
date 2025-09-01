/**
 * Enhanced Qwen3 Embedding Integration for Cortex RAG
 * Supports all Qwen3-Embedding models (0.6B, 4B, 8B)
 */
import { type Embedder } from '../index.js';
export type Qwen3ModelSize = '0.6B' | '4B' | '8B';
export interface Qwen3EmbedOptions {
  modelSize?: Qwen3ModelSize;
  modelPath?: string;
  maxTokens?: number;
  batchSize?: number;
  useGPU?: boolean;
  cacheDir?: string;
}
export declare class Qwen3Embedder implements Embedder {
  private readonly modelSize;
  private readonly modelPath;
  private readonly cacheDir;
  private readonly maxTokens;
  private readonly batchSize;
  private readonly useGPU;
  constructor(options?: Qwen3EmbedOptions);
  embed(texts: string[]): Promise<number[][]>;
  private embedBatch;
  private embedWithModel;
  close(): Promise<void>;
}
/**
 * Factory function for easy Qwen3 embedder creation
 */
export declare function createQwen3Embedder(options?: Qwen3EmbedOptions): Qwen3Embedder;
/**
 * Optimized embedder configurations for different use cases
 */
export declare const Qwen3Presets: {
  readonly development: () => Qwen3Embedder;
  readonly production: () => Qwen3Embedder;
  readonly research: () => Qwen3Embedder;
};
//# sourceMappingURL=qwen3.d.ts.map
