import { describe, expect, it, vi } from 'vitest';
import { createMemoryCoordinator } from '../../../../src/modern-agent-system/memory-adapter.js';
import { createPlanner } from '../../../../src/modern-agent-system/planner.js';
import { createWorkerRegistry } from '../../../../src/modern-agent-system/worker-registry.js';
import type {
        PlannerGoal,
        PlannerSessionState,
        SessionMemoryAdapter,
        WorkerDefinition,
} from '../../../../src/modern-agent-system/types.js';

const createMemoryAdapter = () => {
        const store = new Map<string, PlannerSessionState>();
        const appendEvent = vi.fn();
        const adapter: SessionMemoryAdapter = {
                loadSession: async (sessionId) => store.get(sessionId) ?? null,
                saveSession: async (sessionId, state) => {
                        store.set(sessionId, state);
                },
                appendEvent: async (sessionId, event) => {
                        appendEvent(sessionId, event);
                },
        };
        return { adapter, appendEvent };
};

const createWorker = (name: string, capability: string): WorkerDefinition => ({
        name,
        description: 'unit test worker',
        capabilities: [capability],
        handler: async () => ({ capability, worker: name, output: { handled: capability } }),
});

describe('createPlanner', () => {
        it('prepares a plan using registry capabilities and RAG context', async () => {
                const { adapter } = createMemoryAdapter();
                const memory = createMemoryCoordinator({
                        session: adapter,
                        rag: { retrieve: async () => [{ id: 'doc', content: 'context' }] },
                });
                const registry = createWorkerRegistry([createWorker('alpha', 'plan')]);
                const runner = { executePlan: vi.fn(), executeTask: vi.fn() };
                const planner = createPlanner({ registry, memory, runner });

                const goal: PlannerGoal = {
                        sessionId: 'session-1',
                        objective: 'plan work',
                        requiredCapabilities: ['plan'],
                };

                const plan = await planner.prepare(goal);
                expect(plan.steps).toHaveLength(1);
                expect(plan.steps[0]).toMatchObject({ capability: 'plan', worker: 'alpha', status: 'pending' });
                expect(plan.retrievedContext[0]?.content).toBe('context');
        });

        it('runs a plan by delegating to the worker runner', async () => {
                const { adapter } = createMemoryAdapter();
                const memory = createMemoryCoordinator({ session: adapter });
                const registry = createWorkerRegistry([createWorker('alpha', 'plan')]);
                const runner = {
                        executePlan: vi.fn(async () => [
                                {
                                        capability: 'plan',
                                        worker: 'alpha',
                                        status: 'completed' as const,
                                },
                        ]),
                        executeTask: vi.fn(),
                };
                const planner = createPlanner({ registry, memory, runner });

                const result = await planner.run({
                        sessionId: 'session-2',
                        objective: 'run plan',
                        requiredCapabilities: ['plan'],
                });

                expect(runner.executePlan).toHaveBeenCalled();
                expect(result.steps[0].status).toBe('completed');
        });
});
