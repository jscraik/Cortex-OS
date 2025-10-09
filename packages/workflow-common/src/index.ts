/**
 * @file packages/workflow-common/src/index.ts
 * @description brAInwav Cortex-OS shared workflow primitives
 *
 * This package provides shared validation logic and evidence tracking
 * for both PRP Runner (quality gates) and Task Management (development workflow).
 *
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 */

// Accessibility validation
export {
	type AccessibilityTestResult,
	formatAccessibilityValidationResult,
	validateAccessibility,
} from './accessibility-validation.js';

// Coverage validation
export {
	formatCoverageValidationResult,
	validateCoverage,
} from './coverage-validation.js';
// Evidence tracking
export {
	addEvidenceToIndex,
	createEvidenceIndex,
	createEvidenceIndexEntry,
	type EvidenceIndex,
	type EvidenceIndexEntry,
	findEvidenceByGate,
	findEvidenceByPhase,
	findEvidenceByTask,
	linkGateToTask,
} from './evidence.js';
// Performance validation
export {
	formatPerformanceValidationResult,
	validatePerformance,
} from './performance-validation.js';
export type { EnforcementProfile as EnforcementProfileSchema } from './schemas/enforcement-profile.js';
// Enforcement profile schema and utilities
export {
	defaults as enforcementProfileDefaults,
	diffFromDefaults as diffEnforcementProfileFromDefaults,
	enforcementProfileSchema,
} from './schemas/enforcement-profile.js';
// Security validation
export {
	formatSecurityValidationResult,
	type SecurityVulnerabilitySummary,
	validateSecurity,
} from './security-validation.js';
// Workflow types
export type {
	EnforcementProfile,
	GateId,
	GateState,
	PhaseId,
	PhaseState,
	PRPState,
	Priority,
	QualityMetrics,
	StepStatus,
	TaskState,
	WorkflowState,
	WorkflowStatus,
} from './types.js';
// Validation types
export type {
	AccessibilityRequirements,
	CoverageRequirements,
	PerformanceBudget,
	QualityGateRequirements,
	SecurityRequirements,
	ValidationResult,
} from './validation-types.js';
