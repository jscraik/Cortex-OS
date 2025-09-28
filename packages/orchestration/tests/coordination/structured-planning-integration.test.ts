import { describe, expect, it } from 'vitest';
import { executePlannedWorkflow } from '../../src/langgraph/planning-orchestrator.js';
import { LongHorizonPlanner, InMemoryPlanningPersistence } from '../../src/lib/long-horizon-planner.js';
import { PlanningContextManager } from '../../src/dsp/planning-context-manager.js';
import { AdaptiveCoordinationManager } from '../../src/coordinator/adaptive-coordinator.js';

const tickingClock = () => {
        let tick = 0;
        return () => new Date(1_735_680_000_000 + tick++ * 1_000);
};

describe('executePlannedWorkflow', () => {
        it('synchronises planning outputs with LangGraph state transitions', async () => {
                const clock = tickingClock();
                const contextManager = new PlanningContextManager({ historyLimit: 3, stepLimit: 3, clock });
                const persistence = new InMemoryPlanningPersistence();
                const planner = new LongHorizonPlanner({
                        contextManager,
                        persistenceAdapter: persistence,
                        clock,
                });
                const coordinationManager = new AdaptiveCoordinationManager({ clock });

                const result = await executePlannedWorkflow({
                        input: 'brAInwav orchestrator integration',
                        task: {
                                id: 'structured-integration',
                                description: 'Validate Phase 11 integration path',
                                complexity: 8,
                                priority: 7,
                                estimatedDuration: 75_000,
                                dependencies: ['planner', 'coordinator'],
                                metadata: { capabilities: ['analysis', 'execution'] },
                        },
                        planner,
                        coordinationManager,
                        clock,
                });

                expect(result.output).toBe('brAInwav orchestrator integration');
                expect(result.planningResult.success).toBe(true);
                expect(result.stateTransitions.length).toBe(result.planningResult.phases.length);
                expect(result.state.ctx?.planning?.phases.length).toBe(result.planningResult.phases.length);
                expect(result.state.ctx?.coordination?.strategy).toBe(result.coordinationDecision.strategy);
                expect(result.state.ctx?.telemetry?.[0].branding).toBe('brAInwav');
        });
});
