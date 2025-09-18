import { describe, it, expect } from 'vitest';
import { createCerebrumGraph } from '../src/index.js';

describe('LangGraph foundation', () => {
  it('creates a graph that echoes input', async () => {
    const graph = createCerebrumGraph();
    const res = await graph.invoke({ input: 'hello' });
    expect(res.output).toBe('hello');
  });
});
