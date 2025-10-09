import { z } from 'zod';

export interface RagDocument {
	id: string;
	content: string;
	score?: number;
	metadata?: Record<string, unknown>;
}

export interface RagRetriever {
	retrieve: (query: string, limit?: number) => Promise<readonly RagDocument[]>;
}

export interface SessionMemoryAdapter {
	loadSession: (sessionId: string) => Promise<PlannerSessionState | null>;
	saveSession: (sessionId: string, state: PlannerSessionState) => Promise<void>;
	appendEvent?: (sessionId: string, event: PlannerEvent) => Promise<void>;
}

export interface PlannerSessionState {
	steps: PlannerStepRecord[];
	facts: string[];
	lastUpdated: string;
	reasoning?: PlannerReasoning;
}

export interface PlannerEvent {
	type: 'plan-created' | 'step-completed' | 'step-failed';
	payload: Record<string, unknown>;
	timestamp: string;
}

export interface ApprovalRequest {
	sessionId: string;
	capability: string;
	goal: PlannerGoal;
	input: Record<string, unknown>;
}

export interface ApprovalDecision {
	approved: boolean;
	reason?: string;
	metadata?: Record<string, unknown>;
}

export interface ApprovalGate {
	requireApproval: boolean;
	requestApproval: (request: ApprovalRequest) => Promise<ApprovalDecision>;
}

export interface ApprovalConfiguration {
	require?: boolean;
	gate: (request: ApprovalRequest) => Promise<ApprovalDecision>;
}

export interface ToolInvocationContext {
	sessionId: string;
	metadata?: Record<string, unknown>;
}

export interface ToolInvocationRequest {
	tool: string;
	input: unknown;
	kind?: 'search' | 'codemod' | 'validation' | 'analysis';
	context?: ToolInvocationContext;
}

export interface ToolInvocationResult<T = unknown> {
	tool: string;
	result: T;
	tokensUsed: number;
	metadata?: Record<string, unknown>;
}

export type ToolHandler = (request: ToolInvocationRequest) => Promise<ToolInvocationResult>;

export interface ToolRouter {
	invoke: ToolHandler;
	listTools: () => Promise<string[]>;
}

export interface WorkerTask {
	capability: string;
	input: Record<string, unknown>;
}

export interface WorkerStepResult {
	capability: string;
	worker: string;
	output: unknown;
	evidence?: RagDocument[];
}

export interface WorkerHandlerContext {
	tools: ToolRouter;
	goal: PlannerGoal;
	memory: PlannerSessionState | null;
	rag?: RagRetriever;
	contextDocuments?: readonly RagDocument[];
}

export type WorkerHandler = (
	task: WorkerTask,
	context: WorkerHandlerContext,
) => Promise<WorkerStepResult>;

export interface WorkerDefinition {
	name: string;
	description: string;
	capabilities: string[];
	handler: WorkerHandler;
}

export interface WorkerRegistry {
	register: (definition: WorkerDefinition) => void;
	getWorker: (name: string) => WorkerDefinition | undefined;
	findByCapability: (capability: string) => WorkerDefinition | undefined;
	list: () => WorkerDefinition[];
}

export interface PlannerGoal {
	sessionId: string;
	objective: string;
	requiredCapabilities: string[];
	input?: Record<string, unknown>;
	strategy?: PlannerStrategy;
}

export type PlannerStrategy = 'chain-of-thought' | 'tree-of-thought';

export interface PlannerThought {
	id: string;
	capability?: string;
	text: string;
	score?: number;
}

export interface PlannerAlternative {
	path: string[];
	score: number;
	summary: string;
}

export interface PlannerReasoning {
	strategy: PlannerStrategy;
	thoughts: PlannerThought[];
	decision: string;
	alternatives?: PlannerAlternative[];
	vendorWeighting?: Record<string, number>;
}

export interface PlannerStepRecord {
	capability: string;
	worker: string;
	status: 'pending' | 'completed' | 'failed';
	input?: Record<string, unknown>;
	output?: unknown;
	error?: string;
	completedAt?: string;
}

export interface PlannerPlan {
	goal: PlannerGoal;
	steps: PlannerStepRecord[];
	retrievedContext: readonly RagDocument[];
	reasoning: PlannerReasoning;
}

export interface PlannerExecutionResult {
	goal: PlannerGoal;
	steps: PlannerStepRecord[];
	context: readonly RagDocument[];
	reasoning: PlannerReasoning;
}

export interface ReflectionFeedback {
	summary: string;
	improvements: string[];
	status: 'retry' | 'accepted';
	createdAt: string;
}

export interface ReflectionContext {
	goal: PlannerGoal;
	plan: PlannerPlan;
	lastResult: PlannerExecutionResult;
}

export interface ReflectionOutcome {
	feedback: ReflectionFeedback;
	nextGoal?: PlannerGoal;
}

export interface ReflectionModule {
	reflect: (context: ReflectionContext) => Promise<ReflectionOutcome>;
}

export interface Planner {
	prepare: (goal: PlannerGoal) => Promise<PlannerPlan>;
	run: (goal: PlannerGoal) => Promise<PlannerExecutionResult>;
}

export interface ModernAgentSystem {
	planner: Planner;
	workerRegistry: WorkerRegistry;
	toolRouter: ToolRouter;
}

export const PlannerGoalSchema = z
	.object({
		sessionId: z.string().min(1),
		objective: z.string().min(1),
		requiredCapabilities: z.array(z.string().min(1)).default([]),
		input: z.record(z.any()).optional(),
		strategy: z
			.enum(['chain-of-thought', 'tree-of-thought'] as const)
			.optional()
			.default('chain-of-thought'),
	})
	.transform((goal) => ({
		...goal,
		requiredCapabilities: goal.requiredCapabilities ?? [],
		strategy: goal.strategy ?? 'chain-of-thought',
	}));

const handlerGuard = (value: unknown, label: string) => {
	if (typeof value !== 'function') {
		throw new TypeError(`${label} must be a function`);
	}
	return true;
};

const sessionAdapterGuard = (value: unknown) =>
	typeof value === 'object' &&
	value !== null &&
	'loadSession' in value &&
	typeof (value as SessionMemoryAdapter).loadSession === 'function' &&
	'saveSession' in value &&
	typeof (value as SessionMemoryAdapter).saveSession === 'function';

const ragGuard = (value: unknown) =>
	value === undefined ||
	(typeof value === 'object' &&
		value !== null &&
		'retrieve' in value &&
		typeof (value as RagRetriever).retrieve === 'function');

const approvalConfigGuard = (value: unknown) =>
	value === undefined ||
	(typeof value === 'object' &&
		value !== null &&
		'gate' in value &&
		typeof (value as ApprovalConfiguration).gate === 'function');

export const WorkerDefinitionSchema = z.object({
	name: z.string().min(1),
	description: z.string().min(1),
	capabilities: z.array(z.string().min(1)).min(1),
	handler: z
		.custom<WorkerHandler>((value) => handlerGuard(value, 'Worker handler'))
		.transform((value) => value as WorkerHandler),
});

const StdIoConfigSchema = z.object({
	name: z.string().min(1),
	command: z.string().min(1),
	args: z.array(z.string()).default([]),
	cwd: z.string().optional(),
});

const StreamableHttpConfigSchema = z.object({
	name: z.string().min(1),
	url: z.string().url(),
	headers: z.record(z.string()).default({}),
});

export const ModernAgentSystemConfigSchema = z.object({
	workers: z.array(WorkerDefinitionSchema).min(1),
	memory: z
		.object({
			session: z
				.custom<SessionMemoryAdapter>(sessionAdapterGuard, {
					message: 'Session memory adapter must implement loadSession/saveSession',
				})
				.transform((value) => value as SessionMemoryAdapter),
			rag: z
				.custom<RagRetriever | undefined>(ragGuard, {
					message: 'RAG retriever must expose a retrieve method',
				})
				.optional()
				.transform((value) => (value as RagRetriever | undefined) ?? undefined),
		})
		.strict(),
	approvals: z
		.custom<ApprovalConfiguration | undefined>(approvalConfigGuard, {
			message: 'Approval configuration must include a gate function',
		})
		.optional()
		.transform((value) => (value as ApprovalConfiguration | undefined) ?? undefined),
	mcp: z
		.object({
			stdio: z.array(StdIoConfigSchema).default([]),
			streamableHttp: z.array(StreamableHttpConfigSchema).default([]),
		})
		.default({ stdio: [], streamableHttp: [] }),
	tools: z
		.record(
			z
				.custom<ToolHandler>((value) => handlerGuard(value, 'Tool handler'))
				.transform((value) => value as ToolHandler),
		)
		.default({}),
});

export type ModernAgentSystemConfig = z.infer<typeof ModernAgentSystemConfigSchema>;
