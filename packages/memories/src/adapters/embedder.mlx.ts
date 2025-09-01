import os from 'os';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Embedder } from '../ports/Embedder.js';
import type { PythonRunner } from '../ports/PythonRunner.js';
import type { Metrics } from '../ports/Metrics.js';
import { NodePythonRunner } from './python-runner.js';
import { ConsoleMetrics } from './console-metrics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_MLX_MODELS_DIR = path.join(os.homedir(), '.cache', 'huggingface');

// Available MLX embedding models - paths configurable via environment variables
const MLX_MODELS = {
  'qwen3-0.6b': {
    name: 'Qwen3-Embedding-0.6B',
    dimensions: 768,
    path:
      process.env.MLX_MODEL_QWEN3_0_6B_PATH ||
      path.join(DEFAULT_MLX_MODELS_DIR, 'models--Qwen--Qwen3-Embedding-0.6B'),
    recommendedFor: ['quick_search', 'development'],
  },
  'qwen3-4b': {
    name: 'Qwen3-Embedding-4B',
    dimensions: 768,
    path:
      process.env.MLX_MODEL_QWEN3_4B_PATH ||
      path.join(DEFAULT_MLX_MODELS_DIR, 'models--Qwen--Qwen3-Embedding-4B'),
    recommendedFor: ['production', 'balanced_performance'],
  },
  'qwen3-8b': {
    name: 'Qwen3-Embedding-8B',
    dimensions: 768,
    path:
      process.env.MLX_MODEL_QWEN3_8B_PATH ||
      path.join(DEFAULT_MLX_MODELS_DIR, 'models--Qwen--Qwen3-Embedding-8B'),
    recommendedFor: ['high_accuracy', 'research'],
  },
} as const;

type MLXModelName = keyof typeof MLX_MODELS;

const DEFAULT_MLX_MODEL: MLXModelName = 'qwen3-4b';

export class MLXEmbedder implements Embedder {
  private readonly modelName: MLXModelName;
  private readonly modelConfig: (typeof MLX_MODELS)[keyof typeof MLX_MODELS];
  private readonly python: PythonRunner;
  private readonly metrics: Metrics;

  constructor(
    modelName?: MLXModelName,
    pythonRunner: PythonRunner = new NodePythonRunner(),
    metrics: Metrics = new ConsoleMetrics(),
  ) {
    this.modelName = modelName || DEFAULT_MLX_MODEL;
    this.modelConfig = MLX_MODELS[this.modelName];
    this.python = pythonRunner;
    this.metrics = metrics;

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
    const start = Date.now();
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

    const latency = Date.now() - start;
    await this.metrics.record('mlx.service', { model: this.modelName, latency });
    return data.embeddings as number[][];
  }

  private async embedViaPython(texts: string[]): Promise<number[][]> {
    // Use centralized Python runner to handle PYTHONPATH and env merging
    const pythonScriptPath = path.join(__dirname, 'mlx-embedder.py');
    const run = () =>
      this.python.run(
        pythonScriptPath,
        [this.modelConfig.path, JSON.stringify(texts)],
        {
          envOverrides: { MLX_MODELS_DIR: process.env.MLX_MODELS_DIR || DEFAULT_MLX_MODELS_DIR },
          python: process.env.PYTHON_EXEC || 'python3',
        },
      );

    const timer = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('MLX embedding timeout after 30000ms')), 30000),
    );

    const start = Date.now();
    const out = await Promise.race([run(), timer]);
    try {
      const result = JSON.parse(String(out || '{}'));
      if (result.error) throw new Error(String(result.error));
      if (!Array.isArray(result.embeddings)) throw new Error('Invalid embeddings format from MLX');
      const latency = Date.now() - start;
      await this.metrics.record('mlx.python', { model: this.modelName, latency });
      return result.embeddings as number[][];
    } catch (err) {
      throw new Error(`Failed to parse MLX response: ${err}`);
    }
  }
}
