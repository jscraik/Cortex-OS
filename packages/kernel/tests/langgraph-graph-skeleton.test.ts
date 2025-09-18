import { describe, expect, it } from 'vitest';
import { createKernelGraph } from '../src/index.js';

describe('LangGraph graph skeleton', () => {
  it('returns a minimal graph-like structure', () => {
    const graph = createKernelGraph();
    expect(graph).toBeTruthy();
    expect(Array.isArray(graph.nodes)).toBe(true);
    expect(Array.isArray(graph.edges)).toBe(true);
    expect(graph.metadata).toBeDefined();
    expect(graph.metadata).toMatchObject({ engine: 'langgraphjs-skeleton' });
  });
});
