import { describe, expect, it } from 'vitest';
import { PlanningContextManager } from '../../src/dsp/planning-context-manager.js';
import {
        InMemoryPlanningPersistence,
        LongHorizonPlanner,
        type LongHorizonTask,
} from '../../src/lib/long-horizon-planner.js';
import { PlanningPhase, type PlanningContext } from '../../src/utils/dsp.js';

class RecordingPersistence extends InMemoryPlanningPersistence {
        public saved?: Parameters<InMemoryPlanningPersistence['save']>[0];
        public phases: Array<{ phase: PlanningPhase; success: boolean }> = [];

        override async save(result: Parameters<InMemoryPlanningPersistence['save']>[0]): Promise<void> {
                this.saved = result;
                await super.save(result);
        }

        override async recordPhase(record: Parameters<InMemoryPlanningPersistence['recordPhase']>[0]): Promise<void> {
                this.phases.push({ phase: record.phase, success: record.success });
                await super.recordPhase(record);
        }
}

describe('LongHorizonPlanner', () => {
        it('isolates contexts and persists each planning phase', async () => {
                const baseDate = new Date('2025-01-01T00:00:00.000Z');
                const clock = () => new Date(baseDate);
                const contextManager = new PlanningContextManager({ historyLimit: 2, stepLimit: 2, clock });
                const persistence = new RecordingPersistence();
                const planner = new LongHorizonPlanner({
                        contextManager,
                        persistenceAdapter: persistence,
                        clock,
                        maxPlanningTime: 10_000,
                });

                const task: LongHorizonTask = {
                        id: 'task-11',
                        description: 'Execute DSP roadmap phase validation',
                        complexity: 7,
                        priority: 6,
                        estimatedDuration: 90_000,
                        dependencies: ['context-manager'],
                        metadata: { capabilities: ['analysis', 'execution'] },
                };

                const observedContexts = new Set<string>();
                const executor = async (_phase: PlanningPhase, context: PlanningContext) => {
                        observedContexts.add(`${context.id}:${context.steps.length}`);
                        expect(context).not.toBe(planner.getCurrentContext());
                        return { snapshotSteps: context.steps.length, id: context.id };
                };

                const result = await planner.planAndExecute(task, executor);

                expect(result.success).toBe(true);
                expect(result.phases.length).toBeGreaterThan(0);
                expect(persistence.saved?.taskId).toBe('task-11');
                expect(persistence.phases.map((entry) => entry.phase)).toEqual(result.phases.map((entry) => entry.phase));
                expect(persistence.phases.every((entry) => entry.success)).toBe(true);
                expect(observedContexts.size).toBe(result.phases.length);

                const snapshot = contextManager.snapshot('task-11');
                expect(snapshot?.history.length ?? 0).toBeLessThanOrEqual(2);
                expect(snapshot?.steps.length ?? 0).toBeLessThanOrEqual(2);
        });
});
