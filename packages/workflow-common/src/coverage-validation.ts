/**
 * @file packages/workflow-common/src/coverage-validation.ts
 * @description Shared coverage validation logic for PRP Runner G4 and Task Management Phase 4
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 */

import type { CoverageRequirements, ValidationResult } from './validation-types.js';

/**
 * Validate coverage metrics against requirements
 *
 * Used by:
 * - PRP Runner G4 (Verification gate)
 * - Task Management Phase 4 (Verification phase)
 *
 * @param actual - Actual coverage metrics from test run
 * @param required - Required coverage thresholds
 * @returns Validation result with pass/fail status and detailed failures
 *
 * @example
 * ```typescript
 * const result = validateCoverage(
 *   { lines: 96, branches: 94, functions: 95, statements: 96 },
 *   { lines: 95, branches: 95, functions: 95, statements: 95 }
 * );
 * // result.passed = false (branches below threshold)
 * // result.failures = ['Branch coverage insufficient: 94% < 95%']
 * ```
 */
export function validateCoverage(
	actual: CoverageRequirements,
	required: CoverageRequirements,
): ValidationResult {
	const failures: string[] = [];
	const warnings: string[] = [];

	// Validate line coverage
	if (actual.lines < required.lines) {
		failures.push(`Line coverage insufficient: ${actual.lines}% < ${required.lines}%`);
	} else if (actual.lines === required.lines) {
		warnings.push(`Line coverage at minimum threshold: ${actual.lines}%`);
	}

	// Validate branch coverage
	if (actual.branches < required.branches) {
		failures.push(`Branch coverage insufficient: ${actual.branches}% < ${required.branches}%`);
	} else if (actual.branches === required.branches) {
		warnings.push(`Branch coverage at minimum threshold: ${actual.branches}%`);
	}

	// Validate function coverage
	if (actual.functions < required.functions) {
		failures.push(`Function coverage insufficient: ${actual.functions}% < ${required.functions}%`);
	} else if (actual.functions === required.functions) {
		warnings.push(`Function coverage at minimum threshold: ${actual.functions}%`);
	}

	// Validate statement coverage
	if (actual.statements < required.statements) {
		failures.push(
			`Statement coverage insufficient: ${actual.statements}% < ${required.statements}%`,
		);
	} else if (actual.statements === required.statements) {
		warnings.push(`Statement coverage at minimum threshold: ${actual.statements}%`);
	}

	return {
		passed: failures.length === 0,
		failures,
		warnings,
		metadata: {
			actual,
			required,
			branding: 'brAInwav',
		},
	};
}

/**
 * Format coverage validation result as human-readable message
 *
 * @param result - Validation result to format
 * @returns Formatted message suitable for CLI output or logs
 */
export function formatCoverageValidationResult(result: ValidationResult): string {
	if (result.passed) {
		const lines = ['✓ brAInwav Coverage validation passed', ''];

		if (result.warnings && result.warnings.length > 0) {
			lines.push('Warnings:');
			for (const warning of result.warnings) {
				lines.push(`  ⚠ ${warning}`);
			}
			lines.push('');
		}

		if (result.metadata) {
			const { actual } = result.metadata as { actual: CoverageRequirements };
			lines.push('Coverage metrics:');
			lines.push(`  Lines:      ${actual.lines}%`);
			lines.push(`  Branches:   ${actual.branches}%`);
			lines.push(`  Functions:  ${actual.functions}%`);
			lines.push(`  Statements: ${actual.statements}%`);
		}

		return lines.join('\n');
	}

	const lines = ['✗ brAInwav Coverage validation failed', '', 'Failures:'];

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
