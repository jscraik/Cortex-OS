import { spawn } from 'child_process';
import type { ChatMessage, GenerationConfig, Generator } from './index';

/**
 * Model specification with priority support
 */
export interface ModelSpec {
  /** Model identifier or path */
  model: string;
  /** Backend to use for this model */
  backend: 'mlx' | 'ollama';
  /** Priority (higher = preferred, MLX models get +100 bonus) */
  priority?: number;
  /** Display name for the model */
  name?: string;
  /** Model description */
  description?: string;
  /** Recommended use cases */
  useCases?: string[];
}

/**
 * Configuration for multi-model generator
 */
export interface MultiModelGeneratorOptions {
  /** Available models (will be auto-sorted by priority) */
  models: ModelSpec[];
  /** Default generation options */
  defaultConfig?: Partial<GenerationConfig>;
  /** Timeout for model requests (ms) */
  timeout?: number;
}

/**
 * Multi-model generator with MLX-first, Ollama-fallback strategy
 */
export class MultiModelGenerator implements Generator {
  private readonly models: ModelSpec[];
  private readonly defaultConfig: Partial<GenerationConfig>;
  private readonly timeout: number;

  constructor(options: MultiModelGeneratorOptions) {
    // Sort models: MLX first (priority + 100), then by explicit priority, then by order
    this.models = [...options.models].sort((a, b) => {
      const aPriority = (a.priority || 0) + (a.backend === 'mlx' ? 100 : 0);
      const bPriority = (b.priority || 0) + (b.backend === 'mlx' ? 100 : 0);
      return bPriority - aPriority;
    });

    this.defaultConfig = {
      maxTokens: 2048,
      temperature: 0.7,
      topP: 0.9,
      ...options.defaultConfig,
    };
    this.timeout = options.timeout || 30000;
  }

  /**
   * Generate text completion with MLX-first fallback support
   */
  async generate(prompt: string, config?: Partial<GenerationConfig>) {
    const finalConfig = { ...this.defaultConfig, ...config };

    for (const model of this.models) {
      try {
        const result = await this.generateWithModel(model, prompt, finalConfig);
        return {
          content: result,
          provider: model.backend,
          usage: {
            promptTokens: Math.floor(prompt.length / 4), // Rough estimate
            completionTokens: Math.floor(result.length / 4),
            totalTokens: Math.floor((prompt.length + result.length) / 4),
          },
        };
      } catch (error) {
        console.warn(`Model ${model.model} (${model.backend}) failed, trying next:`, error);
        continue;
      }
    }

    throw new Error('All models failed to generate response');
  }

  /**
   * Generate chat response with MLX-first fallback support
   */
  async chat(messages: ChatMessage[], config?: Partial<GenerationConfig>) {
    const finalConfig = { ...this.defaultConfig, ...config };

    for (const model of this.models) {
      try {
        const result = await this.chatWithModel(model, messages, finalConfig);
        return {
          content: result,
          provider: model.backend,
          usage: {
            promptTokens: Math.floor(messages.reduce((sum, m) => sum + m.content.length, 0) / 4),
            completionTokens: Math.floor(result.length / 4),
            totalTokens: Math.floor(
              (messages.reduce((sum, m) => sum + m.content.length, 0) + result.length) / 4,
            ),
          },
        };
      } catch (error) {
        console.warn(`Model ${model.model} (${model.backend}) failed, trying next:`, error);
        continue;
      }
    }

    throw new Error('All models failed to generate chat response');
  }

  /**
   * Generate with a specific model
   */
  private async generateWithModel(
    model: ModelSpec,
    prompt: string,
    config: Partial<GenerationConfig>,
  ): Promise<string> {
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
  private async chatWithModel(
    model: ModelSpec,
    messages: ChatMessage[],
    config: Partial<GenerationConfig>,
  ): Promise<string> {
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
  private async generateWithOllama(
    model: ModelSpec,
    prompt: string,
    config: Partial<GenerationConfig>,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn('ollama', ['generate', model.model, prompt], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timeoutId = setTimeout(() => {
        child.kill();
        reject(new Error(`Ollama generation timed out after ${this.timeout}ms`));
      }, this.timeout);

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        if (code !== 0) {
          reject(new Error(`Ollama failed with code ${code}: ${stderr}`));
          return;
        }
        resolve(stdout.trim());
      });

      child.on('error', (err) => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to spawn Ollama: ${err}`));
      });
    });
  }

  /**
   * Chat with Ollama backend using API
   */
  private async chatWithOllama(
    model: ModelSpec,
    messages: ChatMessage[],
    config: Partial<GenerationConfig>,
  ): Promise<string> {
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
  private async generateWithMLX(
    model: ModelSpec,
    prompt: string,
    config: Partial<GenerationConfig>,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const pythonScript = this.getMLXPythonScript();
      const child = spawn('python3', ['-c', pythonScript], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timeoutId = setTimeout(() => {
        child.kill();
        reject(new Error(`MLX generation timed out after ${this.timeout}ms`));
      }, this.timeout);

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        if (code !== 0) {
          reject(new Error(`MLX failed with code ${code}: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout.trim());
          if (result.error) {
            reject(new Error(`MLX error: ${result.error}`));
          } else {
            resolve(result.text || '');
          }
        } catch (err) {
          reject(new Error(`Failed to parse MLX output: ${err}`));
        }
      });

      child.on('error', (err) => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to spawn MLX process: ${err}`));
      });

      // Send input data
      const input = {
        model: model.model,
        prompt,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        top_p: config.topP,
      };

      child.stdin?.write(JSON.stringify(input));
      child.stdin?.end();
    });
  }

  /**
   * Chat with MLX backend
   */
  private async chatWithMLX(
    model: ModelSpec,
    messages: ChatMessage[],
    config: Partial<GenerationConfig>,
  ): Promise<string> {
    // Convert chat messages to a single prompt for MLX
    const prompt = this.formatMessagesAsPrompt(messages);
    return this.generateWithMLX(model, prompt, config);
  }

  /**
   * Format chat messages as a single prompt string
   */
  private formatMessagesAsPrompt(messages: ChatMessage[]): string {
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
  private getMLXPythonScript(): string {
    return `
import json
import sys
import os

try:
    # Try to import MLX
    import mlx.core as mx
    from mlx_lm import load, generate
    
    # Read input
    input_data = json.loads(sys.stdin.read())
    model_path = input_data['model']
    prompt = input_data['prompt']
    max_tokens = input_data.get('max_tokens', 2048)
    temperature = input_data.get('temperature', 0.7)
    top_p = input_data.get('top_p', 0.9)
    
    # Load model
    model, tokenizer = load(model_path)
    
    # Generate response
    response = generate(
        model,
        tokenizer,
        prompt=prompt,
        temp=temperature,
        top_p=top_p,
        max_tokens=max_tokens
    )
    
    # Extract generated text (remove the prompt)
    generated_text = response[len(prompt):].strip()
    
    result = {"text": generated_text}
    print(json.dumps(result))
    
except ImportError:
    result = {"error": "MLX not available - install with: pip install mlx-lm"}
    print(json.dumps(result))
    sys.exit(1)
except Exception as e:
    result = {"error": str(e)}
    print(json.dumps(result))
    sys.exit(1)
`;
  }

  /**
   * Cleanup resources
   */
  async close(): Promise<void> {
    // No persistent resources to cleanup
  }
}

/**
 * Factory function for creating a multi-model generator
 */
export function createMultiModelGenerator(
  options: MultiModelGeneratorOptions,
): MultiModelGenerator {
  return new MultiModelGenerator(options);
}

/**
 * Predefined model configurations for common use cases
 */
export const ModelPresets = {
  /** Coding and development tasks */
  coding: {
    model: 'qwen3-coder:30b',
    backend: 'ollama' as const,
    name: 'Qwen3 Coder 30B',
    description: 'Specialized for coding and programming tasks',
    useCases: ['code generation', 'debugging', 'code explanation', 'refactoring'],
  },

  /** Reasoning and analysis */
  reasoning: {
    model: 'phi4-mini-reasoning',
    backend: 'ollama' as const,
    name: 'Phi4 Mini Reasoning',
    description: 'Optimized for logical reasoning and analysis',
    useCases: ['problem solving', 'analysis', 'logical reasoning', 'planning'],
  },

  /** General chat and assistance */
  chat: {
    model: 'qwen3:14b',
    backend: 'ollama' as const,
    name: 'Qwen3 14B',
    description: 'General purpose conversational model',
    useCases: ['general chat', 'Q&A', 'summarization', 'writing assistance'],
  },

  /** Compact and fast responses */
  fast: {
    model: 'qwen3:7b',
    backend: 'ollama' as const,
    name: 'Qwen3 7B',
    description: 'Fast responses with good quality',
    useCases: ['quick responses', 'simple tasks', 'real-time chat'],
  },
} as const;

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
} as const;
