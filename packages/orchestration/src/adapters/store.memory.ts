import type { Store } from '../ports/Store.js';
import type { RunState, Workflow } from '../domain/types.js';
import { uuid } from '@cortex-os/utils';

export type InMemoryStore = Store;

export const createInMemoryStore = (): InMemoryStore => {
  const state = {
    wfs: new Map<string, Workflow>(),
    runs: new Map<string, RunState>(),
  };

  return {
    saveWorkflow: async (wf) => {
      state.wfs.set(wf.id, wf);
    },

    getWorkflow: async (id) => {
      return state.wfs.get(id) ?? null;
    },

    createRun: async (wf) => {
      const now = new Date().toISOString();
      const rs: RunState = {
        wf,
        runId: uuid(),
        status: 'pending',
        cursor: wf.entry,
        startedAt: now,
        updatedAt: now,
        context: {},
      };
      state.runs.set(rs.runId, rs);
      return rs;
    },

    getRun: async (id) => {
      return state.runs.get(id) ?? null;
    },

    updateRun: async (id, patch) => {
      const cur = state.runs.get(id);
      if (!cur) return;
      state.runs.set(id, { ...cur, ...patch, updatedAt: new Date().toISOString() });
    },

    appendEvent: async (_id, _event) => {},

    recordToken: async (_t) => {},
  };
};
