import type { AgentResponse } from './agent-adapter.js';
import type { SimScenario, SimTurn } from './types.js';

export interface FailureInjectorInput {
	scenario: SimScenario;
	turns: SimTurn[];
	agentResponse: AgentResponse;
	rng: () => number;
}

export interface FailureInjector {
	maybeInject(input: FailureInjectorInput): AgentResponse;
}

export class RandomFailureInjector implements FailureInjector {
	constructor(
		private probability = 0.1,
		private message = 'Simulated failure',
	) {}

	maybeInject(input: FailureInjectorInput): AgentResponse {
		const { agentResponse, rng } = input;
		if (rng() < this.probability) {
			return {
				content: this.message,
				completed: true,
				metadata: { failureInjected: true },
			};
		}
		return agentResponse;
	}
}
