/**
 * @file packages/workflow-common/src/validation-types.ts
 * @description Shared validation types for PRP Runner and Task Management
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 */

/**
 * Coverage requirements for tests
 */
export interface CoverageRequirements {
	/** Line coverage percentage (0-100) */
	lines: number;
	/** Branch coverage percentage (0-100) */
	branches: number;
	/** Function coverage percentage (0-100) */
	functions: number;
	/** Statement coverage percentage (0-100) */
	statements: number;
}

/**
 * Performance budget requirements
 */
export interface PerformanceBudget {
	/** Largest Contentful Paint in milliseconds */
	lcp: number;
	/** Total Blocking Time in milliseconds */
	tbt: number;
	/** First Contentful Paint in milliseconds (optional) */
	fcp?: number;
	/** Time to Interactive in milliseconds (optional) */
	tti?: number;
}

/**
 * Accessibility requirements
 */
export interface AccessibilityRequirements {
	/** Accessibility score (0-100) */
	score: number;
	/** WCAG compliance level */
	wcagLevel: 'A' | 'AA' | 'AAA';
	/** WCAG version */
	wcagVersion: '2.0' | '2.1' | '2.2';
}

/**
 * Security requirements
 */
export interface SecurityRequirements {
	/** Maximum number of critical vulnerabilities allowed */
	maxCritical: number;
	/** Maximum number of high vulnerabilities allowed */
	maxHigh: number;
	/** Maximum number of medium vulnerabilities allowed */
	maxMedium: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
	/** Whether validation passed */
	passed: boolean;
	/** List of validation failures (empty if passed) */
	failures: string[];
	/** Optional warnings that don't fail validation */
	warnings?: string[];
	/** Optional metadata about the validation */
	metadata?: Record<string, unknown>;
}

/**
 * Quality gate requirements combining all validation types
 */
export interface QualityGateRequirements {
	/** Coverage requirements */
	coverage: CoverageRequirements;
	/** Performance budget */
	performance: PerformanceBudget;
	/** Accessibility requirements */
	accessibility: AccessibilityRequirements;
	/** Security requirements */
	security: SecurityRequirements;
}
