/**
 * @file state.ts
 * @description Cortex Kernel State Management - Deterministic PRP State Schema
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */

import { z } from 'zod';
import { generateId } from './utils/id.js';

/**
 * Evidence captured during PRP execution
 */
export const EvidenceSchema = z.object({
  id: z.string(),
  type: z.enum(['file', 'command', 'test', 'analysis', 'validation', 'llm-generation']),
  source: z.string(),
  content: z.string(),
  timestamp: z.string(),
  phase: z.enum(['strategy', 'build', 'evaluation']),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Validation gate results for each phase
 */
export const ValidationGateSchema = z.object({
  passed: z.boolean(),
  blockers: z.array(z.string()),
  majors: z.array(z.string()),
  evidence: z.array(z.string()), // Evidence IDs
  timestamp: z.string(),
});

/**
 * Cerebrum decision state
 */
export const CerebrumDecisionSchema = z.object({
  decision: z.enum(['promote', 'recycle', 'pending']),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
  timestamp: z.string(),
});

/**
 * Core PRP State following the state machine diagram
 */
export const PRPStateSchema = z.object({
  // Core identifiers
  id: z.string(),
  runId: z.string(),

  // State machine phase
  phase: z.enum(['strategy', 'build', 'evaluation', 'completed', 'recycled']),

  // Input blueprint
  blueprint: z.object({
    title: z.string(),
    description: z.string(),
    requirements: z.array(z.string()),
    metadata: z.record(z.unknown()).optional(),
  }),

  // Execution outputs by neuron ID
  outputs: z.record(z.unknown()),

  // Validation results by phase
  validationResults: z.object({
    strategy: ValidationGateSchema.optional(),
    build: ValidationGateSchema.optional(),
    evaluation: ValidationGateSchema.optional(),
  }),

  // Evidence collection
  evidence: z.array(EvidenceSchema),

  // Cerebrum decision
  cerebrum: CerebrumDecisionSchema.optional(),

  // Execution metadata
  metadata: z.object({
    startTime: z.string(),
    endTime: z.string().optional(),
    currentNeuron: z.string().optional(),
    llmConfig: z
      .object({
        provider: z.enum(['mlx', 'ollama']).optional(),
        model: z.string().optional(),
      })
      .optional(),
    executionContext: z.record(z.unknown()).optional(),
    deterministic: z.boolean().optional(),
    // Teaching layer extensions
    validationAdjustments: z.record(z.unknown()).optional(),
    gateModifications: z.record(z.unknown()).optional(),
    workflowAlterations: z.record(z.unknown()).optional(),
    // Error tracking
    error: z.string().optional(),
  }),

  // Checkpointing for determinism
  checkpoints: z
    .array(
      z.object({
        id: z.string(),
        timestamp: z.string(),
        phase: z.enum(['strategy', 'build', 'evaluation', 'completed', 'recycled']),
        state: z.record(z.unknown()),
      }),
    )
    .optional(),
});

export type PRPState = z.infer<typeof PRPStateSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type ValidationGate = z.infer<typeof ValidationGateSchema>;
export type CerebrumDecision = z.infer<typeof CerebrumDecisionSchema>;

/**
 * State transition validation
 */
export const validateStateTransition = (fromState: PRPState, toState: PRPState): boolean => {
  const fromPhase = fromState.phase;
  const toPhase = toState.phase;
  const validTransitions: Record<PRPState['phase'], PRPState['phase'][]> = {
    strategy: ['build', 'recycled'],
    build: ['evaluation', 'recycled'],
    evaluation: ['completed', 'recycled'],
    completed: [], // Terminal state
    recycled: ['strategy'], // Can restart
  };

  return validTransitions[fromPhase]?.includes(toPhase) ?? false;
};

/**
 * Create initial PRP state
 */
export const createInitialPRPState = (
  blueprint: PRPState['blueprint'],
  options: {
    id?: string;
    runId?: string;
    llmConfig?: PRPState['metadata']['llmConfig'];
    deterministic?: boolean;
  } = {},
): PRPState => {
  const now = options.deterministic ? '2025-08-21T00:00:00.000Z' : new Date().toISOString();
  const id = options.id ?? generateId('prp', options.deterministic);
  const runId = options.runId ?? generateId('run', options.deterministic);

  return {
    id,
    runId,
    phase: 'strategy',
    blueprint,
    outputs: {},
    validationResults: {},
    evidence: [],
    metadata: {
      startTime: now,
      llmConfig: options.llmConfig,
      deterministic: options.deterministic,
    },
  };
};
