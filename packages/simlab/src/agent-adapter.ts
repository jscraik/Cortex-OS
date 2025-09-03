/**
 * @fileoverview Agent adapter for SimLab - interfaces with Cortex-OS PRP system
 * @version 1.0.0
 */

import type { SimScenario, SimTurn } from "./types.js";

export interface AgentRequest {
	scenario: SimScenario;
	conversationHistory: SimTurn[];
	userMessage: string;
}

export interface AgentResponse {
	content: string;
	completed?: boolean;
	metadata?: Record<string, unknown>;
}

export interface PRPExecutor {
	executePRP(request: AgentRequest): Promise<AgentResponse>;
}

/**
 * Adapter that interfaces SimLab with the Cortex-OS PRP system.
 * Uses dependency injection for the underlying executor to allow
 * integration with the real kernel while providing a deterministic
 * default for tests.
 */
export class AgentAdapter {
	constructor(private executor: PRPExecutor = new BasicPRPExecutor()) {}

	async execute(request: AgentRequest): Promise<AgentResponse> {
		try {
			const result = await this.executor.executePRP(request);
			return {
				content: result.content,
				completed:
					result.completed ??
					this.isGoalAchieved(result.content, request.scenario),
				metadata: {
					...result.metadata,
					prpVersion: "1.0.0",
					executedAt: new Date().toISOString(),
				},
			};
		} catch (error) {
			return {
				content: `I apologize, but I encountered an error processing your request: ${
					error instanceof Error ? error.message : "Unknown error"
				}`,
				completed: false,
				metadata: {
					error: true,
					errorMessage:
						error instanceof Error ? error.message : "Unknown error",
				},
			};
		}
	}

	private isGoalAchieved(response: string, scenario: SimScenario): boolean {
		const successIndicators = scenario.success_criteria || [];
		return successIndicators.some((criteria) =>
			response.toLowerCase().includes(criteria.toLowerCase()),
		);
	}
}

class BasicPRPExecutor implements PRPExecutor {
	executePRP({ scenario, userMessage }: AgentRequest): Promise<AgentResponse> {
		const goal = scenario.goal.toLowerCase();
		const message = userMessage.toLowerCase();

		if (goal.includes("help") && message.includes("help")) {
			return Promise.resolve({
				content:
					"I'd be happy to help you! Could you please tell me more about what you need assistance with?",
			});
		}

		if (goal.includes("information") && message.includes("question")) {
			return Promise.resolve({
				content:
					"I can provide information on that topic. Let me gather the relevant details for you.",
			});
		}

		if (goal.includes("troubleshoot") || goal.includes("problem")) {
			return Promise.resolve({
				content:
					"I understand you're experiencing an issue. Let me help you troubleshoot this step by step.",
			});
		}

		return Promise.resolve({
			content:
				"Thank you for your message. I'm here to assist you with your request.",
		});
	}
}

export default AgentAdapter;
