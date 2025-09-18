import type { Tool, ToolSchema } from '@voltagent/core';
import { createTool } from '@voltagent/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { CortexAgent } from '../src/CortexAgent';
import { SubagentRegistry } from '../src/subagents/registry';
import { DelegationRouter } from '../src/subagents/router';
import { SubagentToolFactory } from '../src/subagents/tools';
import type { ISubagentRegistry, SubagentConfig } from '../src/subagents/types';
import type { IToolRegistry } from '../src/types';

describe('Delegation routing and execution', () => {
	const prev = process.env.CORTEX_TEST_MODE;
	beforeAll(() => {
		process.env.CORTEX_TEST_MODE = '1';
	});
	afterAll(() => {
		process.env.CORTEX_TEST_MODE = prev;
	});

	it('materializes subagent tool and delegates via router', async () => {
		const agent = new CortexAgent({
			name: 'Main',
			cortex: {
				subagents: {
					enabled: true,
					enableDelegation: true,
					delegation: {
						defaultSubagent: 'code',
						rules: [{ pattern: /code/i, targets: 'code', confidence: 1 }],
					},
					searchPaths: [],
				},
			},
		});

		// end constructor setup
		// Inject a fake subagent system by using factory+registry directly
		const echo = createTool({
			id: 'util.echo',
			name: 'util.echo',
			description: 'Echo',
			parameters: z.object({ message: z.string() }),
			async execute(p) {
				return { content: p.message };
			},
		});
		agent.regRegister(echo);

		const registryAdapter: IToolRegistry = {
			register: <T extends ToolSchema>(t: Tool<T>) =>
				agent.regRegister(t as unknown as Tool<ToolSchema>),
			unregister: (id: string) => agent.regUnregister(id),
			get: <T extends ToolSchema>(id: string) => agent.regGet(id) as Tool<T> | null,
			list: <T extends ToolSchema>() => agent.regList() as unknown as Tool<T>[],
			has: (id: string) => agent.regHas(id),
		};
		const factory = new SubagentToolFactory(registryAdapter, agent.getTools());
		const registry = new SubagentRegistry(factory);
		const subConfig: SubagentConfig = {
			name: 'code',
			version: '1.0.0',
			description: 'Code agent',
			scope: 'project',
			allowed_tools: ['*'],
			blocked_tools: [],
			model: undefined,
			model_provider: undefined,
			model_config: undefined,
			parallel_fanout: false,
			auto_delegate: false,
			max_recursion: 1,
			context_isolation: true,
			context_window: undefined,
			memory_enabled: false,
			timeout_ms: 1000,
			max_tokens: undefined,
			tags: [],
			author: undefined,
			created: undefined,
			modified: undefined,
		};
		await registry.register(subConfig);

		// Monkey-patch private fields for test
		(agent as unknown as { subagentSystem: unknown }).subagentSystem = {
			getToolNames: () => ['agent.code'],
			getRegistry: () => registry,
		};
		await (
			agent as unknown as { initializeSubagents: (c: unknown) => Promise<void> }
		).initializeSubagents({
			cortex: {
				subagents: {
					delegation: {
						rules: [{ pattern: /code/, targets: 'code', confidence: 1 }],
					},
				},
			},
		});

		const results = await agent.delegateToSubagents('please do some code', true);
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].to).toBe('code');
	});

	it('respects maxFanout and confidenceThreshold', async () => {
		const mockList: SubagentConfig[] = ['a', 'b', 'c'].map((n) => ({
			name: n,
			version: '1.0.0',
			description: `Agent ${n}`,
			scope: 'project',
			allowed_tools: ['*'],
			blocked_tools: [],
			parallel_fanout: false,
			auto_delegate: false,
			max_recursion: 1,
			context_isolation: true,
			memory_enabled: false,
			timeout_ms: 1000,
			tags: [],
		}));
		const mockRegistry: Pick<ISubagentRegistry, 'list'> = {
			list: async () => mockList,
		};

		const router = new DelegationRouter(mockRegistry as unknown as ISubagentRegistry, {
			maxFanout: 2,
			confidenceThreshold: 0.8,
			rules: [
				{ pattern: /fanout/, targets: ['a', 'b', 'c'], confidence: 0.95 },
				{ pattern: /low/, targets: ['a'], confidence: 0.3 },
			],
			enableParallel: true,
		});

		const r1 = await router.route('please fanout this');
		expect(r1.shouldDelegate).toBe(true);
		expect(r1.strategy).toBe('fanout');
		const reqs1 = await router.createDelegations('please fanout this', r1.strategy, r1.candidates);
		expect(reqs1.length).toBe(2);

		const r2 = await router.route('low');
		expect(r2.shouldDelegate).toBe(false);
		expect(r2.strategy).toBe('none');
	});
});
