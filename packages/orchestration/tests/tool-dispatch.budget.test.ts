import { describe, expect, it, vi } from 'vitest';
import type { N0Session } from '../src/langgraph/n0-state.js';
import {
	dispatchTools,
	type ToolDispatchJob,
	type ToolDispatchResult,
} from '../src/langgraph/tool-dispatch.js';

const RUN_ID = 'dispatch-run-id';
const recordOperationSpy = vi.fn();
const recordLatencySpy = vi.fn();
const generateRunIdSpy = vi.fn(() => RUN_ID);

vi.mock('@cortex-os/observability', () => ({
	generateRunId: generateRunIdSpy,
	recordLatency: recordLatencySpy,
	recordOperation: recordOperationSpy,
}));

const session: N0Session = {
	id: 'session-dispatch-tests',
	model: 'test-model',
	user: 'vitest',
	cwd: '/tmp',
};

describe('dispatchTools budget and allow-list behaviour', () => {
	beforeEach(() => {
		recordOperationSpy.mockClear();
		recordLatencySpy.mockClear();
		generateRunIdSpy.mockClear();
		generateRunIdSpy.mockImplementation(() => RUN_ID);
	});

	it('enforces allow-lists and propagates hook mutations', async () => {
		const executed: unknown[] = [];
		const hookCalls: Array<{ event: string; ctx: Record<string, unknown> }> = [];

		const hooks = {
			run: vi.fn(async (event: 'PreToolUse' | 'PostToolUse', ctx: Record<string, unknown>) => {
				hookCalls.push({ event, ctx });
				if (event === 'PreToolUse') {
					return [{ action: 'allow', input: { mutated: true } } as const];
				}
				return [{ action: 'allow' } as const];
			}),
		};

		const jobs: Array<ToolDispatchJob<{ ok: boolean }>> = [
			{
				id: 'allowed-job',
				name: 'allowed.tool',
				input: { original: true },
				estimateTokens: 2,
				metadata: { tags: ['dispatch', 'test'] },
				execute: async (input) => {
					executed.push(input);
					return { ok: true };
				},
			},
			{
				id: 'blocked-job',
				name: 'blocked.tool',
				input: { shouldSkip: true },
				estimateTokens: 1,
				metadata: { tags: ['dispatch', 'denied'] },
				execute: async () => ({ ok: false }),
			},
		];

		const results = await dispatchTools(jobs, {
			session,
			allowList: ['allowed.tool'],
			hooks,
			budget: { tokens: 16, timeMs: 250, depth: 1 },
			concurrency: 1,
		});

		expect(results).toHaveLength(2);

		const fulfilled = results[0] as ToolDispatchResult<{ ok: boolean }>;
		expect(fulfilled.status).toBe('fulfilled');
		expect(fulfilled.started).toBe(true);
		expect(fulfilled.value).toEqual({ ok: true });
		expect(executed).toEqual([{ mutated: true }]);

		const skipped = results[1];
		expect(skipped.status).toBe('skipped');
		expect(skipped.started).toBe(false);
		expect(skipped.reason?.message).toContain('brAInwav blocked tool blocked.tool');

		expect(hooks.run).toHaveBeenCalled();
		const preCalls = hookCalls.filter((c) => c.event === 'PreToolUse');
		expect(preCalls).toHaveLength(1);
		expect(preCalls[0].ctx.tool).toMatchObject({ id: 'allowed-job', name: 'allowed.tool' });
		const postCalls = hookCalls.filter((c) => c.event === 'PostToolUse');
		expect(postCalls).toHaveLength(1);
		expect(postCalls[0].ctx.tool).toMatchObject({ id: 'allowed-job', name: 'allowed.tool' });

		expect(generateRunIdSpy).toHaveBeenCalledTimes(1);
		expect(recordOperationSpy).toHaveBeenCalledWith(
			'orchestration.tool_dispatch',
			true,
			RUN_ID,
			expect.objectContaining({
				tool: 'allowed.tool',
				outcome: 'fulfilled',
			}),
		);
		expect(recordOperationSpy).toHaveBeenCalledWith(
			'orchestration.tool_dispatch',
			false,
			RUN_ID,
			expect.objectContaining({
				tool: 'blocked.tool',
				outcome: 'skipped',
			}),
		);
		expect(recordLatencySpy).toHaveBeenCalledWith(
			'orchestration.tool_dispatch',
			expect.any(Number),
			expect.objectContaining({
				tool: 'allowed.tool',
				outcome: 'fulfilled',
			}),
		);
		expect(recordLatencySpy).toHaveBeenCalledTimes(1);
		expect(recordOperationSpy).toHaveBeenCalledTimes(2);
	});

	it('skips jobs when token budget is exhausted', async () => {
		const jobs: Array<ToolDispatchJob<string>> = [
			{
				id: 'primary',
				name: 'primary.tool',
				input: 'primary-input',
				estimateTokens: 2,
				execute: async () => 'primary-result',
			},
			{
				id: 'secondary',
				name: 'secondary.tool',
				input: 'secondary-input',
				estimateTokens: 2,
				execute: async () => 'secondary-result',
			},
		];

		const results = await dispatchTools(jobs, {
			session,
			budget: { tokens: 2, timeMs: 100, depth: 1 },
		});

		expect(results[0].status).toBe('fulfilled');
		expect(results[0].value).toBe('primary-result');
		expect(results[1].status).toBe('skipped');
		expect(results[1].reason?.message).toContain('token budget exhausted');
		expect(results[1].started).toBe(false);

		expect(generateRunIdSpy).toHaveBeenCalledTimes(1);
		expect(recordOperationSpy).toHaveBeenCalledWith(
			'orchestration.tool_dispatch',
			true,
			RUN_ID,
			expect.objectContaining({ tool: 'primary.tool', outcome: 'fulfilled' }),
		);
		expect(recordOperationSpy).toHaveBeenCalledWith(
			'orchestration.tool_dispatch',
			false,
			RUN_ID,
			expect.objectContaining({ tool: 'secondary.tool', outcome: 'skipped' }),
		);
		expect(recordOperationSpy).toHaveBeenCalledTimes(2);
		expect(recordLatencySpy).toHaveBeenCalledTimes(1);
	});
});
