/**
 * @file packages/prp-runner/src/integrations/task-management-adapter.ts
 * @description Adapter for integrating PRP Runner with Task Management system
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 */

import type {
	AccessibilityRequirements,
	CoverageRequirements,
	PerformanceBudget,
	QualityGateRequirements,
	SecurityRequirements,
} from '@cortex-os/workflow-common';
import type { EnforcementProfile } from '../gates/base.js';
import type { Blueprint } from '../orchestrator.js';

/**
 * Task Management Constitution template structure
 */
export interface ConstitutionTemplate {
	vision: string;
	principles: Array<{
		statement: string;
		rationale: string;
	}>;
	successCriteria: Array<{
		criterion: string;
		measurement: string;
	}>;
	branding: 'brAInwav';
}

/**
 * Convert PRP Blueprint to Task Management Constitution
 *
 * Maps G0 (Ideation) blueprint to Task Phase 0 (Init) constitution template.
 *
 * @param blueprint - PRP G0 blueprint
 * @returns Constitution template for task management
 */
export function blueprintToConstitution(blueprint: Blueprint): ConstitutionTemplate {
	return {
		vision: blueprint.description,
		principles: blueprint.requirements.map((req: string) => ({
			statement: req,
			rationale: 'Derived from product requirement',
		})),
		successCriteria: blueprint.requirements.map((req: string) => ({
			criterion: req,
			measurement: 'TBD - Define in research phase',
		})),
		branding: 'brAInwav',
	};
}

/**
 * Convert PRP Enforcement Profile to Task Management Quality Requirements
 *
 * Maps enforcement profile budgets to quality gate requirements used in
 * Task Management Phase 4 (Verification).
 *
 * @param profile - PRP enforcement profile
 * @returns Quality gate requirements for task management
 */
export function enforcementProfileToQualityRequirements(
	profile: EnforcementProfile,
): QualityGateRequirements {
	return {
		coverage: {
			lines: profile.budgets.coverageLines,
			branches: profile.budgets.coverageBranches,
			functions: 95, // Default from brAInwav standards
			statements: 95, // Default from brAInwav standards
		},
		performance: {
			lcp: profile.budgets.performanceLCP,
			tbt: profile.budgets.performanceTBT,
		},
		accessibility: {
			score: profile.budgets.a11yScore,
			wcagLevel: 'AA',
			wcagVersion: '2.2',
		},
		security: {
			maxCritical: 0,
			maxHigh: 0,
			maxMedium: 5,
			failOnAny: false,
		},
	};
}

/**
 * Extract coverage requirements from enforcement profile
 *
 * @param profile - Enforcement profile
 * @returns Coverage requirements for validation
 */
export function extractCoverageRequirements(profile: EnforcementProfile): CoverageRequirements {
	return {
		lines: profile.budgets.coverageLines,
		branches: profile.budgets.coverageBranches,
		functions: 95,
		statements: 95,
	};
}

/**
 * Extract performance budget from enforcement profile
 *
 * @param profile - Enforcement profile
 * @returns Performance budget for validation
 */
export function extractPerformanceBudget(profile: EnforcementProfile): PerformanceBudget {
	return {
		lcp: profile.budgets.performanceLCP,
		tbt: profile.budgets.performanceTBT,
	};
}

/**
 * Extract accessibility requirements from enforcement profile
 *
 * @param profile - Enforcement profile
 * @returns Accessibility requirements for validation
 */
export function extractAccessibilityRequirements(
	profile: EnforcementProfile,
): AccessibilityRequirements {
	return {
		score: profile.budgets.a11yScore,
		wcagLevel: 'AA',
		wcagVersion: '2.2',
	};
}

/**
 * Get default security requirements (brAInwav standards)
 *
 * @returns Security requirements for validation
 */
export function getDefaultSecurityRequirements(): SecurityRequirements {
	return {
		maxCritical: 0,
		maxHigh: 0,
		maxMedium: 5,
		failOnAny: false,
	};
}
