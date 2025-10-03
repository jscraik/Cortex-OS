/**
 * Core types and interfaces for the Orchestration Engine
 * Defines the fundamental data structures for task planning, execution, and coordination
 */
import { z } from 'zod';
export declare enum TaskStatus {
	PENDING = 'pending',
	PLANNING = 'planning',
	EXECUTING = 'executing',
	COMPLETED = 'completed',
	FAILED = 'failed',
	CANCELLED = 'cancelled',
	PAUSED = 'paused',
}
export declare enum OrchestrationStrategy {
	SEQUENTIAL = 'sequential',
	PARALLEL = 'parallel',
	ADAPTIVE = 'adaptive',
	HIERARCHICAL = 'hierarchical',
	REACTIVE = 'reactive',
}
export declare enum AgentRole {
	PLANNER = 'planner',
	EXECUTOR = 'executor',
	COORDINATOR = 'coordinator',
	VALIDATOR = 'validator',
	MONITOR = 'monitor',
	SPECIALIST = 'specialist',
	WORKER = 'worker',
}
export type ModelCapability = 'embedding' | 'chat' | 'reranking' | 'vision' | 'coding';
export type HybridMode = 'privacy' | 'performance' | 'enterprise' | 'conjunction';
export declare const TaskSchema: z.ZodObject<
	{
		id: z.ZodString;
		title: z.ZodString;
		description: z.ZodString;
		status: z.ZodNativeEnum<typeof TaskStatus>;
		priority: z.ZodNumber;
		dependencies: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
		requiredCapabilities: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
		context: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
		metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
		createdAt: z.ZodDate;
		updatedAt: z.ZodOptional<z.ZodDate>;
		completedAt: z.ZodOptional<z.ZodDate>;
		estimatedDuration: z.ZodOptional<z.ZodNumber>;
		actualDuration: z.ZodOptional<z.ZodNumber>;
	},
	'strip',
	z.ZodTypeAny,
	{
		status: TaskStatus;
		id: string;
		createdAt: Date;
		description: string;
		metadata: Record<string, unknown>;
		priority: number;
		context: Record<string, unknown>;
		title: string;
		dependencies: string[];
		requiredCapabilities: string[];
		completedAt?: Date | undefined;
		updatedAt?: Date | undefined;
		estimatedDuration?: number | undefined;
		actualDuration?: number | undefined;
	},
	{
		status: TaskStatus;
		id: string;
		createdAt: Date;
		description: string;
		priority: number;
		title: string;
		completedAt?: Date | undefined;
		updatedAt?: Date | undefined;
		metadata?: Record<string, unknown> | undefined;
		estimatedDuration?: number | undefined;
		context?: Record<string, unknown> | undefined;
		dependencies?: string[] | undefined;
		requiredCapabilities?: string[] | undefined;
		actualDuration?: number | undefined;
	}
>;
export declare const ExecutionPlanSchema: z.ZodObject<
	{
		id: z.ZodString;
		taskId: z.ZodString;
		strategy: z.ZodNativeEnum<typeof OrchestrationStrategy>;
		phases: z.ZodArray<z.ZodString, 'many'>;
		dependencies: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, 'many'>>;
		estimatedDuration: z.ZodNumber;
		resourceRequirements: z.ZodObject<
			{
				minAgents: z.ZodNumber;
				maxAgents: z.ZodNumber;
				requiredCapabilities: z.ZodArray<z.ZodString, 'many'>;
				memoryRequirement: z.ZodOptional<z.ZodNumber>;
				computeRequirement: z.ZodOptional<z.ZodNumber>;
			},
			'strip',
			z.ZodTypeAny,
			{
				requiredCapabilities: string[];
				minAgents: number;
				maxAgents: number;
				memoryRequirement?: number | undefined;
				computeRequirement?: number | undefined;
			},
			{
				requiredCapabilities: string[];
				minAgents: number;
				maxAgents: number;
				memoryRequirement?: number | undefined;
				computeRequirement?: number | undefined;
			}
		>;
		checkpoints: z.ZodArray<
			z.ZodObject<
				{
					phase: z.ZodString;
					criteria: z.ZodArray<z.ZodString, 'many'>;
					validation: z.ZodString;
				},
				'strip',
				z.ZodTypeAny,
				{
					validation: string;
					phase: string;
					criteria: string[];
				},
				{
					validation: string;
					phase: string;
					criteria: string[];
				}
			>,
			'many'
		>;
		createdAt: z.ZodDate;
		updatedAt: z.ZodOptional<z.ZodDate>;
	},
	'strict',
	z.ZodTypeAny,
	{
		id: string;
		createdAt: Date;
		strategy: OrchestrationStrategy;
		estimatedDuration: number;
		checkpoints: {
			validation: string;
			phase: string;
			criteria: string[];
		}[];
		dependencies: Record<string, string[]>;
		taskId: string;
		phases: string[];
		resourceRequirements: {
			requiredCapabilities: string[];
			minAgents: number;
			maxAgents: number;
			memoryRequirement?: number | undefined;
			computeRequirement?: number | undefined;
		};
		updatedAt?: Date | undefined;
	},
	{
		id: string;
		createdAt: Date;
		strategy: OrchestrationStrategy;
		estimatedDuration: number;
		checkpoints: {
			validation: string;
			phase: string;
			criteria: string[];
		}[];
		dependencies: Record<string, string[]>;
		taskId: string;
		phases: string[];
		resourceRequirements: {
			requiredCapabilities: string[];
			minAgents: number;
			maxAgents: number;
			memoryRequirement?: number | undefined;
			computeRequirement?: number | undefined;
		};
		updatedAt?: Date | undefined;
	}
>;
export type Task = z.infer<typeof TaskSchema>;
export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;
export interface Agent {
	id: string;
	name: string;
	role: AgentRole;
	capabilities: string[];
	status: 'available' | 'busy' | 'offline';
	metadata: Record<string, unknown>;
	lastSeen: Date;
}
export interface AgentAssignment {
	agentId: string;
	taskId: string;
	phase: string;
	role: AgentRole;
	startTime: Date;
	endTime?: Date;
	status: TaskStatus;
	result?: unknown;
	error?: string;
}
export type PlanningStepStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type PlanningIsolationScope = 'task' | 'workspace' | 'global';
export declare enum PlanningPhase {
	INITIALIZATION = 'initialization',
	ANALYSIS = 'analysis',
	STRATEGY = 'strategy',
	EXECUTION = 'execution',
	VALIDATION = 'validation',
	COMPLETION = 'completion',
}
export interface DSPPlanningStep {
	phase: PlanningPhase;
	action: string;
	status: PlanningStepStatus;
	timestamp: Date;
	result?: unknown;
}
export interface DSPPlanningHistoryEntry {
	decision: string;
	outcome: 'success' | 'failure';
	learned: string;
	timestamp: Date;
}
export interface DSPPlanningMetadata {
	createdBy: 'brAInwav';
	createdAt: Date;
	updatedAt: Date;
	complexity: number;
	priority: number;
}
export interface DSPPlanningPreferences {
	failureHandling: 'strict' | 'resilient' | 'permissive';
	notes: string[];
}
export interface DSPPlanningComplianceIssue {
	id: string;
	severity: 'low' | 'medium' | 'high' | 'critical';
	description: string;
	remediation: string;
	detectedAt: Date;
}
export interface DSPPlanningCompliance {
	standards: string[];
	lastCheckedAt: Date | null;
	riskScore: number;
	outstandingViolations: DSPPlanningComplianceIssue[];
}
export interface DSPPlanningContext {
	id: string;
	workspaceId?: string;
	currentPhase: PlanningPhase;
	steps: DSPPlanningStep[];
	history: DSPPlanningHistoryEntry[];
	metadata: DSPPlanningMetadata;
	preferences: DSPPlanningPreferences;
	compliance: DSPPlanningCompliance;
	retention?: {
		ttlMs?: number;
		persist?: boolean;
	};
}
export interface PlanningContextSnapshot {
	id: string;
	taskId: string;
	workspaceId?: string;
	revision: number;
	timestamp: Date;
	phase: PlanningPhase;
	scope: PlanningIsolationScope;
	currentStep: number;
	context: DSPPlanningContext;
	reason?: string;
}
export interface PlanningContextPersistenceAdapter {
	save(snapshot: PlanningContextSnapshot): void;
	load(taskId: string, workspaceId?: string): PlanningContextSnapshot | undefined;
	delete(taskId: string, workspaceId?: string): void;
	list?(workspaceId?: string): PlanningContextSnapshot[];
}
export interface PlanningContextIsolationOptions {
	scope?: PlanningIsolationScope;
	preserveHistory?: boolean;
	tags?: string[];
}
export interface PlanningContextIsolationStrategy {
	isolate(
		context: DSPPlanningContext,
		options?: PlanningContextIsolationOptions,
	): DSPPlanningContext;
	release?(contextId: string): void;
}
export interface PlanningContext {
	task: Task;
	availableAgents: Agent[];
	resources: {
		memory: number;
		compute: number;
		storage: number;
	};
	constraints: {
		maxDuration: number;
		maxCost: number;
		availabilityWindow: [Date, Date];
	};
	preferences: {
		strategy: OrchestrationStrategy;
		quality: 'fast' | 'balanced' | 'thorough';
		failureHandling: 'strict' | 'resilient' | 'permissive';
	};
	compliance: {
		standards: string[];
		lastCheckedAt: Date | null;
		riskScore: number;
		outstandingViolations: Array<{
			id: string;
			severity: 'low' | 'medium' | 'high' | 'critical';
			description: string;
			remediation: string;
			detectedAt: Date;
		}>;
	};
	longHorizon?: LongHorizonPlanningState;
}
export interface LongHorizonPlanningState {
	contextId?: string;
	currentPhase?: PlanningPhase;
	adaptiveDepth?: number;
	isolationScope?: PlanningIsolationScope;
	lastSnapshotRevision?: number;
	lastSnapshotAt?: Date;
}
export interface PlanningResult {
	plan: ExecutionPlan;
	alternatives: ExecutionPlan[];
	confidence: number;
	reasoning: string;
	risks: Array<{
		description: string;
		probability: number;
		impact: number;
		mitigation: string;
	}>;
}
export interface OrchestrationContext {
	tasks: Map<string, Task>;
	plans: Map<string, ExecutionPlan>;
	agents: Map<string, Agent>;
	assignments: Map<string, AgentAssignment[]>;
	activeExecutions: Map<string, unknown>;
	completedTasks: Set<string>;
	failedTasks: Set<string>;
}
export interface DecisionContext {
	id: string;
	type: string;
	taskId?: string;
	situation: string;
	options: Array<{
		id: string;
		description: string;
		cost: number;
		benefit: number;
		risk: number;
		confidence: number;
	}>;
	constraints: Record<string, unknown>;
	deadline?: Date;
	history: Array<{
		decision: string;
		outcome: string;
		learned: string;
	}>;
}
export interface AdaptiveDecision {
	id: string;
	contextId: string;
	selectedOption: string;
	confidence: number;
	reasoning: string;
	strategy: 'greedy' | 'conservative' | 'balanced' | 'aggressive' | 'adaptive';
	alternativeOptions: Array<{
		option: string;
		score: number;
		reasoning: string;
	}>;
	learningFactors: Record<string, unknown>;
	adaptationData: {
		patternsUsed: number;
		strategyConfidence: number;
		historicalAccuracy: number;
		uncertaintyFactors: string[];
	};
	timestamp: Date;
	executionTime: number;
	chosen?: string;
	expectedOutcome?: string;
	learningPoints?: string[];
}
export interface OrchestrationEvent {
	type:
		| 'task_created'
		| 'task_started'
		| 'task_completed'
		| 'task_failed'
		| 'agent_assigned'
		| 'agent_freed'
		| 'plan_created'
		| 'plan_updated'
		| 'coordination_started'
		| 'decision_made'
		| 'resource_allocated';
	taskId?: string;
	agentId?: string;
	planId?: string;
	data: unknown;
	timestamp: Date;
	source: string;
}
export interface PlanCheckpoint {
	phase: string;
	criteria: string[];
	validation: string;
}
export interface PlanRisk {
	description: string;
	probability: number;
	impact: number;
	mitigation: string;
}
export interface ResourceRequirements {
	minAgents: number;
	maxAgents: number;
	requiredCapabilities: string[];
	memoryRequirement?: number;
	computeRequirement?: number;
}
export declare enum AgentCapability {
	TASK_PLANNING = 'task_planning',
	RESOURCE_OPTIMIZATION = 'resource_optimization',
	RISK_ASSESSMENT = 'risk_assessment',
	CODE_GENERATION = 'code_generation',
	TESTING = 'testing',
	DEPLOYMENT = 'deployment',
	MONITORING = 'monitoring',
	COMMUNICATION = 'communication',
	LEARNING = 'learning',
	DECISION_MAKING = 'decision_making',
}
export interface PerformanceMetrics {
	accuracy: number;
	speed: number;
	efficiency: number;
	quality: number;
}
export interface OrchestrationConfig {
	maxConcurrentOrchestrations: number;
	defaultStrategy: OrchestrationStrategy;
	enableMultiAgentCoordination: boolean;
	enableAdaptiveDecisions: boolean;
	planningTimeout: number;
	executionTimeout: number;
	qualityThreshold: number;
	performanceMonitoring: boolean;
}
export interface OrchestrationState {
	id: string;
	taskId: string;
	status:
		| 'initializing'
		| 'planning'
		| 'deciding'
		| 'executing'
		| 'validating'
		| 'completed'
		| 'failed'
		| 'cancelled';
	strategy: OrchestrationStrategy;
	planningContext: PlanningContext;
	currentPhase: string;
	progress: number;
	startTime: Date;
	endTime: Date | null;
	assignedAgents: Agent[];
	errors: string[];
	metrics: {
		planningDuration: number;
		executionDuration: number;
		coordinationEfficiency: number;
		qualityScore: number;
	};
}
export interface OrchestrationResult {
	orchestrationId: string;
	taskId: string;
	success: boolean;
	plan: ExecutionPlan | null;
	executionResults: Record<string, unknown>;
	coordinationResults: Record<string, unknown> | null;
	decisions: AdaptiveDecision[];
	performance: {
		totalDuration: number;
		planningTime: number;
		executionTime: number;
		efficiency: number;
		qualityScore: number;
	};
	errors: string[];
	timestamp: Date;
}
export interface StrategicDecision {
	id: string;
	type: string;
	description: string;
	context: Record<string, unknown>;
	option: {
		id: string;
		description: string;
		cost: number;
		benefit: number;
		risk: number;
		confidence: number;
	};
	reasoning: string;
	confidence: number;
	timestamp: Date;
}
export declare const Schemas: {
	Task: z.ZodObject<
		{
			id: z.ZodString;
			title: z.ZodString;
			description: z.ZodString;
			status: z.ZodNativeEnum<typeof TaskStatus>;
			priority: z.ZodNumber;
			dependencies: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
			requiredCapabilities: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
			context: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
			metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
			createdAt: z.ZodDate;
			updatedAt: z.ZodOptional<z.ZodDate>;
			completedAt: z.ZodOptional<z.ZodDate>;
			estimatedDuration: z.ZodOptional<z.ZodNumber>;
			actualDuration: z.ZodOptional<z.ZodNumber>;
		},
		'strip',
		z.ZodTypeAny,
		{
			status: TaskStatus;
			id: string;
			createdAt: Date;
			description: string;
			metadata: Record<string, unknown>;
			priority: number;
			context: Record<string, unknown>;
			title: string;
			dependencies: string[];
			requiredCapabilities: string[];
			completedAt?: Date | undefined;
			updatedAt?: Date | undefined;
			estimatedDuration?: number | undefined;
			actualDuration?: number | undefined;
		},
		{
			status: TaskStatus;
			id: string;
			createdAt: Date;
			description: string;
			priority: number;
			title: string;
			completedAt?: Date | undefined;
			updatedAt?: Date | undefined;
			metadata?: Record<string, unknown> | undefined;
			estimatedDuration?: number | undefined;
			context?: Record<string, unknown> | undefined;
			dependencies?: string[] | undefined;
			requiredCapabilities?: string[] | undefined;
			actualDuration?: number | undefined;
		}
	>;
	ExecutionPlan: z.ZodObject<
		{
			id: z.ZodString;
			taskId: z.ZodString;
			strategy: z.ZodNativeEnum<typeof OrchestrationStrategy>;
			phases: z.ZodArray<z.ZodString, 'many'>;
			dependencies: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, 'many'>>;
			estimatedDuration: z.ZodNumber;
			resourceRequirements: z.ZodObject<
				{
					minAgents: z.ZodNumber;
					maxAgents: z.ZodNumber;
					requiredCapabilities: z.ZodArray<z.ZodString, 'many'>;
					memoryRequirement: z.ZodOptional<z.ZodNumber>;
					computeRequirement: z.ZodOptional<z.ZodNumber>;
				},
				'strip',
				z.ZodTypeAny,
				{
					requiredCapabilities: string[];
					minAgents: number;
					maxAgents: number;
					memoryRequirement?: number | undefined;
					computeRequirement?: number | undefined;
				},
				{
					requiredCapabilities: string[];
					minAgents: number;
					maxAgents: number;
					memoryRequirement?: number | undefined;
					computeRequirement?: number | undefined;
				}
			>;
			checkpoints: z.ZodArray<
				z.ZodObject<
					{
						phase: z.ZodString;
						criteria: z.ZodArray<z.ZodString, 'many'>;
						validation: z.ZodString;
					},
					'strip',
					z.ZodTypeAny,
					{
						validation: string;
						phase: string;
						criteria: string[];
					},
					{
						validation: string;
						phase: string;
						criteria: string[];
					}
				>,
				'many'
			>;
			createdAt: z.ZodDate;
			updatedAt: z.ZodOptional<z.ZodDate>;
		},
		'strict',
		z.ZodTypeAny,
		{
			id: string;
			createdAt: Date;
			strategy: OrchestrationStrategy;
			estimatedDuration: number;
			checkpoints: {
				validation: string;
				phase: string;
				criteria: string[];
			}[];
			dependencies: Record<string, string[]>;
			taskId: string;
			phases: string[];
			resourceRequirements: {
				requiredCapabilities: string[];
				minAgents: number;
				maxAgents: number;
				memoryRequirement?: number | undefined;
				computeRequirement?: number | undefined;
			};
			updatedAt?: Date | undefined;
		},
		{
			id: string;
			createdAt: Date;
			strategy: OrchestrationStrategy;
			estimatedDuration: number;
			checkpoints: {
				validation: string;
				phase: string;
				criteria: string[];
			}[];
			dependencies: Record<string, string[]>;
			taskId: string;
			phases: string[];
			resourceRequirements: {
				requiredCapabilities: string[];
				minAgents: number;
				maxAgents: number;
				memoryRequirement?: number | undefined;
				computeRequirement?: number | undefined;
			};
			updatedAt?: Date | undefined;
		}
	>;
};
//# sourceMappingURL=types.d.ts.map
