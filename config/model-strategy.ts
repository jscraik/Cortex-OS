/**
 * MLX-First Model Integration Strategy for Cortex-OS
 * Prioritizes MLX models with Ollama fallbacks for optimal Apple Silicon performance
 */
import path from 'node:path';

const MLX_CACHE_DIR = process.env.MLX_CACHE_DIR || '/models';
const modelPath = (...segments: string[]) => path.join(MLX_CACHE_DIR, ...segments);


export interface ModelConfig {
  primary: {
    provider: 'mlx';
    model: string;
    path: string;
    capabilities: string[];
  };
  fallback: {
    provider: 'ollama';
    model: string;
    endpoint: string;
    capabilities: string[];
  };
  performance: {
    latency: 'low' | 'medium' | 'high';
    memory: 'light' | 'moderate' | 'heavy';
    accuracy: 'basic' | 'good' | 'excellent';
  };
}

/**
 * MLX-First Model Assignments for Different Use Cases
 */
export const MODEL_STRATEGY: Record<string, ModelConfig> = {
  // Fast reasoning and orchestration decisions
  quickReasoning: {
    primary: {
      provider: 'mlx',
      model: 'qwen2.5-0.5b-instruct',
      path: modelPath('hub', 'models--mlx-community--Qwen2.5-0.5B-Instruct-4bit'),
      capabilities: ['reasoning', 'planning', 'fast_response'],
    },
    fallback: {
      provider: 'ollama',
      model: 'phi4-mini-reasoning:latest',
      endpoint: 'http://localhost:11434',
      capabilities: ['reasoning', 'planning', 'fallback'],
    },
    performance: { latency: 'low', memory: 'light', accuracy: 'good' },
  },

  // Complex code analysis and generation
  codeIntelligence: {
    primary: {
      provider: 'mlx',
      model: 'qwen3-coder-30b',
      path: modelPath('hub', 'models--mlx-community--Qwen3-Coder-30B-A3B-Instruct-4bit'),
      capabilities: ['code_generation', 'analysis', 'refactoring'],
    },
    fallback: {
      provider: 'ollama',
      model: 'qwen3-coder:30b',
      endpoint: 'http://localhost:11434',
      capabilities: ['code_generation', 'analysis', 'fallback'],
    },
    performance: { latency: 'high', memory: 'heavy', accuracy: 'excellent' },
  },

  // Multi-modal coordination (vision + text)
  multiModal: {
    primary: {
      provider: 'mlx',
      model: 'qwen2.5-vl-3b',
      path: modelPath('hub', 'models--mlx-community--Qwen2.5-VL-3B-Instruct-6bit'),
      capabilities: ['vision', 'text', 'ui_understanding'],
    },
    fallback: {
      provider: 'ollama',
      model: 'gemma3n:e4b',
      endpoint: 'http://localhost:11434',
      capabilities: ['text_only', 'reasoning', 'fallback'],
    },
    performance: { latency: 'medium', memory: 'moderate', accuracy: 'excellent' },
  },

  // Complex reasoning and task decomposition
  complexReasoning: {
    primary: {
      provider: 'mlx',
      model: 'mixtral-8x7b',
      path: modelPath('hub', 'models--mlx-community--Mixtral-8x7B-v0.1-hf-4bit-mlx'),
      capabilities: ['expert_reasoning', 'task_decomposition', 'parallel_thinking'],
    },
    fallback: {
      provider: 'ollama',
      model: 'deepseek-coder:6.7b',
      endpoint: 'http://localhost:11434',
      capabilities: ['reasoning', 'code_understanding', 'fallback'],
    },
    performance: { latency: 'medium', memory: 'heavy', accuracy: 'excellent' },
  },

  // Efficient general chat
  generalChat: {
    primary: {
      provider: 'mlx',
      model: 'phi3-mini',
      path: modelPath('hub', 'models--mlx-community--Phi-3-mini-4k-instruct-4bit'),
      capabilities: ['conversation', 'general_knowledge', 'efficient'],
    },
    fallback: {
      provider: 'ollama',
      model: 'phi4-mini-reasoning:3.8b',
      endpoint: 'http://localhost:11434',
      capabilities: ['conversation', 'reasoning', 'fallback'],
    },
    performance: { latency: 'low', memory: 'light', accuracy: 'good' },
  },

  // Embeddings for semantic understanding
  embeddings: {
    primary: {
      provider: 'mlx',
      model: 'qwen3-embedding-4b',
      path: modelPath('models--Qwen--Qwen3-Embedding-4B'),
      capabilities: ['semantic_search', 'similarity', 'classification'],
    },
    fallback: {
      provider: 'ollama',
      model: 'phi4-mini-reasoning:latest', // Ollama doesn't have dedicated embedding endpoints
      endpoint: 'http://localhost:11434',
      capabilities: ['text_understanding', 'fallback'],
    },
    performance: { latency: 'low', memory: 'light', accuracy: 'excellent' },
  },

  // Content reranking and prioritization
  reranking: {
    primary: {
      provider: 'mlx',
      model: 'qwen3-reranker-4b',
      path: modelPath('models--Qwen--Qwen3-Reranker-4B'),
      capabilities: ['ranking', 'relevance', 'prioritization'],
    },
    fallback: {
      provider: 'ollama',
      model: 'phi4-mini-reasoning:latest',
      endpoint: 'http://localhost:11434',
      capabilities: ['comparison', 'reasoning', 'fallback'],
    },
    performance: { latency: 'low', memory: 'moderate', accuracy: 'excellent' },
  },
};

/**
 * Usage Priority Guidelines
 */
export const USAGE_PRIORITIES = {
  // Real-time agent communication (A2A)
  realtime: ['quickReasoning', 'generalChat', 'embeddings'],

  // Complex orchestration decisions
  orchestration: ['complexReasoning', 'multiModal', 'codeIntelligence'],

  // Agent specializations
  agents: {
    coder: ['codeIntelligence', 'complexReasoning'],
    coordinator: ['multiModal', 'complexReasoning'],
    communicator: ['generalChat', 'embeddings'],
    analyzer: ['embeddings', 'reranking'],
  },
};

/**
 * Performance Optimization Rules
 */
export const OPTIMIZATION_RULES = {
  // Use MLX for < 100ms response requirements
  lowLatency: ['quickReasoning', 'generalChat', 'embeddings'],

  // Use MLX for memory-efficient operations
  memoryEfficient: ['quickReasoning', 'generalChat', 'embeddings'],

  // Use MLX for high-accuracy tasks where local processing is preferred
  highAccuracy: ['codeIntelligence', 'complexReasoning', 'multiModal', 'reranking'],

  // Fallback to Ollama for heavy compute or when MLX models fail
  fallbackScenarios: [
    'mlx_model_unavailable',
    'mlx_service_overloaded',
    'context_length_exceeded',
    'memory_pressure',
  ],
};
