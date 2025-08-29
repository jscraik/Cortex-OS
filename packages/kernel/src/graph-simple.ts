/**
 * @file graph-simple.ts
 * @description Cortex Kernel - Simplified State Machine (No LangGraph)
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */

import { PRPState, validateStateTransition, createInitialPRPState } from './state.js';
import { nanoid } from 'nanoid';
import type { PRPOrchestrator } from '@cortex-os/prp-runner';

interface Blueprint {
  title: string;
  description: string;
  requirements: string[];
}

interface RunOptions {
  runId?: string;
  deterministic?: boolean;
}

/**
 * Execute the PRP workflow sequence for a blueprint.
 */
export async function runPRPWorkflow(
  blueprint: Blueprint,
  orchestrator: PRPOrchestrator,
  options: RunOptions = {},
): Promise<PRPState> {
  const runId = options.runId || nanoid();
  const deterministic = options.deterministic || false;
  const state = createInitialPRPState(blueprint, { runId, deterministic });

  try {
    const strategyState = await executeStrategyPhase(state, deterministic);
    if (strategyState.phase === 'recycled') {
      return strategyState;
    }

    const buildState = await executeBuildPhase(strategyState, deterministic);
    if (buildState.phase === 'recycled') {
      return buildState;
    }

    const evaluationState = await executeEvaluationPhase(buildState, deterministic);
    return evaluationState;
  } catch (error) {
    return {
      ...state,
      phase: 'recycled',
      metadata: {
        ...state.metadata,
        error: error instanceof Error ? error.message : 'Unknown error',
        endTime: new Date().toISOString(),
      },
    };
  }
}

/**
 * Factory to create kernel function handles.
 */
export function createKernel(orchestrator: PRPOrchestrator) {
  return {
    getNeuronCount: () => orchestrator.getNeuronCount(),
    runPRPWorkflow: (blueprint: Blueprint, opts: RunOptions = {}) =>
      runPRPWorkflow(blueprint, orchestrator, opts),
  };
}

// Phase executors
async function executeStrategyPhase(state: PRPState, deterministic = false): Promise<PRPState> {
  const newState: PRPState = {
    ...state,
    phase: 'strategy',
    metadata: {
      ...state.metadata,
      currentNeuron: 'strategy-neuron',
    },
  };

  await simulateWork(100, { deterministic });

  newState.validationResults.strategy = {
    passed: true,
    blockers: [],
    majors: [],
    evidence: [],
    timestamp: deterministic ? '2025-08-21T00:00:01.000Z' : new Date().toISOString(),
  };

  const buildState: PRPState = {
    ...newState,
    phase: 'build',
  };

  return validateStateTransition(newState, buildState) ? buildState : newState;
}

async function executeBuildPhase(state: PRPState, deterministic = false): Promise<PRPState> {
  const newState: PRPState = {
    ...state,
    phase: 'build',
    metadata: {
      ...state.metadata,
      currentNeuron: 'build-neuron',
    },
  };

  await simulateWork(150, { deterministic });

  newState.validationResults.build = {
    passed: true,
    blockers: [],
    majors: [],
    evidence: [],
    timestamp: deterministic ? '2025-08-21T00:00:02.000Z' : new Date().toISOString(),
  };

  const evaluationState: PRPState = {
    ...newState,
    phase: 'evaluation',
  };

  return validateStateTransition(newState, evaluationState) ? evaluationState : newState;
}

async function executeEvaluationPhase(state: PRPState, deterministic = false): Promise<PRPState> {
  const newState: PRPState = {
    ...state,
    phase: 'evaluation',
    metadata: {
      ...state.metadata,
      currentNeuron: 'evaluation-neuron',
    },
  };

  await simulateWork(100, { deterministic });

  newState.validationResults.evaluation = {
    passed: true,
    blockers: [],
    majors: [],
    evidence: [],
    timestamp: deterministic ? '2025-08-21T00:00:03.000Z' : new Date().toISOString(),
  };

  newState.cerebrum = {
    decision: 'promote',
    reasoning: 'All validation gates passed successfully',
    confidence: 0.95,
    timestamp: deterministic ? '2025-08-21T00:00:04.000Z' : new Date().toISOString(),
  };

  const completedState: PRPState = {
    ...newState,
    phase: 'completed',
    metadata: {
      ...newState.metadata,
      endTime: deterministic ? '2025-08-21T00:00:05.000Z' : new Date().toISOString(),
    },
  };

  return validateStateTransition(newState, completedState) ? completedState : newState;
}

async function simulateWork(ms: number, options?: { deterministic?: boolean }): Promise<void> {
  if (options?.deterministic) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}
