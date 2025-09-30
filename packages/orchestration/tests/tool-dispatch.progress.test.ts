import { beforeEach, describe, expect, it } from 'vitest';
import type { N0Session } from '../src/langgraph/n0-state.js';
import { dispatchTools, type ToolDispatchJob } from '../src/langgraph/tool-dispatch.js';
import { resetDispatchMetricsSnapshot } from '../src/langgraph/tool-dispatch-metrics.js';

const session: N0Session = {
	id: 'progress-session',
	model: 'test-model',
	user: 'vitest',
	cwd: process.cwd(),
};

describe('dispatchTools progress events', () => {
	beforeEach(() => {
		resetDispatchMetricsSnapshot();
	});

	it('emits start and settle notifications', async () => {
		const events: Array<{ type: string; name: string; status?: string }> = [];
		const jobs: Array<ToolDispatchJob<string>> = [
			{
				id: 'alpha',
				name: 'alpha.tool',
				input: 'input-a',
				execute: async () => 'alpha-result',
			},
			{
				id: 'beta',
				name: 'beta.tool',
				input: 'input-b',
				execute: async () => 'beta-result',
			},
		];

		const results = await dispatchTools(jobs, {
			session,
			onProgress: ({ type, job, result }) => {
				events.push({ type, name: job.name, status: result?.status });
			},
		});

		expect(results.every((res) => res.status === 'fulfilled')).toBe(true);
		expect(events.some((e) => e.type === 'start' && e.name === 'alpha.tool')).toBe(true);
		expect(
			events.some((e) => e.type === 'settle' && e.name === 'beta.tool' && e.status === 'fulfilled'),
		).toBe(true);
	});

	it('emits skip events when allow list blocks jobs', async () => {
		const events: Array<{ type: string; name: string; status?: string }> = [];
		const jobs: Array<ToolDispatchJob<string>> = [
			{
				id: 'allowed',
				name: 'allowed.tool',
				input: 'data',
				execute: async () => 'ok',
			},
			{
				id: 'blocked',
				name: 'blocked.tool',
				input: 'data',
				execute: async () => 'should-not-run',
			},
		];

		const results = await dispatchTools(jobs, {
			session,
			allowList: ['allowed.tool'],
			onProgress: ({ type, job, result }) => {
				events.push({ type, name: job.name, status: result?.status });
			},
		});

		expect(results[1].status).toBe('skipped');
		expect(events).toContainEqual({ type: 'skip', name: 'blocked.tool', status: 'skipped' });
	});
});
