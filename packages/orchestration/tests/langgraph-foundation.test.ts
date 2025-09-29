import { describe, expect, it } from 'vitest';
import { createCerebrumGraph } from '../src/langgraph/create-cerebrum-graph.js';

describe('LangGraph foundation', () => {
	it('creates a graph that routes through MLX by default', async () => {
		const graph = createCerebrumGraph();
		const res = await graph.invoke({ input: 'hello' });
		expect(res.selectedModel?.provider).toBe('mlx');
		expect(res.output).toBe('brAInwav routed via mlx');
	});
});
