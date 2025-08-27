import type { Embedder } from "../ports/Embedder.js";
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Available MLX embedding models - paths configurable via environment variables
const MLX_MODELS = {
  'qwen3-0.6b': {
    name: 'Qwen3-Embedding-0.6B',
    dimensions: 768,
    path: process.env.MLX_MODEL_QWEN3_0_6B_PATH || '/Volumes/ExternalSSD/huggingface_cache/models--Qwen--Qwen3-Embedding-0.6B',
    recommendedFor: ['quick_search', 'development']
  },
  'qwen3-4b': {
    name: 'Qwen3-Embedding-4B',
    dimensions: 768,
    path: process.env.MLX_MODEL_QWEN3_4B_PATH || '/Volumes/ExternalSSD/huggingface_cache/models--Qwen--Qwen3-Embedding-4B',
    recommendedFor: ['production', 'balanced_performance']
  },
  'qwen3-8b': {
    name: 'Qwen3-Embedding-8B',
    dimensions: 768,
    path: process.env.MLX_MODEL_QWEN3_8B_PATH || '/Volumes/ExternalSSD/huggingface_cache/models--Qwen--Qwen3-Embedding-8B',
    recommendedFor: ['high_accuracy', 'research']
  }
} as const;

type MLXModelName = keyof typeof MLX_MODELS;

const DEFAULT_MLX_MODEL: MLXModelName = 'qwen3-4b';

export class MLXEmbedder implements Embedder {
  private readonly modelName: MLXModelName;
  private readonly modelConfig: typeof MLX_MODELS[keyof typeof MLX_MODELS];
  
  constructor(modelName?: MLXModelName) {
    this.modelName = modelName || DEFAULT_MLX_MODEL;
    this.modelConfig = MLX_MODELS[this.modelName];
    
    if (!this.modelConfig) {
      throw new Error(`Unsupported MLX model: ${this.modelName}`);
    }
  }

  name(): string {
    return this.modelName;
  }

  async embed(texts: string[]): Promise<number[][]> {
    try {
      // Try to use existing MLX service if available
      if (process.env.MLX_SERVICE_URL) {
        return await this.embedViaService(texts);
      }
      
      // Fallback to direct Python execution
      return await this.embedViaPython(texts);
    } catch (error) {
      console.warn('MLX embedding failed:', error);
      throw error;
    }
  }

  private async embedViaService(texts: string[]): Promise<number[][]> {
    const response = await fetch(`${process.env.MLX_SERVICE_URL}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texts,
        model: this.modelName,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`MLX service error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Validate response structure
    if (!Array.isArray(data.embeddings)) {
      throw new Error('Invalid response format from MLX service');
    }

    return data.embeddings as number[][];
  }

  private async embedViaPython(texts: string[]): Promise<number[][]> {
    return new Promise((resolve, reject) => {
      // Use a dedicated Python script instead of generating code
      const pythonScriptPath = path.join(__dirname, 'mlx-embedder.py');
      
      const python = spawn('python3', [pythonScriptPath, this.modelConfig.path, JSON.stringify(texts)], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          MLX_MODELS_DIR: process.env.MLX_MODELS_DIR || '/Volumes/ExternalSSD/huggingface_cache',
        },
      });

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        python.kill();
        reject(new Error(`MLX embedding timeout after 30000ms`));
      }, 30000);

      python.on('close', (code) => {
        clearTimeout(timeout);

        if (code !== 0) {
          reject(new Error(`Python MLX embedder failed: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout.trim());
          if (result.error) {
            reject(new Error(`MLX embedding error: ${result.error}`));
            return;
          }

          if (!Array.isArray(result.embeddings)) {
            reject(new Error('Invalid embeddings format from MLX'));
            return;
          }

          resolve(result.embeddings);
        } catch (parseError) {
          reject(new Error(`Failed to parse MLX response: ${parseError}`));
        }
      });

      python.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });
    });
  }
}