import type { Subagent } from '@cortex-os/agents/nO/contracts.js';
import { AIMessage } from '@langchain/core/messages';
import { describe, expect, it, vi } from 'vitest';
import { createInitialN0State, type N0Session } from '../src/langgraph/n0-state.js';
import { createUnifiedToolSystem, type HookRunner } from '../src/langgraph/tool-system.js';

const session: N0Session = {
	id: 'unified-tools',
	model: 'test-model',
	user: 'vitest',
	cwd: process.cwd(),
};

describe('createUnifiedToolSystem', () => {
	it('binds kernel tools, subagent tools, and exposes dispatcher + compaction', async () => {
		const subagent: Subagent = {
			config: {
				name: 'analysis',
				description: 'analysis helper',
				systemPrompt: 'analyze',
				scope: 'project',
				path: process.cwd(),
				capabilities: ['analysis'],
				maxConcurrency: 1,
				timeout: 1_000,
			},
			async execute() {
				return {
					output: 'completed',
					metrics: { tokensUsed: 10, executionTime: 20 },
				};
			},
			async initialize() {},
			async cleanup() {},
			async getHealth() {
				return {
					healthy: true,
					lastCheck: new Date().toISOString(),
					responseTime: 5,
					errorRate: 0,
					consecutiveFailures: 0,
				};
			},
			getAvailableTools() {
				return ['analysis'];
			},
		};

		const hookSpy = vi.fn(async () => [{ action: 'allow' } as const]);
		const hooks: HookRunner = { run: hookSpy };

		const system = createUnifiedToolSystem({
			kernel: {
				cwd: process.cwd(),
				bashAllow: ['echo *'],
				fsAllow: ['**'],
			},
			session,
			hooks,
			subagents: new Map([[subagent.config.name, subagent]]),
			autoDelegate: true,
			compaction: { maxMessages: 2, retainHead: 1 },
		});

		expect(system.metadata.kernelSurfaces.length).toBeGreaterThan(0);
		expect(system.metadata.agentNames).toContain('agent.analysis');

		const results = await system.dispatch(
			[
				{
					id: 'echo',
					name: 'allowed.tool',
					input: 'payload',
					execute: async () => 'ok',
				},
			],
			{ allowList: ['allowed.tool'] },
		);

		expect(results[0].status).toBe('fulfilled');
		expect(hookSpy).toHaveBeenCalledWith('PreToolUse', expect.any(Object));

		const state = createInitialN0State('hello', session, {
			messages: [new AIMessage('start'), new AIMessage('middle'), new AIMessage('end')],
		});

		const compacted = await system.compact(state);
		expect(compacted.removed).toBeGreaterThan(0);
		expect(hookSpy.mock.calls.some(([event]) => event === 'PreCompact')).toBe(true);
	});
});
