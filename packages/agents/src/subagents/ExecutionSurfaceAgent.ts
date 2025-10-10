/**
 * Execution Surface Agent
 *
 * Specialized sub-agent for external system integration and execution
 * following the LangGraphJS framework pattern.
 *
 * Co-authored-by: brAInwav Development Team
 */

import { EventEmitter } from 'node:events';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import { Annotation, END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { ConnectorRegistry } from '../connectors/registry.js';
import type { ConnectorDefinition, ConnectorRegistryOptions } from '../connectors/registry.js';
import { secureDelay } from '../lib/secure-random.js';

// Execution Surface State
export const ExecutionSurfaceStateAnnotation = Annotation.Root({
	...MessagesAnnotation.spec,
	currentStep: Annotation<string>,
	targetSurface: Annotation<
		| {
				type: 'filesystem' | 'network' | 'git' | 'deployment' | 'database';
				endpoint: string;
				credentials?: Record<string, string>;
		  }
		| undefined
	>(),
	executionPlan:
		Annotation<
			Array<{
				action: string;
				target: string;
				parameters: Record<string, unknown>;
				order: number;
			}>
		>(),
	executionResults:
		Annotation<
			Array<{
				action: string;
				status: 'success' | 'error' | 'pending';
				result: unknown;
				duration: number;
			}>
		>(),
	context: Annotation<Record<string, unknown>>(),
	result: Annotation<unknown>(),
	error: Annotation<string | undefined>(),
});

export type ExecutionSurfaceState = typeof ExecutionSurfaceStateAnnotation.State;

// Configuration for Execution Surface Agent
export interface ExecutionSurfaceConfig {
        name: string;
        maxConcurrentActions: number;
        actionTimeout: number;
        allowedSurfaces: string[];
        securityLevel: 'low' | 'medium' | 'high';
        connectors?: ConnectorRegistryOptions;
}

/**
 * Execution Surface Agent - Handles external system integration and execution
 */
export class ExecutionSurfaceAgent extends EventEmitter {
        private graph: ReturnType<typeof createExecutionSurfaceGraph>;
        private config: ExecutionSurfaceConfig;
        private surfaceConnectors: Map<
                string,
                { execute: (action: string, params: unknown) => Promise<unknown> }
        >;
        private connectorRegistry?: ConnectorRegistry;
        private connectorDefinitions: ConnectorDefinition[] = [];

        constructor(config: ExecutionSurfaceConfig) {
                super();
                this.config = config;
                this.surfaceConnectors = new Map();
                if (config.connectors) {
                        this.connectorRegistry = new ConnectorRegistry(config.connectors);
                        void this.refreshConnectorDefinitions(true);
                }
                this.initializeSurfaceConnectors();
                this.graph = createExecutionSurfaceGraph();
        }

	/**
	 * Execute execution surface operations
	 */
	async execute(
		input: string,
		options?: {
			context?: Record<string, unknown>;
			config?: RunnableConfig;
		},
	): Promise<ExecutionSurfaceState> {
		const initialState: ExecutionSurfaceState = {
			messages: [new HumanMessage({ content: input })],
			currentStep: 'surface_detection',
			targetSurface: undefined,
			executionPlan: [],
			executionResults: [],
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
	 * Initialize surface connectors
	 */
        private initializeSurfaceConnectors(): void {
                // Filesystem connector
                this.surfaceConnectors.set('filesystem', {
                        execute: async (action: string, params: unknown) => {
                                return {
					action,
					filesystem: 'accessed',
					params,
					timestamp: new Date().toISOString(),
				};
			},
		});

		// Network connector
		this.surfaceConnectors.set('network', {
			execute: async (action: string, params: unknown) => {
				return {
					action,
					network: 'connected',
					params,
					timestamp: new Date().toISOString(),
				};
			},
		});

		// Git connector
		this.surfaceConnectors.set('git', {
			execute: async (action: string, params: unknown) => {
				return {
					action,
					git: 'executed',
					params,
					timestamp: new Date().toISOString(),
				};
			},
		});

		// Deployment connector
		this.surfaceConnectors.set('deployment', {
			execute: async (action: string, params: unknown) => {
				return {
					action,
					deployment: 'completed',
					params,
					timestamp: new Date().toISOString(),
				};
			},
		});

		// Database connector
                this.surfaceConnectors.set('database', {
                        execute: async (action: string, params: unknown) => {
                                return {
                                        action,
                                        database: 'queried',
                                        params,
                                        timestamp: new Date().toISOString(),
                                };
                        },
                });
        }

        private async refreshConnectorDefinitions(force = false): Promise<void> {
                if (!this.connectorRegistry) {
                        return;
                }

                try {
                        await this.connectorRegistry.refresh(force);
                        this.connectorDefinitions = this.connectorRegistry.list();
                } catch (error) {
                        this.emit('error', error);
                }
        }

	/**
	 * Get agent capabilities
	 */
	getCapabilities(): string[] {
		return ['deployment', 'networking', 'file-system', 'git-operations', 'database-access'];
	}

	/**
	 * Get available surface connectors
	 */
        getAvailableSurfaces(): string[] {
                void this.refreshConnectorDefinitions();
                const allowed = new Set(this.config.allowedSurfaces);
                const builtin = Array.from(this.surfaceConnectors.keys()).filter((surface) =>
                        allowed.has(surface),
                );

                const connectorSurfaces = this.connectorDefinitions
                        .filter((connector) => connector.enabled)
                        .map((connector) => `connector:${connector.id}`)
                        .filter((surface) => allowed.has('connector') || allowed.has(surface));

                return Array.from(new Set([...builtin, ...connectorSurfaces]));
        }

        async getConnectorDefinitions(): Promise<ConnectorDefinition[]> {
                await this.refreshConnectorDefinitions();
                return this.connectorDefinitions.map((definition) => ({ ...definition }));
        }

	/**
	 * Health check
	 */
	async healthCheck(): Promise<{
		status: string;
		timestamp: string;
		surfaces: number;
		securityLevel: string;
	}> {
		return {
			status: 'healthy',
			timestamp: new Date().toISOString(),
			surfaces: this.surfaceConnectors.size,
			securityLevel: this.config.securityLevel,
		};
	}
}

/**
 * Create LangGraphJS workflow for Execution Surface Agent
 */
function createExecutionSurfaceGraph() {
	/**
	 * Surface Detection Node - Detect target execution surface
	 */
	const surfaceDetection = async (
		state: ExecutionSurfaceState,
	): Promise<Partial<ExecutionSurfaceState>> => {
		const lastMessage = state.messages[state.messages.length - 1];
		const content = typeof lastMessage?.content === 'string' ? lastMessage.content : '';

		// Detect target surface based on content analysis
		const targetSurface = detectTargetSurface(content);

		return {
			currentStep: 'execution_planning',
			targetSurface,
			context: {
				...state.context,
				detectionTimestamp: new Date().toISOString(),
			},
		};
	};

	/**
	 * Execution Planning Node - Plan execution steps
	 */
	const executionPlanning = async (
		state: ExecutionSurfaceState,
	): Promise<Partial<ExecutionSurfaceState>> => {
		const { targetSurface } = state;
		const lastMessage = state.messages[state.messages.length - 1];
		const content = typeof lastMessage?.content === 'string' ? lastMessage.content : '';

		if (!targetSurface) {
			return {
				currentStep: 'error_handling',
				error: 'No target surface detected',
			};
		}

		// Create execution plan
		const executionPlan = createExecutionPlan(content, targetSurface);

		return {
			currentStep: 'security_validation',
			executionPlan,
		};
	};

	/**
	 * Security Validation Node - Validate execution plan security
	 */
	const securityValidation = async (
		state: ExecutionSurfaceState,
	): Promise<Partial<ExecutionSurfaceState>> => {
		const { executionPlan, targetSurface } = state;

		// Validate security constraints
		const securityCheck = validateExecutionSecurity(executionPlan || [], targetSurface);

		if (!securityCheck.passed) {
			return {
				currentStep: 'error_handling',
				error: `Security validation failed: ${securityCheck.reason}`,
			};
		}

		return {
			currentStep: 'surface_execution',
		};
	};

	/**
	 * Surface Execution Node - Execute on target surface
	 */
	const surfaceExecution = async (
		state: ExecutionSurfaceState,
	): Promise<Partial<ExecutionSurfaceState>> => {
		const { executionPlan, targetSurface } = state;

		if (!executionPlan || executionPlan.length === 0) {
			return {
				currentStep: 'response_generation',
				executionResults: [],
			};
		}

		// Execute actions on target surface
		const results = await executeOnSurface(executionPlan, targetSurface);

		return {
			currentStep: 'response_generation',
			executionResults: results,
		};
	};

	/**
	 * Response Generation Node - Generate final response
	 */
	const responseGeneration = async (
		state: ExecutionSurfaceState,
	): Promise<Partial<ExecutionSurfaceState>> => {
		const { executionResults, targetSurface } = state;

		const result = {
			surface: targetSurface?.type || 'unknown',
			actionsExecuted: executionResults?.length || 0,
			successfulActions: executionResults?.filter((r) => r.status === 'success').length || 0,
			summary: generateExecutionSummary(executionResults || [], targetSurface),
		};

		const responseContent = generateExecutionSurfaceResponse(result);
		const responseMessage = new AIMessage({ content: responseContent });

		return {
			currentStep: END,
			messages: [...state.messages, responseMessage],
			result,
		};
	};

	/**
	 * Error Handling Node
	 */
	const errorHandling = async (
		state: ExecutionSurfaceState,
	): Promise<Partial<ExecutionSurfaceState>> => {
		const error = state.error || 'Unknown error in execution surface';

		const errorResponse = new AIMessage({
			content: `Execution surface operation failed: ${error}`,
		});

		return {
			currentStep: END,
			messages: [...state.messages, errorResponse],
			error,
		};
	};

	// Build workflow
	const workflow = new StateGraph(ExecutionSurfaceStateAnnotation)
		.addNode('surface_detection', surfaceDetection)
		.addNode('execution_planning', executionPlanning)
		.addNode('security_validation', securityValidation)
		.addNode('surface_execution', surfaceExecution)
		.addNode('response_generation', responseGeneration)
		.addNode('error_handling', errorHandling)
		.addEdge(START, 'surface_detection')
		.addEdge('surface_detection', 'execution_planning')
		.addEdge('execution_planning', 'security_validation')
		.addEdge('security_validation', 'surface_execution')
		.addEdge('surface_execution', 'response_generation')
		.addEdge('error_handling', END);

	// Add conditional routing for error handling
	workflow.addConditionalEdges(
		'execution_planning',
		(state: ExecutionSurfaceState) => {
			return state.error ? 'error_handling' : 'security_validation';
		},
		{
			security_validation: 'security_validation',
			error_handling: 'error_handling',
		},
	);

	workflow.addConditionalEdges(
		'security_validation',
		(state: ExecutionSurfaceState) => {
			return state.error ? 'error_handling' : 'surface_execution';
		},
		{
			surface_execution: 'surface_execution',
			error_handling: 'error_handling',
		},
	);

	return workflow.compile();
}

// Helper functions

function detectTargetSurface(content: string): {
	type: 'filesystem' | 'network' | 'git' | 'deployment' | 'database';
	endpoint: string;
	credentials?: Record<string, string>;
} {
	const keywords = content.toLowerCase();

	if (keywords.includes('deploy') || keywords.includes('release')) {
		return {
			type: 'deployment',
			endpoint: 'deployment-service',
		};
	}

	if (keywords.includes('git') || keywords.includes('commit') || keywords.includes('branch')) {
		return {
			type: 'git',
			endpoint: 'git-repository',
		};
	}

	if (keywords.includes('network') || keywords.includes('http') || keywords.includes('api')) {
		return {
			type: 'network',
			endpoint: 'network-interface',
		};
	}

	if (keywords.includes('file') || keywords.includes('directory') || keywords.includes('path')) {
		return {
			type: 'filesystem',
			endpoint: 'filesystem',
		};
	}

	if (keywords.includes('database') || keywords.includes('sql') || keywords.includes('query')) {
		return {
			type: 'database',
			endpoint: 'database-connection',
		};
	}

	// Default to filesystem
	return {
		type: 'filesystem',
		endpoint: 'filesystem',
	};
}

function createExecutionPlan(
	content: string,
	targetSurface: {
		type: 'filesystem' | 'network' | 'git' | 'deployment' | 'database';
		endpoint: string;
	},
): Array<{
	action: string;
	target: string;
	parameters: Record<string, unknown>;
	order: number;
}> {
	const plan: Array<{
		action: string;
		target: string;
		parameters: Record<string, unknown>;
		order: number;
	}> = [];

	switch (targetSurface.type) {
		case 'deployment':
			plan.push(
				{
					action: 'prepare_deployment',
					target: targetSurface.endpoint,
					parameters: { content },
					order: 1,
				},
				{
					action: 'execute_deployment',
					target: targetSurface.endpoint,
					parameters: { content },
					order: 2,
				},
				{
					action: 'verify_deployment',
					target: targetSurface.endpoint,
					parameters: { content },
					order: 3,
				},
			);
			break;

		case 'git':
			plan.push(
				{
					action: 'git_status',
					target: targetSurface.endpoint,
					parameters: { content },
					order: 1,
				},
				{
					action: 'git_operation',
					target: targetSurface.endpoint,
					parameters: { content },
					order: 2,
				},
			);
			break;

		case 'network':
			plan.push(
				{
					action: 'network_connect',
					target: targetSurface.endpoint,
					parameters: { content },
					order: 1,
				},
				{
					action: 'network_request',
					target: targetSurface.endpoint,
					parameters: { content },
					order: 2,
				},
			);
			break;

		case 'filesystem':
			plan.push(
				{
					action: 'fs_access',
					target: targetSurface.endpoint,
					parameters: { content },
					order: 1,
				},
				{
					action: 'fs_operation',
					target: targetSurface.endpoint,
					parameters: { content },
					order: 2,
				},
			);
			break;

		case 'database':
			plan.push(
				{
					action: 'db_connect',
					target: targetSurface.endpoint,
					parameters: { content },
					order: 1,
				},
				{
					action: 'db_query',
					target: targetSurface.endpoint,
					parameters: { content },
					order: 2,
				},
			);
			break;
	}

	return plan;
}

function validateExecutionSecurity(
	executionPlan: Array<{
		action: string;
		target: string;
		parameters: Record<string, unknown>;
		order: number;
	}>,
	targetSurface:
		| {
				type: 'filesystem' | 'network' | 'git' | 'deployment' | 'database';
				endpoint: string;
		  }
		| undefined,
): { passed: boolean; reason?: string } {
	// Basic security validation
	for (const action of executionPlan) {
		// Check for dangerous operations
		if (action.action.includes('delete') || action.action.includes('remove')) {
			return {
				passed: false,
				reason: 'Destructive operations not allowed',
			};
		}

		// Check for unauthorized access
		if (action.target.includes('admin') || action.target.includes('root')) {
			return {
				passed: false,
				reason: 'Administrative access not allowed',
			};
		}
	}

	// Check surface permissions
	if (
		targetSurface?.type === 'database' &&
		executionPlan.some((a) => a.action.includes('modify'))
	) {
		return {
			passed: false,
			reason: 'Database modification not allowed',
		};
	}

	return { passed: true };
}

async function executeOnSurface(
	executionPlan: Array<{
		action: string;
		target: string;
		parameters: Record<string, unknown>;
		order: number;
	}>,
	targetSurface:
		| {
				type: 'filesystem' | 'network' | 'git' | 'deployment' | 'database';
				endpoint: string;
		  }
		| undefined,
): Promise<
	Array<{
		action: string;
		status: 'success' | 'error' | 'pending';
		result: unknown;
		duration: number;
	}>
> {
	const results: Array<{
		action: string;
		status: 'success' | 'error' | 'pending';
		result: unknown;
		duration: number;
	}> = [];

	for (const step of executionPlan.sort((a, b) => a.order - b.order)) {
		const startTime = Date.now();

		try {
			// Simulate execution
			const result = await simulateSurfaceExecution(step, targetSurface);

			results.push({
				action: step.action,
				status: 'success',
				result,
				duration: Date.now() - startTime,
			});
		} catch (error) {
			results.push({
				action: step.action,
				status: 'error',
				result: error instanceof Error ? error.message : String(error),
				duration: Date.now() - startTime,
			});
		}
	}

	return results;
}

async function simulateSurfaceExecution(
	step: {
		action: string;
		target: string;
		parameters: Record<string, unknown>;
		order: number;
	},
	targetSurface:
		| {
				type: 'filesystem' | 'network' | 'git' | 'deployment' | 'database';
				endpoint: string;
		  }
		| undefined,
): Promise<unknown> {
	// Simulate execution delay
	await new Promise((resolve) => setTimeout(resolve, secureDelay(200, 501)));

	return {
		action: step.action,
		target: step.target,
		surface: targetSurface?.type || 'unknown',
		status: 'completed',
		timestamp: new Date().toISOString(),
		parameters: step.parameters,
	};
}

function generateExecutionSummary(
	executionResults: Array<{
		action: string;
		status: 'success' | 'error' | 'pending';
		result: unknown;
		duration: number;
	}>,
	targetSurface:
		| {
				type: 'filesystem' | 'network' | 'git' | 'deployment' | 'database';
				endpoint: string;
		  }
		| undefined,
): string {
	const successCount = executionResults.filter((r) => r.status === 'success').length;
	const totalActions = executionResults.length;

	if (totalActions === 0) return 'No actions executed';

	return `Executed ${totalActions} actions on ${targetSurface?.type || 'unknown'} surface, ${successCount} successful`;
}

function generateExecutionSurfaceResponse(result: {
	surface: string;
	actionsExecuted: number;
	successfulActions: number;
	summary: string;
}): string {
	const successRate =
		result.actionsExecuted > 0 ? (result.successfulActions / result.actionsExecuted) * 100 : 0;

	return `Execution surface operation complete on ${result.surface}. ${result.summary}. Success rate: ${successRate.toFixed(1)}%`;
}

/**
 * Factory function to create Execution Surface Agent
 */
export function createExecutionSurfaceAgent(
        config?: Partial<ExecutionSurfaceConfig>,
): ExecutionSurfaceAgent {
        const connectorOptions = config?.connectors ?? resolveConnectorEnvConfig();
        const defaultConfig: ExecutionSurfaceConfig = {
                name: 'execution-surface-agent',
                maxConcurrentActions: 3,
                actionTimeout: 60000,
                allowedSurfaces: ['filesystem', 'network', 'git', 'deployment', 'database', 'connector'],
                securityLevel: 'medium',
                ...config,
                connectors: config?.connectors ?? connectorOptions,
        };

        return new ExecutionSurfaceAgent(defaultConfig);
}

function resolveConnectorEnvConfig(): ConnectorRegistryOptions | undefined {
        const signatureKey = process.env.CONNECTORS_SIGNATURE_KEY;
        if (!signatureKey) {
                return undefined;
        }

        const explicitUrl = process.env.CONNECTORS_SERVICE_MAP_URL;
        const baseHost = explicitUrl ?? process.env.ASBR_BASE_URL ?? 'http://127.0.0.1:7439';
        const normalized = explicitUrl
                ? explicitUrl
                : `${baseHost.replace(/\/$/, '')}/v1/connectors/service-map`;

        return {
                serviceMapUrl: normalized,
                apiKey: process.env.ASBR_API_KEY ?? process.env.MCP_API_KEY,
                signatureKey,
                connectorsApiKey: process.env.CONNECTORS_API_KEY,
        };
}
