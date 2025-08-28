/**
 * @file graph-simple.ts
 * @description Cortex Kernel - Simplified State Machine (No LangGraph)
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */

import { nanoid } from 'nanoid';
import {
  createInitialPRPState,
  generateDeterministicHash,
  PRPState,
  validateStateTransition,
} from './state.js';
import { PRPOrchestrator } from './mcp/adapter.js';
import { startSpan, recordMetric } from './observability/otel.js';

interface Blueprint {
  title: string;
  description: string;
  requirements: string[];
}

interface RunOptions {
  runId?: string;
  deterministic?: boolean;
  id?: string;
}

/**
 * Simplified Cortex Kernel - Deterministic state machine for PRP workflows
 *
 * Implements the PRP state machine:
 * Strategy → Build → Evaluation → Completed
 *     ↓       ↓         ↓
 *   Recycled ←--------←
 */
export class SimplePRPGraph {
  private readonly orchestrator: PRPOrchestrator;
  private readonly executionHistory: Map<string, PRPState[]> = new Map();

  constructor(orchestrator: PRPOrchestrator) {
    this.orchestrator = orchestrator;
  }

  /**
   * Run a complete PRP workflow
   */
  async runPRPWorkflow(blueprint: Blueprint, options: RunOptions = {}): Promise<PRPState> {
    const workflowSpan = startSpan('prp.workflow');
    const startTime = Date.now();

    try {
      const deterministic = options.deterministic || false;
      const runId =
        options.runId ||
        (deterministic ? `prp-deterministic-${generateDeterministicHash(blueprint)}` : nanoid());

      const state = createInitialPRPState(blueprint, {
        runId,
        deterministic,
        id: options.id,
      });

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

        // Record metrics
        const duration = Date.now() - startTime;
        recordMetric('prp.duration', duration, 'milliseconds');
        recordMetric('prp.phases.completed', 3);

        // Final state
        workflowSpan.setStatus('OK');
        return evaluationState;
      } catch (error) {
        workflowSpan.setStatus('ERROR');
        const message = error instanceof Error ? error.message : 'Unknown error';
        workflowSpan.setAttribute('error.message', message);
        const errorState: PRPState = {
          ...state,
          phase: 'recycled',
          metadata: { ...state.metadata, error: message },
        };
        this.addToHistory(runId, errorState);
        return errorState;
      }
    } finally {
      workflowSpan.end();
    }
  }

  /**
   * Execute strategy phase
   */
  private async executeStrategyPhase(state: PRPState, deterministic = false): Promise<PRPState> {
    const strategySpan = startSpan('prp.strategy');

    try {
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

      strategySpan.setStatus('OK');
      return validateStateTransition(newState, buildState) ? buildState : newState;
    } catch (error) {
      strategySpan.setStatus('ERROR');
      strategySpan.setAttribute(
        'error.message',
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    } finally {
      strategySpan.end();
    }
  }

  /**
   * Execute build phase
   */
  private async executeBuildPhase(state: PRPState, deterministic = false): Promise<PRPState> {
    const buildSpan = startSpan('prp.build');

    try {
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

      buildSpan.setStatus('OK');
      return validateStateTransition(newState, evaluationState) ? evaluationState : newState;
    } catch (error) {
      buildSpan.setStatus('ERROR');
      buildSpan.setAttribute(
        'error.message',
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    } finally {
      buildSpan.end();
    }
  }

  /**
   * Execute evaluation phase
   */
  private async executeEvaluationPhase(state: PRPState, deterministic = false): Promise<PRPState> {
    const evaluationSpan = startSpan('prp.evaluation');

    try {
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

      evaluationSpan.setStatus('OK');
      return validateStateTransition(newState, completedState) ? completedState : newState;
    } catch (error) {
      evaluationSpan.setStatus('ERROR');
      evaluationSpan.setAttribute(
        'error.message',
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    } finally {
      evaluationSpan.end();
    }
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
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Maintain backward compatibility with former export name
export { SimplePRPGraph as CortexKernel };
