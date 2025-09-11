import { CompositeEmbedder } from '../adapters/embedder.composite.js';
import { MLXEmbedder } from '../adapters/embedder.mlx.js';
import { NoopEmbedder } from '../adapters/embedder.noop.js';
import { OllamaEmbedder } from '../adapters/embedder.ollama.js';
import type { Embedder } from '../ports/Embedder.js';

export type EmbedderKind = 'noop' | 'mlx' | 'ollama' | 'composite';

export function resolveEmbedderKindFromEnv(): EmbedderKind {
  const raw = (process.env.MEMORIES_EMBEDDER || '').toLowerCase();
  if (raw === 'mlx') return 'mlx';
  if (raw === 'ollama') return 'ollama';
  if (raw === 'composite') return 'composite';
  return 'noop';
}

export function createEmbedderFromEnv(): Embedder {
  const kind = resolveEmbedderKindFromEnv();
  try {
    if (kind === 'composite') {
      // Order: preferred -> fallbacks
      const providers: Embedder[] = [];
      const raw = String(process.env.MLX_MODEL || 'qwen3-4b').toLowerCase();
      const allowed = ['qwen3-0.6b', 'qwen3-4b', 'qwen3-8b'] as const;
      const isAllowed = (v: string): v is (typeof allowed)[number] =>
        (allowed as readonly string[]).includes(v);
      const model = isAllowed(raw) ? raw : undefined;
      // Push available providers; construction may still throw and will be handled by outer catch
      try {
        providers.push(new MLXEmbedder(model));
      } catch {
        /* optional MLX provider not available */
      }
      try {
        providers.push(new OllamaEmbedder(process.env.OLLAMA_MODEL));
      } catch {
        /* optional Ollama provider not available */
      }
      if (providers.length === 0) {
        providers.push(new NoopEmbedder());
      }
      return new CompositeEmbedder(...providers);
    }
    if (kind === 'mlx') {
      const model = (process.env.MLX_MODEL || '').toLowerCase() as
        | 'qwen3-0.6b'
        | 'qwen3-4b'
        | 'qwen3-8b'
        | undefined;
      return new MLXEmbedder(model);
    }
    if (kind === 'ollama') {
      const model = process.env.OLLAMA_MODEL;
      return new OllamaEmbedder(model);
    }
  } catch (err) {
    // fall back to noop on any import/construct failure
    console.warn('Falling back to NoopEmbedder:', err);
  }
  return new NoopEmbedder();
}
