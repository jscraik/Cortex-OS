/**
 * @fileoverview Agent adapter for SimLab - interfaces with Cortex-OS PRP system
 * @version 1.0.0
 */

// Import PRP runner from package boundary (avoid deep relative imports)
import {
	type Blueprint,
	createPRPOrchestrator,
	type Neuron,
} from '@cortex-os/prp-runner';
import { agentRequestSchema } from './schemas.js';
import type { SimScenario, SimTurn } from './types.js';

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
	constructor(private readonly executor: PRPExecutor = new BasicPRPExecutor()) { }

	async execute(request: AgentRequest): Promise<AgentResponse> {
		const parsed = agentRequestSchema.parse(request);
		try {
			const result = await this.executor.executePRP(parsed);
			return {
				content: result.content,
				completed:
					result.completed ??
					this.isGoalAchieved(result.content, parsed.scenario),
				metadata: {
					...result.metadata,
					prpVersion: '1.0.0',
					executedAt: new Date().toISOString(),
				},
			};
		} catch (error) {
			return {
				content: `I apologize, but I encountered an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'
					}`,
				completed: false,
				metadata: {
					error: true,
					errorMessage:
						error instanceof Error ? error.message : 'Unknown error',
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
	private classify(goal: string): 'help' | 'info' | 'troubleshoot' | 'general' {
		const lower = goal.toLowerCase();
		if (/(help|assist|support)/.test(lower)) return 'help';
		if (/(information|inform|explain|question)/.test(lower)) return 'info';
		if (/(troubleshoot|problem|error|issue)/.test(lower)) return 'troubleshoot';
		return 'general';
	}

	async executePRP({
		scenario,
		conversationHistory,
		userMessage,
	}: AgentRequest): Promise<AgentResponse> {
		const goalType = this.classify(scenario.goal);
		const lowerMsg = userMessage.toLowerCase();

		// Avoid repeating identical agent responses
		const lastAgentTurn = [...conversationHistory]
			.reverse()
			.find((t) => t.role === 'agent');
		if (lastAgentTurn && lastAgentTurn.content.toLowerCase() === lowerMsg) {
			return {
				content:
					"It looks like we've already covered that. Is there anything else you need?",
			};
		}

		const successHint = scenario.success_criteria[0];

		switch (goalType) {
			case 'help': {
				const hint = successHint
					? `Let's work toward ${successHint}.`
					: 'How can I assist further?';
				return {
					content: `I'm here to help. ${hint}`,
				};
			}
			case 'info':
				if (/[?]/.test(userMessage)) {
					return {
						content:
							"Here's the information you requested: [placeholder details].",
					};
				}
				return {
					content: 'What specific information would you like to know?',
				};
			case 'troubleshoot':
				return {
					content:
						"I understand you're encountering an issue. Let's go through some steps to resolve it.",
				};
			default:
				return {
					content: 'Thank you for your message. How can I assist you today?',
				};
		}
	}
}

export class RealPRPExecutor implements PRPExecutor {
	private readonly orchestrator = createPRPOrchestrator();

	constructor() {
		const neuron: Neuron = {
			id: 'simple',
			role: 'responder',
			phase: 'strategy',
			dependencies: [],
			tools: [],
			requiresLLM: false,
			async execute(_state: unknown, _context: unknown) {
				// Mark unused parameters as intentionally unused to satisfy lint rules
				const __unused_state = _state; // eslint-disable-line @typescript-eslint/no-unused-vars
				const __unused_context = _context; // eslint-disable-line @typescript-eslint/no-unused-vars
				const startTime = new Date().toISOString();
				const endTime = new Date().toISOString();
				return {
					output: 'PRP response',
					evidence: [],
					nextSteps: [],
					artifacts: [],
					metrics: {
						startTime,
						endTime,
						duration: 0,
						toolsUsed: [],
						filesCreated: 0,
						filesModified: 0,
						commandsExecuted: 0,
					},
				};
			},
		};
		this.orchestrator.registerNeuron(neuron);
	}

	async executePRP({ scenario }: AgentRequest): Promise<AgentResponse> {
		let title = '';
		if (typeof scenario.name === 'string' && scenario.name.length > 0) {
			title = scenario.name;
		} else if (typeof scenario.goal === 'string') {
			title = scenario.goal;
		}
		const blueprint: Blueprint = {
			title,
			description: scenario.goal,
			requirements: [],
		};
		const result = await this.orchestrator.executePRPCycle(blueprint);
		const content = String(result.outputs.simple ?? '');
		return { content: `PRP: ${content}` };
	}
}
