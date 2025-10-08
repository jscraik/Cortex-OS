/**
 * @file packages/workflow-common/src/performance-validation.ts
 * @description Shared performance validation logic for PRP Runner and Task Management
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 */

import type { PerformanceBudget, ValidationResult } from './validation-types.js';

/**
 * Validate performance metrics against budget
 *
 * Used by:
 * - PRP Runner G2 (Test Plan gate)
 * - PRP Runner G6 (Release Readiness gate)
 * - Task Management Phase 4 (Verification phase)
 *
 * @param actual - Actual performance metrics from tests
 * @param budget - Performance budget thresholds
 * @returns Validation result with pass/fail status and detailed failures
 */
export function validatePerformance(
	actual: PerformanceBudget,
	budget: PerformanceBudget,
): ValidationResult {
	const failures: string[] = [];
	const warnings: string[] = [];

	// Validate LCP (Largest Contentful Paint)
	if (actual.lcp > budget.lcp) {
		failures.push(`LCP exceeds budget: ${actual.lcp}ms > ${budget.lcp}ms`);
	} else if (actual.lcp > budget.lcp * 0.9) {
		warnings.push(`LCP approaching budget limit: ${actual.lcp}ms (budget: ${budget.lcp}ms)`);
	}

	// Validate TBT (Total Blocking Time)
	if (actual.tbt > budget.tbt) {
		failures.push(`TBT exceeds budget: ${actual.tbt}ms > ${budget.tbt}ms`);
	} else if (actual.tbt > budget.tbt * 0.9) {
		warnings.push(`TBT approaching budget limit: ${actual.tbt}ms (budget: ${budget.tbt}ms)`);
	}

	// Validate FCP if provided
	if (budget.fcp !== undefined && actual.fcp !== undefined) {
		if (actual.fcp > budget.fcp) {
			failures.push(`FCP exceeds budget: ${actual.fcp}ms > ${budget.fcp}ms`);
		} else if (actual.fcp > budget.fcp * 0.9) {
			warnings.push(`FCP approaching budget limit: ${actual.fcp}ms (budget: ${budget.fcp}ms)`);
		}
	}

	// Validate TTI if provided
	if (budget.tti !== undefined && actual.tti !== undefined) {
		if (actual.tti > budget.tti) {
			failures.push(`TTI exceeds budget: ${actual.tti}ms > ${budget.tti}ms`);
		} else if (actual.tti > budget.tti * 0.9) {
			warnings.push(`TTI approaching budget limit: ${actual.tti}ms (budget: ${budget.tti}ms)`);
		}
	}

	return {
		passed: failures.length === 0,
		failures,
		warnings,
		metadata: {
			actual,
			budget,
			branding: 'brAInwav',
		},
	};
}

/**
 * Format performance validation result as human-readable message
 */
export function formatPerformanceValidationResult(result: ValidationResult): string {
	if (result.passed) {
		const lines = ['✓ brAInwav Performance validation passed', ''];

		if (result.warnings && result.warnings.length > 0) {
			lines.push('Warnings:');
			for (const warning of result.warnings) {
				lines.push(`  ⚠ ${warning}`);
			}
			lines.push('');
		}

		if (result.metadata) {
			const { actual } = result.metadata as { actual: PerformanceBudget };
			lines.push('Performance metrics:');
			lines.push(`  LCP: ${actual.lcp}ms`);
			lines.push(`  TBT: ${actual.tbt}ms`);
			if (actual.fcp !== undefined) lines.push(`  FCP: ${actual.fcp}ms`);
			if (actual.tti !== undefined) lines.push(`  TTI: ${actual.tti}ms`);
		}

		return lines.join('\n');
	}

	const lines = ['✗ brAInwav Performance validation failed', '', 'Failures:'];

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
