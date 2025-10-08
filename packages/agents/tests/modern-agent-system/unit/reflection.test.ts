import { describe, expect, it } from 'vitest';
import { StreamingManager } from '../../../src/langgraph/streaming.ts';
import { createReflectionModule } from '../../../src/modern-agent-system/reflection.ts';
import type {
        PlannerExecutionResult,
        PlannerGoal,
        PlannerPlan,
        PlannerReasoning,
        PlannerStepRecord,
} from '../../../src/modern-agent-system/types.ts';

const buildStep = (override: Partial<PlannerStepRecord> = {}): PlannerStepRecord => ({
        capability: override.capability ?? 'plan',
        worker: override.worker ?? 'alpha',
        status: override.status ?? 'completed',
        input: override.input ?? {},
        output: override.output,
        error: override.error,
        completedAt: override.completedAt,
});

const buildReasoning = (strategy: PlannerReasoning['strategy'], alternatives = 0): PlannerReasoning => ({
        strategy,
        decision: 'test-decision',
        thoughts: [{ id: 'thought-1', text: 'test thought' }],
        alternatives:
                alternatives > 0
                        ? Array.from({ length: alternatives }, (_, i) => ({
                                        path: [`cap-${i + 1}`],
                                        score: 0.5,
                                        summary: `Alt ${i + 1}`,
                                }))
                        : undefined,
});

const buildPlan = (goal: PlannerGoal, steps: PlannerStepRecord[]): PlannerPlan => ({
        goal,
        steps,
        retrievedContext: [],
        reasoning: buildReasoning('chain-of-thought'),
});

const buildExecution = (
        goal: PlannerGoal,
        steps: PlannerStepRecord[],
        reasoning: PlannerReasoning,
): PlannerExecutionResult => ({
        goal,
        steps,
        context: [],
        reasoning,
});

describe('Reflection module', () => {
        const reflection = createReflectionModule();

        it('returns acceptance feedback when all steps succeed', async () => {
                const goal: PlannerGoal = {
                        sessionId: 'session-1',
                        objective: 'deliver feature',
                        requiredCapabilities: ['plan'],
                        strategy: 'chain-of-thought',
                };
                const steps = [buildStep({ capability: 'plan', status: 'completed' })];
                const plan = buildPlan(goal, steps);
                const execution = buildExecution(goal, steps, buildReasoning('chain-of-thought'));

                const outcome = await reflection.reflect({ goal, plan, lastResult: execution });

                expect(outcome.feedback.status).toBe('accepted');
                expect(outcome.feedback.summary).toContain('all 1 step(s) completed');
                expect(outcome.feedback.improvements).toContain('Leverage retrieved context to enhance final deliverable.');
                expect(outcome.nextGoal).toBeUndefined();
        });

        it('suggests retries and next goal when failures occur', async () => {
                const goal: PlannerGoal = {
                        sessionId: 'session-2',
                        objective: 'ship hotfix',
                        requiredCapabilities: ['plan', 'deploy'],
                        strategy: 'chain-of-thought',
                };
                const planSteps = [buildStep({ capability: 'plan' }), buildStep({ capability: 'deploy' })];
                const plan = buildPlan(goal, planSteps);
                const execution = buildExecution(
                        goal,
                        [buildStep({ capability: 'plan' }), buildStep({ capability: 'deploy', status: 'failed', error: 'timeout' })],
                        buildReasoning('chain-of-thought'),
                );

                const outcome = await reflection.reflect({ goal, plan, lastResult: execution });

                expect(outcome.feedback.status).toBe('retry');
                expect(outcome.feedback.improvements[0]).toContain('Retry capability "deploy"');
                expect(outcome.nextGoal?.requiredCapabilities[0]).toBe('deploy');
        });

        it('leverages tree-of-thought alternatives for improvements', async () => {
                const goal: PlannerGoal = {
                        sessionId: 'session-3',
                        objective: 'prepare release',
                        requiredCapabilities: ['plan', 'validate', 'deploy', 'announce'],
                        strategy: 'tree-of-thought',
                };
                const planSteps = goal.requiredCapabilities.map((cap) => buildStep({ capability: cap }));
                const plan = buildPlan(goal, planSteps);
                const execution = buildExecution(
                        goal,
                        planSteps,
                        buildReasoning('tree-of-thought', 2),
                );

                const outcome = await reflection.reflect({ goal, plan, lastResult: execution });

                expect(outcome.feedback.status).toBe('accepted');
                expect(outcome.feedback.improvements.some((msg) => msg.includes('Explore alternative branch'))).toBe(true);
        });
});

describe('FastMCP streaming compatibility', () => {
        it('buffers FastMCP async iterators without dropping events', async () => {
                const manager = new StreamingManager({ bufferSize: 2, flushInterval: 5, mode: 'updates' });
                const batches: unknown[][] = [];
                manager.on('batch', (batch) => {
                        batches.push(batch as unknown[]);
                });

                const graph = {
                        async stream() {
                                async function* iterator() {
                                        yield { data: { currentStep: 'fastmcp.generate' }, currentStep: 'fastmcp.generate' };
                                        await new Promise((resolve) => setTimeout(resolve, 0));
                                        yield { data: { currentStep: 'reflection' }, currentStep: 'reflection' };
                                }
                                return iterator();
                        },
                };

                await manager.streamExecution(graph as any, { currentStep: 'init' } as any, {
                        threadId: 'fastmcp-test',
                } as any);
                await new Promise((resolve) => setTimeout(resolve, 20));

                expect(batches.length).toBeGreaterThanOrEqual(1);
                const flattened = batches.flat();
                expect(flattened.some((event: any) => event.type === 'node_start')).toBe(true);
                expect(flattened.some((event: any) => event.type === 'node_finish')).toBe(true);
        });
});
