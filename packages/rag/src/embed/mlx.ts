/**
 * MLX Embedding Adapter for Cortex-OS
 * Interfaces with local MLX models via Python service or direct Python execution
 */

import { spawn } from 'child_process';
import { PyEmbedder } from './python-client.js';

const DEFAULT_MLX_MODEL = 'bge-base-en-v1.5';
const MLX_SERVICE_URL = process.env.MLX_SERVICE_URL || 'http://localhost:8001';
const MLX_MODELS_DIR =
  process.env.MLX_MODELS_DIR || '/Volumes/ExternalSSD/.cache/huggingface/models';

export interface MLXEmbedOptions {
  model?: string;
  useService?: boolean; // true = HTTP service, false = direct Python call
  timeout?: number;
}

export class MLXEmbedder {
  private pyClient?: PyEmbedder;

  constructor(private options: MLXEmbedOptions = {}) {
    if (options.useService !== false) {
      this.pyClient = new PyEmbedder(MLX_SERVICE_URL);
    }
  }

  async embedText(input: string, options: MLXEmbedOptions = {}): Promise<number[]> {
    const embeddings = await this.embedTexts([input], options);
    return embeddings[0] || [];
  }

  async embedTexts(inputs: string[], options: MLXEmbedOptions = {}): Promise<number[][]> {
    const modelName = options.model || this.options.model || DEFAULT_MLX_MODEL;

    // Try HTTP service first if available
    if (this.pyClient && options.useService !== false) {
      try {
        return await this.embedViaService(inputs, modelName);
      } catch (error) {
        console.warn('MLX service unavailable, falling back to direct Python call:', error);
      }
    }

    // Fallback to direct Python execution
    return await this.embedViaPython(inputs, modelName);
  }

  private async embedViaService(inputs: string[], modelName: string): Promise<number[][]> {
    if (!this.pyClient) {
      throw new Error('Python client not initialized');
    }

    const response = await fetch(`${MLX_SERVICE_URL}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texts: inputs,
        model: modelName,
      }),
      signal: AbortSignal.timeout(this.options.timeout || 30000),
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

  private async embedViaPython(inputs: string[], modelName: string): Promise<number[][]> {
    return new Promise((resolve, reject) => {
      const pythonScript = `
import sys
import json
sys.path.append('${process.cwd()}/packages/rag/src/embed')
from mlx import embed

try:
    texts = ${JSON.stringify(inputs)}
    model_name = "${modelName}"
    embeddings = embed(texts, model_name)
    print(json.dumps({"embeddings": embeddings}))
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;

      const python = spawn('python3', ['-c', pythonScript], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          MLX_MODELS_DIR,
          PYTHONPATH: `${process.cwd()}/packages/rag/src/embed:${process.env.PYTHONPATH || ''}`,
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
        reject(new Error(`MLX embedding timeout after ${this.options.timeout || 30000}ms`));
      }, this.options.timeout || 30000);

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

// Convenience functions for backward compatibility
export async function embedText(input: string, model?: string): Promise<number[]> {
  const embedder = new MLXEmbedder({ model });
  return embedder.embedText(input);
}

export async function embedTexts(inputs: string[], model?: string): Promise<number[][]> {
  const embedder = new MLXEmbedder({ model });
  return embedder.embedTexts(inputs);
}

// Default embedder instance
export const mlxEmbedder = new MLXEmbedder();
