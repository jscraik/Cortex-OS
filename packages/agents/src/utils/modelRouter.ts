import type { Model } from '@voltagent/core';
import { createLogger } from '@voltagent/logger';

const logger = createLogger('ModelRouter');

export interface ModelRouterConfig {
  enableMLX?: boolean;
  ollamaBaseUrl?: string;
  apiProviders?: {
    openai?: {
      apiKey: string;
      baseURL?: string;
    };
    anthropic?: {
      apiKey: string;
      baseURL?: string;
    };
    google?: {
      apiKey: string;
      baseURL?: string;
    };
  };
}

export interface ModelCapability {
  name: string;
  provider: 'mlx' | 'ollama' | 'openai' | 'anthropic' | 'google';
  capabilities: {
    codeAnalysis: boolean;
    testGeneration: boolean;
    documentation: boolean;
    securityAnalysis: boolean;
    multimodal: boolean;
    streaming: boolean;
    contextWindow: number;
  };
  cost: {
    input: number; // per 1K tokens
    output: number; // per 1K tokens
  };
  priority: number; // 1-10, higher is preferred
}

export function createModelRouter(config?: ModelRouterConfig) {
  // Define available models
  const models: ModelCapability[] = [
    // MLX models (macOS native)
    ...(config?.enableMLX ? [
      {
        name: 'mlx/Llama-3.2-3B-Instruct',
        provider: 'mlx' as const,
        capabilities: {
          codeAnalysis: true,
          testGeneration: true,
          documentation: true,
          securityAnalysis: false,
          multimodal: false,
          streaming: true,
          contextWindow: 8192,
        },
        cost: { input: 0, output: 0 },
        priority: 10,
      },
      {
        name: 'mlx/Qwen2.5-Coder-7B-Instruct',
        provider: 'mlx' as const,
        capabilities: {
          codeAnalysis: true,
          testGeneration: true,
          documentation: true,
          securityAnalysis: true,
          multimodal: false,
          streaming: true,
          contextWindow: 32768,
        },
        cost: { input: 0, output: 0 },
        priority: 9,
      },
    ] : []),

    // Ollama models (local fallback)
    {
      name: 'ollama/llama3.2',
      provider: 'ollama' as const,
      capabilities: {
        codeAnalysis: true,
        testGeneration: true,
        documentation: true,
        securityAnalysis: true,
        multimodal: false,
        streaming: true,
        contextWindow: 131072,
      },
      cost: { input: 0, output: 0 },
      priority: 8,
    },
    {
      name: 'ollama/deepseek-coder',
      provider: 'ollama' as const,
      capabilities: {
        codeAnalysis: true,
        testGeneration: true,
        documentation: true,
        securityAnalysis: true,
        multimodal: false,
        streaming: true,
        contextWindow: 32768,
      },
      cost: { input: 0, output: 0 },
      priority: 7,
    },

    // API providers (frontier models)
    ...(config?.apiProviders?.openai ? [
      {
        name: 'gpt-4',
        provider: 'openai' as const,
        capabilities: {
          codeAnalysis: true,
          testGeneration: true,
          documentation: true,
          securityAnalysis: true,
          multimodal: true,
          streaming: true,
          contextWindow: 128000,
        },
        cost: { input: 0.03, output: 0.06 },
        priority: 6,
      },
      {
        name: 'gpt-4o-mini',
        provider: 'openai' as const,
        capabilities: {
          codeAnalysis: true,
          testGeneration: true,
          documentation: true,
          securityAnalysis: false,
          multimodal: true,
          streaming: true,
          contextWindow: 128000,
        },
        cost: { input: 0.00015, output: 0.0006 },
        priority: 5,
      },
    ] : []),

    ...(config?.apiProviders?.anthropic ? [
      {
        name: 'claude-3-5-sonnet-20241022',
        provider: 'anthropic' as const,
        capabilities: {
          codeAnalysis: true,
          testGeneration: true,
          documentation: true,
          securityAnalysis: true,
          multimodal: true,
          streaming: true,
          contextWindow: 200000,
        },
        cost: { input: 0.003, output: 0.015 },
        priority: 7,
      },
      {
        name: 'claude-3-haiku-20240307',
        provider: 'anthropic' as const,
        capabilities: {
          codeAnalysis: true,
          testGeneration: true,
          documentation: true,
          securityAnalysis: false,
          multimodal: true,
          streaming: true,
          contextWindow: 200000,
        },
        cost: { input: 0.00025, output: 0.00125 },
        priority: 4,
      },
    ] : []),

    ...(config?.apiProviders?.google ? [
      {
        name: 'gemini-1.5-pro',
        provider: 'google' as const,
        capabilities: {
          codeAnalysis: true,
          testGeneration: true,
          documentation: true,
          securityAnalysis: true,
          multimodal: true,
          streaming: true,
          contextWindow: 2097152,
        },
        cost: { input: 0.00125, output: 0.005 },
        priority: 6,
      },
    ] : []),
  ];

  return {
    /**
     * Select the best model for a given task
     */
    async selectModel(
      input: string,
      tools: any[],
      preferredModel?: string
    ): Promise<string> {
      // If model is explicitly requested, use it if available
      if (preferredModel) {
        const model = models.find(m => m.name === preferredModel);
        if (model) return model.name;
        logger.warn(`Requested model ${preferredModel} not found, using automatic selection`);
      }

      // Analyze input to determine required capabilities
      const requirements = analyzeInputRequirements(input, tools);

      // Filter models that meet requirements
      const eligibleModels = models.filter(model => {
        return Object.entries(requirements).every(([cap, required]) =>
          !required || model.capabilities[cap as keyof typeof model.capabilities]
        );
      });

      if (eligibleModels.length === 0) {
        logger.warn('No models meet requirements, falling back to basic capabilities');
        return models.reduce((best, current) =>
          current.priority > best.priority ? current : best
        ).name;
      }

      // Select based on priority, cost, and thermal considerations
      const selected = selectOptimalModel(eligibleModels, input.length);

      logger.info(`Selected model: ${selected.name} (${selected.provider})`);
      return selected.name;
    },

    /**
     * Get current model information
     */
    async getCurrentModel(): Promise<ModelCapability> {
      // For now, return the highest priority model
      return models.reduce((best, current) =>
        current.priority > best.priority ? current : best
      );
    },

    /**
     * List all available models
     */
    getAvailableModels(): ModelCapability[] {
      return [...models];
    },

    /**
     * Check model health and availability
     */
    async checkHealth(modelName: string): Promise<{
      healthy: boolean;
      latency?: number;
      error?: string;
    }> {
      const model = models.find(m => m.name === modelName);
      if (!model) {
        return { healthy: false, error: 'Model not found' };
      }

      // Check MLX availability
      if (model.provider === 'mlx') {
        try {
          // Check if MLX is available
          const { execSync } = await import('child_process');
          execSync('python3 -c "import mlx.core; print(1)"', {
            stdio: 'pipe',
            timeout: 5000
          });
          return { healthy: true, latency: 10 };
        } catch (error) {
          return { healthy: false, error: 'MLX not available' };
        }
      }

      // Check Ollama availability
      if (model.provider === 'ollama') {
        try {
          const startTime = Date.now();
          const response = await fetch(`${config?.ollamaBaseUrl || 'http://localhost:11434'}/api/tags`);
          const latency = Date.now() - startTime;

          if (response.ok) {
            const data = await response.json();
            const available = data.models.some((m: any) =>
              m.name.includes(modelName.split('/')[1])
            );
            return { healthy: available, latency };
          }
          return { healthy: false, error: 'Ollama not responding' };
        } catch (error) {
          return { healthy: false, error: 'Ollama connection failed' };
        }
      }

      // API providers are assumed healthy if configured
      if (['openai', 'anthropic', 'google'].includes(model.provider)) {
        return { healthy: true, latency: 100 };
      }

      return { healthy: false, error: 'Unknown provider' };
    },
  };
}

function analyzeInputRequirements(input: string, tools: any[]) {
  const lowerInput = input.toLowerCase();

  return {
    codeAnalysis: /code|analyze|review|refactor|debug/i.test(input),
    testGeneration: /test|spec|unit|integration|e2e/i.test(input),
    documentation: /doc|readme|markdown|comment/i.test(input),
    securityAnalysis: /security|vulnerability|exploit|safe/i.test(input),
    multimodal: tools.some(t => t.name.toLowerCase().includes('image') ||
                             t.name.toLowerCase().includes('audio') ||
                             t.name.toLowerCase().includes('video')) ||
                 /image|audio|video|screenshot/i.test(input),
    streaming: true, // Always prefer streaming for better UX
    contextWindow: Math.min(128000, Math.max(8192, input.length * 10)),
  };
}

function selectOptimalModel(models: ModelCapability[], inputLength: number): ModelCapability {
  // Calculate scores based on multiple factors
  const scored = models.map(model => {
    let score = model.priority * 10;

    // Prefer free models for simple tasks
    if (model.cost.input === 0 && inputLength < 1000) {
      score += 5;
    }

    // Consider thermal constraints for MLX
    if (model.provider === 'mlx') {
      // Reduce score if input is very large to prevent overheating
      if (inputLength > 50000) {
        score -= 3;
      }
    }

    // Consider context window requirements
    const requiredWindow = inputLength * 10;
    if (model.capabilities.contextWindow >= requiredWindow) {
      score += 2;
    } else if (model.capabilities.contextWindow >= requiredWindow * 0.5) {
      score += 1;
    }

    return { model, score };
  });

  // Return highest scoring model
  return scored.reduce((best, current) =>
    current.score > best.score ? current : best
  ).model;
}