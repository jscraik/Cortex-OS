/**
 * Intelligence & Scheduler Agent
 *
 * Specialized sub-agent for intelligent task analysis, planning, and scheduling
 * following the LangGraphJS framework pattern.
 *
 * Co-authored-by: brAInwav Development Team
 */

import { EventEmitter } from 'node:events';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import { Annotation, END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';

// Intelligence & Scheduler State
export const IntelligenceStateAnnotation = Annotation.Root({
	...MessagesAnnotation.spec,
	currentStep: Annotation<string>,
	taskAnalysis: Annotation<
		| {
			type: string;
			complexity: number;
			priority: number;
			estimatedDuration: number;
		}
		| undefined
	>(),
	schedule:
		Annotation<
			Array<{
				step: string;
				order: number;
				dependencies: string[];
				resources: string[];
			}>
		>(),
	context: Annotation<Record<string, unknown>>(),
	result: Annotation<unknown>(),
	error: Annotation<string | undefined>(),
});

export type IntelligenceState = typeof IntelligenceStateAnnotation.State;

// Configuration for Intelligence & Scheduler Agent
export interface IntelligenceSchedulerConfig {
	name: string;
	maxComplexity: number;
	planningTimeout: number;
	enableAnalytics: boolean;
}

/**
 * Intelligence & Scheduler Agent - Handles task analysis, planning, and scheduling
 */
export class IntelligenceSchedulerAgent extends EventEmitter {
	private readonly graph: ReturnType<typeof createIntelligenceSchedulerGraph>;
	private readonly config: IntelligenceSchedulerConfig;

	constructor(config: IntelligenceSchedulerConfig) {
		super();
		// Observability: log planning timeout to avoid unused warnings
		console.log(`IntelligenceSchedulerAgent initialized (planningTimeout=${config.planningTimeout}ms)`);
		this.config = config;
		this.graph = createIntelligenceSchedulerGraph();
		// Use config to set up scheduler parameters
		console.log(`IntelligenceSchedulerAgent initialized with max complexity: ${this.config.maxComplexity}, timeout: ${this.config.planningTimeout}ms`);
	}

	/**
	 * Execute intelligence analysis and scheduling
	 */
	async execute(
		input: string,
		options?: {
			context?: Record<string, unknown>;
			config?: RunnableConfig;
		},
	): Promise<IntelligenceState> {
		const initialState: IntelligenceState = {
			messages: [new HumanMessage({ content: input })],
			currentStep: 'task_analysis',
			taskAnalysis: undefined,
			schedule: [],
			context: options?.context || {},
			result: undefined,
			error: undefined,
		};

		try {
			return await this.graph.invoke(initialState, options?.config);
		} catch (error) {
			this.emit('error', error);
			throw error;
		}
	}

	/**
	 * Get agent capabilities
	 */
	getCapabilities(): string[] {
		return ['task-analysis', 'planning', 'scheduling', 'routing', 'prioritization'];
	}

	/**
	 * Health check
	 */
	async healthCheck(): Promise<{ status: string; timestamp: string }> {
		return {
			status: 'healthy',
			timestamp: new Date().toISOString(),
		};
	}
}

/**
 * Create LangGraphJS workflow for Intelligence & Scheduler Agent
 */
function createIntelligenceSchedulerGraph() {
	/**
	 * Task Analysis Node - Analyze incoming task
	 */
	const taskAnalysis = async (state: IntelligenceState): Promise<Partial<IntelligenceState>> => {
		const lastMessage = state.messages[state.messages.length - 1];
		const content = typeof lastMessage?.content === 'string' ? lastMessage.content : '';

		// Analyze task complexity and type
		const analysis = analyzeTask(content);

		return {
			currentStep: 'planning',
			taskAnalysis: analysis,
			context: {
				...state.context,
				analysisTimestamp: new Date().toISOString(),
			},
		};
	};

	/**
	 * Planning Node - Create execution plan
	 */
	const planning = async (state: IntelligenceState): Promise<Partial<IntelligenceState>> => {
		const { taskAnalysis } = state;
		const lastMessage = state.messages[state.messages.length - 1];
		const content = typeof lastMessage?.content === 'string' ? lastMessage.content : '';

		if (!taskAnalysis) {
			return {
				currentStep: 'error_handling',
				error: 'Task analysis required for planning',
			};
		}

		// Create execution plan based on analysis
		const schedule = createExecutionPlan(content, taskAnalysis);

		return {
			currentStep: 'scheduling',
			schedule,
		};
	};

	/**
	 * Scheduling Node - Optimize and finalize schedule
	 */
	const scheduling = async (state: IntelligenceState): Promise<Partial<IntelligenceState>> => {
		const { schedule, taskAnalysis } = state;

		// Optimize schedule for efficiency
		const optimizedSchedule = optimizeSchedule(schedule || []);

		// Generate result
		const result = {
			taskType: taskAnalysis?.type || 'unknown',
			complexity: taskAnalysis?.complexity || 1,
			priority: taskAnalysis?.priority || 5,
			estimatedDuration: taskAnalysis?.estimatedDuration || 60000,
			schedule: optimizedSchedule,
			recommendations: generateRecommendations(taskAnalysis, optimizedSchedule),
		};

		return {
			currentStep: 'response_generation',
			result,
		};
	};

	/**
	 * Response Generation Node - Generate final response
	 */
	const responseGeneration = async (
		state: IntelligenceState,
	): Promise<Partial<IntelligenceState>> => {
		const { result } = state;

		const responseContent = generateIntelligenceResponse(result);
		const responseMessage = new AIMessage({ content: responseContent });

		return {
			currentStep: END,
			messages: [...state.messages, responseMessage],
		};
	};

	/**
	 * Error Handling Node
	 */
	const errorHandling = async (state: IntelligenceState): Promise<Partial<IntelligenceState>> => {
		const error = state.error || 'Unknown error in intelligence analysis';

		const errorResponse = new AIMessage({
			content: `Intelligence analysis failed: ${error}`,
		});

		return {
			currentStep: END,
			messages: [...state.messages, errorResponse],
			error,
		};
	};

	// Build workflow
	const workflow = new StateGraph(IntelligenceStateAnnotation)
		.addNode('task_analysis', taskAnalysis)
		.addNode('planning', planning)
		.addNode('scheduling', scheduling)
		.addNode('response_generation', responseGeneration)
		.addNode('error_handling', errorHandling)
		.addEdge(START, 'task_analysis')
		.addEdge('task_analysis', 'planning')
		.addEdge('planning', 'scheduling')
		.addEdge('scheduling', 'response_generation')
		.addEdge('error_handling', END);

	// Add conditional routing for error handling
	workflow.addConditionalEdges(
		'planning',
		(state: IntelligenceState) => {
			return state.error ? 'error_handling' : 'scheduling';
		},
		{
			scheduling: 'scheduling',
			error_handling: 'error_handling',
		},
	);

	return workflow.compile();
}

// Helper functions

function analyzeTask(content: string): {
	type: string;
	complexity: number;
	priority: number;
	estimatedDuration: number;
} {
	const keywords = content.toLowerCase();

	// Determine task type
	let type = 'general';
	if (keywords.includes('code') || keywords.includes('develop')) type = 'development';
	if (keywords.includes('test') || keywords.includes('verify')) type = 'testing';
	if (keywords.includes('deploy') || keywords.includes('release')) type = 'deployment';
	if (keywords.includes('analyze') || keywords.includes('review')) type = 'analysis';

	// Calculate complexity (1-10)
	let complexity = 1;
	if (keywords.includes('complex') || keywords.includes('advanced')) complexity += 3;
	if (keywords.includes('multiple') || keywords.includes('various')) complexity += 2;
	if (keywords.includes('integration') || keywords.includes('system')) complexity += 2;
	complexity = Math.min(complexity, 10);

	// Determine priority (1-10)
	let priority = 5; // default medium priority
	if (keywords.includes('urgent') || keywords.includes('critical')) priority = 10;
	if (keywords.includes('high') || keywords.includes('important')) priority = 8;
	if (keywords.includes('low') || keywords.includes('later')) priority = 3;

	// Estimate duration in milliseconds
	const baseTime = 60000; // 1 minute base
	const estimatedDuration = baseTime * complexity * (priority / 5);

	return { type, complexity, priority, estimatedDuration };
}

function createExecutionPlan(
	_content: string,
	analysis: { type: string; complexity: number },
): Array<{
	step: string;
	order: number;
	dependencies: string[];
	resources: string[];
}> {
	const steps: Array<{
		step: string;
		order: number;
		dependencies: string[];
		resources: string[];
	}> = [];

	// Base steps for all tasks
	steps.push({
		step: 'initialize',
		order: 1,
		dependencies: [],
		resources: ['memory', 'context'],
	});

	// Type-specific steps
	if (analysis.type === 'development') {
		steps.push(
			{
				step: 'analyze_requirements',
				order: 2,
				dependencies: ['initialize'],
				resources: ['analyzer', 'requirements'],
			},
			{
				step: 'design_solution',
				order: 3,
				dependencies: ['analyze_requirements'],
				resources: ['designer', 'architect'],
			},
			{
				step: 'implement',
				order: 4,
				dependencies: ['design_solution'],
				resources: ['code-generator', 'tools'],
			},
		);
	} else if (analysis.type === 'testing') {
		steps.push(
			{
				step: 'test_planning',
				order: 2,
				dependencies: ['initialize'],
				resources: ['test-planner', 'specs'],
			},
			{
				step: 'execute_tests',
				order: 3,
				dependencies: ['test_planning'],
				resources: ['test-runner', 'environment'],
			},
		);
	} else {
		// Generic steps for other task types
		steps.push({
			step: 'process_task',
			order: 2,
			dependencies: ['initialize'],
			resources: ['processor', 'tools'],
		});
	}

	// Add finalization step
	steps.push({
		step: 'finalize',
		order: steps.length + 1,
		dependencies: [steps[steps.length - 1].step],
		resources: ['finalizer', 'validator'],
	});

	return steps;
}

function optimizeSchedule(
	schedule: Array<{
		step: string;
		order: number;
		dependencies: string[];
		resources: string[];
	}>,
): Array<{
	step: string;
	order: number;
	dependencies: string[];
	resources: string[];
}> {
	// For now, return the schedule as-is
	// In production, implement dependency optimization, resource allocation, etc.
	return schedule.sort((a, b) => a.order - b.order);
}

function generateRecommendations(
	analysis: { type: string; complexity: number; priority: number } | undefined,
	schedule: Array<{ step: string; order: number; dependencies: string[]; resources: string[] }>,
): string[] {
	const recommendations: string[] = [];

	if (!analysis) return recommendations;

	if (analysis.complexity > 7) {
		recommendations.push('Consider breaking down into smaller subtasks');
	}

	if (analysis.priority > 8) {
		recommendations.push('Allocate additional resources for high priority task');
	}

	if (schedule.length > 5) {
		recommendations.push('Monitor progress closely due to multiple steps');
	}

	return recommendations;
}

function generateIntelligenceResponse(result: unknown): string {
	if (typeof result === 'object' && result !== null) {
		const res = result as Record<string, unknown>;
		const taskType = typeof res.taskType === 'string' ? res.taskType : 'unknown';
		const complexity = typeof res.complexity === 'number' ? res.complexity : 0;
		const priority = typeof res.priority === 'number' ? res.priority : 0;
		const scheduleLength = Array.isArray(res.schedule) ? res.schedule.length : 0;

		return `Intelligence analysis complete. Task type: ${taskType}, Complexity: ${complexity}/10, Priority: ${priority}/10. Execution plan with ${scheduleLength} steps created.`;
	}

	return 'Intelligence analysis completed successfully.';
}

/**
 * Factory function to create Intelligence & Scheduler Agent
 */
export function createIntelligenceSchedulerAgent(
	config?: Partial<IntelligenceSchedulerConfig>,
): IntelligenceSchedulerAgent {
	const defaultConfig: IntelligenceSchedulerConfig = {
		name: 'intelligence-scheduler-agent',
		maxComplexity: 10,
		planningTimeout: 30000,
		enableAnalytics: true,
		...config,
	};

	return new IntelligenceSchedulerAgent(defaultConfig);
}
