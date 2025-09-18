import { execa } from 'execa';
import { existsSync } from 'node:fs';
import { z } from 'zod';
import type { ModelConfig } from './model-selector.js';

// MLX Model configuration schema
export const MLXModelConfigSchema = z.object({
  modelPath: z.string().optional(),
  knifePath: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().positive().default(4096),
  topP: z.number().min(0).max(1).default(0.9),
  timeout: z.number().positive().default(30000)
});

export type MLXModelConfig = z.infer<typeof MLXModelConfigSchema>;

/**
 * MLX Model Adapter - Provides zero-cost local inference on Apple Silicon
 */
export class MLXModelAdapter {
  private config: MLXModelConfig;
  private isAvailable: boolean = false;
  private pythonAvailable: boolean = false;
  private mlxInstalled: boolean = false;

  constructor(config: MLXModelConfig = {}) {
    this.config = MLXModelConfigSchema.parse(config);
    this.checkAvailability();
  }

  /**
   * Check if MLX runtime is available
   */
  private async checkAvailability(): Promise<void> {
    // Check if Python is available
    try {
      const { stdout } = await execa('python3', ['--version']);
      this.pythonAvailable = stdout.includes('Python 3');
    } catch {
      this.pythonAvailable = false;
      return;
    }

    // Check if MLX is installed
    try {
      const { stdout } = await execa('python3', ['-c', 'import mlx.core; print("OK")']);
      this.mlxInstalled = stdout.trim() === 'OK';
    } catch {
      this.mlxInstalled = false;
      return;
    }

    // Check if mlx-knife is available
    const knifeAvailable = await this.isKnifeAvailable();

    this.isAvailable = this.pythonAvailable && this.mlxInstalled && knifeAvailable;
  }

  /**
   * Check if mlx-knife CLI is available
   */
  private async isKnifeAvailable(): Promise<boolean> {
    // If explicit path provided and exists on FS we assume available.
    if (this.config.knifePath && existsSync(this.config.knifePath)) return true;

    // Try to find in PATH
    try {
      await execa('which', ['mlx-knife']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Execute inference using MLX model
   */
  async inference(
    prompt: string,
    modelConfig: ModelConfig,
    options?: {
      temperature?: number;
      maxTokens?: number;
      stop?: string[];
    }
  ): Promise<string> {
    if (!this.isAvailable) {
      throw new Error('MLX runtime is not available');
    }

    const temperature = options?.temperature ?? this.config.temperature;
    const maxTokens = options?.maxTokens ?? this.config.maxTokens;

    try {
      // Prepare command arguments
      const args = [
        'inference',
        '--model', modelConfig.id.replace('mlx/', ''),
        '--prompt', prompt,
        '--temperature', temperature.toString(),
        '--max-tokens', maxTokens.toString(),
        '--top-p', this.config.topP.toString()
      ];

      // Add stop tokens if provided
      if (options?.stop) {
        args.push('--stop', ...options.stop);
      }

      // Execute MLX inference
      const { stdout, stderr } = await execa('mlx-knife', args, {
        timeout: this.config.timeout,
        env: {
          ...process.env,
          MLX_MODEL_PATH: this.config.modelPath
        }
      });

      if (stderr) {
        console.warn('MLX inference warning:', stderr);
      }

      return stdout.trim();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`MLX inference failed: ${error.message}`);
      }
      throw new Error('MLX inference failed with unknown error');
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(modelId: string): Promise<{
    name: string;
    contextLength: number;
    capabilities: string[];
  }> {
    // This would typically query the model for its capabilities
    // For now, return static information based on known models
    const modelInfo: Record<string, any> = {
      'GLM-4.5-4Bit': {
        name: 'GLM-4.5 (4-bit quantized)',
        contextLength: 128000,
        capabilities: ['code-analysis', 'test-generation', 'documentation']
      },
      'Qwen3-Coder-30B-4Bit': {
        name: 'Qwen3-Coder (30B, 4-bit quantized)',
        contextLength: 32768,
        capabilities: ['code-analysis', 'test-generation', 'documentation']
      }
    };

    const modelKey = modelId.replace('mlx/', '');
    return modelInfo[modelKey] || {
      name: modelId,
      contextLength: 4096,
      capabilities: []
    };
  }

  /**
   * Check if adapter is ready
   */
  isReady(): boolean {
    return this.isAvailable;
  }

  /**
   * Get availability status
   */
  getStatus(): {
    available: boolean;
    python: boolean;
    mlx: boolean;
    knife: boolean;
  } {
    return {
      available: this.isAvailable,
      python: this.pythonAvailable,
      mlx: this.mlxInstalled,
      knife: this.isKnifeAvailable()
    };
  }

  /**
   * Stream inference response
   */
  async *streamInference(
    prompt: string,
    modelConfig: ModelConfig,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): AsyncGenerator<string, void, unknown> {
    if (!this.isAvailable) {
      throw new Error('MLX runtime is not available');
    }

    // For now, fall back to non-streaming version
    // MLX streaming support would require additional CLI capabilities
    const response = await this.inference(prompt, modelConfig, options);
    yield response;
  }
}