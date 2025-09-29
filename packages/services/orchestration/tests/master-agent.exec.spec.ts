import type { SubAgentConfig } from '@cortex-os/agents';
import type { ToolDispatchJob } from '@cortex-os/orchestration';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const orchestrationHarness = vi.hoisted(() => {
	const recordedJobs: ToolDispatchJob[] = [];
	const dispatchSpy = vi.fn(async (jobs: ToolDispatchJob[], _options: unknown) => {
		recordedJobs.length = 0;
		recordedJobs.push(...jobs);
		const results = [] as Array<{
			id: string;
			name: string;
			status: 'fulfilled';
			value: unknown;
			durationMs: number;
			tokensUsed: number;
			started: boolean;
			metadata?: Record<string, unknown>;
		}>;
		for (const job of jobs) {
			const value = await job.execute(job.input);
			results.push({
				id: job.id,
				name: job.name,
				status: 'fulfilled',
				value,
				durationMs: 2,
				tokensUsed: job.estimateTokens ?? 0,
				started: true,
				metadata: job.metadata,
			});
		}
		return results;
	});
	return {
		recordedJobs,
		dispatchSpy,
	};
});

const mlxAdapterFactory = vi.hoisted(() => {
	const instances: Array<{
		isAvailable: ReturnType<typeof vi.fn>;
		generateChat: ReturnType<typeof vi.fn>;
	}> = [];
	const factory = vi.fn(() => {
		const adapter = {
			isAvailable: vi.fn().mockResolvedValue(true),
			generateChat: vi.fn().mockResolvedValue({
				content: 'brAInwav MLX dispatch success',
				model: 'glm-4.5-mlx',
			}),
		};
		instances.push(adapter);
		return adapter;
	});
	return {
		factory,
		instances,
	};
});

const ollamaAdapterFactory = vi.hoisted(() => {
	const instances: Array<{
		generateChat: ReturnType<typeof vi.fn>;
	}> = [];
	const factory = vi.fn(() => {
		const adapter = {
			generateChat: vi.fn().mockResolvedValue({
				content: 'brAInwav Ollama dispatch success',
				model: 'brAInwav-ollama-dev',
			}),
		};
		instances.push(adapter);
		return adapter;
	});
	return {
		factory,
		instances,
	};
});

vi.mock('@cortex-os/orchestration', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@cortex-os/orchestration')>();
	return {
		...actual,
		dispatchTools: orchestrationHarness.dispatchSpy,
	};
});

vi.mock('@cortex-os/model-gateway', () => ({
	createMLXAdapter: mlxAdapterFactory.factory,
	createOllamaAdapter: ollamaAdapterFactory.factory,
}));

describe('brAInwav master agent LangGraph execution', () => {
	beforeEach(() => {
		orchestrationHarness.dispatchSpy.mockClear();
		mlxAdapterFactory.factory.mockClear();
		mlxAdapterFactory.instances.length = 0;
		ollamaAdapterFactory.factory.mockClear();
		ollamaAdapterFactory.instances.length = 0;
	});

	it('instruments tool dispatch with provider spies', async () => {
		await vi.resetModules();
		const { createMasterAgentGraph } = await import('@cortex-os/agents');

		const subAgents: SubAgentConfig[] = [
			{
				name: 'test-generation-agent',
				description: 'Generates unit tests for TDD enforcement',
				capabilities: ['test', 'spec', 'unit'],
				model_targets: ['glm-4.5-mlx'],
				tools: ['generate_tests'],
				specialization: 'test-generation',
			},
		];

		const masterAgent = createMasterAgentGraph({
			name: 'brAInwav-MasterAgent-TDD',
			subAgents,
		});

		const result = await masterAgent.coordinate(
			'Generate integration tests for LangGraph execution',
		);

		expect(orchestrationHarness.dispatchSpy).toHaveBeenCalledTimes(1);
                const [jobs] = orchestrationHarness.dispatchSpy.mock.calls[0];
                expect(jobs).toHaveLength(2);
                expect(jobs.map((job) => job.metadata?.provider)).toEqual(
                        expect.arrayContaining(['mlx', 'ollama']),
                );
                expect(orchestrationHarness.recordedJobs[0]?.metadata?.brand).toBe('brAInwav');
                expect(orchestrationHarness.recordedJobs[1]?.metadata?.brand).toBe('brAInwav');
                expect(jobs[0]?.metadata?.tags).toContain('agents');
                expect(jobs[1]?.name).toBe('ollama.generateChat');

                expect(mlxAdapterFactory.factory).toHaveBeenCalledTimes(1);
                const mlxAdapter = mlxAdapterFactory.instances[0];
                expect(mlxAdapter.isAvailable).toHaveBeenCalledTimes(1);
                expect(mlxAdapter.generateChat).toHaveBeenCalledTimes(1);
                expect(orchestrationHarness.dispatchSpy.mock.invocationCallOrder[0]).toBeLessThan(
                        mlxAdapter.generateChat.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
                );

                expect(ollamaAdapterFactory.factory).toHaveBeenCalledTimes(1);
                const ollamaAdapter = ollamaAdapterFactory.instances[0];
                expect(ollamaAdapter.generateChat).toHaveBeenCalledTimes(1);
                expect(mlxAdapter.generateChat.mock.invocationCallOrder[0]).toBeLessThan(
                        ollamaAdapter.generateChat.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
                );

                expect(result.result?.executed).toBe(true);
                expect(result.result?.provider).toBe('mlx');
                const aiMessage = result.messages[result.messages.length - 1];
                const aiContent =
			typeof aiMessage.content === 'string' ? aiMessage.content : JSON.stringify(aiMessage.content);
		expect(aiContent).toContain('brAInwav');
	});
});
