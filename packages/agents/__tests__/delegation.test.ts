import { createTool } from '@voltagent/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { CortexAgent } from '../src/CortexAgent';
import { SubagentRegistry } from '../src/subagents/registry';
import { SubagentToolFactory } from '../src/subagents/tools';

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
		agent.register(echo);

		const factory = new SubagentToolFactory(agent, agent.list());
		const registry = new SubagentRegistry(factory);
		await registry.register({
			name: 'code',
			version: '1.0.0',
			description: 'Code agent',
			scope: 'project',
			allowed_tools: ['*'],
			parallel_fanout: false,
			auto_delegate: false,
			max_recursion: 1,
			context_isolation: true,
			memory_enabled: false,
			timeout_ms: 1000,
			tags: [],
		} as unknown as any);

		// Monkey-patch private fields for test
		(agent as unknown as { subagentSystem: unknown }).subagentSystem = {
			getToolNames: () => ['agent.code'],
			getRegistry: () => registry,
		};
		await (
			agent as unknown as { initializeSubagents: (c: any) => Promise<void> }
		).initializeSubagents({
			cortex: {
				subagents: {
					delegation: {
						rules: [{ pattern: /code/, targets: 'code', confidence: 1 }],
					},
				},
			},
		});

		const results = await agent.delegateToSubagents(
			'please do some code',
			true,
		);
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].to).toBe('code');
	});
});
