/**
 * @file packages/workflow-common/src/types.ts
 * @description Core workflow state types for unified PRP + Task workflow
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 */

import type {
	AccessibilityRequirements,
	CoverageRequirements,
	PerformanceBudget,
	SecurityRequirements,
} from './validation-types.js';

/**
 * PRP Gate IDs (G0-G7)
 */
export type GateId = 'G0' | 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6' | 'G7';

/**
 * Task Phase IDs (0-5)
 */
export type PhaseId = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Workflow status
 */
export type WorkflowStatus = 'active' | 'paused' | 'completed' | 'failed';

/**
 * Step status
 */
export type StepStatus = 'pending' | 'in-progress' | 'completed' | 'failed';

/**
 * Workflow priority
 */
export type Priority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';

/**
 * Enforcement profile for quality standards
 */
export interface EnforcementProfile {
	/** brAInwav branding (required) */
	branding: 'brAInwav';
	/** Profile version */
	version: string;
	/** Quality budgets */
	budgets: {
		coverage: CoverageRequirements;
		performance: PerformanceBudget;
		accessibility: AccessibilityRequirements;
		security: SecurityRequirements;
	};
	/** Policy requirements */
	policies: {
		architecture: {
			maxFunctionLines: number;
			exportStyle: 'named-only' | 'default-allowed';
		};
		governance: {
			requiredChecks: string[];
		};
	};
	/** Gate approvers */
	approvers: Record<GateId, string>;
}

/**
 * PRP Gate state
 */
export interface GateState {
	id: GateId;
	status: StepStatus;
	startedAt?: string;
	completedAt?: string;
	evidence: string[];
	approved: boolean;
	approver?: string;
	approvalRationale?: string;
}

/**
 * Task Phase state
 */
export interface PhaseState {
	id: PhaseId;
	status: StepStatus;
	startedAt?: string;
	completedAt?: string;
	artifacts: string[];
}

/**
 * PRP-specific state
 */
export interface PRPState {
	gates: Partial<Record<GateId, GateState>>;
	approvals: Array<{
		gateId: GateId;
		approver: string;
		decision: 'approved' | 'rejected';
		rationale: string;
		timestamp: string;
	}>;
}

/**
 * Task-specific state
 */
export interface TaskState {
	phases: Partial<Record<PhaseId, PhaseState>>;
	artifacts: string[];
}

/**
 * Complete workflow state
 */
export interface WorkflowState {
	id: string;
	featureName: string;
	taskId: string;
	priority: Priority;
	status: WorkflowStatus;
	currentStep: GateId | `phase-${PhaseId}`;
	prpState: PRPState;
	taskState: TaskState;
	enforcementProfile: EnforcementProfile;
	metadata: {
		createdAt: string;
		updatedAt: string;
		gitBranch: string;
		branding: 'brAInwav';
		[key: string]: unknown;
	};
}

/**
 * Quality metrics snapshot
 */
export interface QualityMetrics {
	coverage: number;
	security: {
		critical: number;
		high: number;
		medium: number;
	};
	performance: {
		lcp: number;
		tbt: number;
	};
	accessibility: number;
}
