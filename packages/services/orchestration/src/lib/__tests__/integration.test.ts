import { describe, expect, it } from 'vitest';
import { CancellationError, type CancellationResult } from '../cancellation';
import { CompensationManager } from '../compensation';
import { run, type Workflow } from '../executor';
import { HookManager } from '../hooks';

interface WorkflowWithHooks extends Workflow {
    hooks?: HookManager;
    compensation?: CompensationManager;
}

describe('integration tests', () => {
    it('integrates hooks and compensation in workflow execution', async () => {
        const executed: string[] = [];
        const hookEvents: string[] = [];
        const compensated: string[] = [];

        const hooks = new HookManager();
        hooks.addPreWorkflowHook(async () => {
            hookEvents.push('pre-workflow');
        });
        hooks.addPostWorkflowHook(async () => {
            hookEvents.push('post-workflow');
        });

        const compensation = new CompensationManager();
        compensation.registerCompensation('step1', async () => {
            compensated.push('step1-compensated');
        });
        compensation.registerCompensation('step2', async () => {
            compensated.push('step2-compensated');
        });

        const workflow: WorkflowWithHooks = {
            graph: { step1: ['step2'], step2: [] },
            steps: {
                step1: async () => {
                    executed.push('step1');
                },
                step2: async () => {
                    executed.push('step2');
                },
            },
            hooks,
            compensation,
        };

        await run(workflow, { workflowId: 'test-workflow' });

        expect(executed).toEqual(['step1', 'step2']);
        expect(hookEvents).toEqual(['pre-workflow', 'post-workflow']);
        expect(compensated).toEqual([]); // No compensation should run on success
    });

    it('triggers compensation on workflow failure', async () => {
        const executed: string[] = [];
        const compensated: string[] = [];

        const compensation = new CompensationManager();
        compensation.registerCompensation('step1', async () => {
            compensated.push('step1-compensated');
        });
        compensation.registerCompensation('step2', async () => {
            compensated.push('step2-compensated');
        });

        const workflow: WorkflowWithHooks = {
            graph: { step1: ['step2'], step2: [] },
            steps: {
                step1: async () => {
                    executed.push('step1');
                },
                step2: async () => {
                    executed.push('step2');
                    throw new Error('Step 2 failed');
                },
            },
            compensation,
        };

        await expect(
            run(workflow, { workflowId: 'test-workflow' }),
        ).rejects.toThrow('Step 2 failed');

        expect(executed).toEqual(['step1', 'step2']);
        expect(compensated).toEqual(['step2-compensated', 'step1-compensated']);
    });

    it('handles compensation failure gracefully', async () => {
        const executed: string[] = [];
        const compensated: string[] = [];

        const compensation = new CompensationManager();
        compensation.registerCompensation('step1', async () => {
            compensated.push('step1-compensated');
        });
        compensation.registerCompensation('step2', async () => {
            compensated.push('step2-compensated');
            throw new Error('Compensation failed');
        });

        const workflow: WorkflowWithHooks = {
            graph: { step1: ['step2'], step2: [] },
            steps: {
                step1: async () => {
                    executed.push('step1');
                },
                step2: async () => {
                    executed.push('step2');
                    throw new Error('Step 2 failed');
                },
            },
            compensation,
        };

        await expect(
            run(workflow, { workflowId: 'test-workflow' }),
        ).rejects.toThrow('Step 2 failed');

        expect(executed).toEqual(['step1', 'step2']);
        expect(compensated).toEqual(['step2-compensated', 'step1-compensated']); // step2 compensation failed but step1 still runs
    });

    describe('cancellation integration', () => {
        it('handles workflow cancellation with cleanup hooks', async () => {
            const executed: string[] = [];
            const hookEvents: string[] = [];
            const controller = new AbortController();

            const hooks = new HookManager();
            hooks.addPreWorkflowHook(async () => {
                hookEvents.push('pre-workflow');
            });
            hooks.addWorkflowCancelledHook(async () => {
                hookEvents.push('workflow-cancelled');
            });

            const workflow: WorkflowWithHooks = {
                graph: { step1: ['step2'], step2: [] },
                steps: {
                    step1: async () => {
                        executed.push('step1');
                        controller.abort(); // Cancel after step1
                    },
                    step2: async () => {
                        executed.push('step2');
                    },
                },
                hooks,
            };

            await expect(
                run(workflow, {
                    signal: controller.signal,
                    workflowId: 'test-workflow',
                    cancellation: { reason: 'Test cancellation' },
                }),
            ).rejects.toThrow(CancellationError);

            expect(executed).toEqual(['step1']);
            expect(hookEvents).toEqual(['pre-workflow', 'workflow-cancelled']);
        });

        it('performs partial rollback on cancellation', async () => {
            const executed: string[] = [];
            const compensated: string[] = [];
            const controller = new AbortController();

            const compensation = new CompensationManager();
            compensation.registerCompensation('step1', async () => {
                compensated.push('step1-compensated');
            });
            compensation.registerCompensation('step2', async () => {
                compensated.push('step2-compensated');
            });

            const workflow: WorkflowWithHooks = {
                graph: { step1: ['step2'], step2: [] },
                steps: {
                    step1: async () => {
                        executed.push('step1');
                        controller.abort(); // Cancel after step1
                    },
                    step2: async () => {
                        executed.push('step2');
                    },
                },
                compensation,
            };

            await expect(
                run(workflow, {
                    signal: controller.signal,
                    workflowId: 'test-workflow',
                    cancellation: { reason: 'Test cancellation' },
                }),
            ).rejects.toThrow(CancellationError);

            expect(executed).toEqual(['step1']);
            expect(compensated).toEqual(['step1-compensated']); // Only executed steps are compensated
        });

        it('integrates cancellation with hooks and compensation', async () => {
            const executed: string[] = [];
            const hookEvents: string[] = [];
            const compensated: string[] = [];
            const controller = new AbortController();
            let cancellationResult: CancellationResult | null = null;

            const hooks = new HookManager();
            hooks.addPreWorkflowHook(async () => {
                hookEvents.push('pre-workflow');
            });
            hooks.addWorkflowCancelledHook(async (ctx) => {
                hookEvents.push('workflow-cancelled');
                cancellationResult = ctx.metadata
                    ?.cancellationResult as CancellationResult;
            });

            const compensation = new CompensationManager();
            compensation.registerCompensation('step1', async () => {
                compensated.push('step1-compensated');
            });
            compensation.registerCompensation('step2', async () => {
                compensated.push('step2-compensated');
            });

            const workflow: WorkflowWithHooks = {
                graph: { step1: ['step2'], step2: [] },
                steps: {
                    step1: async () => {
                        executed.push('step1');
                        controller.abort(); // Cancel after step1
                    },
                    step2: async () => {
                        executed.push('step2');
                    },
                },
                hooks,
                compensation,
            };

            await expect(
                run(workflow, {
                    signal: controller.signal,
                    workflowId: 'integration-test',
                    cancellation: { reason: 'Integration test cancellation' },
                }),
            ).rejects.toThrow(CancellationError);

            expect(executed).toEqual(['step1']);
            expect(compensated).toEqual(['step1-compensated']);
            expect(hookEvents).toEqual(['pre-workflow', 'workflow-cancelled']);
            expect(cancellationResult).toBeDefined();
            expect(cancellationResult?.cancelled).toBe(true);
            expect(cancellationResult?.rolledBackSteps).toEqual(['step1']); // Contains step IDs that were rolled back
        });
    });
});
