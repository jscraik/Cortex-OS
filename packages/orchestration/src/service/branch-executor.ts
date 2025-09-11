import type { RunState, Step } from '../domain/types.js';

function get(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function executeBranch(rs: RunState, step: Step): RunState {
  if (!step.branches || step.branches.length === 0) {
    if (step.next) return { ...rs, cursor: step.next };
    throw new Error(`Branch step '${step.id}' has no branches`);
  }

  for (const br of step.branches) {
    const val = get(rs.context, br.when);
    if (val) {
      return { ...rs, cursor: br.to };
    }
  }

  if (step.next) return { ...rs, cursor: step.next };
  throw new Error(`No branch matched for step '${step.id}'`);
}
