export enum PlanningPhase {
	INITIALIZATION = 'initialization',
	ANALYSIS = 'analysis',
	STRATEGY = 'strategy',
	EXECUTION = 'execution',
	VALIDATION = 'validation',
	COMPLETION = 'completion',
}

export type ContextIsolationLevel = 'none' | 'light' | 'strict';

type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends Date
		? T[P]
		: T[P] extends Array<infer U>
			? Array<DeepPartial<U>>
			: T[P] extends Record<string, unknown>
				? DeepPartial<T[P]>
				: T[P];
};

export interface PlanningContext {
	id: string;
	workspaceId?: string;
	currentPhase: PlanningPhase;
	compliance?: {
		standards?: string[];
		lastCheckedAt?: string | Date | null;
		riskScore?: number;
		outstandingViolations?: Array<{
			id?: string;
			severity?: 'low' | 'medium' | 'high' | 'critical';
			description?: string;
		}>;
	};
	[key: string]: unknown;
}

export interface PromptContext {
	taskId: string;
	agentId: string;
	sessionId?: string;
	complexity: number;
	priority: number;
	capabilities: string[];
	tools: string[];
	currentPhase?: PlanningPhase;
	planningContext?: PlanningContext;
	compliance?: PlanningContext['compliance'];
	nOArchitecture: boolean;
	taskDescription?: string;
	agentCount?: number;
	contextIsolation?: ContextIsolationLevel;
	contextTags?: string[];
}

export interface PromptTemplateExample {
	context: DeepPartial<PromptContext>;
	input: string;
	expectedBehavior: string;
}

export type PromptTemplateCategory =
	| 'system'
	| 'task'
	| 'planning'
	| 'coordination'
	| 'error'
	| 'reflection';

export interface PromptTemplate {
	id: string;
	name: string;
	description: string;
	category: PromptTemplateCategory;
	complexity: [number, number];
	template: string;
	examples: PromptTemplateExample[];
	variables: string[];
	brAInwavBranding: boolean;
	nOOptimized: boolean;
	phases?: PlanningPhase[];
	tags?: string[];
	supportsMultiAgent?: boolean;
	contextIsolation?: ContextIsolationLevel;
}

export interface TemplateSelection {
	template: PromptTemplate;
	confidence: number;
	reasoning: string;
	adaptations: string[];
}

export interface TemplateFilter {
	category?: PromptTemplateCategory;
	phase?: PlanningPhase;
	tags?: string[];
	supportsMultiAgent?: boolean;
}

export interface TemplateUsageRecord {
	context: PromptContext;
	effectiveness: number;
	timestamp: Date;
}

export interface PhasePerformanceSummary {
	total: number;
	averageEffectiveness: number;
}

export interface TemplatePerformanceSnapshot {
	templateId: string;
	name: string;
	category: PromptTemplateCategory;
	totalUses: number;
	averageEffectiveness: number;
	lastUsedAt: Date | null;
	phasePerformance: Partial<Record<PlanningPhase, PhasePerformanceSummary>>;
	multiAgentUsageRate: number;
	supportsMultiAgent: boolean;
}
