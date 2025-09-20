import { z } from 'zod';

// Core request/plan/schedule/feedback/status schemas for nO Intelligence Scheduler
export const ExecutionRequestSchema = z.object({
  task: z.string().min(1),
  constraints: z.object({
    timeoutMs: z.number().int().positive().max(600_000),
    // Require maxTokens to ensure stricter contract (tests provide only timeoutMs)
    maxTokens: z.number().int().positive().max(100_000),
  }),
  context: z.record(z.unknown()).optional(),
});
export type ExecutionRequest = z.infer<typeof ExecutionRequestSchema>;

export const ExecutionPlanStepSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  dependsOn: z.array(z.string()).default([]),
});

export const ExecutionPlanSchema = z.object({
  id: z.string().min(1),
  steps: z.array(ExecutionPlanStepSchema).min(1),
  metadata: z
    .object({
      createdBy: z.string().min(1),
      strategy: z.enum(['parallel-coordinated', 'sequential-safe', 'hybrid']).optional(),
      bounds: z
        .object({
          timeoutMs: z.number().int().positive().max(600_000),
          maxTokens: z.number().int().positive().max(100_000),
        })
        .optional(),
    })
    .passthrough(),
});
export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;

export const AgentAssignmentSchema = z.object({
  stepId: z.string().min(1),
  agentId: z.string().min(1),
});

export const AgentScheduleSchema = z.object({
  planId: z.string().min(1),
  assignments: z.array(AgentAssignmentSchema).min(1),
});
export type AgentSchedule = z.infer<typeof AgentScheduleSchema>;

export const ExecutionFeedbackSchema = z.object({
  planId: z.string().min(1),
  successRate: z.number().min(0).max(1),
  // Require at least one note to avoid accepting empty feedback
  notes: z.array(z.string().min(1)).min(1),
  metrics: z.record(z.number()).optional(),
});
export type ExecutionFeedback = z.infer<typeof ExecutionFeedbackSchema>;

export const StrategyAdjustmentSchema = z.object({
  newStrategy: z.enum(['parallel-coordinated', 'sequential-safe', 'hybrid']),
  rationale: z.string().min(1),
});
export type StrategyAdjustment = z.infer<typeof StrategyAdjustmentSchema>;

export const ExecutionStatusSchema = z.object({
  planId: z.string().min(1),
  state: z.enum(['planning', 'running', 'completed', 'failed', 'cancelled']),
  details: z.string().optional(),
});
export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;

// Interface contract placeholder (shape only for compile-time/reference)
export const IntelligenceSchedulerSchema = z.object({});

// --- Advanced capabilities (nO plan) ---

// Multi-objective optimization inputs/outputs
export const ObjectiveSchema = z.object({
  id: z.string().min(1).default(() => `obj-${Date.now()}`),
  type: z.enum(['performance', 'cost', 'reliability', 'accessibility', 'security']),
  weight: z.number().min(0).max(1).default(0.2),
  target: z.number().optional(),
});
export type Objective = z.infer<typeof ObjectiveSchema>;

export const OptimizationResultSchema = z.object({
  score: z.number().min(0).max(1),
  tradeoffs: z.array(z.string()).default([]),
  recommendedStrategy: z.enum(['parallel-coordinated', 'sequential-safe', 'hybrid']).optional(),
  notes: z.array(z.string()).default([]),
});
export type OptimizationResult = z.infer<typeof OptimizationResultSchema>;

// Performance prediction for a plan
export const PerformancePredictionSchema = z.object({
  predictedDurationMs: z.number().int().nonnegative(),
  predictedCost: z.number().nonnegative().default(0),
  successProbability: z.number().min(0).max(1),
  riskFactors: z.array(z.string()).default([]),
});
export type PerformancePrediction = z.infer<typeof PerformancePredictionSchema>;

// Learning updates from outcomes
export const ExecutionOutcomeSchema = z.object({
  stepId: z.string().min(1),
  success: z.boolean(),
  durationMs: z.number().int().nonnegative().optional(),
  errors: z.array(z.string()).optional(),
  metrics: z.record(z.number()).optional(),
});
export type ExecutionOutcome = z.infer<typeof ExecutionOutcomeSchema>;

export const LearningUpdateSchema = z.object({
  adjustments: z.array(z.string()).default([]),
  newHeuristics: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
});
export type LearningUpdate = z.infer<typeof LearningUpdateSchema>;

// Environment adaptation
export const EnvironmentChangeSchema = z.object({
  type: z.enum(['resources', 'latency', 'failure', 'policy']),
  details: z.record(z.unknown()).default({}),
});
export type EnvironmentChange = z.infer<typeof EnvironmentChangeSchema>;

export const AdaptationResultSchema = z.object({
  actions: z.array(z.string()).default([]),
  newConfig: z.record(z.unknown()).optional(),
  rationale: z.string().min(1),
});
export type AdaptationResult = z.infer<typeof AdaptationResultSchema>;
