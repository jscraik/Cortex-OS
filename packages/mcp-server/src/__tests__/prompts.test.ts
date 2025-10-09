import { beforeEach, describe, expect, it, vi } from 'vitest';

const addSpy = vi.fn();

vi.mock('../utils/config.js', () => ({
	loadServerConfig: () => ({ promptsEnabled: true }),
}));

vi.mock('@cortex-os/memory-core', () => ({
	createMemoryProviderFromEnv: () => ({
		search: vi.fn().mockResolvedValue([
			{ id: 'mem-1', content: 'Example content', score: 0.91 },
			{ id: 'mem-2', content: 'More content', score: 0.82 },
		]),
	}),
}));

vi.mock('../resources/metrics-provider.js', () => ({
	readHealthMetrics: vi.fn().mockResolvedValue({ text: JSON.stringify({ status: 'ok' }) }),
}));

const serverStub = {
	prompts: {
		add: addSpy,
	},
};

beforeEach(() => {
	addSpy.mockClear();
});

describe('prompts registry', () => {
	it('registers three prompts with handlers', async () => {
		const logger = { info: vi.fn() };
		const { createPrompts } = await import('../prompts/index.js');
		createPrompts(serverStub as any, logger);
		expect(addSpy).toHaveBeenCalledTimes(3);
		expect(addSpy.mock.calls[0][0].name).toBe('code-change-plan');
		expect(addSpy.mock.calls[1][0].name).toBe('memory-analysis');
		expect(addSpy.mock.calls[2][0].name).toBe('incident-retro');
	});

	it('renders code change plan with sentinel terminator', async () => {
		const logger = { info: vi.fn() };
		const { createPrompts } = await import('../prompts/index.js');
		createPrompts(serverStub as any, logger);
		const handler = addSpy.mock.calls.find(([args]: any[]) => args.name === 'code-change-plan')[0]
			.handler;
		const result = await handler({
			goal: 'Ship feature',
			constraints: [],
			acceptance_criteria: [],
		});
		expect(result.text.trim().endsWith('</plan>')).toBe(true);
		expect(result.structuredContent.goal).toBe('Ship feature');
	});

	it('renders memory analysis with sampled memories', async () => {
		const logger = { info: vi.fn() };
		const { createPrompts } = await import('../prompts/index.js');
		createPrompts(serverStub as any, logger);
		const handler = addSpy.mock.calls.find(([args]: any[]) => args.name === 'memory-analysis')[0]
			.handler;
		const result = await handler({ query: 'refactor', focus_areas: ['testing'] });
		expect(result.structuredContent.match_count).toBe(2);
		expect(result.structuredContent.sampled_memories[0].url).toBe('memory://cortex-local/mem-1');
		expect(result.text).toContain('**Matches:** 2');
	});
});
