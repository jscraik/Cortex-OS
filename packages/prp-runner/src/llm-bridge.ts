/**
 * @file llm-bridge.ts
 * Functional LLM bridge utilities connecting orchestrator to MLX/Ollama services.
 */

import { z } from 'zod';
import { Ollama } from 'ollama';
import { MLXAdapter, createMLXAdapter, AVAILABLE_MLX_MODELS } from './mlx-adapter.js';

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
  prompt?: string;
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

function normalizeConfig(config: LLMConfig): LLMConfig {
  const normalized = { ...config };
  if (normalized.provider === 'ollama') {
    if (!normalized.endpoint) throw new Error('Ollama endpoint is required');
    delete normalized.mlxModel;
    delete normalized.knifePath;
  } else {
    if (!normalized.mlxModel) throw new Error('MLX model is required for MLX provider');
    delete (normalized as any).endpoint;
    delete (normalized as any).model;
  }
  return normalized;
}

function createOllamaAdapter(cfg: LLMConfig): OllamaAdapter {
  const client = new Ollama({ host: cfg.endpoint });
  return {
    async generate({ prompt, temperature, maxTokens, model }) {
      const res = await client.generate({
        model: model || cfg.model || 'llama3',
        prompt,
        stream: false,
        options: { temperature: temperature ?? 0.7, num_predict: maxTokens ?? 512 },
      });
      return { text: res.response || '' };
    },
  };
}

export function configureLLM(config: LLMConfig): LLMState {
  const normalized = normalizeConfig(config);
  const cfg = llmConfigSchema.parse(normalized);
  const state: LLMState = { config: cfg };
  if (cfg.provider === 'ollama') {
    state.ollamaAdapter = createOllamaAdapter(cfg);
  } else {
    state.mlxAdapter = createMLXAdapter(cfg.mlxModel!, {
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
  return state.config.provider === 'ollama'
    ? 'llama3'
    : state.config.mlxModel || AVAILABLE_MLX_MODELS.QWEN_SMALL;
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
  }
  if (state.config.provider === 'ollama' && state.ollamaAdapter) {
    try {
      await state.ollamaAdapter.generate({ prompt: '', maxTokens: 1 });
      return { healthy: true, message: 'Ollama healthy' };
    } catch (error) {
      return {
        healthy: false,
        message: `Ollama error: ${error instanceof Error ? error.message : String(error)}`,
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
  if (state.config.provider === 'ollama') {
    if (!state.ollamaAdapter) throw new Error('Ollama adapter not initialized');
    const result = await state.ollamaAdapter.generate({
      prompt,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      model: state.config.model,
    });
    return result.text;
  }
  if (state.config.provider === 'mlx') {
    return generateWithMLX(state, prompt, options);
  }
  throw new Error(`Generation not implemented for provider: ${state.config.provider}`);
}

async function generateWithMLX(
  state: LLMState,
  prompt: string,
  options: LLMGenerateOptions,
): Promise<string> {
  if (!state.mlxAdapter) throw new Error('MLX adapter not initialized');
  const health = await state.mlxAdapter.checkHealth();
  if (!health.healthy) {
    throw new Error(`MLX model not healthy: ${health.message}`);
  }
  return state.mlxAdapter.generate({
    prompt,
    maxTokens: options.maxTokens ?? 512,
    temperature: options.temperature ?? 0.7,
  });
}

export async function shutdown(state: LLMState): Promise<void> {
  if (state.mlxAdapter && typeof (state.mlxAdapter as any).shutdown === 'function') {
    await (state.mlxAdapter as any).shutdown();
  }
}

export class LLMBridge {
  private state: LLMState;
  constructor(config: LLMConfig) {
    this.state = configureLLM(config);
  }
  getProvider() {
    return getProvider(this.state);
  }
  getModel() {
    return getModel(this.state);
  }
  async generate(prompt: string, options?: LLMGenerateOptions) {
    return generate(this.state, prompt, options);
  }
  async listModels() {
    return listMLXModels(this.state);
  }
  async checkHealth() {
    return checkProviderHealth(this.state);
  }
  async shutdown() {
    await shutdown(this.state);
  }
}

