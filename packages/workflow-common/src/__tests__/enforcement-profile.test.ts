/**
 * Phase 1: Schema & Type Tests - Enforcement Profile
 * Following TDD: Write tests FIRST (RED), then implement (GREEN)
 */

import { describe, expect, it } from 'vitest';
import {
	diffEnforcementProfileFromDefaults,
	type EnforcementProfileSchema,
	enforcementProfileDefaults,
	enforcementProfileSchema,
} from '../index.js';

describe('EnforcementProfile Schema', () => {
	describe('Zod Validation', () => {
		it('should validate complete profile with brAInwav branding', () => {
			const profile: EnforcementProfileSchema = {
				branding: 'brAInwav',
				version: '1.0.0',
				budgets: {
					coverage: { lines: 95, branches: 95, functions: 95, statements: 95 },
					performance: { lcp: 2500, tbt: 300 },
					accessibility: { score: 90, wcagLevel: 'AA', wcagVersion: '2.2' },
					security: { maxCritical: 0, maxHigh: 0, maxMedium: 5 },
				},
				policies: {
					architecture: { maxFunctionLines: 40, exportStyle: 'named-only' },
					governance: { requiredChecks: ['lint', 'type-check', 'test', 'security-scan'] },
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

			const result = enforcementProfileSchema.parse(profile);
			expect(result.branding).toBe('brAInwav');
		});

		it('should reject profile without brAInwav branding', () => {
			const profile = {
				branding: 'Other',
				version: '1.0.0',
				budgets: {
					coverage: { lines: 95, branches: 95, functions: 95, statements: 95 },
					performance: { lcp: 2500, tbt: 300 },
					accessibility: { score: 90, wcagLevel: 'AA', wcagVersion: '2.2' },
					security: { maxCritical: 0, maxHigh: 0, maxMedium: 5 },
				},
				policies: {
					architecture: { maxFunctionLines: 40, exportStyle: 'named-only' },
					governance: { requiredChecks: ['lint'] },
				},
				approvers: {
					G0: 'test',
				},
			};

			expect(() => enforcementProfileSchema.parse(profile)).toThrow();
		});

		it('should reject invalid coverage values (must be > 0)', () => {
			const profile = {
				...enforcementProfileDefaults(),
				budgets: {
					...enforcementProfileDefaults().budgets,
					coverage: { lines: -1, branches: 95, functions: 95, statements: 95 },
				},
			};

			expect(() => enforcementProfileSchema.parse(profile)).toThrow();
		});

		it('should reject coverage values > 100', () => {
			const profile = {
				...enforcementProfileDefaults(),
				budgets: {
					...enforcementProfileDefaults().budgets,
					coverage: { lines: 101, branches: 95, functions: 95, statements: 95 },
				},
			};

			expect(() => enforcementProfileSchema.parse(profile)).toThrow();
		});

		it('should accept valid WCAG levels', () => {
			const levels: Array<'A' | 'AA' | 'AAA'> = ['A', 'AA', 'AAA'];

			for (const level of levels) {
				const profile = {
					...enforcementProfileDefaults(),
					budgets: {
						...enforcementProfileDefaults().budgets,
						accessibility: {
							score: 90,
							wcagLevel: level,
							wcagVersion: '2.2' as const,
						},
					},
				};

				expect(() => enforcementProfileSchema.parse(profile)).not.toThrow();
			}
		});

		it('should reject invalid WCAG level', () => {
			const profile = {
				...enforcementProfileDefaults(),
				budgets: {
					...enforcementProfileDefaults().budgets,
					accessibility: {
						score: 90,
						wcagLevel: 'Invalid',
						wcagVersion: '2.2',
					},
				},
			};

			expect(() => enforcementProfileSchema.parse(profile)).toThrow();
		});
	});

	describe('Defaults Builder', () => {
		it('should provide brAInwav default profile', () => {
			const profile = enforcementProfileDefaults();

			expect(profile.branding).toBe('brAInwav');
			expect(profile.budgets.coverage.lines).toBe(95);
			expect(profile.budgets.security.maxCritical).toBe(0);
			expect(profile.budgets.security.maxHigh).toBe(0);
			expect(profile.budgets.security.maxMedium).toBe(5);
		});

		it('should provide complete profile with all required fields', () => {
			const profile = enforcementProfileDefaults();

			expect(profile.version).toBeDefined();
			expect(profile.budgets).toBeDefined();
			expect(profile.budgets.coverage).toBeDefined();
			expect(profile.budgets.performance).toBeDefined();
			expect(profile.budgets.accessibility).toBeDefined();
			expect(profile.budgets.security).toBeDefined();
			expect(profile.policies).toBeDefined();
			expect(profile.policies.architecture).toBeDefined();
			expect(profile.policies.governance).toBeDefined();
			expect(profile.approvers).toBeDefined();
		});

		it('should set brAInwav architectural standards', () => {
			const profile = enforcementProfileDefaults();

			expect(profile.policies.architecture.maxFunctionLines).toBe(40);
			expect(profile.policies.architecture.exportStyle).toBe('named-only');
		});
	});

	describe('Diff Utility', () => {
		it('should show diff from defaults for coverage change', () => {
			const custom = {
				...enforcementProfileDefaults(),
				budgets: {
					...enforcementProfileDefaults().budgets,
					coverage: {
						lines: 98,
						branches: 95,
						functions: 95,
						statements: 95,
					},
				},
			};

			const diff = diffEnforcementProfileFromDefaults(custom);

			expect(diff).toContain('coverage.lines: 95 → 98');
		});

		it('should return empty array when no diffs', () => {
			const diff = diffEnforcementProfileFromDefaults(enforcementProfileDefaults());
			expect(diff).toHaveLength(0);
		});

		it('should show multiple diffs', () => {
			const custom = {
				...enforcementProfileDefaults(),
				budgets: {
					...enforcementProfileDefaults().budgets,
					coverage: {
						lines: 98,
						branches: 98,
						functions: 95,
						statements: 95,
					},
					performance: {
						lcp: 2000,
						tbt: 250,
					},
				},
			};

			const diff = diffEnforcementProfileFromDefaults(custom);

			expect(diff.length).toBeGreaterThan(1);
			expect(diff).toContain('coverage.lines: 95 → 98');
			expect(diff).toContain('coverage.branches: 95 → 98');
			expect(diff).toContain('performance.lcp: 2500ms → 2000ms');
			expect(diff).toContain('performance.tbt: 300ms → 250ms');
		});

		it('should show security policy diffs', () => {
			const custom = {
				...enforcementProfileDefaults(),
				budgets: {
					...enforcementProfileDefaults().budgets,
					security: {
						maxCritical: 1,
						maxHigh: 2,
						maxMedium: 10,
					},
				},
			};

			const diff = diffEnforcementProfileFromDefaults(custom);

			expect(diff).toContain('security.maxCritical: 0 → 1');
			expect(diff).toContain('security.maxHigh: 0 → 2');
			expect(diff).toContain('security.maxMedium: 5 → 10');
		});
	});
});
