import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LLMBridge } from '../../src/llm-bridge.js';
import * as MlxAdapterModule from '../../src/mlx-adapter.js';
import { type Blueprint, createPRPOrchestrator } from '../../src/orchestrator.js';

// Mock minimal LLM generate path so E2E doesn't require real Ollama/MLX
let ollamaGenerateMock: (...args: unknown[]) => Promise<{ response?: string }>;
vi.mock('ollama', () => ({
	Ollama: class {
		generate = (...args: unknown[]) => ollamaGenerateMock(...args);
	},
	default: class {
		generate = (...args: unknown[]) => ollamaGenerateMock(...args);
	},
}));

describe('PRP Orchestrator E2E', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.restoreAllMocks();
		ollamaGenerateMock = async () => ({ response: 'ok' });
	});

	it('runs a full cycle with an LLM-backed subAgent', async () => {
		const orchestrator = createPRPOrchestrator();

		// Configure LLM (Ollama mocked)
		orchestrator.configureLLM({
			provider: 'ollama',
			endpoint: 'http://localhost:11434',
			model: 'llama3',
		});

		// Register a simple subAgent that uses the LLM bridge
		orchestrator.registerNeuron({
			id: 'strategy-llm',
			role: 'strategy',
			phase: 'strategy',
			dependencies: [],
			tools: [],
			requiresLLM: true,
			async execute(state, context) {
				const llm = context.llmBridge as LLMBridge;
				const text = await llm.generate(`Title: ${state.blueprint.title}`);
				return {
					output: { text },
					evidence: [],
					nextSteps: [],
					artifacts: [],
					metrics: {
						startTime: new Date().toISOString(),
						endTime: new Date().toISOString(),
						duration: 0,
						toolsUsed: [],
						filesCreated: 0,
						filesModified: 0,
						commandsExecuted: 0,
					},
				};
			},
		});

		const blueprint: Blueprint = {
			title: 'Test Release',
			description: 'E2E test',
			requirements: ['test'],
		};

		const result = await orchestrator.executePRPCycle(blueprint);
		expect(result.status).toBe('completed');
		expect(result.outputs).toHaveProperty('strategy-llm');
	});

	it('runs an MLX-backed subAgent using mocked adapter', async () => {
		// Mock MLX adapter
		const checkHealth = vi.fn().mockResolvedValue({ healthy: true, message: 'ok' });
		const generate = vi.fn().mockResolvedValue('mlx-ok');
		vi.spyOn(MlxAdapterModule, 'createMLXAdapter').mockImplementation(
			(): MlxAdapterModule.MLXAdapter =>
				({ checkHealth, generate, listModels: vi.fn() }) as unknown as MlxAdapterModule.MLXAdapter,
		);

		const orchestrator = createPRPOrchestrator();
		orchestrator.configureLLM({ provider: 'mlx', mlxModel: 'QWEN_SMALL' });

		orchestrator.registerNeuron({
			id: 'mlx-subAgent',
			role: 'build',
			phase: 'build',
			dependencies: [],
			tools: [],
			requiresLLM: true,
			async execute(state, context) {
				const llm = context.llmBridge as LLMBridge;
				const text = await llm.generate(`Build: ${state.blueprint.title}`);
				return {
					output: { text },
					evidence: [],
					nextSteps: [],
					artifacts: [],
					metrics: {
						startTime: new Date().toISOString(),
						endTime: new Date().toISOString(),
						duration: 0,
						toolsUsed: [],
						filesCreated: 0,
						filesModified: 0,
						commandsExecuted: 0,
					},
				};
			},
		});

		const blueprint: Blueprint = {
			title: 'MLX Release',
			description: 'MLX E2E test',
			requirements: ['mlx'],
		};

		const result = await orchestrator.executePRPCycle(blueprint);
		expect(result.status).toBe('completed');
		expect(result.outputs).toHaveProperty('mlx-subAgent');
	});

	it('executes subAgents respecting dependencies across phases', async () => {
		const orchestrator = createPRPOrchestrator();

		// Ollama mocked already
		orchestrator.configureLLM({
			provider: 'ollama',
			endpoint: 'http://localhost:11434',
			model: 'llama3',
		});

		// Simple in-memory execution log to assert ordering
		const execLog: Array<{ id: string; seq: number }> = [];
		let execSeq = 0;

		// Register three subAgents across phases with dependencies: n1(strategy) -> n2(build) -> n3(evaluation)
		orchestrator.registerNeuron({
			id: 'n1',
			role: 'strategy',
			phase: 'strategy',
			dependencies: [],
			tools: [],
			requiresLLM: true,
			async execute(state, context) {
				const llm = context.llmBridge as LLMBridge;
				const text = await llm.generate(`S:${state.blueprint.title}`);
				execLog.push({ id: 'n1', seq: ++execSeq });
				return {
					output: { id: 'n1', text },
					evidence: [],
					nextSteps: ['proceed to build'],
					artifacts: [],
					metrics: {
						startTime: new Date().toISOString(),
						endTime: new Date().toISOString(),
						duration: 0,
						toolsUsed: [],
						filesCreated: 0,
						filesModified: 0,
						commandsExecuted: 0,
					},
				};
			},
		});

		orchestrator.registerNeuron({
			id: 'n2',
			role: 'build',
			phase: 'build',
			dependencies: ['n1'],
			tools: [],
			requiresLLM: true,
			async execute(state, context) {
				const llm = context.llmBridge as LLMBridge;
				const text = await llm.generate(`B:${state.blueprint.title}`);
				execLog.push({ id: 'n2', seq: ++execSeq });
				return {
					output: { id: 'n2', text },
					evidence: [],
					nextSteps: ['proceed to evaluation'],
					artifacts: [],
					metrics: {
						startTime: new Date().toISOString(),
						endTime: new Date().toISOString(),
						duration: 0,
						toolsUsed: [],
						filesCreated: 0,
						filesModified: 0,
						commandsExecuted: 0,
					},
				};
			},
		});

		orchestrator.registerNeuron({
			id: 'n3',
			role: 'evaluation',
			phase: 'evaluation',
			dependencies: ['n2'],
			tools: [],
			requiresLLM: true,
			async execute(state, context) {
				const llm = context.llmBridge as LLMBridge;
				const text = await llm.generate(`E:${state.blueprint.title}`);
				execLog.push({ id: 'n3', seq: ++execSeq });
				return {
					output: { id: 'n3', text },
					evidence: [],
					nextSteps: [],
					artifacts: [],
					metrics: {
						startTime: new Date().toISOString(),
						endTime: new Date().toISOString(),
						duration: 0,
						toolsUsed: [],
						filesCreated: 0,
						filesModified: 0,
						commandsExecuted: 0,
					},
				};
			},
		});

		const blueprint: Blueprint = { title: 'Multi', description: 'Dependencies', requirements: [] };

		const result = await orchestrator.executePRPCycle(blueprint);
		expect(result.status).toBe('completed');
		expect(result.outputs).toHaveProperty('n1');
		expect(result.outputs).toHaveProperty('n2');
		expect(result.outputs).toHaveProperty('n3');

		// Stronger ordering assertions using the execution log
		const seqOf = (id: string) => execLog.find((e) => e.id === id)?.seq ?? 0;
		expect(seqOf('n1')).toBeGreaterThan(0);
		expect(seqOf('n2')).toBeGreaterThan(0);
		expect(seqOf('n3')).toBeGreaterThan(0);
		// Dependency order: n1 before n2, n2 before n3
		expect(seqOf('n1')).toBeLessThan(seqOf('n2'));
		expect(seqOf('n2')).toBeLessThan(seqOf('n3'));
	});

	it('fails fast when LLM is misconfigured', async () => {
		const orchestrator = createPRPOrchestrator();
		// Register a subAgent requiring LLM but do not configure it
		orchestrator.registerNeuron({
			id: 'needs-llm',
			role: 'strategy',
			phase: 'strategy',
			dependencies: [],
			tools: [],
			requiresLLM: true,
			async execute() {
				throw new Error('should not execute');
			},
		});

		const blueprint: Blueprint = {
			title: 'Bad',
			description: 'Missing LLM',
			requirements: [],
		};

		await expect(orchestrator.executePRPCycle(blueprint)).rejects.toThrow(
			'LLM configuration required for LLM-powered subAgents',
		);
	});
});
