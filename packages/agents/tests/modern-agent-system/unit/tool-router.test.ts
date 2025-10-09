import { createSessionContextManager } from '@cortex-os/agent-toolkit';
import { describe, expect, it } from 'vitest';
import { createToolRouter } from '../../../../src/modern-agent-system/tool-router.js';
import type { ToolInvocationRequest } from '../../../../src/modern-agent-system/types.js';

const createLocalTool = () => async (request: ToolInvocationRequest) => ({
	tool: request.tool,
	result: { ok: true },
	tokensUsed: 12,
});

describe('createToolRouter', () => {
	it('invokes local tools and records usage', async () => {
		const sessionContext = createSessionContextManager();
		const router = createToolRouter({
			localTools: { 'local.analyse': createLocalTool() },
			sessionContext,
		});

		const response = await router.invoke({ tool: 'local.analyse', input: { value: 1 } });
		expect(response.result).toEqual({ ok: true });

		const calls = sessionContext.getRecentToolCalls();
		expect(calls).toHaveLength(1);
		expect(calls[0].payload.tokenCount).toBe(12);
	});

	it('lists available tools', async () => {
		const sessionContext = createSessionContextManager();
		const router = createToolRouter({
			localTools: { 'local.analyse': createLocalTool() },
			sessionContext,
		});

		await expect(router.listTools()).resolves.toContain('local.analyse');
	});
});
