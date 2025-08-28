/**
 * @file graph-simple.ts
 * @description Cortex Kernel - Simplified State Machine (No LangGraph)
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */

import { PRPState, validateStateTransition, createInitialPRPState } from './state.js';
import { nanoid } from 'nanoid';

// Import real interfaces from prp-runner
interface PRPOrchestrator {
  getNeuronCount(): number;
  // Real orchestrator interface - simplified for testing
}

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
 * Simplified Cortex Kernel - Deterministic state machine for PRP workflows
 * 
 * Implements the PRP state machine:
 * Strategy → Build → Evaluation → Completed
 *     ↓       ↓         ↓
 *   Recycled ←--------←
 */
export class CortexKernel {
  protected orchestrator: PRPOrchestrator;
  private executionHistory: Map<string, PRPState[]> = new Map();

  constructor(orchestrator: PRPOrchestrator) {
    this.orchestrator = orchestrator;
  }

  /**
   * Run a complete PRP workflow
   */
  async runPRPWorkflow(blueprint: Blueprint, options: RunOptions = {}): Promise<PRPState> {
    const runId = options.runId || (options.deterministic 
      ? `prp-deterministic-${Math.abs(JSON.stringify(blueprint).split('').reduce((a,b) => ((a << 5) - a + b.charCodeAt(0))|0, 0))}`
      : nanoid());
    
    const deterministic = options.deterministic || false;
    const state = createInitialPRPState(blueprint, { runId, deterministic });
    
    // Initialize execution history
    this.executionHistory.set(runId, []);
    this.addToHistory(runId, state);

    try {
      // Execute strategy phase
      const strategyState = await this.executeStrategyPhase(state, deterministic);
      this.addToHistory(runId, strategyState);

      // Check if we should proceed or recycle
      if (strategyState.phase === 'recycled') {
        return strategyState;
      }

      // Execute build phase
      const buildState = await this.executeBuildPhase(strategyState, deterministic);
      this.addToHistory(runId, buildState);

      if (buildState.phase === 'recycled') {
        return buildState;
      }

      // Execute evaluation phase
      const evaluationState = await this.executeEvaluationPhase(buildState, deterministic);
      this.addToHistory(runId, evaluationState);

      // Final state
      return evaluationState;

    } catch (error) {
      const errorState: PRPState = {
        ...state,
        phase: 'recycled',
        metadata: {
          ...state.metadata,
          error: error instanceof Error ? error.message : 'Unknown error',
          endTime: new Date().toISOString(),
        },
      };
      this.addToHistory(runId, errorState);
      return errorState;
    }
  }

  /**
   * Execute strategy phase
   */
  private async executeStrategyPhase(state: PRPState, deterministic = false): Promise<PRPState> {
    const newState: PRPState = {
      ...state,
      phase: 'strategy',
      metadata: {
        ...state.metadata,
        currentNeuron: 'strategy-neuron',
      },
    };

    // Simulate strategy work
    await this.simulateWork(100, { deterministic });

    // Add strategy validation results
    newState.validationResults.strategy = {
      passed: true,
      blockers: [],
      majors: [],
      evidence: [],
      timestamp: deterministic ? '2025-08-21T00:00:01.000Z' : new Date().toISOString(),
    };

    // Transition to build
    const buildState: PRPState = {
      ...newState,
      phase: 'build',
    };

    return validateStateTransition(newState, buildState) ? buildState : newState;
  }

  /**
   * Execute build phase  
   */
  private async executeBuildPhase(state: PRPState, deterministic = false): Promise<PRPState> {
    const newState: PRPState = {
      ...state,
      phase: 'build',
      metadata: {
        ...state.metadata,
        currentNeuron: 'build-neuron',
      },
    };

    // Simulate build work
    await this.simulateWork(150, { deterministic });

    // Add build validation results
    newState.validationResults.build = {
      passed: true,
      blockers: [],
      majors: [],
      evidence: [],
      timestamp: deterministic ? '2025-08-21T00:00:02.000Z' : new Date().toISOString(),
    };

    // Transition to evaluation
    const evaluationState: PRPState = {
      ...newState,
      phase: 'evaluation',
    };

    return validateStateTransition(newState, evaluationState) ? evaluationState : newState;
  }

  /**
   * Execute evaluation phase
   */
  private async executeEvaluationPhase(state: PRPState, deterministic = false): Promise<PRPState> {
    const newState: PRPState = {
      ...state,
      phase: 'evaluation',
      metadata: {
        ...state.metadata,
        currentNeuron: 'evaluation-neuron',
      },
    };

    // Simulate evaluation work
    await this.simulateWork(100, { deterministic });

    // Add evaluation validation results
    newState.validationResults.evaluation = {
      passed: true,
      blockers: [],
      majors: [],
      evidence: [],
      timestamp: deterministic ? '2025-08-21T00:00:03.000Z' : new Date().toISOString(),
    };

    // Final cerebrum decision
    newState.cerebrum = {
      decision: 'promote',
      reasoning: 'All validation gates passed successfully',
      confidence: 0.95,
      timestamp: deterministic ? '2025-08-21T00:00:04.000Z' : new Date().toISOString(),
    };

    // Complete the workflow
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

  /**
   * Get execution history for a run
   */
  getExecutionHistory(runId: string): PRPState[] {
    return this.executionHistory.get(runId) || [];
  }

  /**
   * Add state to execution history
   */
  private addToHistory(runId: string, state: PRPState): void {
    const history = this.executionHistory.get(runId) || [];
    history.push(state);
    this.executionHistory.set(runId, history);
  }

  /**
   * Simulate work delay for determinism testing
   */
  private async simulateWork(ms: number, options?: { deterministic?: boolean }): Promise<void> {
    if (options?.deterministic) {
      return Promise.resolve(); // Skip timing in deterministic mode
    }
    return new Promise(resolve => setTimeout(resolve, ms));
  }

}