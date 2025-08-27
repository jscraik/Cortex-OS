/**
 * @file_path packages/model-gateway/src/adapters/mlx-adapter.ts
 * MLX adapter for model gateway - interfaces with Python MLX embedding generator
 */

import { spawn } from 'child_process';
import path from 'path';
import { z } from 'zod';

// MLX model configurations
const MLX_MODELS = {
  'qwen3-embedding-4b-mlx': {
    path: 'Qwen/Qwen3-Embedding-4B',
    memory_gb: 4.0,
    dimensions: 1536,
    context_length: 8192,
  },
  'qwen3-embedding-8b-mlx': {
    path: 'Qwen/Qwen3-Embedding-8B',
    memory_gb: 8.0,
    dimensions: 1536,
    context_length: 8192,
  },
} as const;

export type MLXModelName = keyof typeof MLX_MODELS;

// Embedding request/response schemas
const MLXEmbeddingRequestSchema = z.object({
  text: z.string(),
  model: z.string().optional(),
});

const MLXEmbeddingResponseSchema = z.object({
  embedding: z.array(z.number()),
  model: z.string(),
  dimensions: z.number(),
  usage: z
    .object({
      tokens: z.number(),
      cost: z.number().optional(),
    })
    .optional(),
});

export type MLXEmbeddingRequest = z.infer<typeof MLXEmbeddingRequestSchema>;
export type MLXEmbeddingResponse = z.infer<typeof MLXEmbeddingResponseSchema>;

/**
 * MLX Adapter for model gateway
 */
export class MLXAdapter {
  private readonly pythonPath: string;
  private readonly scriptPath: string;

  constructor() {
    // Path to Python executable (can be configured via environment)
    this.pythonPath = process.env.PYTHON_PATH || 'python3';

    // Path to the MLX embedding generator script
    this.scriptPath = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      '../../../../apps/cortex-py/src/mlx/embedding_generator.py',
    );
  }

  /**
   * Generate embeddings using MLX
   */
  async generateEmbedding(request: MLXEmbeddingRequest): Promise<MLXEmbeddingResponse> {
    const modelName = (request.model as MLXModelName) || 'qwen3-embedding-4b-mlx';
    const modelConfig = MLX_MODELS[modelName];

    if (!modelConfig) {
      throw new Error(`Unsupported MLX model: ${modelName}`);
    }

    try {
      const result = await this.executePythonScript([
        request.text,
        '--model',
        modelName,
        '--json-only',
      ]);

      const data = JSON.parse(result);

      return MLXEmbeddingResponseSchema.parse({
        embedding: data[0], // Python script returns array of arrays, take first
        model: modelName,
        dimensions: modelConfig.dimensions,
        usage: {
          tokens: this.estimateTokenCount(request.text),
          cost: 0, // Local inference has no API cost
        },
      });
    } catch (error) {
      console.error('MLX embedding generation failed:', error);
      throw new Error(
        `MLX embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate multiple embeddings in batch
   */
  async generateEmbeddings(texts: string[], model?: string): Promise<MLXEmbeddingResponse[]> {
    const modelName = (model as MLXModelName) || 'qwen3-embedding-4b-mlx';

    try {
      const result = await this.executePythonScript([
        ...texts,
        '--model',
        modelName,
        '--json-only',
      ]);

      const data = JSON.parse(result);

      if (!Array.isArray(data)) {
        throw new Error('Expected array of embeddings from MLX script');
      }

      const modelConfig = MLX_MODELS[modelName];
      const totalTokens = texts.reduce((sum, text) => sum + this.estimateTokenCount(text), 0);

      return data.map((embedding: number[], index: number) =>
        MLXEmbeddingResponseSchema.parse({
          embedding,
          model: modelName,
          dimensions: modelConfig.dimensions,
          usage: {
            tokens: Math.floor(totalTokens / texts.length), // Approximate per-text tokens
            cost: 0,
          },
        }),
      );
    } catch (error) {
      console.error('MLX batch embedding generation failed:', error);
      throw new Error(
        `MLX batch embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Execute the Python MLX script
   */
  private async executePythonScript(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(this.pythonPath, [this.scriptPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONPATH: path.resolve(process.cwd(), 'apps/cortex-py/src'),
        },
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Estimate token count for text (rough approximation)
   */
  private estimateTokenCount(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters for most models
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if MLX is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Test with a simple text to check if MLX is available
      await this.executePythonScript(['test', '--json-only']);
      return true;
    } catch {
      return false;
    }
  }
}
