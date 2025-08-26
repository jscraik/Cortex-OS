import type { Agent, AgentSpec } from "../ports/Agent.js";

export type AgentRegistry = {
  register: (a: Agent) => void;
  get: (id: string) => Agent | undefined;
  list: () => AgentSpec[];
};

export const createAgentRegistry = (): AgentRegistry => {
  const agents = new Map<string, Agent>();
  return {
    register: (a) => { agents.set(a.spec().id, a); },
    get: (id) => agents.get(id),
    list: () => [...agents.values()].map(a => a.spec())
  };
};

