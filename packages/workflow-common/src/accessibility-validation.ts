/**
 * @file packages/workflow-common/src/accessibility-validation.ts
 * @description Shared accessibility validation logic for PRP Runner and Task Management
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 */

import type { AccessibilityRequirements, ValidationResult } from './validation-types.js';

/**
 * Accessibility test results
 */
export interface AccessibilityTestResult {
	/** Overall accessibility score (0-100) */
	score: number;
	/** WCAG level achieved */
	wcagLevel: 'A' | 'AA' | 'AAA' | 'NONE';
	/** WCAG version tested against */
	wcagVersion: '2.0' | '2.1' | '2.2';
	/** Number of violations found */
	violations: number;
	/** Number of warnings found */
	warningCount: number;
}

/**
 * Validate accessibility test results against requirements
 *
 * Used by:
 * - PRP Runner G2 (Test Plan gate)
 * - PRP Runner G6 (Release Readiness gate)
 * - Task Management Phase 4 (Verification phase)
 *
 * @param actual - Actual accessibility test results
 * @param requirements - Accessibility requirements
 * @returns Validation result with pass/fail status and detailed failures
 */
export function validateAccessibility(
	actual: AccessibilityTestResult,
	requirements: AccessibilityRequirements,
): ValidationResult {
	const failures: string[] = [];
	const warnings: string[] = [];

	// Validate score
	if (actual.score < requirements.score) {
		failures.push(`Accessibility score insufficient: ${actual.score} < ${requirements.score}`);
	} else if (actual.score === requirements.score) {
		warnings.push(`Accessibility score at minimum threshold: ${actual.score}`);
	}

	// Validate WCAG level
	const levelOrder = { NONE: 0, A: 1, AA: 2, AAA: 3 };
	const actualLevel = levelOrder[actual.wcagLevel];
	const requiredLevel = levelOrder[requirements.wcagLevel];

	if (actualLevel < requiredLevel) {
		failures.push(`WCAG level insufficient: ${actual.wcagLevel} < ${requirements.wcagLevel}`);
	}

	// Validate WCAG version
	if (actual.wcagVersion !== requirements.wcagVersion) {
		warnings.push(
			`WCAG version mismatch: tested ${actual.wcagVersion}, required ${requirements.wcagVersion}`,
		);
	}

	// Check for violations
	if (actual.violations > 0) {
		failures.push(`Accessibility violations found: ${actual.violations}`);
	}

	// Warn about accessibility warnings
	if (actual.warningCount > 0) {
		warnings.push(`Accessibility warnings found: ${actual.warningCount} (should be addressed)`);
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
 * Format accessibility validation result as human-readable message
 */
export function formatAccessibilityValidationResult(result: ValidationResult): string {
	if (result.passed) {
		const lines = ['✓ brAInwav Accessibility validation passed', ''];

		if (result.warnings && result.warnings.length > 0) {
			lines.push('Warnings:');
			for (const warning of result.warnings) {
				lines.push(`  ⚠ ${warning}`);
			}
			lines.push('');
		}

		if (result.metadata) {
			const { actual } = result.metadata as { actual: AccessibilityTestResult };
			lines.push('Accessibility metrics:');
			lines.push(`  Score:       ${actual.score}`);
			lines.push(`  WCAG Level:  ${actual.wcagLevel}`);
			lines.push(`  WCAG Version: ${actual.wcagVersion}`);
			lines.push(`  Violations:  ${actual.violations}`);
			lines.push(`  Warnings:    ${actual.warningCount}`);
		}

		return lines.join('\n');
	}

	const lines = ['✗ brAInwav Accessibility validation failed', '', 'Failures:'];

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
