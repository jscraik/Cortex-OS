import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { describe, expect, it, vi } from 'vitest';
import {
	compactN0State,
	createInitialN0State,
	type MemoryCompactionOptions,
	type N0Session,
} from '../src/langgraph/n0-state.js';

const session: N0Session = {
	id: 'compaction-test',
	model: 'test-model',
	user: 'vitest',
	cwd: process.cwd(),
};

describe('compactN0State', () => {
	it('trims message history while retaining head and tail', async () => {
		const base = createInitialN0State('hello', session, {
			messages: [
				new HumanMessage('system prompt'),
				new AIMessage('step 1'),
				new HumanMessage('step 2'),
				new AIMessage('step 3'),
				new HumanMessage('step 4'),
				new AIMessage('step 5'),
			],
		});

		const hooks = { run: vi.fn(async () => [{ action: 'allow' } as const]) } satisfies {
			run: NonNullable<MemoryCompactionOptions['hooks']>['run'];
		};

		const result = await compactN0State(base, {
			maxMessages: 3,
			retainHead: 1,
			hooks,
			session,
		});

		expect(result.removed).toBe(3);
		expect(result.state.messages?.length).toBe(3);
		expect(result.state.messages?.[0].content).toBe('system prompt');
		expect(result.state.messages?.at(-1)?.content).toBe('step 5');
		expect(result.skipped).toBe(false);
		expect(hooks.run).toHaveBeenCalledWith(
			'PreCompact',
			expect.objectContaining({ event: 'PreCompact', tool: expect.any(Object) }),
		);
	});

	it('respects hook denials by skipping compaction', async () => {
		const base = createInitialN0State('input', session, {
			messages: [
				new HumanMessage('start'),
				new AIMessage('middle'),
				new HumanMessage('more'),
				new AIMessage('end'),
			],
		});

		const hooks = {
			run: vi.fn(async () => [{ action: 'deny', reason: 'preserve' } as const]),
		} satisfies {
			run: NonNullable<MemoryCompactionOptions['hooks']>['run'];
		};

		const result = await compactN0State(base, {
			maxMessages: 2,
			hooks,
			session,
		});

		expect(result.removed).toBe(0);
		expect(result.skipped).toBe(true);
		expect(result.state.messages?.length).toBe(4);
		expect(hooks.run).toHaveBeenCalledTimes(1);
	});
});
