/**
 * @fileoverview TDD Tests for Structure Guard Policy Schema Validation
 *
 * This module tests the policy schema validation system to ensure:
 * 1. Policy files are properly validated against schema
 * 2. Invalid policies are rejected with clear error messages
 * 3. Policy evolution is supported through versioning
 * 4. Comprehensive validation coverage for all policy fields
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { type StructureGuardPolicy, validatePolicy } from './policy-schema.js';

describe('Structure Guard Policy Schema', () => {
	describe('Policy Validation', () => {
		it('should reject policy with missing version', () => {
			const invalidPolicy = {
				excludePatterns: [],
				allowedPaths: {},
				allowedRootEntries: [],
			};

			expect(() => validatePolicy(invalidPolicy)).toThrow('version');
		});

		it('should reject policy with invalid version format', () => {
			const invalidPolicy = {
				version: 'not-semver',
				excludePatterns: [],
				allowedPaths: {},
				allowedRootEntries: [],
			};

			expect(() => validatePolicy(invalidPolicy)).toThrow('version');
		});

		it('should accept valid minimal policy', () => {
			const validPolicy: StructureGuardPolicy = {
				version: '1.0.0',
				excludePatterns: ['**/node_modules/**'],
				allowedPaths: {
					packages: ['core', 'utils'],
				},
				allowedRootEntries: ['packages', 'apps'],
				filePatterns: {},
				maxFilesPerChange: 50,
				overrideRules: {
					migrationMode: false,
					overrideRequiresApproval: [],
					maxFilesWithOverride: 100,
				},
				protectedFiles: [],
				allowedGlobs: ['**/*.ts', '**/*.js'],
				deniedGlobs: ['**/*.secret', '**/*.key'],
				importRules: {
					bannedPatterns: [],
					allowedCrossPkgImports: [],
				},
				enforcement: {
					blockUnknownRoots: true,
					blockUnknownPaths: true,
				},
				testRequirements: {
					minCoverage: 80,
					requiredTestDirs: ['tests', '__tests__'],
					excludeFromCoverage: ['*.config.js'],
				},
			};

			expect(() => validatePolicy(validPolicy)).not.toThrow();
		});

		it('should reject policy with negative maxFilesPerChange', () => {
			const invalidPolicy = {
				version: '1.0.0',
				maxFilesPerChange: -1,
				excludePatterns: [],
				allowedPaths: {},
				allowedRootEntries: [],
			};

			expect(() => validatePolicy(invalidPolicy)).toThrow('maxFilesPerChange');
		});

		it('should reject policy with invalid coverage percentage', () => {
			const invalidPolicy = {
				version: '1.0.0',
				testRequirements: {
					minCoverage: 150, // Invalid: > 100
					requiredTestDirs: [],
					excludeFromCoverage: [],
				},
			};

			expect(() => validatePolicy(invalidPolicy)).toThrow('coverage');
		});

		it('should provide detailed error messages for validation failures', () => {
			const invalidPolicy = {
				version: 123, // Should be string
				allowedPaths: 'not-an-object', // Should be object
			};

			try {
				validatePolicy(invalidPolicy);
				expect.fail('Should have thrown validation error');
			} catch (error) {
				expect(error).toBeInstanceOf(z.ZodError);
				const zodError = error as z.ZodError;
				expect(zodError.issues).toHaveLength(2);
				expect(
					zodError.issues.some((issue) => issue.path.includes('version')),
				).toBe(true);
				expect(
					zodError.issues.some((issue) => issue.path.includes('allowedPaths')),
				).toBe(true);
			}
		});
	});

	describe('Policy Versioning', () => {
		it('should support major version upgrades', () => {
			const v2Policy = {
				version: '2.0.0',
				// v2 might have different required fields
				newField: 'new-feature',
				excludePatterns: [],
				allowedPaths: {},
				allowedRootEntries: [],
			};

			// This test documents version evolution capability
			// Implementation should handle version-specific validation
			expect(() =>
				validatePolicy(v2Policy, { version: '2.0.0' }),
			).not.toThrow();
		});

		it('should warn about deprecated fields in older versions', () => {
			const v1PolicyWithDeprecated = {
				version: '1.0.0',
				deprecatedField: 'old-value', // This field was deprecated in v1.1
				excludePatterns: [],
				allowedPaths: {},
				allowedRootEntries: [],
			};

			// Should accept but provide warnings
			const result = validatePolicy(v1PolicyWithDeprecated, {
				allowDeprecated: true,
			});
			expect(result.warnings).toContain('deprecatedField');
		});
	});

	describe('Security Validation', () => {
		it('should reject policies that allow dangerous glob patterns', () => {
			const unsafePolicy = {
				version: '1.0.0',
				allowedGlobs: [
					'**/.env', // Dangerous: might expose secrets
					'**/*.key', // Dangerous: cryptographic keys
					'../outside/**', // Dangerous: path traversal
				],
			};

			expect(() => validatePolicy(unsafePolicy)).toThrow('security');
		});

		it('should require denied patterns for sensitive file types', () => {
			const policyMissingSecurityDenies = {
				version: '1.0.0',
				deniedGlobs: [], // Missing security-critical denies
			};

			const result = validatePolicy(policyMissingSecurityDenies, {
				strict: true,
			});
			expect(result.warnings).toContain('Consider adding security denies');
		});
	});

	describe('Performance Validation', () => {
		it('should warn about performance-impacting configurations', () => {
			const performanceHeavyPolicy = {
				version: '1.0.0',
				allowedGlobs: [
					'**/*', // Too broad
					'**/node_modules/**/*', // Performance killer
				],
				maxFilesPerChange: 10000, // Too high
			};

			const result = validatePolicy(performanceHeavyPolicy, {
				checkPerformance: true,
			});
			expect(result.warnings).toContain('performance');
		});
	});

	describe('Import Rules Validation', () => {
		it('should validate import rule patterns are valid regex', () => {
			const invalidImportRules = {
				version: '1.0.0',
				importRules: {
					bannedPatterns: [
						'[invalid-regex', // Malformed regex
					],
					allowedCrossPkgImports: [],
				},
			};

			expect(() => validatePolicy(invalidImportRules)).toThrow('regex');
		});

		it('should detect conflicting import rules', () => {
			const conflictingPolicy = {
				version: '1.0.0',
				importRules: {
					bannedPatterns: ['@cortex-os/core'],
					allowedCrossPkgImports: ['@cortex-os/core'], // Conflicts with banned
				},
			};

			expect(() => validatePolicy(conflictingPolicy)).toThrow('conflict');
		});
	});
});
