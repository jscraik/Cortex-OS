/**
 * @file_path packages/model-gateway/src/adapters/mlx-adapter.ts
 * MLX adapter for model gateway - interfaces with Python MLX embedding generator
 */

import { spawn } from 'child_process';
import path from 'path';
import { z } from 'zod';

// MLX model configurations from ExternalSSD
const MLX_MODELS = {
  // Embedding models from HuggingFace cache
  'qwen3-embedding-0.6b-mlx': {
    path: '/Volumes/ExternalSSD/huggingface_cache/models--Qwen--Qwen3-Embedding-0.6B',
    hf_path: 'Qwen/Qwen3-Embedding-0.6B',
    type: 'embedding',
    memory_gb: 1.0,
    dimensions: 1536,
    context_length: 8192,
  },
  'qwen3-embedding-4b-mlx': {
    path: '/Volumes/ExternalSSD/huggingface_cache/models--Qwen--Qwen3-Embedding-4B',
    hf_path: 'Qwen/Qwen3-Embedding-4B',
    type: 'embedding',
    memory_gb: 4.0,
    dimensions: 1536,
    context_length: 8192,
  },
  'qwen3-embedding-8b-mlx': {
    path: '/Volumes/ExternalSSD/huggingface_cache/models--Qwen--Qwen3-Embedding-8B',
    hf_path: 'Qwen/Qwen3-Embedding-8B',
    type: 'embedding',
    memory_gb: 8.0,
    dimensions: 1536,
    context_length: 8192,
  },
  // Reranker models
  'qwen3-reranker-4b-mlx': {
    path: '/Volumes/ExternalSSD/huggingface_cache/models--Qwen--Qwen3-Reranker-4B',
    hf_path: 'Qwen/Qwen3-Reranker-4B',
    type: 'reranking',
    memory_gb: 4.0,
    context_length: 8192,
  },
  // Chat/completion models from HuggingFace MLX cache
  'qwen3-coder-30b-mlx': {
    path: '/Volumes/ExternalSSD/huggingface_cache/hub/models--mlx-community--Qwen3-Coder-30B-A3B-Instruct-4bit',
    hf_path: 'mlx-community/Qwen3-Coder-30B-A3B-Instruct-4bit',
    type: 'chat',
    memory_gb: 16.0,
    max_tokens: 4096,
    context_length: 32768,
    capabilities: ['code'],
  },
  'qwen2.5-vl-3b-mlx': {
    path: '/Volumes/ExternalSSD/huggingface_cache/hub/models--mlx-community--Qwen2.5-VL-3B-Instruct-6bit',
    hf_path: 'mlx-community/Qwen2.5-VL-3B-Instruct-6bit',
    type: 'chat',
    memory_gb: 3.0,
    max_tokens: 4096,
    context_length: 32768,
    capabilities: ['vision'],
  },
  'qwen2.5-0.5b-mlx': {
    path: '/Volumes/ExternalSSD/huggingface_cache/hub/models--mlx-community--Qwen2.5-0.5B-Instruct-4bit',
    hf_path: 'mlx-community/Qwen2.5-0.5B-Instruct-4bit',
    type: 'chat',
    memory_gb: 0.5,
    max_tokens: 4096,
    context_length: 32768,
  },
  'mixtral-8x7b-mlx': {
    path: '/Volumes/ExternalSSD/huggingface_cache/hub/models--mlx-community--Mixtral-8x7B-v0.1-hf-4bit-mlx',
    hf_path: 'mlx-community/Mixtral-8x7B-v0.1-hf-4bit-mlx',
    type: 'chat',
    memory_gb: 24.0,
    max_tokens: 4096,
    context_length: 32768,
  },
  'gemma2-2b-mlx': {
    path: '/Volumes/ExternalSSD/huggingface_cache/models--mlx-community--gemma-2-2b-it-4bit',
    hf_path: 'mlx-community/gemma-2-2b-it-4bit',
    type: 'chat',
    memory_gb: 2.0,
    max_tokens: 4096,
    context_length: 8192,
  },
  'glm-4.5-mlx': {
    path: '/Volumes/ExternalSSD/huggingface_cache/hub/models--mlx-community--GLM-4.5-4bit',
    hf_path: 'mlx-community/GLM-4.5-4bit',
    type: 'chat',
    memory_gb: 12.0,
    max_tokens: 4096,
    context_length: 32768,
  },
  'phi3-mini-mlx': {
    path: '/Volumes/ExternalSSD/huggingface_cache/hub/models--mlx-community--Phi-3-mini-4k-instruct-4bit',
    hf_path: 'mlx-community/Phi-3-mini-4k-instruct-4bit',
    type: 'chat',
    memory_gb: 2.0,
    max_tokens: 4096,
    context_length: 4096,
  },
} as const;

export type MLXModelName = keyof typeof MLX_MODELS;

// Request/response schemas
const MLXEmbeddingRequestSchema = z.object({
  text: z.string(),
  model: z.string().optional(),
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
      prompt_tokens: z.number(),
      completion_tokens: z.number(),
      total_tokens: z.number(),
    })
    .optional(),
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
export type MLXChatRequest = z.infer<typeof MLXChatRequestSchema>;
export type MLXChatResponse = z.infer<typeof MLXChatResponseSchema>;

/**
 * MLX Adapter for model gateway
 */
export class MLXAdapter {
  private readonly pythonPath: string;
  private readonly scriptPath: string;

  constructor() {
    // Path to Python executable (can be configured via environment)
    this.pythonPath = process.env.PYTHON_PATH || 'python3';

    // Path to the MLX generator script (unified for chat and embeddings)
    this.scriptPath = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      '../../../../apps/cortex-py/src/mlx/mlx_unified.py',
    );
  }

  /**
   * Generate chat completion using MLX
   */
  async generateChat(request: MLXChatRequest): Promise<MLXChatResponse> {
    const modelName = (request.model as MLXModelName) || 'qwen3-coder-30b-mlx';
    const modelConfig = MLX_MODELS[modelName];

    if (!modelConfig || modelConfig.type !== 'chat') {
      throw new Error(`Unsupported MLX chat model: ${modelName}`);
    }

    // Validate model path exists
    if (!(await this.validateModelPath(modelConfig.path))) {
      console.warn(`Model path not found: ${modelConfig.path}, attempting to download...`);
    }

    try {
      // Use mlx-lm or mlxknife if available, otherwise use our Python script
      const useMLXTools = await this.checkMLXTools();
      let result;

      if (useMLXTools === 'mlx-lm') {
        result = await this.executeMLXLM(modelConfig.hf_path, request.messages, {
          max_tokens: request.max_tokens || 4096,
          temperature: request.temperature || 0.7,
        });
      } else {
        result = await this.executePythonScript([
          JSON.stringify(request.messages),
          '--model',
          modelConfig.hf_path || modelName,
          '--model-path',
          modelConfig.path,
          '--chat-mode',
          '--max-tokens',
          String(request.max_tokens || 4096),
          '--temperature',
          String(request.temperature || 0.7),
          '--json-only',
        ]);
      }

      const data = JSON.parse(result);

      return MLXChatResponseSchema.parse({
        content: data.content || data.response,
        model: modelName,
        usage: {
          prompt_tokens:
            data.usage?.prompt_tokens || this.estimateTokenCount(JSON.stringify(request.messages)),
          completion_tokens:
            data.usage?.completion_tokens || this.estimateTokenCount(data.content || ''),
          total_tokens: data.usage?.total_tokens || 0,
        },
      });
    } catch (error) {
      console.error('MLX chat generation failed:', error);
      throw new Error(
        `MLX chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate embeddings using MLX
   */
  async generateEmbedding(request: MLXEmbeddingRequest): Promise<MLXEmbeddingResponse> {
    const modelName = (request.model as MLXModelName) || 'qwen3-embedding-4b-mlx';
    const modelConfig = MLX_MODELS[modelName];

    if (!modelConfig || modelConfig.type !== 'embedding') {
      throw new Error(`Unsupported MLX embedding model: ${modelName}`);
    }

    // Validate model path exists
    if (!(await this.validateModelPath(modelConfig.path))) {
      console.warn(`Model path not found: ${modelConfig.path}, attempting to download...`);
    }

    try {
      const result = await this.executePythonScript([
        request.text,
        '--model',
        modelConfig.hf_path || modelName,
        '--model-path',
        modelConfig.path,
        '--embedding-mode',
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
      const modelConfig = MLX_MODELS[modelName];
      const result = await this.executePythonScript([
        ...texts,
        '--model',
        modelConfig.hf_path || modelName,
        '--model-path',
        modelConfig.path,
        '--batch-embedding-mode',
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
   * Execute operation with timeout protection
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number = 30000,
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('MLX operation timeout')), timeoutMs),
      ),
    ]);
  }

  /**
   * Validate model path exists
   */
  private async validateModelPath(modelPath: string): Promise<boolean> {
    try {
      const fs = await import('fs');
      return fs.existsSync(modelPath);
    } catch {
      return false;
    }
  }

  /**
   * Execute the Python MLX script with retry logic
   */
  private async executePythonScript(args: string[], retries: number = 2): Promise<string> {
    return this.executeWithTimeout(async () => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          return await this.executePythonScriptInternal(args);
        } catch (error) {
          if (attempt === retries) throw error;
          console.warn(`MLX attempt ${attempt + 1} failed, retrying...`, error);
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
      throw new Error('All retry attempts failed');
    });
  }

  /**
   * Internal Python script execution
   */
  private async executePythonScriptInternal(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(this.pythonPath, [this.scriptPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONPATH: path.resolve(process.cwd(), 'apps/cortex-py/src'),
          HF_HOME: '/Volumes/ExternalSSD/huggingface_cache',
          TRANSFORMERS_CACHE: '/Volumes/ExternalSSD/huggingface_cache',
          MLX_CACHE_DIR: '/Volumes/ExternalSSD/ai-cache',
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
   * Check which MLX tools are available
   */
  private async checkMLXTools(): Promise<'mlx-lm' | 'mlxknife' | 'python' | null> {
    try {
      await this.executeCommand('mlx_lm.generate', ['--help']);
      return 'mlx-lm';
    } catch {
      try {
        await this.executeCommand('mlxknife', ['--help']);
        return 'mlxknife';
      } catch {
        try {
          await this.executePythonScript(['--help']);
          return 'python';
        } catch {
          return null;
        }
      }
    }
  }

  /**
   * Execute MLX-LM command for chat generation
   */
  private async executeMLXLM(
    modelPath: string,
    messages: Array<{ role: string; content: string }>,
    options: { max_tokens: number; temperature: number },
  ): Promise<string> {
    const prompt = this.formatMessagesForMLX(messages);

    return this.executeCommand('python', [
      '-m',
      'mlx_lm.generate',
      '--model',
      modelPath,
      '--prompt',
      prompt,
      '--max-tokens',
      String(options.max_tokens),
      '--temp',
      String(options.temperature),
      '--colorize',
    ]);
  }

  /**
   * Format messages for MLX consumption
   */
  private formatMessagesForMLX(messages: Array<{ role: string; content: string }>): string {
    return messages.map((msg) => `${msg.role}: ${msg.content}`).join('\n');
  }

  /**
   * Execute a system command
   */
  private async executeCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          HF_HOME: '/Volumes/ExternalSSD/huggingface_cache',
          TRANSFORMERS_CACHE: '/Volumes/ExternalSSD/huggingface_cache',
        },
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Check if MLX is available
   */
  async isAvailable(): Promise<boolean> {
    const tools = await this.checkMLXTools();
    return tools !== null;
  }

  /**
   * Generate reranking scores using MLX
   */
  async generateReranking(
    query: string,
    documents: string[],
    model?: string,
  ): Promise<Array<{ index: number; score: number }>> {
    const modelName = (model as MLXModelName) || 'qwen3-reranker-4b-mlx';
    const modelConfig = MLX_MODELS[modelName];

    if (!modelConfig || modelConfig.type !== 'reranking') {
      throw new Error(`Unsupported MLX reranking model: ${modelName}`);
    }

    try {
      const result = await this.executePythonScript([
        query,
        JSON.stringify(documents),
        '--model',
        modelConfig.hf_path || modelName,
        '--model-path',
        modelConfig.path,
        '--rerank-mode',
        '--json-only',
      ]);

      const data = JSON.parse(result);
      return data.scores || [];
    } catch (error) {
      console.error('MLX reranking failed:', error);
      throw new Error(
        `MLX reranking failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
