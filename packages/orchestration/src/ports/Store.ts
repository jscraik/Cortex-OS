import type { RunState, Workflow, Token } from '../domain/types.js';

export interface Store {
  saveWorkflow(wf: Workflow): Promise<void>;
  getWorkflow(id: string): Promise<Workflow | null>;
  createRun(wf: Workflow): Promise<RunState>;
  getRun(runId: string): Promise<RunState | null>;
  updateRun(runId: string, patch: Partial<RunState>): Promise<void>;
  appendEvent(runId: string, event: Record<string, unknown>): Promise<void>;
  recordToken(t: Token): Promise<void>;
}
