/**
 * @file packages/workflow-common/src/security-validation.ts
 * @description Shared security validation logic for PRP Runner and Task Management
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 */

import type { SecurityRequirements, ValidationResult } from './validation-types.js';

/**
 * Security vulnerability summary
 */
export interface SecurityVulnerabilitySummary {
	/** Number of critical vulnerabilities */
	critical: number;
	/** Number of high vulnerabilities */
	high: number;
	/** Number of medium vulnerabilities */
	medium: number;
	/** Number of low vulnerabilities */
	low: number;
	/** Total number of vulnerabilities */
	total: number;
}

/**
 * Validate security scan results against requirements
 *
 * Used by:
 * - PRP Runner G3 (Code Review gate)
 * - PRP Runner G6 (Release Readiness gate)
 * - Task Management Phase 4 (Verification phase)
 *
 * @param actual - Actual vulnerability counts from security scan
 * @param requirements - Security requirements/thresholds
 * @returns Validation result with pass/fail status and detailed failures
 */
export function validateSecurity(
	actual: SecurityVulnerabilitySummary,
	requirements: SecurityRequirements,
): ValidationResult {
	const failures: string[] = [];
	const warnings: string[] = [];

	// Check fail-on-any mode
	if (requirements.failOnAny && actual.total > 0) {
		failures.push(`Security scan found ${actual.total} vulnerabilities (fail-on-any mode enabled)`);
		return {
			passed: false,
			failures,
			warnings,
			metadata: {
				actual,
				requirements,
				branding: 'brAInwav',
			},
		};
	}

	// Validate critical vulnerabilities
	if (actual.critical > requirements.maxCritical) {
		failures.push(
			`Critical vulnerabilities exceed limit: ${actual.critical} > ${requirements.maxCritical}`,
		);
	} else if (actual.critical > 0 && requirements.maxCritical === 0) {
		failures.push(`Critical vulnerabilities found: ${actual.critical} (zero tolerance)`);
	}

	// Validate high vulnerabilities
	if (actual.high > requirements.maxHigh) {
		failures.push(`High vulnerabilities exceed limit: ${actual.high} > ${requirements.maxHigh}`);
	} else if (actual.high > 0 && requirements.maxHigh === 0) {
		failures.push(`High vulnerabilities found: ${actual.high} (zero tolerance)`);
	}

	// Validate medium vulnerabilities
	if (actual.medium > requirements.maxMedium) {
		failures.push(
			`Medium vulnerabilities exceed limit: ${actual.medium} > ${requirements.maxMedium}`,
		);
	} else if (actual.medium > 0 && requirements.maxMedium === 0) {
		warnings.push(`Medium vulnerabilities found: ${actual.medium} (consider addressing)`);
	}

	// Warn about low vulnerabilities
	if (actual.low > 0) {
		warnings.push(`Low vulnerabilities found: ${actual.low} (informational)`);
	}

	return {
		passed: failures.length === 0,
		failures,
		warnings,
		metadata: {
			actual,
			requirements,
			branding: 'brAInwav',
		},
	};
}

/**
 * Format security validation result as human-readable message
 */
export function formatSecurityValidationResult(result: ValidationResult): string {
	if (result.passed) {
		const lines = ['✓ brAInwav Security validation passed', ''];

		if (result.warnings && result.warnings.length > 0) {
			lines.push('Warnings:');
			for (const warning of result.warnings) {
				lines.push(`  ⚠ ${warning}`);
			}
			lines.push('');
		}

		if (result.metadata) {
			const { actual } = result.metadata as { actual: SecurityVulnerabilitySummary };
			lines.push('Vulnerability summary:');
			lines.push(`  Critical: ${actual.critical}`);
			lines.push(`  High:     ${actual.high}`);
			lines.push(`  Medium:   ${actual.medium}`);
			lines.push(`  Low:      ${actual.low}`);
			lines.push(`  Total:    ${actual.total}`);
		}

		return lines.join('\n');
	}

	const lines = ['✗ brAInwav Security validation failed', '', 'Failures:'];

	for (const failure of result.failures) {
		lines.push(`  ✗ ${failure}`);
	}

	if (result.warnings && result.warnings.length > 0) {
		lines.push('');
		lines.push('Warnings:');
		for (const warning of result.warnings) {
			lines.push(`  ⚠ ${warning}`);
		}
	}

	return lines.join('\n');
}
