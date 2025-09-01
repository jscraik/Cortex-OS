/**
 * Cortex AI GitHub App - Main Export
 * Production-ready AI automation for GitHub repositories
 */

export * from './core/ai-github-app.js';
export * from './server/webhook-server.js';
export * from './types/github-models.js';

// Re-export main classes for convenience
export { CortexAiGitHubApp } from './core/ai-github-app.js';
export { CortexWebhookServer } from './server/webhook-server.js';
export type {
  GitHubModelsConfig,
  GitHubModel,
  AITaskParams,
  AITaskResult,
  AITaskType,
  GitHubContext,
  CommentTrigger
} from './types/github-models.js';