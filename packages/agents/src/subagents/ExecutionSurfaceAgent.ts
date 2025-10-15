/**
 * Execution Surface Agent
 *
 * Specialized sub-agent for external system integration and execution
 * following the LangGraphJS framework pattern.
 *
 * Co-authored-by: brAInwav Development Team
 */

import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import { Annotation, END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import type {
	ConnectorDefinition,
	ConnectorRegistryOptions,
	ConnectorRemoteTool,
} from '../connectors/registry.js';
import { ConnectorRegistry } from '../connectors/registry.js';
import { secureDelay } from '../lib/secure-random.js';
import {
	createAgentMCPClient,
	createRagBus,
	executeWikidataWorkflow,
	type AgentMCPClient,
	type WorkflowHooks,
	type WorkflowResult,
} from '@cortex-os/rag';
import type { RagBus, RagEventEnvelope } from '@cortex-os/rag';
import { LocalMemoryProvider } from '@cortex-os/memory-core';

type BuiltinSurfaceType = 'filesystem' | 'network' | 'git' | 'deployment' | 'database';

interface BuiltinExecutionSurface {
	type: BuiltinSurfaceType;
	endpoint: string;
	credentials?: Record<string, string>;
}

interface ConnectorExecutionSurface {
	type: 'connector';
	endpoint: string;
	connectorId: string;
	scopes: string[];
	description?: string;
	remoteTools?: ConnectorRemoteTool[];
	tags?: string[];
}

type ExecutionSurfaceTarget = BuiltinExecutionSurface | ConnectorExecutionSurface;

interface AvailableConnectorContext {
	id: string;
	endpoint: string;
	scopes?: string[];
	description?: string;
	remoteTools?: ConnectorRemoteTool[];
	tags?: string[];
	enabled?: boolean;
	definition?: ConnectorDefinition;
}

interface DetectionContext {
	connectors: AvailableConnectorContext[];
	scopeHints: string[];
}

interface ExecutionSurfaceGraphDeps {
	getConnectorDefinition?: (id: string) => ConnectorDefinition | undefined;
	getWorkflowHooks?: () => Promise<WorkflowHooks>;
	getMcpClient?: (connector: ConnectorDefinition) => Promise<AgentMCPClient>;
}

// Execution Surface State
export const ExecutionSurfaceStateAnnotation = Annotation.Root({
	...MessagesAnnotation.spec,
	currentStep: Annotation<string>,
	targetSurface: Annotation<ExecutionSurfaceTarget | undefined>(),
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
	private ragBus?: RagBus;
	private localMemoryProvider?: LocalMemoryProvider;
	private workflowHooksPromise?: Promise<WorkflowHooks>;
	private readonly connectorClients = new Map<string, Promise<AgentMCPClient>>();

	constructor(config: ExecutionSurfaceConfig) {
		super();
		this.config = config;
		this.surfaceConnectors = new Map();
		if (config.connectors) {
			this.connectorRegistry = new ConnectorRegistry(config.connectors);
			// Start async refresh but don't wait to avoid blocking constructor
			this.refreshConnectorDefinitions(true).catch((error) => {
				console.warn('brAInwav execution surface agent: Initial connector refresh failed:', error);
			});
		}
	this.initializeSurfaceConnectors();
	this.graph = createExecutionSurfaceGraph({
		getConnectorDefinition: (id) =>
			this.connectorDefinitions.find((definition) => definition.id === id),
		getWorkflowHooks: () => this.resolveWorkflowHooks(),
		getMcpClient: (connector) => this.resolveMcpClient(connector),
	});
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
		await this.refreshConnectorDefinitions();
		const enabledConnectors = this.connectorDefinitions.filter((definition) => definition.enabled);
		const mergedContext: Record<string, unknown> = {
			...(options?.context ?? {}),
		};

		if (enabledConnectors.length > 0) {
			mergedContext.availableConnectors = enabledConnectors.map(
				(definition) =>
					({
						id: definition.id,
						endpoint: definition.endpoint,
						scopes: definition.scopes,
						description: definition.description ?? definition.displayName,
						remoteTools: definition.remoteTools,
						tags: definition.tags,
						enabled: definition.enabled,
						definition,
					}) satisfies AvailableConnectorContext,
			);
		}

		const scopeHints = collectScopeHints(mergedContext, enabledConnectors);
		if (scopeHints.length > 0) {
			mergedContext.scopeHints = scopeHints;
		}

		const initialState: ExecutionSurfaceState = {
			messages: [new HumanMessage({ content: input })],
			currentStep: 'surface_detection',
			targetSurface: undefined,
			executionPlan: [],
			executionResults: [],
			context: mergedContext,
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

	private async getRagBus(): Promise<RagBus> {
		if (!this.ragBus) {
			this.ragBus = createRagBus({ source: 'urn:cortex:agents:execution-surface' });
		}
		return this.ragBus;
	}

	private async getLocalMemoryProvider(): Promise<LocalMemoryProvider> {
		if (!this.localMemoryProvider) {
			this.localMemoryProvider = new LocalMemoryProvider({ maxRecords: 2048 });
		}
		return this.localMemoryProvider;
	}

	private async resolveWorkflowHooks(): Promise<WorkflowHooks> {
		if (!this.workflowHooksPromise) {
			this.workflowHooksPromise = (async () => {
				const bus = await this.getRagBus();
				const memory = await this.getLocalMemoryProvider();
				const hooks: WorkflowHooks = {
					publishEvent: async (envelope) => {
						try {
							await bus.publishEnvelope(envelope as RagEventEnvelope);
						} catch (error) {
							console.warn('brAInwav execution surface agent: Failed to publish RAG event', {
								error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
								brand: 'brAInwav',
								timestamp: new Date().toISOString(),
							});
						}
					},
					persistInsight: async (insight) => {
						try {
							const tags = [
								'wikidata',
								'semantic',
								`connector:${insight.connectorId}`,
							];
							if (insight.partialFailure) tags.push('partial');
							await memory.store({
								text: `[${insight.connectorId}] ${insight.result.content}`,
								tags,
								meta: {
									brand: insight.brand,
									query: insight.query,
									result: insight.result,
									timestamp: insight.timestamp,
									partialFailure: insight.partialFailure,
								},
							});
						} catch (error) {
							console.warn('brAInwav execution surface agent: Failed to persist Local Memory insight', {
								error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
								brand: 'brAInwav',
								timestamp: new Date().toISOString(),
							});
						}
					},
				};
				return hooks;
			})();
		}
		return this.workflowHooksPromise;
	}

	private async resolveMcpClient(connector: ConnectorDefinition): Promise<AgentMCPClient> {
		let clientPromise = this.connectorClients.get(connector.id);
		if (!clientPromise) {
			clientPromise = (async () => {
				const apiKey = extractApiKeyFromHeaders(connector.headers);
				const client = createAgentMCPClient({ mcpServerUrl: connector.endpoint, apiKey });
				if (typeof client.initialize === 'function') {
					await client.initialize();
				}
				return client;
			})();
			this.connectorClients.set(connector.id, clientPromise);
		}
		return clientPromise;
	}

	private async refreshConnectorDefinitions(force = false): Promise<void> {
		if (!this.connectorRegistry) {
			return;
		}

		try {
			await this.connectorRegistry.refresh(force);
			this.connectorDefinitions = this.connectorRegistry.list();
		} catch (error) {
			console.warn('brAInwav execution surface agent: Connector refresh failed:', error);
			this.emit('error', error);
			// Don't re-throw to allow caller to continue with existing definitions
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
	async getAvailableSurfaces(): Promise<string[]> {
		try {
			await this.refreshConnectorDefinitions();
		} catch (error) {
			// Log warning but continue with existing definitions
			console.warn(
				'brAInwav execution surface agent: Failed to refresh connectors for surface list:',
				error,
			);
		}

		const allowed = new Set(this.config.allowedSurfaces);
		const builtin = Array.from(this.surfaceConnectors.keys()).filter((surface) =>
			allowed.has(surface),
		);

		const connectorSurfaces = this.connectorDefinitions
			.filter((connector) => connector.status === 'enabled')
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
function createExecutionSurfaceGraph(deps: ExecutionSurfaceGraphDeps = {}) {
	/**
	 * Surface Detection Node - Detect target execution surface
	 */
	const surfaceDetection = async (
		state: ExecutionSurfaceState,
	): Promise<Partial<ExecutionSurfaceState>> => {
		const lastMessage = state.messages[state.messages.length - 1];
		const content = typeof lastMessage?.content === 'string' ? lastMessage.content : '';

		const detection = normalizeDetectionContext(state.context);
		const targetSurface = detectTargetSurface(content, detection);
		const scopeHints = mergeScopeHints(state.context?.scopeHints, detection.scopeHints);
		const updatedContext: Record<string, unknown> = {
			...state.context,
			detectionTimestamp: new Date().toISOString(),
		};

		if (detection.connectors.length > 0) {
			updatedContext.availableConnectors = detection.connectors;
		}

		if (scopeHints.length > 0) {
			updatedContext.scopeHints = scopeHints;
		}

		return {
			currentStep: 'execution_planning',
			targetSurface,
			context: updatedContext,
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

		if (
			targetSurface?.type === 'connector' &&
			targetSurface.connectorId === 'wikidata'
		) {
			const wikidataResults = await maybeRunWikidataWorkflow(
				executionPlan as ExecutionPlanStep[],
				state,
				targetSurface,
				deps,
			);
			if (wikidataResults) {
				return {
					currentStep: 'response_generation',
					executionResults: wikidataResults,
				};
			}
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
			surface: formatSurfaceName(targetSurface),
			actionsExecuted: executionResults?.length || 0,
			successfulActions: executionResults?.filter((r) => r.status === 'success').length || 0,
			summary: generateExecutionSummary(executionResults || [], targetSurface),
			metadata:
				targetSurface?.type === 'connector'
					? { connectorId: targetSurface.connectorId, scopes: targetSurface.scopes }
					: undefined,
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

const FACT_SCOPE_MATCHERS = ['facts', 'fact', 'fact-check', 'knowledge:facts', 'factual'];
const FACT_KEYWORDS = [
	'wikidata',
	'fact',
	'facts',
	'evidence',
	'citation',
	'cite',
	'source',
	'claim',
	'claims',
	'qid',
	'q-id',
	'who is',
	'what is',
	'when did',
	'where is',
	'tell me about',
	'biography',
	'statistic',
	'verify',
	'ground truth',
];
const QID_REGEX = /\bQ\d{2,}\b/gi;
const CLAIM_ID_REGEX = /\b[QP]\d+\$[A-Za-z0-9-]+\b/gi;

function normalizeStringArray(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value
			.map((entry) => (typeof entry === 'string' ? entry : undefined))
			.filter((entry): entry is string => Boolean(entry));
	}
	if (typeof value === 'string') return [value];
	return [];
}

function normalizeRemoteToolEntry(entry: unknown): ConnectorRemoteTool | undefined {
	if (!entry || typeof entry !== 'object') return undefined;
	const record = entry as Record<string, unknown>;
	const name = typeof record.name === 'string' ? record.name : undefined;
	const description = typeof record.description === 'string' ? record.description : undefined;
	if (!name || !description) return undefined;
	const tags = normalizeStringArray(record.tags);
	const scopes = normalizeStringArray(record.scopes);
	return {
		name,
		description,
		tags: tags.length ? tags : undefined,
		scopes: scopes.length ? scopes : undefined,
	};
}

function normalizeConnectorContextEntry(entry: unknown): AvailableConnectorContext | undefined {
	if (!entry || typeof entry !== 'object') return undefined;
	const record = entry as Record<string, unknown>;
	const id = typeof record.id === 'string' ? record.id : undefined;
	const endpoint = typeof record.endpoint === 'string' ? record.endpoint : undefined;
	if (!id || !endpoint) return undefined;
	const scopes = normalizeStringArray(record.scopes);
	const description = typeof record.description === 'string' ? record.description : undefined;
	const tags = normalizeStringArray(record.tags);
	const remoteToolsRaw = Array.isArray(record.remoteTools) ? record.remoteTools : undefined;
	const remoteTools = remoteToolsRaw
		? remoteToolsRaw
				.map((tool) => normalizeRemoteToolEntry(tool))
				.filter((tool): tool is ConnectorRemoteTool => Boolean(tool))
		: undefined;
	const enabled = typeof record.enabled === 'boolean' ? record.enabled : true;
	const definition =
		record.definition && typeof record.definition === 'object'
			? (record.definition as ConnectorDefinition)
			: undefined;
	return {
		id,
		endpoint,
		scopes: scopes.length ? scopes : undefined,
		description,
		remoteTools,
		tags: tags.length ? tags : undefined,
		enabled,
		definition,
	};
}

function mergeScopeHints(existing: unknown, additional: string[]): string[] {
	const merged = new Set<string>(normalizeStringArray(existing));
	for (const hint of additional) {
		if (hint) merged.add(hint);
	}
	return Array.from(merged);
}

function collectScopeHints(
	context: Record<string, unknown>,
	connectors: ConnectorDefinition[],
): string[] {
	const hints = new Set<string>();
	const add = (value: unknown) => {
		for (const entry of normalizeStringArray(value)) {
			if (entry) hints.add(entry);
		}
	};
	add(context.scope);
	add(context.scopes);
	add(context.scopeHints);
	for (const connector of connectors) {
		if (connector.scopes.some((scope) => scope.toLowerCase().includes('facts'))) {
			hints.add('facts');
		}
		if (
			/wikidata/i.test(connector.id) ||
			connector.scopes.some((scope) => /wikidata/i.test(scope))
		) {
			hints.add('wikidata');
		}
	}
	return Array.from(hints);
}

function normalizeDetectionContext(context?: Record<string, unknown>): DetectionContext {
	const available =
		context && Array.isArray((context as Record<string, unknown>).availableConnectors)
			? ((context as Record<string, unknown>).availableConnectors as unknown[])
					.map((entry) => normalizeConnectorContextEntry(entry))
					.filter(
						(entry): entry is AvailableConnectorContext =>
							Boolean(entry) && entry.enabled !== false,
					)
			: [];
	const hints = new Set<string>();
	if (context) {
		const record = context as Record<string, unknown>;
		for (const key of ['scope', 'scopes', 'scopeHints']) {
			const value = record[key];
			for (const entry of normalizeStringArray(value)) {
				if (entry) hints.add(entry);
			}
		}
	}
	for (const connector of available) {
		if (
			normalizeStringArray(connector.scopes).some((scope) => scope.toLowerCase().includes('facts'))
		) {
			hints.add('facts');
		}
		if (
			/wikidata/i.test(connector.id) ||
			normalizeStringArray(connector.tags).some((tag) => /wikidata/i.test(tag))
		) {
			hints.add('wikidata');
		}
	}
	return { connectors: available, scopeHints: Array.from(hints) };
}

function formatSurfaceName(targetSurface?: ExecutionSurfaceTarget): string {
	if (!targetSurface) return 'unknown';
	if (targetSurface.type === 'connector') {
		return `connector:${targetSurface.connectorId}`;
	}
	return targetSurface.type;
}

function hasVectorTag(tool?: ConnectorRemoteTool): boolean {
	if (!tool) return false;
	if (tool.tags?.some((tag) => tag.toLowerCase().includes('vector'))) return true;
	return /vector/i.test(tool.name);
}

function chooseFactsConnector(
	connectors: AvailableConnectorContext[],
): ConnectorExecutionSurface | undefined {
	const prioritized = [
		connectors.find((connector) => connector.id === 'wikidata'),
		connectors.find((connector) =>
			normalizeStringArray(connector.scopes).some((scope) => scope.toLowerCase().includes('facts')),
		),
		connectors.find((connector) =>
			normalizeStringArray(connector.tags).some((tag) => /wikidata/i.test(tag)),
		),
		connectors[0],
	];
	for (const candidate of prioritized) {
		if (!candidate) continue;
		const scopes = normalizeStringArray(candidate.scopes);
		return {
			type: 'connector',
			connectorId: candidate.id,
			endpoint: candidate.endpoint,
			scopes,
			description: candidate.description,
			remoteTools: candidate.remoteTools,
			tags: candidate.tags,
		};
	}
	return undefined;
}

function detectBuiltinTarget(keywords: string): BuiltinExecutionSurface {
	if (keywords.includes('deploy') || keywords.includes('release')) {
		return { type: 'deployment', endpoint: 'deployment-service' };
	}

	if (keywords.includes('git') || keywords.includes('commit') || keywords.includes('branch')) {
		return { type: 'git', endpoint: 'git-repository' };
	}

	if (keywords.includes('network') || keywords.includes('http') || keywords.includes('api')) {
		return { type: 'network', endpoint: 'network-interface' };
	}

	if (keywords.includes('file') || keywords.includes('directory') || keywords.includes('path')) {
		return { type: 'filesystem', endpoint: 'filesystem' };
	}

	if (keywords.includes('database') || keywords.includes('sql') || keywords.includes('query')) {
		return { type: 'database', endpoint: 'database-connection' };
	}

	return { type: 'filesystem', endpoint: 'filesystem' };
}

function detectTargetSurface(content: string, detection: DetectionContext): ExecutionSurfaceTarget {
	const keywords = content.toLowerCase();
	const scopeIntent = detection.scopeHints.some((hint) =>
		FACT_SCOPE_MATCHERS.some((matcher) => hint.toLowerCase().includes(matcher)),
	);
	const keywordIntent =
		FACT_KEYWORDS.some((keyword) => keywords.includes(keyword)) ||
		Boolean(content.match(QID_REGEX));
	const factIntent = scopeIntent || keywordIntent;
	if (factIntent) {
		const connector = chooseFactsConnector(detection.connectors);
		if (connector) {
			return connector;
		}
	}

	if (/wikidata/i.test(content)) {
		const connector = chooseFactsConnector(detection.connectors);
		if (connector) {
			return connector;
		}
	}

	return detectBuiltinTarget(keywords);
}

function createExecutionPlan(
	content: string,
	targetSurface: ExecutionSurfaceTarget,
): Array<{
	action: string;
	target: string;
	parameters: Record<string, unknown>;
	order: number;
}> {
	if (targetSurface.type === 'connector') {
		return createConnectorPlan(content, targetSurface);
	}
	return createBuiltinPlan(content, targetSurface);
}

// Step builder: Vector search
function buildVectorSearchStep(
	vectorTool: ConnectorRemoteTool,
	connectorId: string,
	content: string,
	scopes: string[],
	order: number,
): { action: string; target: string; parameters: Record<string, unknown>; order: number } {
	return {
		action: 'invoke_connector_tool',
		target: `${connectorId}:${vectorTool.name}`,
		parameters: {
			connectorId,
			tool: vectorTool.name,
			description: vectorTool.description,
			query: content,
			scopes: vectorTool.scopes ?? scopes,
			prefer: 'vector',
			brand: 'brAInwav',
		},
		order,
	};
}

// Step builder: Claims retrieval
function buildClaimsStep(
	claimsTool: ConnectorRemoteTool,
	connectorId: string,
	content: string,
	scopes: string[],
	order: number,
): { action: string; target: string; parameters: Record<string, unknown>; order: number } {
	return {
		action: 'stitch_connector_claims',
		target: `${connectorId}:${claimsTool.name}`,
		parameters: {
			connectorId,
			tool: claimsTool.name,
			description: claimsTool.description,
			query: content,
			stitchClaims: true,
			scopes: claimsTool.scopes ?? scopes,
			brand: 'brAInwav',
		},
		order,
	};
}

// Step builder: SPARQL enrichment
function buildSparqlStep(
	sparqlTool: ConnectorRemoteTool,
	connectorId: string,
	content: string,
	scopes: string[],
	order: number,
): { action: string; target: string; parameters: Record<string, unknown>; order: number } {
	return {
		action: 'enrich_with_sparql',
		target: `${connectorId}:${sparqlTool.name}`,
		parameters: {
			connectorId,
			tool: sparqlTool.name,
			description: sparqlTool.description,
			query: content,
			scopes: sparqlTool.scopes ?? scopes,
			optional: true,
			brand: 'brAInwav',
		},
		order,
	};
}

// Helper: Identify available tools from remoteTools
function identifyConnectorTools(remoteTools: ConnectorRemoteTool[]): {
	vectorTool?: ConnectorRemoteTool;
	claimsTool?: ConnectorRemoteTool;
	sparqlTool?: ConnectorRemoteTool;
} {
	return {
		vectorTool: remoteTools.find((tool) => hasVectorTag(tool)),
		claimsTool: remoteTools.find((tool) => tool?.name && /get_claims|claims/i.test(tool.name)),
		sparqlTool: remoteTools.find((tool) => tool?.name && /sparql/i.test(tool.name)),
	};
}

// Helper: Build three-step workflow plan
function buildThreeStepWorkflow(
	tools: {
		vectorTool?: ConnectorRemoteTool;
		claimsTool?: ConnectorRemoteTool;
		sparqlTool?: ConnectorRemoteTool;
	},
	targetSurface: ConnectorExecutionSurface,
	content: string,
): Array<{ action: string; target: string; parameters: Record<string, unknown>; order: number }> {
	const plan: Array<{
		action: string;
		target: string;
		parameters: Record<string, unknown>;
		order: number;
	}> = [];
	let order = 1;

	// Step 1: Vector search
	if (tools.vectorTool) {
		plan.push(
			buildVectorSearchStep(
				tools.vectorTool,
				targetSurface.connectorId,
				content,
				targetSurface.scopes,
				order++,
			),
		);
	}

	// Step 2: Claims retrieval (avoid duplicate if same as vector tool)
	if (tools.claimsTool && (!tools.vectorTool || tools.claimsTool.name !== tools.vectorTool.name)) {
		plan.push(
			buildClaimsStep(
				tools.claimsTool,
				targetSurface.connectorId,
				content,
				targetSurface.scopes,
				order++,
			),
		);
	}

	// Step 3: SPARQL enrichment
	if (tools.sparqlTool) {
		plan.push(
			buildSparqlStep(
				tools.sparqlTool,
				targetSurface.connectorId,
				content,
				targetSurface.scopes,
				order++,
			),
		);
	}

	return plan;
}

// Helper: Create fallback plan when no tools available
function createFallbackPlan(
	targetSurface: ConnectorExecutionSurface,
	content: string,
	order: number,
): Array<{ action: string; target: string; parameters: Record<string, unknown>; order: number }> {
	return [
		{
			action: 'inspect_connector_capabilities',
			target: targetSurface.endpoint,
			parameters: {
				connectorId: targetSurface.connectorId,
				scopes: targetSurface.scopes,
				query: content,
			},
			order,
		},
	];
}

// Main orchestrator (now ≤40 lines)
function createConnectorPlan(
	content: string,
	targetSurface: ConnectorExecutionSurface,
): Array<{
	action: string;
	target: string;
	parameters: Record<string, unknown>;
	order: number;
}> {
	const remoteTools = targetSurface.remoteTools ?? [];
	const tools = identifyConnectorTools(remoteTools);
	const plan = buildThreeStepWorkflow(tools, targetSurface, content);

	// Graceful degradation: fallback if no tools available
	if (plan.length === 0) {
		return createFallbackPlan(targetSurface, content, 1);
	}

	return plan;
}

function createBuiltinPlan(
	content: string,
	targetSurface: BuiltinExecutionSurface,
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
					action: 'clone_repository',
					target: targetSurface.endpoint,
					parameters: { branch: 'main', content },
					order: 1,
				},
				{
					action: 'create_branch',
					target: targetSurface.endpoint,
					parameters: { branch: 'feature-branch', content },
					order: 2,
				},
				{
					action: 'commit_changes',
					target: targetSurface.endpoint,
					parameters: { message: 'Automated update', content },
					order: 3,
				},
			);
			break;
		case 'network':
			plan.push(
				{
					action: 'resolve_endpoint',
					target: targetSurface.endpoint,
					parameters: { content },
					order: 1,
				},
				{
					action: 'send_request',
					target: targetSurface.endpoint,
					parameters: { method: 'GET', content },
					order: 2,
				},
				{
					action: 'validate_response',
					target: targetSurface.endpoint,
					parameters: { content },
					order: 3,
				},
			);
			break;
		case 'filesystem':
			plan.push(
				{
					action: 'read_file',
					target: targetSurface.endpoint,
					parameters: { path: '/tmp/data.txt', content },
					order: 1,
				},
				{
					action: 'process_file',
					target: targetSurface.endpoint,
					parameters: { content },
					order: 2,
				},
				{
					action: 'write_file',
					target: targetSurface.endpoint,
					parameters: { path: '/tmp/output.txt', content },
					order: 3,
				},
			);
			break;
		case 'database':
			plan.push(
				{
					action: 'connect_database',
					target: targetSurface.endpoint,
					parameters: { content },
					order: 1,
				},
				{
					action: 'run_query',
					target: targetSurface.endpoint,
					parameters: { query: 'SELECT * FROM table', content },
					order: 2,
				},
				{
					action: 'close_connection',
					target: targetSurface.endpoint,
					parameters: { content },
					order: 3,
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
	targetSurface?: ExecutionSurfaceTarget,
): { passed: boolean; reason?: string } {
	if (targetSurface?.type === 'connector') {
		return { passed: true };
	}

	for (const action of executionPlan) {
		if (action.action.includes('delete') || action.action.includes('remove')) {
			return {
				passed: false,
				reason: 'Destructive operations not allowed',
			};
		}

		if (action.target.includes('admin') || action.target.includes('root')) {
			return {
				passed: false,
				reason: 'Administrative access not allowed',
			};
		}
	}

	if (
		targetSurface?.type === 'database' &&
		executionPlan.some((item) => item.action.includes('modify'))
	) {
		return {
			passed: false,
			reason: 'Database modification not allowed',
		};
	}

	return { passed: true };
}

type ExecutionPlanStep = {
	action: string;
	target: string;
	parameters: Record<string, unknown>;
	order: number;
};

type ExecutionPlanResult = {
	action: string;
	status: 'success' | 'error' | 'pending';
	result: unknown;
	duration: number;
};

function resolveConnectorDefinitionFromContext(
	context: Record<string, unknown> | undefined,
	connectorId: string,
): ConnectorDefinition | undefined {
	if (!context) return undefined;
	const available = context.availableConnectors;
	if (!Array.isArray(available)) return undefined;
	for (const entry of available) {
		if (!entry || typeof entry !== 'object') continue;
		const candidate = entry as { id?: string; definition?: ConnectorDefinition };
		if (candidate.id === connectorId && candidate.definition) {
			return candidate.definition;
		}
	}
	return undefined;
}

function extractQueryFromPlan(
	plan: ExecutionPlanStep[],
	state: ExecutionSurfaceState,
): string {
	const sorted = [...plan].sort((a, b) => a.order - b.order);
	for (const step of sorted) {
		const query = step.parameters.query;
		if (typeof query === 'string' && query.trim().length > 0) {
			return query;
		}
	}
	const lastMessage = state.messages[state.messages.length - 1];
	if (lastMessage && typeof lastMessage.content === 'string') {
		return lastMessage.content;
	}
	return 'wikidata facts';
}

function buildWikidataExecutionResults(
	plan: ExecutionPlanStep[],
	targetSurface: ConnectorExecutionSurface,
	workflowResult: WorkflowResult,
): ExecutionPlanResult[] {
	const sorted = [...plan].sort((a, b) => a.order - b.order);
	const vectorResults = workflowResult.metadata?.wikidata?.vectorResults ?? [];
	const claimGuid = workflowResult.metadata?.wikidata?.claimGuid;
	const claims = workflowResult.metadata?.wikidata?.claims ?? [];
	const sparql = workflowResult.metadata?.wikidata?.sparql;
	const sparqlBindings = workflowResult.metadata?.wikidata?.sparqlBindings;
	const partialFailure = workflowResult.metadata?.partialFailure;
	const qids = new Set<string>();
	if (workflowResult.metadata?.wikidata?.qid) qids.add(workflowResult.metadata.wikidata.qid);
	for (const result of vectorResults) {
		if (result?.qid) qids.add(result.qid);
	}

	return sorted.map((step, index) => {
		const start = Date.now();
		const toolName = typeof step.parameters.tool === 'string' ? step.parameters.tool : undefined;
		const metadata: Record<string, unknown> = {
			connectorId: targetSurface.connectorId,
			targetEndpoint: targetSurface.endpoint,
			tool: toolName,
			partialFailure,
		};

		const wikidataMeta: Record<string, unknown> = {
			connectorId: targetSurface.connectorId,
			tool: toolName,
			qids: Array.from(qids),
		};

		if (vectorResults.length > 0) {
			wikidataMeta.vectorResults = vectorResults;
		}
		if (claimGuid) {
			wikidataMeta.claimGuid = claimGuid;
		}
		if (claims.length > 0) {
			wikidataMeta.claims = claims;
		}
		if (sparql) {
			wikidataMeta.sparql = sparql;
		}
		if (sparqlBindings && sparqlBindings.length > 0) {
			wikidataMeta.sparqlBindings = sparqlBindings;
		}

		metadata.wikidata = wikidataMeta;

		if (index === sorted.length - 1) {
			metadata.workflow = workflowResult;
		}

		const payload = {
			action: step.action,
			target: `${targetSurface.connectorId}:${
				typeof step.parameters.tool === 'string' ? step.parameters.tool : step.target
			}`,
			surface: formatSurfaceName(targetSurface),
			status: 'completed',
			timestamp: new Date().toISOString(),
			parameters: step.parameters,
			metadata,
		};

		return {
			action: step.action,
			status: 'success',
			result: payload,
			duration: Math.max(1, Date.now() - start),
		};
	});
}

async function maybeRunWikidataWorkflow(
	executionPlan: ExecutionPlanStep[],
	state: ExecutionSurfaceState,
	targetSurface: ConnectorExecutionSurface,
	deps: ExecutionSurfaceGraphDeps,
): Promise<ExecutionPlanResult[] | null> {
	try {
		const resolver =
			deps.getConnectorDefinition ?? ((id: string) => resolveConnectorDefinitionFromContext(state.context, id));
		const connector = resolver(targetSurface.connectorId);
		if (!connector) return null;
		const getClient = deps.getMcpClient;
		if (!getClient) return null;
		const query = extractQueryFromPlan(executionPlan, state);
		if (!query) return null;
		const rawScope = executionPlan
			.map((step) => step.parameters.scope)
			.find((scope) => typeof scope === 'string');
		const scopeCandidate = rawScope === 'properties' || rawScope === 'facts'
			? (rawScope as 'facts' | 'properties')
			: undefined;
		const hooks = (await deps.getWorkflowHooks?.()) ?? undefined;
		const mcpClient = await getClient(connector);
		const workflowResult = await executeWikidataWorkflow(query, connector, {
			mcpClient,
			hooks,
			queryId: `wikidata-${randomUUID()}`,
			routing: scopeCandidate ? { scope: scopeCandidate } : undefined,
		});
		return buildWikidataExecutionResults(executionPlan, targetSurface, workflowResult);
	} catch (error) {
		console.warn('brAInwav execution surface agent: Wikidata workflow execution failed', {
			error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
			connector: targetSurface.connectorId,
			brand: 'brAInwav',
			timestamp: new Date().toISOString(),
		});
		return null;
	}
}

function extractApiKeyFromHeaders(headers?: Record<string, string>): string | undefined {
	if (!headers) return undefined;
	const auth = headers.Authorization ?? headers.authorization;
	if (!auth) return undefined;
	const match = auth.match(/^Bearer\s+(.+)$/i);
	return match ? match[1] : auth;
}

async function executeOnSurface(
	executionPlan: Array<{
		action: string;
		target: string;
		parameters: Record<string, unknown>;
		order: number;
	}>,
	targetSurface?: ExecutionSurfaceTarget,
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
			const rawResult = await simulateSurfaceExecution(step, targetSurface);
			const result =
				targetSurface?.type === 'connector'
					? enrichConnectorExecutionResult(rawResult, step, targetSurface)
					: rawResult;

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
	targetSurface?: ExecutionSurfaceTarget,
): Promise<unknown> {
	if (targetSurface?.type === 'connector') {
		return await simulateConnectorExecution(step, targetSurface);
	}

	await new Promise((resolve) => setTimeout(resolve, secureDelay(200, 501)));

	return {
		action: step.action,
		target: step.target,
		surface: formatSurfaceName(targetSurface),
		status: 'completed',
		timestamp: new Date().toISOString(),
		parameters: step.parameters,
	};
}

async function simulateConnectorExecution(
	step: {
		action: string;
		target: string;
		parameters: Record<string, unknown>;
		order: number;
	},
	targetSurface: ConnectorExecutionSurface,
): Promise<Record<string, unknown>> {
	await new Promise((resolve) => setTimeout(resolve, secureDelay(200, 501)));
	const toolName = typeof step.parameters.tool === 'string' ? step.parameters.tool : undefined;
	const metadata: Record<string, unknown> = {
		connectorId: targetSurface.connectorId,
		endpoint: targetSurface.endpoint,
		scopes: targetSurface.scopes,
	};
	if (toolName) metadata.tool = toolName;

	return {
		action: step.action,
		target: step.target,
		surface: formatSurfaceName(targetSurface),
		status: 'completed',
		timestamp: new Date().toISOString(),
		parameters: step.parameters,
		metadata,
	};
}

function enrichConnectorExecutionResult(
	rawResult: unknown,
	step: { parameters: Record<string, unknown> },
	targetSurface: ConnectorExecutionSurface,
): unknown {
	if (!rawResult || typeof rawResult !== 'object') return rawResult;
	const result = rawResult as Record<string, unknown>;
	const metadataRaw = result.metadata;
	const metadata: Record<string, unknown> =
		metadataRaw && typeof metadataRaw === 'object'
			? { ...(metadataRaw as Record<string, unknown>) }
			: {};

	const toolName = typeof step.parameters.tool === 'string' ? step.parameters.tool : undefined;
	if (targetSurface.connectorId === 'wikidata' && toolName && /get_claims/i.test(toolName)) {
		const rawClaims = extractClaimRecords(result);
		const sanitizedClaims = rawClaims.map((claim) => sanitizeClaimRecord(claim));
		const identifiers = gatherIdentifiersFromClaims(sanitizedClaims, step.parameters);
		metadata.wikidata = {
			connectorId: targetSurface.connectorId,
			tool: toolName,
			qids: identifiers.qids,
			claimIds: identifiers.claimIds,
			claims: sanitizedClaims,
		};
	}

	if (Object.keys(metadata).length > 0) {
		result.metadata = metadata;
	}

	return result;
}

function extractClaimRecords(
	result: Record<string, unknown>,
): Array<Record<string, unknown> | string> {
	const claims: Array<Record<string, unknown> | string> = [];
	const addFrom = (value: unknown): void => {
		if (!value) return;
		if (Array.isArray(value)) {
			for (const entry of value) addFrom(entry);
			return;
		}
		if (typeof value === 'string') {
			claims.push(value);
			return;
		}
		if (typeof value === 'object') {
			const record = value as Record<string, unknown>;
			if (record.property || record.claimId || record.guid || record.qid) {
				claims.push(record);
				return;
			}
			for (const nested of Object.values(record)) {
				addFrom(nested);
			}
		}
	};

	addFrom(result.claims);
	addFrom(result.statements);
	if (result.metadata && typeof result.metadata === 'object') {
		const metadata = result.metadata as Record<string, unknown>;
		addFrom(metadata.claims);
		addFrom(metadata.statements);
	}
	if (result.parameters && typeof result.parameters === 'object') {
		const parameters = result.parameters as Record<string, unknown>;
		addFrom(parameters.claims);
	}
	if (result.data && typeof result.data === 'object') {
		const data = result.data as Record<string, unknown>;
		addFrom(data.claims);
	}

	return claims;
}

function sanitizeClaimRecord(
	claim: Record<string, unknown> | string,
): Record<string, unknown> | string {
	if (typeof claim === 'string') return claim;
	const allowedKeys = new Set([
		'property',
		'propertyId',
		'propertyLabel',
		'value',
		'valueType',
		'datavalue',
		'qualifiers',
		'references',
		'qid',
		'entity',
		'entityId',
		'item',
		'subject',
		'claimId',
		'guid',
		'source',
		'label',
		'description',
	]);
	const sanitized: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(claim)) {
		if (allowedKeys.has(key)) {
			sanitized[key] = value;
		}
	}
	if (!sanitized.qid && typeof claim.id === 'string' && /^Q\d+/i.test(claim.id)) {
		sanitized.qid = claim.id;
	}
	if (!sanitized.claimId && typeof claim.id === 'string' && claim.id.includes('$')) {
		sanitized.claimId = claim.id;
	}
	return sanitized;
}

function gatherIdentifiersFromClaims(
	claims: Array<Record<string, unknown> | string>,
	fallback?: Record<string, unknown>,
): { qids: string[]; claimIds: string[] } {
	const qids = new Set<string>();
	const claimIds = new Set<string>();

	const addQid = (value: unknown) => {
		if (typeof value === 'string') {
			const matches = value.match(QID_REGEX);
			if (matches) {
				for (const match of matches) qids.add(match.toUpperCase());
			}
		}
	};

	const addClaimId = (value: unknown) => {
		if (typeof value === 'string') {
			const matches = value.match(CLAIM_ID_REGEX);
			if (matches) {
				for (const match of matches) claimIds.add(match);
			}
		}
	};

	for (const claim of claims) {
		if (typeof claim === 'string') {
			addQid(claim);
			addClaimId(claim);
			continue;
		}
		for (const key of ['qid', 'entityId', 'entity', 'item', 'subject']) {
			if (typeof claim[key] === 'string') qids.add(String(claim[key]).toUpperCase());
		}
		for (const key of ['claimId', 'guid', 'id', 'statementId']) {
			if (typeof claim[key] === 'string') addClaimId(String(claim[key]));
		}
		if (claim.references && typeof claim.references === 'object') {
			addQid(JSON.stringify(claim.references));
			addClaimId(JSON.stringify(claim.references));
		}
		if (claim.qualifiers && typeof claim.qualifiers === 'object') {
			addQid(JSON.stringify(claim.qualifiers));
			addClaimId(JSON.stringify(claim.qualifiers));
		}
	}

	if (fallback) {
		for (const key of ['qid', 'entityId', 'entity', 'item', 'subject']) {
			if (typeof fallback[key] === 'string') qids.add(String(fallback[key]).toUpperCase());
		}
		for (const key of ['claimId', 'guid', 'id', 'statementId']) {
			if (typeof fallback[key] === 'string') addClaimId(String(fallback[key]));
		}
	}

	return { qids: Array.from(qids), claimIds: Array.from(claimIds) };
}

function generateExecutionSummary(
	executionResults: Array<{
		action: string;
		status: 'success' | 'error' | 'pending';
		result: unknown;
		duration: number;
	}>,
	targetSurface?: ExecutionSurfaceTarget,
): string {
	const successCount = executionResults.filter((r) => r.status === 'success').length;
	const totalActions = executionResults.length;

	if (totalActions === 0)
		return `No actions executed on ${formatSurfaceName(targetSurface)} surface`;

	let summary = `Executed ${totalActions} actions on ${formatSurfaceName(targetSurface)} surface, ${successCount} successful`;

	if (targetSurface?.type === 'connector') {
		const qids = new Set<string>();
		for (const result of executionResults) {
			if (result.status !== 'success') continue;
			const data = result.result;
			if (!data || typeof data !== 'object') continue;
			const metadata = (data as Record<string, unknown>).metadata;
			if (!metadata || typeof metadata !== 'object') continue;
			const wikidata = (metadata as Record<string, unknown>).wikidata;
			if (!wikidata || typeof wikidata !== 'object') continue;
			const ids = (wikidata as Record<string, unknown>).qids;
			if (Array.isArray(ids)) {
				for (const id of ids) {
					if (typeof id === 'string') qids.add(id);
				}
			}
		}
		if (qids.size > 0) {
			summary += `; stitched claims for ${Array.from(qids).join(', ')}`;
		}
	}

	return summary;
}

function generateExecutionSurfaceResponse(result: {
	surface: string;
	actionsExecuted: number;
	successfulActions: number;
	summary: string;
	metadata?: Record<string, unknown> | undefined;
}): string {
	const successRate =
		result.actionsExecuted > 0 ? (result.successfulActions / result.actionsExecuted) * 100 : 0;
	const connectorNote =
		result.metadata && typeof result.metadata.connectorId === 'string'
			? ` Connector: ${result.metadata.connectorId}.`
			: '';

	return `Execution surface operation complete on ${result.surface}. ${result.summary}. Success rate: ${successRate.toFixed(1)}%.${connectorNote}`;
}

export const __INTERNALS__ = {
	detectTargetSurface,
	createConnectorPlan,
	maybeRunWikidataWorkflow,
};
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
