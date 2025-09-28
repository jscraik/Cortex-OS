import { describe, expect, it } from 'vitest';
import { PlanningContextManager } from '../../src/dsp/planning-context-manager.js';
import { PlanningPhase, type PlanningContext } from '../../src/utils/dsp.js';

function buildContext(overrides: Partial<PlanningContext> = {}): PlanningContext {
        return {
                id: overrides.id ?? 'ctx-1',
                workspaceId: overrides.workspaceId,
                currentPhase: overrides.currentPhase ?? PlanningPhase.INITIALIZATION,
                steps:
                        overrides.steps ??
                        Array.from({ length: 5 }, (_, index) => ({
                                phase: PlanningPhase.ANALYSIS,
                                action: `step-${index}`,
                                status: 'completed',
                                timestamp: new Date(2025, 0, index + 1),
                        })),
                history:
                        overrides.history ??
                        Array.from({ length: 5 }, (_, index) => ({
                                decision: `decision-${index}`,
                                outcome: index % 2 === 0 ? 'success' : 'failure',
                                learned: 'keep-iterating',
                                timestamp: new Date(2025, 0, index + 1),
                        })),
                metadata: {
                        createdBy: 'brAInwav',
                        createdAt: new Date(2025, 0, 1),
                        updatedAt: new Date(2025, 0, 1),
                        complexity: 5,
                        priority: 5,
                        ...(overrides.metadata ?? {}),
                },
        };
}

describe('PlanningContextManager', () => {
        it('trims context history and steps when registering snapshots', () => {
                const manager = new PlanningContextManager({ historyLimit: 2, stepLimit: 2 });
                const context = buildContext();

                manager.register('task-ctx', context);
                const snapshot = manager.snapshot('task-ctx');

                expect(snapshot?.history.length).toBe(2);
                expect(snapshot?.steps.length).toBe(2);

                snapshot?.history.forEach((entry) => expect(entry.timestamp).toBeInstanceOf(Date));
                snapshot?.steps.forEach((step) => expect(step.timestamp).toBeInstanceOf(Date));
        });

        it('returns isolated clones so mutations do not leak into stored snapshots', () => {
                const manager = new PlanningContextManager({ historyLimit: 3, stepLimit: 3 });
                const context = buildContext();

                manager.register('task-ctx', context);
                const isolated = manager.isolate('task-ctx', context);
                isolated.steps[0].action = 'mutated-step';

                const snapshot = manager.snapshot('task-ctx');
                expect(snapshot?.steps[0].action).not.toBe('mutated-step');
        });

        it('evicts oldest contexts once the limit is exceeded', () => {
                const manager = new PlanningContextManager({ maxContexts: 2 });
                manager.register('task-a', buildContext({ id: 'a' }));
                manager.register('task-b', buildContext({ id: 'b' }));
                manager.register('task-c', buildContext({ id: 'c' }));

                expect(manager.size).toBe(2);
                expect(manager.snapshot('task-a')).toBeUndefined();
                expect(manager.snapshot('task-c')?.id).toBe('c');
        });
});
