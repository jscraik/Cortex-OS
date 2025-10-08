/**
 * @file packages/workflow-common/__tests__/coverage-validation.test.ts
 * @description Tests for shared coverage validation logic
 */

import { describe, expect, it } from 'vitest';
import { formatCoverageValidationResult, validateCoverage } from '../src/coverage-validation.js';

describe('validateCoverage', () => {
	it('should pass when all metrics exceed requirements', () => {
		const result = validateCoverage(
			{ lines: 96, branches: 96, functions: 96, statements: 96 },
			{ lines: 95, branches: 95, functions: 95, statements: 95 },
		);

		expect(result.passed).toBe(true);
		expect(result.failures).toHaveLength(0);
	});

	it('should fail when line coverage is insufficient', () => {
		const result = validateCoverage(
			{ lines: 94, branches: 96, functions: 96, statements: 96 },
			{ lines: 95, branches: 95, functions: 95, statements: 95 },
		);

		expect(result.passed).toBe(false);
		expect(result.failures).toContain('Line coverage insufficient: 94% < 95%');
	});

	it('should fail when branch coverage is insufficient', () => {
		const result = validateCoverage(
			{ lines: 96, branches: 94, functions: 96, statements: 96 },
			{ lines: 95, branches: 95, functions: 95, statements: 95 },
		);

		expect(result.passed).toBe(false);
		expect(result.failures).toContain('Branch coverage insufficient: 94% < 95%');
	});

	it('should warn when metrics are at minimum threshold', () => {
		const result = validateCoverage(
			{ lines: 95, branches: 95, functions: 95, statements: 95 },
			{ lines: 95, branches: 95, functions: 95, statements: 95 },
		);

		expect(result.passed).toBe(true);
		expect(result.warnings).toBeDefined();
		expect(result.warnings?.length).toBeGreaterThan(0);
	});

	it('should include brAInwav branding in metadata', () => {
		const result = validateCoverage(
			{ lines: 96, branches: 96, functions: 96, statements: 96 },
			{ lines: 95, branches: 95, functions: 95, statements: 95 },
		);

		expect(result.metadata?.branding).toBe('brAInwav');
	});

	it('should fail with multiple insufficient metrics', () => {
		const result = validateCoverage(
			{ lines: 94, branches: 93, functions: 92, statements: 91 },
			{ lines: 95, branches: 95, functions: 95, statements: 95 },
		);

		expect(result.passed).toBe(false);
		expect(result.failures).toHaveLength(4);
	});
});

describe('formatCoverageValidationResult', () => {
	it('should format passing result with brAInwav branding', () => {
		const result = validateCoverage(
			{ lines: 96, branches: 96, functions: 96, statements: 96 },
			{ lines: 95, branches: 95, functions: 95, statements: 95 },
		);

		const formatted = formatCoverageValidationResult(result);
		expect(formatted).toContain('brAInwav');
		expect(formatted).toContain('✓');
	});

	it('should format failing result with failure details', () => {
		const result = validateCoverage(
			{ lines: 94, branches: 94, functions: 94, statements: 94 },
			{ lines: 95, branches: 95, functions: 95, statements: 95 },
		);

		const formatted = formatCoverageValidationResult(result);
		expect(formatted).toContain('brAInwav');
		expect(formatted).toContain('✗');
		expect(formatted).toContain('failed');
	});
});
