/**
 * @file_path packages/model-gateway/src/adapters/mlx-adapter.ts
 * MLX adapter for model gateway - int  constructor() {
    // Path to Python executable (can be configured via environment)
    this.pythonPath = process.env.PYTHON_PATH || 'python3';

    // Path to the MLX embedding generator script
    this.scriptPath = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      '../../../apps/cortex-py/src/mlx/embedding_generator.py'
    );
  }th Python MLX embedding generator
 */

import { spawn } from 'child_process';
import path from 'path';
import { z } from 'zod';

// MLX model configurations
const MLX_MODELS = {
  'qwen3-embedding-0.6b-mlx': {
    path: 'Qwen/Qwen3-Embedding-0.6B',
    memory_gb: 1.0,
    dimensions: 1536,
    context_length: 8192,
  },
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

const MLXChatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string(),
    }),
  ),
  model: z.string().optional(),
  max_tokens: z.number().optional(),
  temperature: z.number().optional(),
});

const MLXChatResponseSchema = z.object({
  content: z.string(),
  model: z.string(),
  usage: z
    .object({
      promptTokens: z.number(),
      completionTokens: z.number(),
      totalTokens: z.number(),
      cost: z.number().optional(),
    })
    .optional(),
});

const MLXRerankRequestSchema = z.object({
  query: z.string(),
  documents: z.array(z.string()),
  model: z.string().optional(),
});

const MLXRerankResponseSchema = z.object({
  scores: z.array(z.number()),
  model: z.string(),
  usage: z
    .object({
      tokens: z.number(),
      cost: z.number().optional(),
    })
    .optional(),
});

export type MLXEmbeddingRequest = z.infer<typeof MLXEmbeddingRequestSchema>;
export type MLXEmbeddingResponse = z.infer<typeof MLXEmbeddingResponseSchema>;
export type MLXChatRequest = z.infer<typeof MLXChatRequestSchema>;
export type MLXChatResponse = z.infer<typeof MLXChatResponseSchema>;
export type MLXRerankRequest = z.infer<typeof MLXRerankRequestSchema>;
export type MLXRerankResponse = z.infer<typeof MLXRerankResponseSchema>;

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
   * Generate chat completion using MLX
   * Note: This is a placeholder - actual implementation would require MLX chat model support
   */
  async generateChat(request: MLXChatRequest): Promise<MLXChatResponse> {
    // For now, return a placeholder response
    // In a full implementation, this would interface with MLX chat models
    const userMessage = request.messages.find((m) => m.role === 'user')?.content || '';
    const promptTokens = this.estimateTokenCount(request.messages.map((m) => m.content).join(' '));

    return MLXChatResponseSchema.parse({
      content: `MLX Chat Response for: ${userMessage.substring(0, 100)}...`,
      model: request.model || 'qwen3-chat-mlx',
      usage: {
        promptTokens,
        completionTokens: 50, // Estimated
        totalTokens: promptTokens + 50,
        cost: 0,
      },
    });
  }

  /**
   * Rerank documents using MLX cross-encoder
   * Note: This is a placeholder - actual implementation would require MLX reranking models
   */
  async rerank(request: MLXRerankRequest): Promise<MLXRerankResponse> {
    // Simple placeholder reranking based on keyword overlap
    // In a full implementation, this would use MLX cross-encoder models
    const queryWords = request.query.toLowerCase().split(/\s+/);
    const scores = request.documents.map((doc) => {
      const docWords = doc.toLowerCase().split(/\s+/);
      const overlap = queryWords.filter((word) => docWords.includes(word)).length;
      return overlap / Math.max(queryWords.length, 1);
    });

    const totalTokens = this.estimateTokenCount(request.query + ' ' + request.documents.join(' '));

    return MLXRerankResponseSchema.parse({
      scores,
      model: request.model || 'qwen3-rerank-mlx',
      usage: {
        tokens: totalTokens,
        cost: 0,
      },
    });
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
