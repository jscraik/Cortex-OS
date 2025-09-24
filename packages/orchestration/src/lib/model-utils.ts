/**
 * brAInwav Cortex-OS Model Utilities
 * Functional utilities for model management following CODESTYLE.md
 */

import type {
  ModelSelectionOptions,
  OrchestrationModelConfig,
} from '../config/hybrid-model-integration.js';
import type { HybridMode, ModelCapability } from '../types.js';

/**
 * Performance tier configuration
 */
export interface PerformanceTier {
  models: string[];
  max_latency_ms: number;
  memory_limit_gb: number;
}

/**
 * Get performance tier for given latency requirements
 */
export const getPerformanceTier = (
  maxLatencyMs: number,
): 'ultra_fast' | 'balanced' | 'high_performance' => {
  if (maxLatencyMs <= 500) return 'ultra_fast';
  if (maxLatencyMs <= 2000) return 'balanced';
  return 'high_performance';
};

/**
 * Filter models by capability
 */
export const filterModelsByCapability = (
  models: OrchestrationModelConfig[],
  capability: ModelCapability,
): OrchestrationModelConfig[] => {
  return models.filter((model) => model.capabilities.includes(capability));
};

/**
 * Sort models by priority (highest first)
 */
export const sortModelsByPriority = (
  models: OrchestrationModelConfig[],
): OrchestrationModelConfig[] => {
  return [...models].sort((a, b) => b.priority - a.priority);
};

/**
 * Check if model supports vision tasks
 */
export const isVisionModel = (model: OrchestrationModelConfig): boolean => {
  return model.supports_vision === true || model.capabilities.includes('vision');
};

/**
 * Check if model is suitable for coding tasks
 */
export const isCodingModel = (model: OrchestrationModelConfig): boolean => {
  return model.coding_tasks !== undefined && model.coding_tasks.length > 0;
};

/**
 * Get recommended models for task type
 */
export const getRecommendedModelsForTask = (
  models: OrchestrationModelConfig[],
  taskType: string,
): OrchestrationModelConfig[] => {
  return models.filter(
    (model) =>
      model.recommended_for.includes(taskType) ||
      (model.coding_tasks && model.coding_tasks.includes(taskType)),
  );
};

/**
 * Check if model meets memory requirements
 */
export const checkMemoryRequirements = (
  model: OrchestrationModelConfig,
  availableMemoryGb: number,
): boolean => {
  return model.memory_gb <= availableMemoryGb;
};

/**
 * Get fallback chain for model
 */
export const getFallbackChain = (
  model: OrchestrationModelConfig,
  allModels: Map<string, OrchestrationModelConfig>,
): OrchestrationModelConfig[] => {
  if (!model.fallback) return [];

  return model.fallback
    .map((fallbackName) => allModels.get(fallbackName))
    .filter((fallback): fallback is OrchestrationModelConfig => fallback !== undefined);
};

/**
 * Check if cloud conjunction should be used
 */
export const shouldUseCloudConjunction = (
  options: ModelSelectionOptions,
  privacyMode: boolean,
): boolean => {
  if (privacyMode) return false;

  const largeContext = options.contextLength && options.contextLength > 50000;
  const enterpriseComplexity = options.complexity === 'enterprise';

  return largeContext || enterpriseComplexity;
};

/**
 * Generate brAInwav logging message
 */
export const generateLogMessage = (operation: string, details?: string): string => {
  const baseMessage = `brAInwav Cortex-OS Orchestration: ${operation}`;
  return details ? `${baseMessage} - ${details}` : baseMessage;
};

/**
 * Validate model configuration
 */
export const validateModelConfig = (
  config: OrchestrationModelConfig,
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!config.name) errors.push('Model name is required');
  if (!config.provider) errors.push('Model provider is required');
  if (!config.capabilities.length) errors.push('At least one capability is required');
  if (config.priority < 0 || config.priority > 100) {
    errors.push('Priority must be between 0 and 100');
  }
  if (config.memory_gb <= 0) errors.push('Memory requirement must be positive');
  if (config.context_length <= 0) errors.push('Context length must be positive');

  return { valid: errors.length === 0, errors };
};

/**
 * Model selection context interface
 */
export interface ModelSelectionContext {
  task: string;
  options: ModelSelectionOptions;
  privacyMode: boolean;
  hybridMode: HybridMode;
  timestamp: string;
  performanceTier: 'ultra_fast' | 'balanced' | 'high_performance';
  useCloudConjunction: boolean;
}

/**
 * Create model selection context
 */
export const createModelSelectionContext = (
  task: string,
  options: ModelSelectionOptions,
  privacyMode: boolean,
  hybridMode: HybridMode,
): ModelSelectionContext => {
  return {
    task,
    options,
    privacyMode,
    hybridMode,
    timestamp: new Date().toISOString(),
    performanceTier: options.contextLength ? getPerformanceTier(options.contextLength) : 'balanced',
    useCloudConjunction: shouldUseCloudConjunction(options, privacyMode),
  };
};
