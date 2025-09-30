import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * brAInwav Local Memory - Model Detection and Selection
 * Handles MLX/Ollama model discovery and configuration
 */

export interface ModelConfig {
  name: string;
  path: string;
  transformers_model: string;
  memory_gb: number;
  recommended_for: string[];
  dimensions?: number;
  max_tokens?: number;
}

export interface ModelInventory {
  embedding_models: Record<string, ModelConfig>;
  reranker_models: Record<string, ModelConfig>;
  chat_models: Record<string, ModelConfig>;
  default_models: Record<string, string>;
}

/**
 * Load and validate MLX model configuration
 */
export async function loadMLXModels(): Promise<ModelInventory> {
  try {
    const configPath = join(process.cwd(), 'config', 'mlx-models.json');
    
    if (!existsSync(configPath)) {
      throw new Error(`brAInwav model config not found: ${configPath}`);
    }

    const content = await readFile(configPath, 'utf-8');
    const config: ModelInventory = JSON.parse(content);
    
    console.log('brAInwav MLX model configuration loaded successfully');
    return config;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`brAInwav MLX model loading failed: ${message}`);
  }
}

/**
 * Check if a model is installed and available
 */
export async function isModelAvailable(model: ModelConfig): Promise<boolean> {
  try {
    // Expand environment variables in path
    const expandedPath = model.path.replace(/\$\{([^}]+)\}/g, (_, envVar) => {
      return process.env[envVar] || '';
    });

    const isAvailable = existsSync(expandedPath);
    
    if (isAvailable) {
      console.log(`brAInwav model available: ${model.name} at ${expandedPath}`);
    } else {
      console.warn(`brAInwav model not found: ${model.name} at ${expandedPath}`);
    }
    
    return isAvailable;
  } catch (error) {
    console.error(`brAInwav model availability check failed for ${model.name}:`, error);
    return false;
  }
}

/**
 * Select the best available embedding model
 */
export async function selectEmbeddingModel(): Promise<ModelConfig> {
  const config = await loadMLXModels();
  const defaultKey = config.default_models.embedding || 'qwen3-4b';
  
  // Try default first
  const defaultModel = config.embedding_models[defaultKey];
  if (defaultModel && await isModelAvailable(defaultModel)) {
    console.log(`brAInwav selected default embedding model: ${defaultModel.name}`);
    return defaultModel;
  }

  // Fallback to first available model
  for (const model of Object.values(config.embedding_models)) {
    if (await isModelAvailable(model)) {
      console.log(`brAInwav fallback embedding model selected: ${model.name}`);
      return model;
    }
  }

  throw new Error('brAInwav no embedding models available');
}

/**
 * Select the best available reranker model
 */
export async function selectRerankerModel(): Promise<ModelConfig | null> {
  try {
    const config = await loadMLXModels();
    const defaultKey = config.default_models.reranker || 'qwen3-reranker';
    
    const defaultModel = config.reranker_models[defaultKey];
    if (defaultModel && await isModelAvailable(defaultModel)) {
      console.log(`brAInwav selected reranker model: ${defaultModel.name}`);
      return defaultModel;
    }

    // Try other available reranker models
    for (const model of Object.values(config.reranker_models)) {
      if (await isModelAvailable(model)) {
        console.log(`brAInwav fallback reranker model selected: ${model.name}`);
        return model;
      }
    }

    console.warn('brAInwav no reranker models available, will skip reranking');
    return null;
  } catch (error) {
    console.error('brAInwav reranker model selection failed:', error);
    return null;
  }
}

/**
 * Get model memory requirements
 */
export function getModelMemoryRequirements(models: ModelConfig[]): number {
  return models.reduce((total, model) => total + model.memory_gb, 0);
}

/**
 * Check system memory availability
 */
export function checkMemoryAvailability(requiredGB: number): boolean {
  const totalMemory = process.memoryUsage();
  const availableGB = (totalMemory.heapTotal + totalMemory.external) / (1024 ** 3);
  
  const hasMemory = availableGB >= requiredGB;
  
  if (hasMemory) {
    console.log(`brAInwav memory check passed: ${availableGB.toFixed(1)}GB available, ${requiredGB}GB required`);
  } else {
    console.warn(`brAInwav memory check failed: ${availableGB.toFixed(1)}GB available, ${requiredGB}GB required`);
  }
  
  return hasMemory;
}
