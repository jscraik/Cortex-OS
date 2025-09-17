/**
 * MLX-First Orchestration Coordinator
 * Uses your available models with intelligent fallback strategies
 */

import { OrchestrationError } from '../errors.js';
import { MLXFirstModelProvider } from '../providers/mlx-first-provider.js';
import {
	coordinateMultiModalTaskSchema,
	coordinateWorkflowSchema,
	decomposeTaskSchema,
	orchestrateCodeTaskSchema,
} from '../schemas/orchestrator.zod.js';
import {
	type AgentInfo,
	buildAgentPrompt,
	parseAgentSelection,
} from '../utils/agent-selection.js';
import { handleResilience } from '../utils/resilience.js';

export interface TaskDecomposition {
	subtasks: Array<{
		id: string;
		description: string;
		dependencies: string[];
		estimatedComplexity: number;
		recommendedAgent: string;
		requiredCapabilities: string[];
	}>;
	parallelizable: string[][];
	criticalPath: string[];
	reasoning: string;
}

export interface CoordinationDecision {
	action: 'proceed' | 'wait' | 'escalate' | 'abort';
	reasoning: string;
	confidence: number;
	nextSteps: string[];
	provider: 'mlx' | 'ollama';
}

export class MLXFirstOrchestrator {
	private readonly modelProvider: MLXFirstModelProvider;

	constructor() {
		this.modelProvider = new MLXFirstModelProvider();
	}

	/**
	 * Decompose complex tasks using Mixtral-8x7B (MLX)
	 */
	async decomposeTask(
		taskDescription: string,
		availableAgents: string[],
		constraints?: { maxParallelism?: number; timeLimit?: number },
	): Promise<TaskDecomposition> {
		const parsed = decomposeTaskSchema.safeParse({
			taskDescription,
			availableAgents,
			constraints,
		});
		if (!parsed.success) {
			throw new OrchestrationError('INVALID_INPUT', parsed.error.message);
		}
		const {
			taskDescription: td,
			availableAgents: aa,
			constraints: c,
		} = parsed.data;
		const prompt = `Break down this complex task into manageable subtasks:

TASK: ${td}

AVAILABLE AGENTS: ${aa.join(', ')}

CONSTRAINTS:
${c?.maxParallelism ? `- Max parallel tasks: ${c.maxParallelism}` : ''}
${c?.timeLimit ? `- Time limit: ${c.timeLimit} minutes` : ''}

Provide a structured breakdown with:
1. Subtasks with dependencies
2. Parallel execution opportunities
3. Critical path identification
4. Agent assignments based on capabilities

Format as JSON with reasoning.`;

		try {
			// Use complex reasoning model (Mixtral MoE for expert thinking)
			const response = await this.modelProvider.generate('complexReasoning', {
				task: 'task_decomposition',
				prompt,
				maxTokens: 800,
				temperature: 0.3,
			});

			return this.parseTaskDecomposition(response.content);
		} catch (error) {
			return handleResilience(error, 'decomposeTask');
		}
	}

	/**
	 * Multi-modal coordination for tasks involving UI/visual elements
	 */
	async coordinateMultiModalTask(
		taskDescription: string,
		visualContext?: string, // Base64 image or UI description
		codeContext?: string,
	): Promise<CoordinationDecision> {
		const parsed = coordinateMultiModalTaskSchema.safeParse({
			taskDescription,
			visualContext,
			codeContext,
		});
		if (!parsed.success) {
			throw new OrchestrationError('INVALID_INPUT', parsed.error.message);
		}
		const {
			taskDescription: td,
			visualContext: vc,
			codeContext: cc,
		} = parsed.data;
		let prompt = `Coordinate this multi-modal task:

TASK: ${td}`;

		if (vc) {
			prompt += `\nVISUAL CONTEXT: ${vc}`;
		}

		if (cc) {
			prompt += `\nCODE CONTEXT: ${cc}`;
		}

		prompt += `\nDetermine the best coordination approach considering all modalities.
Provide decision, reasoning, confidence (0-1), and next steps.`;

		try {
			// Use vision-language model for multi-modal understanding
			const response = await this.modelProvider.generate('multiModal', {
				task: 'multimodal_coordination',
				prompt,
				maxTokens: 300,
				temperature: 0.4,
			});

			return this.parseCoordinationDecision(
				response.content,
				response.provider,
			);
		} catch (error) {
			return handleResilience(error, 'coordinateMultiModalTask');
		}
	}

	/**
	 * Code-aware orchestration using specialized coding models
	 */
	async orchestrateCodeTask(
		codeTask: string,
		codebase?: string,
		testRequirements?: string,
	): Promise<{
		plan: TaskDecomposition;
		codeStrategy: string;
		testStrategy: string;
		riskAssessment: string;
	}> {
		const parsed = orchestrateCodeTaskSchema.safeParse({
			codeTask,
			codebase,
			testRequirements,
		});
		if (!parsed.success) {
			throw new OrchestrationError('INVALID_INPUT', parsed.error.message);
		}
		const { codeTask: ct, codebase: cb, testRequirements: tr } = parsed.data;
		const prompt = `Plan this code-related task:

TASK: ${ct}

${cb ? `EXISTING CODEBASE:\n${cb.slice(0, 2000)}...` : ''}

${tr ? `TEST REQUIREMENTS:\n${tr}` : ''}

Provide:
1. Development plan with subtasks
2. Coding strategy and best practices
3. Testing approach
4. Risk assessment and mitigation

Focus on maintainable, testable code.`;

		try {
			// Use specialized coding model
			const response = await this.modelProvider.generate('codeIntelligence', {
				task: 'code_orchestration',
				prompt,
				maxTokens: 1000,
				temperature: 0.2,
			});

			return this.parseCodeOrchestrationResponse(response.content);
		} catch (error) {
			return handleResilience(error, 'orchestrateCodeTask');
		}
	}

	/**
	 * Real-time workflow coordination using fast reasoning
	 */
	async coordinateWorkflow(
		workflowId: string,
		currentState: unknown,
		incomingEvents: unknown[],
	): Promise<CoordinationDecision> {
		const parsed = coordinateWorkflowSchema.safeParse({
			workflowId,
			currentState,
			incomingEvents,
		});
		if (!parsed.success) {
			throw new OrchestrationError('INVALID_INPUT', parsed.error.message);
		}
		const {
			workflowId: wfId,
			currentState: cs,
			incomingEvents: events,
		} = parsed.data;
		const prompt = `Coordinate this real-time workflow:

WORKFLOW ID: ${wfId}
CURRENT STATE: ${JSON.stringify(cs, null, 2)}

INCOMING EVENTS:
${events.map((e, i) => `${i + 1}. ${JSON.stringify(e)}`).join('\n')}

Decide immediate action: proceed, wait, escalate, or abort.
Consider event priority, resource availability, and dependencies.

Provide quick decision with reasoning.`;

		try {
			// Use quick reasoning model
			const response = await this.modelProvider.generate('quickReasoning', {
				task: 'workflow_coordination',
				prompt,
				maxTokens: 150,
				temperature: 0.5,
			});

			return this.parseCoordinationDecision(
				response.content,
				response.provider,
			);
		} catch (error) {
			console.warn('Workflow coordination failed:', error);
			return {
				action: 'wait',
				reasoning: 'Fallback coordination - waiting for additional signals',
				confidence: 0.2,
				nextSteps: ['Monitor workflow state', 'Gather more context'],
				provider: 'ollama',
			};
		}
	}

	/**
	 * Safety validation using parallel reasoning
	 */

	async selectOptimalAgent(
		taskDescription: string,
		availableAgents: AgentInfo[],
		urgency: 'low' | 'medium' | 'high' | 'critical' = 'medium',
	): Promise<{ agentId: string; reasoning: string; confidence: number }> {
		const prompt = buildAgentPrompt(taskDescription, availableAgents, urgency);

		try {
			const response = await this.modelProvider.generate('quickReasoning', {
				task: 'agent_selection',
				prompt,
				maxTokens: 150,
			});

			return parseAgentSelection(response.content, availableAgents);
		} catch (error) {
			console.warn('Agent selection failed:', error);
			// Fallback: least loaded agent
			const leastLoaded = availableAgents.reduce(
				(min, agent) => (agent.currentLoad < min.currentLoad ? agent : min),
				availableAgents[0],
			);

			return {
				agentId: leastLoaded.id,
				reasoning: 'Fallback selection - chose least loaded agent',
				confidence: 0.3,
			};
		}
	}

	/**
	 * Safety validation using parallel reasoning
	 */
	async validateSafety(prompt: string): Promise<{
		safe: boolean;
		issues: string[];
		recommendations: string[];
	}> {
		try {
			const response = await this.modelProvider.generate('generalChat', {
				task: 'safety_validation',
				prompt,
				maxTokens: 300,
			});

			return this.parseSafetyAssessment(response.content);
		} catch (error) {
			console.warn('Safety validation failed:', error);
			return {
				safe: false,
				issues: ['Unable to perform safety validation'],
				recommendations: ['Manual review required'],
			};
		}
	}

	/**
	 * Parser methods for model responses
	 */
	private parseTaskDecomposition(content: string): TaskDecomposition {
		try {
			// Try to extract JSON from response
			const jsonRegex = /\{[\s\S]*\}/;
			const jsonMatch = jsonRegex.exec(content);
			if (jsonMatch) {
				return JSON.parse(jsonMatch[0]);
			}
			throw new OrchestrationError('PARSE_ERROR', 'No JSON found in response');
		} catch (error) {
			return handleResilience(error, 'parseTaskDecomposition');
		}
	}

	private parseCoordinationDecision(
		content: string,
		provider: 'mlx' | 'ollama',
	): CoordinationDecision {
		const lines = content.split('\n');
		let action: CoordinationDecision['action'] = 'proceed';
		let confidence = 0.5;
		const nextSteps: string[] = [];

		for (const line of lines) {
			if (line.toLowerCase().includes('abort')) action = 'abort';
			else if (line.toLowerCase().includes('wait')) action = 'wait';
			else if (line.toLowerCase().includes('escalate')) action = 'escalate';

			if (line.includes('confidence:') || line.includes('confidence =')) {
				const confRegex = /(\d+\.?\d*)/;
				const confMatch = confRegex.exec(line);
				if (confMatch)
					confidence = Math.max(0, Math.min(1, parseFloat(confMatch[1])));
			}

			if (
				line.toLowerCase().includes('next:') ||
				line.toLowerCase().includes('steps:')
			) {
				nextSteps.push(line.replace(/^.*?steps?:?\s*/i, ''));
			}
		}

		return { action, reasoning: content, confidence, nextSteps, provider };
	}

	private parseCodeOrchestrationResponse(content: string): {
		plan: TaskDecomposition;
		codeStrategy: string;
		testStrategy: string;
		riskAssessment: string;
	} {
		try {
			return JSON.parse(content);
		} catch (error) {
			return handleResilience(error, 'parseCodeOrchestrationResponse');
		}
	}

	private parseSafetyAssessment(content: string) {
		const safe =
			!content.toLowerCase().includes('unsafe') &&
			!content.toLowerCase().includes('risk') &&
			!content.toLowerCase().includes('danger');

		return {
			safe,
			issues: safe ? [] : ['Potential safety concerns identified'],
			recommendations: safe
				? ['Task appears safe to proceed']
				: ['Review task for safety issues'],
		};
	}
}
