import type { ChatMessage, GenerationConfig, Generator } from './index';
/**
 * Model specification for generation backends
 */
export interface ModelSpec {
  /** Model identifier or path */
  model: string;
  /** Backend to use for this model */
  backend: 'mlx' | 'ollama';
  /** Display name for the model */
  name?: string;
  /** Model description */
  description?: string;
  /** Recommended use cases */
  useCases?: string[];
}
/**
 * Configuration for model generator
 */
export interface MultiModelGeneratorOptions {
  /** Model specification */
  model: ModelSpec;
  /** Default generation options */
  defaultConfig?: Partial<GenerationConfig>;
  /** Timeout for model requests (ms) */
  timeout?: number;
}
/**
 * Single-model generator
 */
export declare class MultiModelGenerator implements Generator {
  private readonly model;
  private readonly defaultConfig;
  private readonly timeout;
  constructor(options: MultiModelGeneratorOptions);
  /**
   * Generate text completion
   */
  generate(
    prompt: string,
    config?: Partial<GenerationConfig>,
  ): Promise<{
    content: string;
    provider: 'mlx' | 'ollama';
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }>;
  /**
   * Generate chat response
   */
  chat(
    messages: ChatMessage[],
    config?: Partial<GenerationConfig>,
  ): Promise<{
    content: string;
    provider: 'mlx' | 'ollama';
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }>;
  /**
   * Generate with a specific model
   */
  private generateWithModel;
  /**
   * Chat with a specific model
   */
  private chatWithModel;
  /**
   * Generate with Ollama backend
   */
  private generateWithOllama;
  /**
   * Chat with Ollama backend using API
   */
  private chatWithOllama;
  /**
   * Generate with MLX backend
   */
  private generateWithMLX;
  /**
   * Chat with MLX backend
   */
  private chatWithMLX;
  /**
   * Format chat messages as a single prompt string
   */
  private formatMessagesAsPrompt;
  /**
   * Get Python script for MLX generation
   */
  private getMLXPythonScript;
  /**
   * Cleanup resources
   */
  close(): Promise<void>;
}
/**
 * Factory function for creating a multi-model generator
 */
export declare function createMultiModelGenerator(
  options: MultiModelGeneratorOptions,
): MultiModelGenerator;
/**
 * Predefined model configurations for common use cases
 */
export declare const ModelPresets: {
  /** Coding and development tasks */
  readonly coding: {
    readonly model: 'qwen3-coder:30b';
    readonly backend: 'ollama';
    readonly name: 'Qwen3 Coder 30B';
    readonly description: 'Specialized for coding and programming tasks';
    readonly useCases: readonly ['code generation', 'debugging', 'code explanation', 'refactoring'];
  };
  /** Reasoning and analysis */
  readonly reasoning: {
    readonly model: 'phi4-mini-reasoning';
    readonly backend: 'ollama';
    readonly name: 'Phi4 Mini Reasoning';
    readonly description: 'Optimized for logical reasoning and analysis';
    readonly useCases: readonly ['problem solving', 'analysis', 'logical reasoning', 'planning'];
  };
  /** General chat and assistance */
  readonly chat: {
    readonly model: 'qwen3:14b';
    readonly backend: 'ollama';
    readonly name: 'Qwen3 14B';
    readonly description: 'General purpose conversational model';
    readonly useCases: readonly ['general chat', 'Q&A', 'summarization', 'writing assistance'];
  };
  /** Compact and fast responses */
  readonly fast: {
    readonly model: 'qwen3:7b';
    readonly backend: 'ollama';
    readonly name: 'Qwen3 7B';
    readonly description: 'Fast responses with good quality';
    readonly useCases: readonly ['quick responses', 'simple tasks', 'real-time chat'];
  };
};
/**
 * RAG-optimized generator configurations
 */
export declare const RAGGeneratorPresets: {
  /** Balanced performance for RAG applications */
  readonly balanced: {
    readonly primaryModel: {
      readonly model: 'qwen3:14b';
      readonly backend: 'ollama';
      readonly name: 'Qwen3 14B';
      readonly description: 'General purpose conversational model';
      readonly useCases: readonly ['general chat', 'Q&A', 'summarization', 'writing assistance'];
    };
    readonly fallbackModels: readonly [
      {
        readonly model: 'qwen3:7b';
        readonly backend: 'ollama';
        readonly name: 'Qwen3 7B';
        readonly description: 'Fast responses with good quality';
        readonly useCases: readonly ['quick responses', 'simple tasks', 'real-time chat'];
      },
    ];
    readonly defaultOptions: {
      readonly maxTokens: 1024;
      readonly temperature: 0.3;
      readonly topP: 0.9;
    };
  };
  /** Code-focused RAG generation */
  readonly coding: {
    readonly primaryModel: {
      readonly model: 'qwen3-coder:30b';
      readonly backend: 'ollama';
      readonly name: 'Qwen3 Coder 30B';
      readonly description: 'Specialized for coding and programming tasks';
      readonly useCases: readonly [
        'code generation',
        'debugging',
        'code explanation',
        'refactoring',
      ];
    };
    readonly fallbackModels: readonly [
      {
        readonly model: 'qwen3:14b';
        readonly backend: 'ollama';
        readonly name: 'Qwen3 14B';
        readonly description: 'General purpose conversational model';
        readonly useCases: readonly ['general chat', 'Q&A', 'summarization', 'writing assistance'];
      },
      {
        readonly model: 'qwen3:7b';
        readonly backend: 'ollama';
        readonly name: 'Qwen3 7B';
        readonly description: 'Fast responses with good quality';
        readonly useCases: readonly ['quick responses', 'simple tasks', 'real-time chat'];
      },
    ];
    readonly defaultOptions: {
      readonly maxTokens: 2048;
      readonly temperature: 0.1;
      readonly topP: 0.95;
    };
  };
  /** High-quality analysis and reasoning */
  readonly analytical: {
    readonly primaryModel: {
      readonly model: 'phi4-mini-reasoning';
      readonly backend: 'ollama';
      readonly name: 'Phi4 Mini Reasoning';
      readonly description: 'Optimized for logical reasoning and analysis';
      readonly useCases: readonly ['problem solving', 'analysis', 'logical reasoning', 'planning'];
    };
    readonly fallbackModels: readonly [
      {
        readonly model: 'qwen3:14b';
        readonly backend: 'ollama';
        readonly name: 'Qwen3 14B';
        readonly description: 'General purpose conversational model';
        readonly useCases: readonly ['general chat', 'Q&A', 'summarization', 'writing assistance'];
      },
    ];
    readonly defaultOptions: {
      readonly maxTokens: 2048;
      readonly temperature: 0.2;
      readonly topP: 0.9;
    };
  };
};
//# sourceMappingURL=multi-model.d.ts.map
