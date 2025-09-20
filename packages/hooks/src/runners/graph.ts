import type { HookContext, HookResult } from '../types.js';

let INVOKER: ((graphName: string, ctx: HookContext) => Promise<HookResult>) | null = null;

export function setGraphInvoker(fn: (graphName: string, ctx: HookContext) => Promise<HookResult>) {
  INVOKER = fn;
}

export async function runGraph(graph: string, ctx: HookContext, timeoutMs: number): Promise<HookResult> {
  if (!graph) return { action: 'emit', note: 'empty graph id' };
  if (!INVOKER) return { action: 'deny', reason: 'graph invoker not set' };
  // Allow consumers to enforce their own timeouts; we surface the parameter for consistency
  if (timeoutMs <= 0) return { action: 'deny', reason: 'invalid timeout' };
  return INVOKER(graph, ctx);
}
