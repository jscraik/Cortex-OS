import type { Store } from "../ports/Store.js";
import type { RunState, Workflow } from "../domain/types.js";

export class InMemoryStore implements Store {
  private wfs = new Map<string, Workflow>();
  private runs = new Map<string, RunState>();
  async saveWorkflow(wf: Workflow) {
    this.wfs.set(wf.id, wf);
  }
  async getWorkflow(id: string) {
    return this.wfs.get(id) ?? null;
  }
  async createRun(wf: Workflow) {
    const now = new Date().toISOString();
    const rs: RunState = {
      wf,
      runId: crypto.randomUUID(),
      status: "pending",
      cursor: wf.entry,
      startedAt: now,
      updatedAt: now,
      context: {},
    };
    this.runs.set(rs.runId, rs);
    return rs;
  }
  async getRun(id: string) {
    return this.runs.get(id) ?? null;
  }
  async updateRun(id: string, patch: Partial<RunState>) {
    const cur = this.runs.get(id);
    if (!cur) return;
    this.runs.set(id, { ...cur, ...patch, updatedAt: new Date().toISOString() });
  }
  async appendEvent(_id: string, _event: Record<string, unknown>) {}
  async recordToken(_t: any) {}
}

