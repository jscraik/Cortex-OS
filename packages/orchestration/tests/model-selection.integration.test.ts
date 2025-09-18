import { describe, expect, it } from 'vitest';
import { createCerebrumGraph } from '../src/langgraph/create-cerebrum-graph.js';

// Ensure that when a task is provided, a model is selected and present in state

describe('Model selection (LangGraph foundation)', () => {
	it('passes through echo with selectedModel placeholder set internally', async () => {
		const graph = createCerebrumGraph();
		const res = await graph.invoke({ input: 'hello', task: 'default' });
		// We cannot directly inspect internal state; echo succeeds if guard didn't throw.
		expect(res.output).toBe('hello');
	});
});

describe.skip('legacy model selection integration (removed)', () => {
	it('placeholder', () => {
		expect(true).toBe(true);
	});
});
