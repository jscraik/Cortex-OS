/**
 * @file llm-bridge.ts
 * @description Functional LLM bridge utilities connecting orchestrator to MLX/Ollama services
 */

import { z } from 'zod';
import { MLXAdapter, createMLXAdapter, AVAILABLE_MLX_MODELS } from './mlx-adapter.js';

// Minimal type-only Ollama adapter interface
interface OllamaAdapter {
  generate(options: {
    prompt: string;
    temperature?: number;
    maxTokens?: number;
    model?: string;
  }): Promise<{ text: string }>;
}

export interface LLMConfig {
  provider: 'mlx' | 'ollama';
  endpoint?: string;
  model?: string;
  mlxModel?: keyof typeof AVAILABLE_MLX_MODELS | string;
  knifePath?: string;
}

export interface LLMGenerateOptions {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMState {
  config: LLMConfig;
  ollamaAdapter?: OllamaAdapter;
  mlxAdapter?: MLXAdapter;
}

const llmConfigSchema = z.object({
  provider: z.enum(['mlx', 'ollama']),
  endpoint: z.string().url().optional(),
  model: z.string().optional(),
  mlxModel: z.string().optional(),
  knifePath: z.string().optional(),
});

/**
 * Configure an LLM provider and return state used by other bridge functions.
 */
export function configureLLM(config: LLMConfig): LLMState {
  if (!['mlx', 'ollama'].includes(config.provider)) {
    throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }

  const normalized = { ...config } as LLMConfig;
  if (normalized.endpoint === '') {
    delete (normalized as any).endpoint;
  }

  const parsed = llmConfigSchema.safeParse(normalized);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join(', '));
  }
  const cfg = parsed.data;

  if (cfg.provider === 'ollama' && !cfg.endpoint) {
    throw new Error('Ollama endpoint is required');
  }
  if (cfg.provider === 'mlx' && !cfg.mlxModel) {
    throw new Error('MLX model is required for MLX provider');
  }

  const state: LLMState = { config: cfg };

  if (cfg.provider === 'ollama') {
    state.ollamaAdapter = {
      generate: async (options) => {
        try {
          const response = await fetch(`${cfg.endpoint}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: options.model || cfg.model || 'llama3',
              prompt: options.prompt,
              stream: false,
              options: {
                temperature: options.temperature ?? 0.7,
                num_predict: options.maxTokens ?? 512,
              },
            }),
          });

          if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status}`);
          }

          const data = await response.json();
          return { text: data.response || '' };
        } catch (error) {
          throw new Error(
            `Ollama request failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    };
  } else if (cfg.provider === 'mlx') {
    const modelName = cfg.mlxModel || AVAILABLE_MLX_MODELS.QWEN_SMALL;
    state.mlxAdapter = createMLXAdapter(modelName, {
      knifePath: cfg.knifePath,
      maxTokens: 512,
      temperature: 0.7,
    });
  }

  return state;
}

export function getProvider(state: LLMState): string {
  return state.config.provider;
}

export function getModel(state: LLMState): string {
  return state.config.model || getDefaultModel(state);
}

function getDefaultModel(state: LLMState): string {
  switch (state.config.provider) {
    case 'ollama':
      return 'llama3';
    case 'mlx':
      return state.config.mlxModel || AVAILABLE_MLX_MODELS.QWEN_SMALL;
    default:
      return 'unknown';
  }
}

export function getMLXAdapter(state: LLMState): MLXAdapter | undefined {
  return state.mlxAdapter;
}

export async function listMLXModels(state: LLMState) {
  if (state.config.provider !== 'mlx' || !state.mlxAdapter) {
    throw new Error('MLX adapter not available');
  }
  return state.mlxAdapter.listModels();
}

export async function checkProviderHealth(
  state: LLMState,
): Promise<{ healthy: boolean; message: string }> {
  if (state.config.provider === 'mlx' && state.mlxAdapter) {
    return state.mlxAdapter.checkHealth();
  } else if (state.config.provider === 'ollama') {
    try {
      const response = await fetch(`${state.config.endpoint}/api/tags`);
      return {
        healthy: response.ok,
        message: response.ok ? 'Ollama healthy' : `Ollama error: ${response.status}`,
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Ollama unreachable: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
  return { healthy: false, message: 'Unknown provider' };
}

export async function generate(
  state: LLMState,
  prompt: string,
  options: LLMGenerateOptions = {},
): Promise<string> {
  switch (state.config.provider) {
    case 'ollama':
      return generateWithOllama(state, prompt, options);
    case 'mlx':
      return generateWithMLX(state, prompt, options);
    default:
      throw new Error(`Generation not implemented for provider: ${state.config.provider}`);
  }
}

async function generateWithOllama(
  state: LLMState,
  prompt: string,
  options: LLMGenerateOptions,
): Promise<string> {
  if (!state.ollamaAdapter) {
    throw new Error('Ollama adapter not initialized');
  }

  const result = await state.ollamaAdapter.generate({
    prompt,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    model: state.config.model,
  });

  return result.text;
}

async function generateWithMLX(
  state: LLMState,
  prompt: string,
  options: LLMGenerateOptions,
): Promise<string> {
  if (!state.mlxAdapter) {
    throw new Error('MLX adapter not initialized');
  }

  try {
    const health = await state.mlxAdapter.checkHealth();
    if (!health.healthy) {
      throw new Error(`MLX model not healthy: ${health.message}`);
    }

    const result = await state.mlxAdapter.generate({
      prompt,
      maxTokens: options.maxTokens ?? 512,
      temperature: options.temperature ?? 0.7,
    });

    return result;
  } catch (error) {
    throw new Error(
      `MLX generation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function shutdown(state: LLMState): Promise<void> {
  if (state.mlxAdapter && typeof (state.mlxAdapter as any).shutdown === 'function') {
    await (state.mlxAdapter as any).shutdown();
  }
}
