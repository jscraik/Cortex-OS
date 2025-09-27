import { describe, expect, it, vi } from 'vitest';
import { runSpool } from '../src/langgraph/spool.js';

describe('runSpool budget and cancellation handling', () => {
	it('skips tasks when token budget is exhausted and fires callbacks', async () => {
		const onStart = vi.fn();
		const onSettle = vi.fn();

		const results = await runSpool(
			[
				{
					id: 'fast',
					name: 'fast-task',
					estimateTokens: 1,
					execute: async () => 'fast-result',
				},
				{
					id: 'expensive',
					name: 'expensive-task',
					estimateTokens: 5,
					execute: async () => 'expensive-result',
				},
			],
			{
				tokens: 1,
				onStart,
				onSettle,
			},
		);

		expect(results).toHaveLength(2);
		expect(results[0].status).toBe('fulfilled');
		expect(results[0].value).toBe('fast-result');
		expect(results[0].started).toBe(true);

		expect(results[1].status).toBe('skipped');
		expect(results[1].started).toBe(false);
		expect(results[1].reason?.message).toContain('token budget exhausted');

		expect(onStart).toHaveBeenCalledTimes(1);
		expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ id: 'fast' }));
		expect(onSettle).toHaveBeenCalledTimes(2);
	});

	it('skips remaining tasks when an abort signal is triggered', async () => {
		const controller = new AbortController();
		const onStart = vi.fn((task: { id: string }) => {
			if (task.id === 'first') {
				controller.abort();
			}
		});

		const results = await runSpool(
			[
				{
					id: 'first',
					name: 'first-task',
					execute: async () => 'first-result',
				},
				{
					id: 'second',
					name: 'second-task',
					execute: async () => 'second-result',
				},
			],
			{
				signal: controller.signal,
				onStart,
			},
		);

		expect(results[0].status).toBe('fulfilled');
		expect(results[0].value).toBe('first-result');
		expect(results[1].status).toBe('skipped');
		expect(results[1].reason?.message).toContain('spool aborted');
		expect(onStart).toHaveBeenCalledTimes(1);
	});
});
