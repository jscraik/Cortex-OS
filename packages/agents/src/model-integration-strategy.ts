/**
 * Model Integration Strategy for Agents Package
 * Local implementation to avoid cross-package dependencies
 */

export interface ModelIntegrationConfig {
  agents: {
    codeIntelligence: {
      primary: string;
      fallback: string;
    };
    reasoning: {
      primary: string;
      fallback: string;
    };
    multimodal: {
      primary: string;
    };
  };
}

export const DEFAULT_MODEL_INTEGRATION: ModelIntegrationConfig = {
  agents: {
    codeIntelligence: {
      primary: 'qwen3-coder:30b',
      fallback: 'deepseek-coder:6.7b',
    },
    reasoning: {
      primary: 'phi4-mini-reasoning:latest',
      fallback: 'phi4-mini-reasoning:3.8b',
    },
    multimodal: {
      primary: 'qwen2.5-vl',
    },
  },
};

/**
 * Model Selection Strategy based on task characteristics
 */
export interface TaskCharacteristics {
  complexity: 'low' | 'medium' | 'high';
  latency: 'realtime' | 'fast' | 'batch';
  accuracy: 'sufficient' | 'high' | 'premium';
  resource_constraint: 'strict' | 'moderate' | 'flexible';
  modality: 'text' | 'code' | 'multimodal';
}

export function selectOptimalModel(
  category: keyof ModelIntegrationConfig,
  subcategory: string,
  characteristics: TaskCharacteristics,
  config: ModelIntegrationConfig = DEFAULT_MODEL_INTEGRATION,
): string {
  const models = config[category] as any;
  const modelGroup = models[subcategory];

  if (!modelGroup) {
    throw new Error(`Unknown model category: ${category}.${subcategory}`);
  }

  // Strategy 1: Real-time tasks prefer smaller models
  if (characteristics.latency === 'realtime') {
    return modelGroup.fallback || modelGroup.primary;
  }

  // Strategy 2: High accuracy tasks prefer premium models
  if (characteristics.accuracy === 'premium' && modelGroup.premium) {
    return modelGroup.premium;
  }

  // Strategy 3: High complexity tasks prefer primary models
  if (characteristics.complexity === 'high') {
    return modelGroup.primary;
  }

  // Strategy 4: Resource-constrained tasks prefer fallback
  if (characteristics.resource_constraint === 'strict') {
    return modelGroup.fallback || modelGroup.primary;
  }

  // Default: Primary model
  return modelGroup.primary;
}

/**
 * Integration Points for agents package
 */
export const INTEGRATION_POINTS = {
  agents: {
    codeIntelligence: [
      'Code analysis and suggestions',
      'Architecture recommendations',
      'Refactoring proposals',
      'Performance optimization',
    ],
    reasoning: [
      'Task planning and decomposition',
      'Decision making under uncertainty',
      'Workflow optimization',
      'Resource allocation',
    ],
    multimodal: [
      'UI/UX analysis from screenshots',
      'Diagram understanding',
      'Visual coordination',
      'Multi-modal task interpretation',
    ],
  },
};

/**
 * Performance characteristics of each model type
 */
export const MODEL_PERFORMANCE_PROFILES = {
  'qwen3-coder:30b': { latency: 'batch', accuracy: 'premium', resource: 'high' },
  'deepseek-coder:6.7b': { latency: 'fast', accuracy: 'high', resource: 'moderate' },
  'phi4-mini-reasoning:latest': { latency: 'realtime', accuracy: 'high', resource: 'low' },
  'phi4-mini-reasoning:3.8b': { latency: 'realtime', accuracy: 'sufficient', resource: 'low' },
  'qwen2.5-vl': { latency: 'fast', accuracy: 'high', resource: 'moderate' },
} as const;