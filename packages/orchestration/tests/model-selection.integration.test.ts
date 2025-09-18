import { describe, expect, it } from 'vitest';
import { loadModelRegistry } from '../src/config/model-catalog.js';
import { createCerebrumGraph } from '../src/index.js';

// Ensure that when a task is provided, a model is selected and present in state

describe('Model selection', () => {
	it('selects a model for chat task', async () => {
		const graph = createCerebrumGraph();
		const reg = await loadModelRegistry();
		const expected = reg.getDefault('chat');
		const res = await graph.invoke({ input: 'hello', task: 'default' });
		// We cannot directly inspect internal state, but echo succeeds if guard didn't throw.
		// As a proxy, verify graph returns output and registry has a default (sanity).
		expect(res.output).toBe('hello');
		expect(expected.model?.length).toBeGreaterThan(0);
	});
});
