/**
 * @file packages/workflow-common/src/schemas/enforcement-profile.ts
 * @description Zod schemas for enforcement profile validation
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 */

import { z } from 'zod';

/**
 * Coverage requirements schema
 */
const coverageSchema = z.object({
	lines: z.number().min(0).max(100),
	branches: z.number().min(0).max(100),
	functions: z.number().min(0).max(100),
	statements: z.number().min(0).max(100),
});

/**
 * Performance budget schema
 */
const performanceSchema = z.object({
	lcp: z.number().positive(),
	tbt: z.number().positive(),
	fcp: z.number().positive().optional(),
	tti: z.number().positive().optional(),
});

/**
 * Accessibility requirements schema
 */
const accessibilitySchema = z.object({
	score: z.number().min(0).max(100),
	wcagLevel: z.enum(['A', 'AA', 'AAA']),
	wcagVersion: z.enum(['2.0', '2.1', '2.2']),
});

/**
 * Security requirements schema
 */
const securitySchema = z.object({
	maxCritical: z.number().min(0),
	maxHigh: z.number().min(0),
	maxMedium: z.number().min(0),
});

/**
 * Architecture policy schema
 */
const architecturePolicySchema = z.object({
	maxFunctionLines: z.number().positive(),
	exportStyle: z.enum(['named-only', 'default-allowed']),
});

/**
 * Governance policy schema
 */
const governancePolicySchema = z.object({
	requiredChecks: z.array(z.string()).min(1),
});

/**
 * Gate approvers schema - all gates must have approvers
 */
const approversSchema = z.object({
	G0: z.string(),
	G1: z.string(),
	G2: z.string(),
	G3: z.string(),
	G4: z.string(),
	G5: z.string(),
	G6: z.string(),
	G7: z.string(),
});

/**
 * Complete enforcement profile schema
 * MUST include brAInwav branding
 */
export const enforcementProfileSchema = z.object({
	branding: z.literal('brAInwav'),
	version: z.string(),
	budgets: z.object({
		coverage: coverageSchema,
		performance: performanceSchema,
		accessibility: accessibilitySchema,
		security: securitySchema,
	}),
	policies: z.object({
		architecture: architecturePolicySchema,
		governance: governancePolicySchema,
	}),
	approvers: approversSchema,
});

/**
 * Type inference from schema
 */
export type EnforcementProfile = z.infer<typeof enforcementProfileSchema>;

/**
 * brAInwav default enforcement profile
 */
export function defaults(): EnforcementProfile {
	return {
		branding: 'brAInwav',
		version: '1.0.0',
		budgets: {
			coverage: {
				lines: 95,
				branches: 95,
				functions: 95,
				statements: 95,
			},
			performance: {
				lcp: 2500,
				tbt: 300,
			},
			accessibility: {
				score: 90,
				wcagLevel: 'AA',
				wcagVersion: '2.2',
			},
			security: {
				maxCritical: 0,
				maxHigh: 0,
				maxMedium: 5,
			},
		},
		policies: {
			architecture: {
				maxFunctionLines: 40,
				exportStyle: 'named-only',
			},
			governance: {
				requiredChecks: ['lint', 'type-check', 'test', 'security-scan'],
			},
		},
		approvers: {
			G0: 'product-owner',
			G1: 'architect',
			G2: 'qa-lead',
			G3: 'tech-lead',
			G4: 'qa-lead',
			G5: 'release-manager',
			G6: 'release-manager',
			G7: 'product-owner',
		},
	};
}

/**
 * Calculate diff from default profile
 * @param custom - Custom profile to compare
 * @returns Array of differences as human-readable strings
 */
export function diffFromDefaults(custom: EnforcementProfile): string[] {
	const def = defaults();
	const diffs: string[] = [];

	// Compare coverage
	if (custom.budgets.coverage.lines !== def.budgets.coverage.lines) {
		diffs.push(`coverage.lines: ${def.budgets.coverage.lines} → ${custom.budgets.coverage.lines}`);
	}
	if (custom.budgets.coverage.branches !== def.budgets.coverage.branches) {
		diffs.push(
			`coverage.branches: ${def.budgets.coverage.branches} → ${custom.budgets.coverage.branches}`,
		);
	}
	if (custom.budgets.coverage.functions !== def.budgets.coverage.functions) {
		diffs.push(
			`coverage.functions: ${def.budgets.coverage.functions} → ${custom.budgets.coverage.functions}`,
		);
	}
	if (custom.budgets.coverage.statements !== def.budgets.coverage.statements) {
		diffs.push(
			`coverage.statements: ${def.budgets.coverage.statements} → ${custom.budgets.coverage.statements}`,
		);
	}

	// Compare performance
	if (custom.budgets.performance.lcp !== def.budgets.performance.lcp) {
		diffs.push(
			`performance.lcp: ${def.budgets.performance.lcp}ms → ${custom.budgets.performance.lcp}ms`,
		);
	}
	if (custom.budgets.performance.tbt !== def.budgets.performance.tbt) {
		diffs.push(
			`performance.tbt: ${def.budgets.performance.tbt}ms → ${custom.budgets.performance.tbt}ms`,
		);
	}

	// Compare accessibility
	if (custom.budgets.accessibility.score !== def.budgets.accessibility.score) {
		diffs.push(
			`accessibility.score: ${def.budgets.accessibility.score} → ${custom.budgets.accessibility.score}`,
		);
	}
	if (custom.budgets.accessibility.wcagLevel !== def.budgets.accessibility.wcagLevel) {
		diffs.push(
			`accessibility.wcagLevel: ${def.budgets.accessibility.wcagLevel} → ${custom.budgets.accessibility.wcagLevel}`,
		);
	}

	// Compare security
	if (custom.budgets.security.maxCritical !== def.budgets.security.maxCritical) {
		diffs.push(
			`security.maxCritical: ${def.budgets.security.maxCritical} → ${custom.budgets.security.maxCritical}`,
		);
	}
	if (custom.budgets.security.maxHigh !== def.budgets.security.maxHigh) {
		diffs.push(
			`security.maxHigh: ${def.budgets.security.maxHigh} → ${custom.budgets.security.maxHigh}`,
		);
	}
	if (custom.budgets.security.maxMedium !== def.budgets.security.maxMedium) {
		diffs.push(
			`security.maxMedium: ${def.budgets.security.maxMedium} → ${custom.budgets.security.maxMedium}`,
		);
	}

	// Compare policies
	if (
		custom.policies.architecture.maxFunctionLines !== def.policies.architecture.maxFunctionLines
	) {
		diffs.push(
			`architecture.maxFunctionLines: ${def.policies.architecture.maxFunctionLines} → ${custom.policies.architecture.maxFunctionLines}`,
		);
	}
	if (custom.policies.architecture.exportStyle !== def.policies.architecture.exportStyle) {
		diffs.push(
			`architecture.exportStyle: ${def.policies.architecture.exportStyle} → ${custom.policies.architecture.exportStyle}`,
		);
	}

	return diffs;
}
