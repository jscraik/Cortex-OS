import type { SimScenario, SimTurn } from "./types.js";
import type { AgentResponse } from "./agent-adapter.js";

export interface FailureInjector {
  maybeInject(input: {
    scenario: SimScenario;
    turns: SimTurn[];
    agentResponse: AgentResponse;
    rng: () => number;
  }): AgentResponse;
}

export class RandomFailureInjector implements FailureInjector {
  constructor(private probability = 0.1, private message = "Simulated failure") {}

  maybeInject({ agentResponse, rng }: { scenario: SimScenario; turns: SimTurn[]; agentResponse: AgentResponse; rng: () => number; }): AgentResponse {
    if (rng() < this.probability) {
      return { content: this.message, completed: true, metadata: { failureInjected: true } };
    }
    return agentResponse;
  }
}
