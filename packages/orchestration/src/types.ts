/**
 * Core types and interfaces for the Orchestration Engine
 * Defines the fundamental data structures for task planning, execution, and coordination
 */

import { z } from 'zod';

// ================================
// Core Enums
// ================================

export enum TaskStatus {
	PENDING = 'pending',
	PLANNING = 'planning',
	EXECUTING = 'executing',
	COMPLETED = 'completed',
	FAILED = 'failed',
	CANCELLED = 'cancelled',
	PAUSED = 'paused',
}

export enum OrchestrationStrategy {
	SEQUENTIAL = 'sequential',
	PARALLEL = 'parallel',
	ADAPTIVE = 'adaptive',
	HIERARCHICAL = 'hierarchical',
	REACTIVE = 'reactive',
}

export enum AgentRole {
	PLANNER = 'planner',
	EXECUTOR = 'executor',
	COORDINATOR = 'coordinator',
	VALIDATOR = 'validator',
	MONITOR = 'monitor',
	SPECIALIST = 'specialist',
	WORKER = 'worker',
}

// ================================
// Hybrid Model Types
// ================================

export type ModelCapability = 'embedding' | 'chat' | 'reranking' | 'vision' | 'coding';
export type HybridMode = 'privacy' | 'performance' | 'enterprise' | 'conjunction';

// ================================
// Zod Schemas for Runtime Validation
// ================================

export const TaskSchema = z.object({
	id: z.string().uuid(),
	title: z.string().min(1),
	description: z.string(),
	status: z.nativeEnum(TaskStatus),
	priority: z.number().min(1).max(10),
	dependencies: z.array(z.string().uuid()).default([]),
	requiredCapabilities: z.array(z.string()).default([]),
	context: z.record(z.unknown()).default({}),
	metadata: z.record(z.unknown()).default({}),
	createdAt: z.date(),
	updatedAt: z.date().optional(),
	completedAt: z.date().optional(),
	estimatedDuration: z.number().optional(),
	actualDuration: z.number().optional(),
});

export const ExecutionPlanSchema = z
	.object({
		id: z.string().uuid(),
		taskId: z.string().uuid(),
		strategy: z.nativeEnum(OrchestrationStrategy),
		phases: z.array(z.string()),
		dependencies: z.record(z.array(z.string())),
		estimatedDuration: z.number(),
		resourceRequirements: z.object({
			minAgents: z.number().min(1),
			maxAgents: z.number().min(1),
			requiredCapabilities: z.array(z.string()),
			memoryRequirement: z.number().optional(),
			computeRequirement: z.number().optional(),
		}),
		checkpoints: z.array(
			z.object({
				phase: z.string(),
				criteria: z.array(z.string()),
				validation: z.string(),
			}),
		),
		createdAt: z.date(),
		updatedAt: z.date().optional(),
	})
	.strict();

// ================================
// Type Definitions
// ================================

export type Task = z.infer<typeof TaskSchema>;
export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;

// ================================
// Agent Interfaces
// ================================

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

// ================================
// DSP Planning Types (Long-Horizon)
// ================================

export type PlanningStepStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export type PlanningIsolationScope = 'task' | 'workspace' | 'global';

export enum PlanningPhase {
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

export interface RoutingRequest {
	requestId?: string;
	interfaceId: string;
	capabilities: string[];
	tags?: string[];
	source?: string;
	command?: string;
	env?: string;
	operation?: string;
	metadata?: Record<string, unknown>;
}

export interface RoutingCandidate {
	agent: string;
	score: number;
	capabilities: string[];
	reasons: string[];
}

export interface RoutingApproval {
	required: boolean;
	approvers: string[];
	policies: string[];
}

export interface RoutingDecision {
	requestId: string;
	interfaceId: string;
	policyVersion: string;
	request: Required<RoutingRequest>;
	selectedAgent: string;
	candidates: RoutingCandidate[];
	appliedRules: string[];
	approval: RoutingApproval;
	fallback?: { agent: string; reason: string } | null;
	createdAt: string;
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

// ================================
// ReAct Loop Interfaces
// ================================

// ReAct types removed (legacy, unused in LangGraph-only design)

// ================================

// Orchestration Interfaces
// ================================

export interface OrchestrationContext {
	tasks: Map<string, Task>;
	plans: Map<string, ExecutionPlan>;
	agents: Map<string, Agent>;
	assignments: Map<string, AgentAssignment[]>;
	activeExecutions: Map<string, unknown>;
	completedTasks: Set<string>;
	failedTasks: Set<string>;
}

// ================================
// LangChain Integration Types
// ================================
// Adaptive Decision Making Types
// ================================

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

// ================================
// Event Types
// ================================

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

export enum AgentCapability {
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

// Orchestration statistics removed (legacy, unused)

export const Schemas = {
	Task: TaskSchema,
	ExecutionPlan: ExecutionPlanSchema,
};
