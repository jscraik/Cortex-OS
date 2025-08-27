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

// Core analytics components
export { MetricsCollector } from "./metrics-collector.js";
export { PatternAnalyzer } from "./pattern-analyzer.js";
export { OptimizationEngine } from "./optimization-engine.js";
export { AgentTraceCollector } from "./agent-trace-collector.js";
export { RealtimeDataStream } from "./realtime-data-stream.js";
export { PerformanceDashboard } from "./performance-dashboard.js";

// Types and interfaces
export type {
  AgentMetrics,
  OrchestrationMetrics,
  InteractionPattern,
  OptimizationRecommendation,
  DashboardData,
  PerformanceAnalysis,
  WorkflowBottleneck,
  ResourceUtilization,
  TrendAnalysis,
  PredictiveModel,
  CrossAgentDependency,
} from "./types.js";

// Analytics configuration
export type { AnalyticsConfig } from "./types.js";
export { createAnalyticsEngine } from "./analytics-engine.js";

// Version information
export const version = "1.0.0";
export const name = "@cortex-os/orchestration-analytics";

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
