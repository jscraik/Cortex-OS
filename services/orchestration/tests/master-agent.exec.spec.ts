import { describe, expect, it, vi } from 'vitest';
import { AdapterRegistry } from '../src/adapters/adapterRegistry.js';
import type { GenerationAdapter, GenerationResponse } from '../src/adapters/types.js';
import { MasterAgentOrchestrator } from '../src/masterAgent.js';
import { LangGraphOrchestrator } from '../src/orchestrator.js';

describe('MasterAgentOrchestrator', () => {
	const createAdapter = (id: string): GenerationAdapter => ({
		id,
		isAvailable: vi.fn().mockResolvedValue(true),
		generate: vi.fn().mockImplementation(
			async () =>
				({
					output: `response-from-${id}`,
					adapterId: id,
					tokensUsed: 128,
				}) satisfies GenerationResponse,
		),
	});

	const orchestrator = () => {
		const adapter = createAdapter('mlx');
		const registry = new AdapterRegistry([adapter]);
		const langGraph = new LangGraphOrchestrator({
			entryNode: 'finish',
			nodes: {
				finish: async (context) => ({
					memory: { ...context.memory, status: 'done' },
					inputs: context.inputs,
				}),
			},
			edges: {
				finish: [],
			},
		});

		const master = new MasterAgentOrchestrator(registry, langGraph);
		return { master, adapter };
	};

	it('invokes registered adapters for every plan step', async () => {
		const { master, adapter } = orchestrator();

		const result = await master.execute({
			steps: [
				{
					id: 'step-1',
					adapterId: 'mlx',
					prompt: 'Summarise the user request',
				},
			],
			context: { memory: {}, inputs: { topic: 'safety' } },
		});

		expect(adapter.isAvailable).toHaveBeenCalledOnce();
		expect(adapter.generate).toHaveBeenCalledWith(
			expect.objectContaining({
				prompt: 'Summarise the user request',
			}),
		);
		expect(result.stepLogs).toHaveLength(1);
		expect(result.stepLogs[0]).toMatchObject({
			stepId: 'step-1',
			adapterId: 'mlx',
			output: 'response-from-mlx',
		});
		expect(result.workflow.executionLog.map((entry) => entry.nodeId)).toStrictEqual(['finish']);
	});

	it('fails fast when plan is empty', async () => {
		const { master } = orchestrator();

		await expect(
			master.execute({
				steps: [],
				context: { memory: {} },
			}),
		).rejects.toThrowError(/brAInwav orchestration received an empty plan/);
	});
});
