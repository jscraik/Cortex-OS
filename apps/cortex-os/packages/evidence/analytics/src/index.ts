/**
 * @file_path packages/orchestration-analytics/src/index.ts
 * @description Main export file for orchestration analytics platform
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-04
 * @version 1.0.0
 * @status active
 * @ai_generated_by human
 * @ai_provenance_hash N/A
 */

export { AgentTraceCollector } from './agent-trace-collector.js';
export { createAnalyticsEngine } from './analytics-engine.js';
// Core analytics components
export { MetricsCollector } from './metrics-collector.js';
export { OptimizationEngine } from './optimization-engine.js';
export { PatternAnalyzer } from './pattern-analyzer.js';
export { PerformanceDashboard } from './performance-dashboard.js';
export { RealtimeDataStream } from './realtime-data-stream.js';
// Types and interfaces
// Analytics configuration
export type {
  AgentMetrics,
  AnalyticsConfig,
  CrossAgentDependency,
  DashboardData,
  InteractionPattern,
  OptimizationRecommendation,
  OrchestrationMetrics,
  PerformanceAnalysis,
  PredictiveModel,
  ResourceUtilization,
  TrendAnalysis,
  WorkflowBottleneck,
} from './types.js';

// Version information
export const version = '1.0.0';
export const name = '@cortex-os/orchestration-analytics';

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
