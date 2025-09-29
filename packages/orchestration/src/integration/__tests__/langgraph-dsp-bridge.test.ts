import { describe, expect, it } from 'vitest';
import type {
  LongHorizonPlanner,
  LongHorizonTask,
  PlanningResult,
} from '../../lib/long-horizon-planner.js';
import { type PlanningContext, PlanningPhase } from '../../utils/dsp.js';
import type { AdaptiveCoordinationManager } from '../coordinator/adaptive-coordinator.js';
import { createLangGraphDSPBridge } from '../langgraph-dsp-bridge.js';
import type { PlanningContextManager } from '../lib/context-manager.js';
import type { Agent } from '../types.js';

// Minimal coordination result used in tests to avoid importing large types
type MinimalCoordinationResult = {
  taskId: string;
  strategy: string;
  assignments: Array<{ agentId: string; role?: string; weight?: number }>;
  confidence: number;
  telemetry?: unknown[];
  statePatch?: Record<string, unknown>;
};

describe('LangGraphDSPBridge (integration)', () => {
  it('executes integrated workflow and produces planning + coordination nodes', async () => {
    // Stubbed planner that invokes the provided executor for two phases
    const fakePlanner: Partial<LongHorizonPlanner> = {
      planTask: async (
        task: LongHorizonTask,
        executor: (phase: PlanningPhase, ctx: PlanningContext) => Promise<unknown>,
      ) => {
        const phases = [PlanningPhase.INITIALIZATION, PlanningPhase.ANALYSIS];
        for (const phase of phases) {
          const ctx = {
            id: task.id,
            metadata: { complexity: task.complexity, priority: task.priority },
            currentPhase: phase,
            steps: [],
            history: [],
            preferences: {},
            compliance: {},
          } as unknown as PlanningContext;
          await executor(phase, ctx);
        }

        const result: PlanningResult = {
          taskId: task.id,
          success: true,
          phases: [],
          totalDuration: 1,
          adaptiveDepth: 1,
          recommendations: [],
          brainwavMetadata: { createdBy: 'brAInwav', version: '1.0.0', timestamp: new Date() },
          security: {
            standards: [],
            lastCheckedAt: new Date(),
            aggregateRisk: 0,
            outstandingViolations: [],
            summary: '',
          },
        };

        return result;
      },
      getStats: () => ({ adaptiveDepth: 1 }),
    };

    const fakeCoordinationManager: Partial<AdaptiveCoordinationManager> = {
      setLongHorizonPlanner: (_planner: unknown) => {
        /* no-op */
      },
      coordinate: (_req: unknown) =>
        ({
          taskId: 't1',
          strategy: 'adaptive',
          assignments: [{ agentId: 'a1', role: 'generalist', weight: 1 }],
          confidence: 0.9,
          telemetry: [],
          statePatch: {},
        }) as unknown as MinimalCoordinationResult,
    };

    const fakeContextManager: Partial<PlanningContextManager> = {
      createContext: (_ctx: unknown) => {
        /* no-op */
      },
    };

    const bridge = createLangGraphDSPBridge(
      fakePlanner as unknown as LongHorizonPlanner,
      fakeCoordinationManager as unknown as AdaptiveCoordinationManager,
      fakeContextManager as unknown as PlanningContextManager,
      { enableStateFlow: true },
    );

    const task: LongHorizonTask = {
      id: 't1',
      description: 'test',
      complexity: 3,
      priority: 5,
      estimatedDuration: 1000,
      dependencies: [],
      metadata: {},
    };

    const agents: Agent[] = [{ id: 'a1' } as unknown as Agent];
    const constraints = { maxDuration: 10000, maxAgents: 1, requiredCapabilities: [] };

    const res = await bridge.executeIntegratedWorkflow(task, agents, constraints);

    expect(res.planningResult.success).toBe(true);
    // our fake coordinator returns 1 assignment
    expect(
      (res.coordinationResult as unknown as MinimalCoordinationResult).assignments.length,
    ).toBeGreaterThan(0);
    expect(res.workflowState.nodes.size).toBeGreaterThan(0);
    expect(res.workflowState.transitions.length).toBeGreaterThanOrEqual(1);
  });
});
