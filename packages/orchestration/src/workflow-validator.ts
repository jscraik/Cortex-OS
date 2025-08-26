import { workflowZ } from './schemas/workflow.zod.js';

/**
 * Validate a workflow definition and ensure it forms a DAG.
 */
export function validateWorkflow(input: unknown) {
  const wf = workflowZ.parse(input);
  const visited = new Set<string>();
  const stack = new Set<string>();

  const visit = (stepId: string) => {
    if (stack.has(stepId)) {
      throw new Error(`Cycle detected at step ${stepId}`);
    }
    if (visited.has(stepId)) return;
    stack.add(stepId);
    visited.add(stepId);
    const step = wf.steps[stepId];
    if (!step) {
      throw new Error(`Missing step: ${stepId}`);
    }
    if (step.next) visit(step.next);
    if (step.branches) {
      for (const br of step.branches) {
        visit(br.to);
      }
    }
    stack.delete(stepId);
  };

  visit(wf.entry);
  return wf;
}
