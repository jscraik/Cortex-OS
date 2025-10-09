import { describe, expect, it, vi } from 'vitest';
import type {
	PlannerGoal,
	PlannerSessionState,
	SessionMemoryAdapter,
	WorkerDefinition,
} from '../../../../src/modern-agent-system/types.js';
import { createMemoryCoordinator } from '../../../src/modern-agent-system/memory-adapter.ts';
import { createPlanner } from '../../../src/modern-agent-system/planner.ts';
import { createWorkerRegistry } from '../../../src/modern-agent-system/worker-registry.ts';

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
	return { adapter, appendEvent, store };
};

const createWorker = (name: string, capability: string): WorkerDefinition => ({
	name,
	description: 'unit test worker',
	capabilities: [capability],
	handler: async () => ({ capability, worker: name, output: { handled: capability } }),
});

describe('createPlanner', () => {
	it('prepares a plan using registry capabilities and RAG context', async () => {
		const { adapter, store } = createMemoryAdapter();
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
		expect(plan.reasoning.strategy).toBe('chain-of-thought');
		expect(plan.reasoning.thoughts).toHaveLength(1);

		const stored = store.get(goal.sessionId);
		expect(stored?.reasoning?.strategy).toBe('chain-of-thought');
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
		expect(result.reasoning.strategy).toBe('chain-of-thought');
	});

	it('generates tree-of-thought reasoning for complex goals', async () => {
		const { adapter } = createMemoryAdapter();
		const memory = createMemoryCoordinator({ session: adapter });
		const registry = createWorkerRegistry([
			createWorker('alpha', 'ingest'),
			createWorker('beta', 'summarise'),
			createWorker('gamma', 'validate'),
			createWorker('delta', 'deploy'),
		]);
		const runner = { executePlan: vi.fn(), executeTask: vi.fn() };
		const planner = createPlanner({ registry, memory, runner });

		const goal: PlannerGoal = {
			sessionId: 'session-3',
			objective: 'ship release candidate',
			requiredCapabilities: ['ingest', 'summarise', 'validate', 'deploy'],
		};

		const plan = await planner.prepare(goal);
		expect(plan.reasoning.strategy).toBe('tree-of-thought');
		expect(plan.reasoning.alternatives?.length).toBeGreaterThanOrEqual(1);
		expect(plan.reasoning.thoughts.map((t) => t.capability)).toContain('deploy');
	});

	it('captures vendor weighting when the anthropic provider is requested', async () => {
		const { adapter } = createMemoryAdapter();
		const memory = createMemoryCoordinator({ session: adapter });
		const registry = createWorkerRegistry([createWorker('alpha', 'plan')]);
		const runner = { executePlan: vi.fn(), executeTask: vi.fn() };
		const planner = createPlanner({ registry, memory, runner });

		const goal: PlannerGoal = {
			sessionId: 'session-anthropic',
			objective: 'capture vendor weighting',
			requiredCapabilities: ['plan'],
			input: { provider: 'anthropic' },
		};

		const plan = await planner.prepare(goal);
		expect(plan.reasoning.vendorWeighting).toMatchInlineSnapshot(`
{
  "claude-3-5-haiku": 0.38,
  "claude-3-5-sonnet": 0.62,
}
`);
	});
});
