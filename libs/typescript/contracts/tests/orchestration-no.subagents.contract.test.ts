import { describe, expect, it } from 'vitest';
import {
	DelegationOptionsSchema,
	HealthStatusSchema,
	SubagentConfigSchema,
	SubagentRunInputSchema,
	SubagentRunResultSchema,
	SubagentSchema,
	SubagentToolSchema,
} from '../src/orchestration-no/subagents.js';

describe('contract: Subagents', () => {
	it('declares subagent config and result schemas', () => {
		const cfg = {
			name: 'code-analysis',
			description: 'Analyze code',
			systemPrompt: '...',
			scope: 'project',
			capabilities: ['security'],
			maxConcurrency: 1,
			timeout: 1000,
		};
		const input = {
			task: 'analyze',
			context: { session: 's1' },
			budget: { tokens: 1000, ms: 1000 },
		};
		const result = { ok: true, output: 'done', metrics: { tokensUsed: 10, durationMs: 5 } };

		expect(SubagentConfigSchema.safeParse(cfg).success).toBe(true);
		expect(SubagentRunInputSchema.safeParse(input).success).toBe(true);
		expect(SubagentRunResultSchema.safeParse(result).success).toBe(true);
	});

	it('declares subagent tool materialization contract', () => {
		const tool = { name: 'agent.code-analysis', description: 'Code analyzer', schema: {} };
		expect(SubagentToolSchema).toBeDefined();
		expect(SubagentToolSchema.safeParse(tool).success).toBe(true);
		// ensure other schemas are present
		expect(DelegationOptionsSchema).toBeDefined();
		expect(HealthStatusSchema).toBeDefined();
		expect(SubagentSchema).toBeDefined();
	});
});
