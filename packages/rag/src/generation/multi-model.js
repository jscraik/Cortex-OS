import { readFileSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
/**
 * Single-model generator
 */
export class MultiModelGenerator {
  model;
  defaultConfig;
  timeout;
  constructor(options) {
    this.model = options.model;
    this.defaultConfig = {
      maxTokens: 2048,
      temperature: 0.7,
      topP: 0.9,
      ...options.defaultConfig,
    };
    this.timeout = options.timeout || 30000;
  }
  /**
   * Generate text completion
   */
  async generate(prompt, config) {
    const finalConfig = { ...this.defaultConfig, ...config };
    const result = await this.generateWithModel(this.model, prompt, finalConfig);
    return {
      content: result,
      provider: this.model.backend,
      usage: {
        promptTokens: Math.floor(prompt.length / 4), // Rough estimate
        completionTokens: Math.floor(result.length / 4),
        totalTokens: Math.floor((prompt.length + result.length) / 4),
      },
    };
  }
  /**
   * Generate chat response
   */
  async chat(messages, config) {
    const finalConfig = { ...this.defaultConfig, ...config };
    const result = await this.chatWithModel(this.model, messages, finalConfig);
    return {
      content: result,
      provider: this.model.backend,
      usage: {
        promptTokens: Math.floor(messages.reduce((sum, m) => sum + m.content.length, 0) / 4),
        completionTokens: Math.floor(result.length / 4),
        totalTokens: Math.floor(
          (messages.reduce((sum, m) => sum + m.content.length, 0) + result.length) / 4,
        ),
      },
    };
  }
  /**
   * Generate with a specific model
   */
  async generateWithModel(model, prompt, config) {
    if (model.backend === 'ollama') {
      return this.generateWithOllama(model, prompt, config);
    } else if (model.backend === 'mlx') {
      return this.generateWithMLX(model, prompt, config);
    } else {
      throw new Error(`Unsupported backend: ${model.backend}`);
    }
  }
  /**
   * Chat with a specific model
   */
  async chatWithModel(model, messages, config) {
    if (model.backend === 'ollama') {
      return this.chatWithOllama(model, messages, config);
    } else if (model.backend === 'mlx') {
      return this.chatWithMLX(model, messages, config);
    } else {
      throw new Error(`Unsupported backend: ${model.backend}`);
    }
  }
  /**
   * Generate with Ollama backend
   */
  async generateWithOllama(model, prompt, config) {
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model.model,
          prompt,
          stream: false,
          options: {
            temperature: config.temperature,
            top_p: config.topP,
            num_predict: config.maxTokens,
          },
        }),
        signal: AbortSignal.timeout(this.timeout),
      });
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }
      const result = await response.json();
      return result.response || '';
    } catch (error) {
      throw new Error(`Ollama generation failed: ${error}`);
    }
  }
  /**
   * Chat with Ollama backend using API
   */
  async chatWithOllama(model, messages, config) {
    try {
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model.model,
          messages,
          stream: false,
          options: {
            temperature: config.temperature,
            top_p: config.topP,
            num_predict: config.maxTokens,
          },
        }),
        signal: AbortSignal.timeout(this.timeout),
      });
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }
      const result = await response.json();
      return result.message?.content || '';
    } catch (error) {
      throw new Error(`Ollama chat failed: ${error}`);
    }
  }
  /**
   * Generate with MLX backend
   */
  async generateWithMLX(model, prompt, config) {
    // Use centralized Python runner for consistent PYTHONPATH/env handling
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error - dynamic import crosses package boundaries; resolved at runtime
    const { runPython } = await import('../../../../libs/python/exec.js');

    const pythonScript = this.getMLXPythonScript();
    const input = JSON.stringify({
      model: model.model,
      prompt,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      top_p: config.topP,
    });

    const run = runPython.bind(null, '-c', [pythonScript], {
      python: 'python3',
      input,
    });

    const timer = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`MLX process timed out after ${this.timeout}ms`)),
        this.timeout,
      ),
    );

    const output = await Promise.race([run(), timer]);
    try {
      const result = JSON.parse(String(output || '{}'));
      return result.text || '';
    } catch (error) {
      throw new Error(`MLX error: ${error}`);
    }
  }
  /**
   * Chat with MLX backend
   */
  async chatWithMLX(model, messages, config) {
    // Convert chat messages to a single prompt for MLX
    const prompt = this.formatMessagesAsPrompt(messages);
    return this.generateWithMLX(model, prompt, config);
  }
  /**
   * Format chat messages as a single prompt string
   */
  formatMessagesAsPrompt(messages) {
    return (
      messages
        .map((msg) => {
          if (msg.role === 'system') {
            return `System: ${msg.content}`;
          } else if (msg.role === 'user') {
            return `User: ${msg.content}`;
          } else {
            return `Assistant: ${msg.content}`;
          }
        })
        .join('\n\n') + '\n\nAssistant:'
    );
  }
  /**
   * Get Python script for MLX generation
   */
  getMLXPythonScript() {
    const scriptPath = path.join(packageRoot, 'python', 'mlx_generate.py');
    return readFileSync(scriptPath, 'utf8');
  }
  /**
   * Cleanup resources
   */
  async close() {
    // No persistent resources to cleanup
  }
}
/**
 * Factory function for creating a multi-model generator
 */
export function createMultiModelGenerator(options) {
  return new MultiModelGenerator(options);
}
/**
 * Predefined model configurations for common use cases
 */
export const ModelPresets = {
  /** Coding and development tasks */
  coding: {
    model: 'qwen3-coder:30b',
    backend: 'ollama',
    name: 'Qwen3 Coder 30B',
    description: 'Specialized for coding and programming tasks',
    useCases: ['code generation', 'debugging', 'code explanation', 'refactoring'],
  },
  /** Reasoning and analysis */
  reasoning: {
    model: 'phi4-mini-reasoning',
    backend: 'ollama',
    name: 'Phi4 Mini Reasoning',
    description: 'Optimized for logical reasoning and analysis',
    useCases: ['problem solving', 'analysis', 'logical reasoning', 'planning'],
  },
  /** General chat and assistance */
  chat: {
    model: 'qwen3:14b',
    backend: 'ollama',
    name: 'Qwen3 14B',
    description: 'General purpose conversational model',
    useCases: ['general chat', 'Q&A', 'summarization', 'writing assistance'],
  },
  /** Compact and fast responses */
  fast: {
    model: 'qwen3:7b',
    backend: 'ollama',
    name: 'Qwen3 7B',
    description: 'Fast responses with good quality',
    useCases: ['quick responses', 'simple tasks', 'real-time chat'],
  },
};
/**
 * RAG-optimized generator configurations
 */
export const RAGGeneratorPresets = {
  /** Balanced performance for RAG applications */
  balanced: {
    primaryModel: ModelPresets.chat,
    fallbackModels: [ModelPresets.fast],
    defaultOptions: {
      maxTokens: 1024,
      temperature: 0.3,
      topP: 0.9,
    },
  },
  /** Code-focused RAG generation */
  coding: {
    primaryModel: ModelPresets.coding,
    fallbackModels: [ModelPresets.chat, ModelPresets.fast],
    defaultOptions: {
      maxTokens: 2048,
      temperature: 0.1,
      topP: 0.95,
    },
  },
  /** High-quality analysis and reasoning */
  analytical: {
    primaryModel: ModelPresets.reasoning,
    fallbackModels: [ModelPresets.chat],
    defaultOptions: {
      maxTokens: 2048,
      temperature: 0.2,
      topP: 0.9,
    },
  },
};
//# sourceMappingURL=multi-model.js.map
