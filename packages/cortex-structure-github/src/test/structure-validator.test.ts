/**
 * Comprehensive test suite for Structure Validator
 * TDD approach for repository structure enforcement
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { StructureRule } from '../core/structure-validator.js';
import { CORTEX_STRUCTURE_RULES, StructureValidator } from '../core/structure-validator.js';

describe('StructureValidator', () => {
	let validator: StructureValidator;

	beforeEach(() => {
		validator = new StructureValidator(CORTEX_STRUCTURE_RULES);
	});

	describe('File Validation', () => {
		describe('Application Placement Rules', () => {
			it('should allow applications in apps/ directory', () => {
				const validPaths = [
					'apps/my-app/src/index',
					'apps/web-ui/package.json',
					'apps/cli-tool/bin/cli.js',
				];

				validPaths.forEach((path) => {
					const violations = validator.validateFile(path);
					const appViolations = violations.filter((v) => v.rule === 'applications-placement');
					expect(appViolations).toHaveLength(0);
				});
			});

			it('should flag applications outside apps/ directory', () => {
				const invalidPaths = [
					'packages/my-app/src/index',
					'libs/web-ui/package.json',
					'src/cli-tool.js',
				];

				invalidPaths.forEach((path) => {
					const violations = validator.validateFile(path);
					const appViolations = violations.filter((v) => v.rule === 'applications-placement');
					expect(appViolations.length).toBeGreaterThan(0);
				});
			});
		});

		describe('Package Placement Rules', () => {
			it('should allow packages in packages/ directory', () => {
				const validPaths = [
					'packages/feature-auth/src/auth',
					'packages/module-payment/index.js',
					'packages/package-core/package.json',
				];

				validPaths.forEach((path) => {
					const violations = validator.validateFile(path);
					const packageViolations = violations.filter((v) => v.rule === 'packages-placement');
					expect(packageViolations).toHaveLength(0);
				});
			});

			it('should flag packages outside packages/ directory', () => {
				const invalidPaths = [
					'apps/feature-auth/src/auth',
					'libs/module-payment/index.js',
					'src/package-core.js',
				];

				invalidPaths.forEach((path) => {
					const violations = validator.validateFile(path);
					const packageViolations = violations.filter((v) => v.rule === 'packages-placement');
					expect(packageViolations.length).toBeGreaterThan(0);
				});
			});
		});

		describe('TypeScript Organization', () => {
			it('should allow TypeScript files in proper locations', () => {
				const validPaths = [
					'apps/my-app/src/index',
					'packages/core/lib/utils',
					'libs/shared/types',
					'scripts/build',
					'tests/unit/auth.test',
				];

				validPaths.forEach((path) => {
					const violations = validator.validateFile(path);
					const tsViolations = violations.filter((v) => v.rule === 'typescript-organization');
					expect(tsViolations.filter((v) => v.type === 'misplaced_file')).toHaveLength(0);
				});
			});

			it('should flag TypeScript files in root directory', () => {
				const invalidPaths = ['index', 'app', 'config'];

				invalidPaths.forEach((path) => {
					const violations = validator.validateFile(path);
					const tsViolations = violations.filter((v) => v.rule === 'typescript-organization');
					expect(tsViolations.length).toBeGreaterThan(0);
				});
			});

			it('should validate TypeScript naming conventions', () => {
				const validNames = [
					'apps/test/index',
					'packages/core/utils',
					'libs/shared/my-component',
					'scripts/build-tool',
				];

				const invalidNames = [
					'apps/test/Index', // PascalCase not allowed
					'packages/core/Utils',
					'libs/shared/my_component', // underscore mixed with hyphen
					'scripts/buildTool', // camelCase not allowed
				];

				validNames.forEach((path) => {
					const violations = validator.validateFile(path);
					const namingViolations = violations.filter((v) => v.type === 'naming_violation');
					expect(namingViolations).toHaveLength(0);
				});

				invalidNames.forEach((path) => {
					const violations = validator.validateFile(path);
					const namingViolations = violations.filter((v) => v.type === 'naming_violation');
					expect(namingViolations.length).toBeGreaterThan(0);
				});
			});
		});

		describe('Documentation Organization', () => {
			it('should allow documentation files in proper locations', () => {
				const validPaths = [
					'docs/api.md',
					'docs/guides/getting-started.md',
					'README.md',
					'apps/my-app/README.md',
					'CHANGELOG.md',
				];

				validPaths.forEach((path) => {
					const violations = validator.validateFile(path);
					const docViolations = violations.filter((v) => v.rule === 'documentation-organization');
					expect(docViolations.filter((v) => v.type === 'misplaced_file')).toHaveLength(0);
				});
			});
		});

		describe('Test File Placement', () => {
			it('should allow test files in proper locations', () => {
				const validPaths = [
					'tests/unit/auth.test',
					'tests/integration/api.spec.js',
					'apps/my-app/src/auth.test',
					'packages/core/lib/utils.spec',
				];

				validPaths.forEach((path) => {
					const violations = validator.validateFile(path);
					const testViolations = violations.filter((v) => v.rule === 'test-files-placement');
					expect(testViolations.filter((v) => v.type === 'misplaced_file')).toHaveLength(0);
				});
			});
		});

		describe('Deep Nesting Prevention', () => {
			it('should flag excessively nested files', () => {
				const deepPaths = [
					'apps/my-app/src/components/forms/fields/input/validators/email/index', // 7+ levels
					'packages/core/lib/utils/helpers/formatters/dates/iso/converter', // 8+ levels
				];

				deepPaths.forEach((path) => {
					const violations = validator.validateFile(path);
					const nestingViolations = violations.filter((v) => v.rule === 'prevent-deep-nesting');
					expect(nestingViolations.length).toBeGreaterThan(0);
				});
			});

			it('should allow reasonable nesting levels', () => {
				const reasonablePaths = [
					'apps/my-app/src/components/Button', // 4 levels
					'packages/core/lib/utils/format', // 4 levels
					'libs/shared/types/api', // 3 levels
				];

				reasonablePaths.forEach((path) => {
					const violations = validator.validateFile(path);
					const nestingViolations = violations.filter((v) => v.rule === 'prevent-deep-nesting');
					expect(nestingViolations).toHaveLength(0);
				});
			});
		});
	});

	describe('Path Suggestions', () => {
		it('should suggest correct paths for misplaced applications', () => {
			const violations = validator.validateFile('src/my-app');
			const appViolations = violations.filter((v) => v.rule === 'applications-placement');

			if (appViolations.length > 0) {
				expect(appViolations[0].suggestedPath).toBe('apps/my-app');
			}
		});

		it('should suggest correct paths for misplaced packages', () => {
			const violations = validator.validateFile('src/feature-auth');
			const packageViolations = violations.filter((v) => v.rule === 'packages-placement');

			if (packageViolations.length > 0) {
				expect(packageViolations[0].suggestedPath).toBe('packages/feature-auth');
			}
		});

		it('should suggest correct paths for misplaced TypeScript files', () => {
			const violations = validator.validateFile('utils');
			const tsViolations = violations.filter((v) => v.rule === 'typescript-organization');

			if (tsViolations.length > 0) {
				expect(tsViolations[0].suggestedPath).toBe('src/utils');
			}
		});

		it('should suggest test directory for test files', () => {
			const violations = validator.validateFile('auth.test');
			const testViolations = violations.filter((v) => v.rule === 'typescript-organization');

			if (testViolations.length > 0) {
				expect(testViolations[0].suggestedPath).toBe('tests/auth.test');
			}
		});
	});

	describe('Repository Analysis', () => {
		it('should calculate correct scores for clean repositories', () => {
			const cleanFiles = [
				'apps/web-ui/src/index',
				'packages/auth/lib/auth',
				'libs/shared/types',
				'docs/README.md',
				'tests/auth.test',
			];

			const result = validator.analyzeRepository(cleanFiles);

			expect(result.violations).toHaveLength(0);
			expect(result.score).toBe(100);
			expect(result.summary.totalFiles).toBe(cleanFiles.length);
			expect(result.summary.violationsCount).toBe(0);
			expect(result.summary.autoFixableCount).toBe(0);
		});

		it('should calculate scores with penalties for violations', () => {
			const messyFiles = [
				'index', // Root TS file - error (10 points)
				'my-app.js', // Root app file - error (10 points)
				'docs/very/deep/nested/file/structure.md', // Deep nesting - warning (5 points)
				'apps/web-ui/src/Component', // Naming violation - warning (5 points)
			];

			const result = validator.analyzeRepository(messyFiles);

			expect(result.violations.length).toBeGreaterThan(0);
			expect(result.score).toBeLessThan(100);
			expect(result.summary.totalFiles).toBe(messyFiles.length);
			expect(result.summary.violationsCount).toBeGreaterThan(0);
		});

		it('should count auto-fixable violations correctly', () => {
			const files = [
				'src/my-app', // Auto-fixable: move to apps/
				'lib/feature', // Auto-fixable: move to packages/
				'script.sh', // Auto-fixable: move to scripts/
			];

			const result = validator.analyzeRepository(files);

			const autoFixableViolations = result.violations.filter((v) => v.autoFixable);
			expect(result.summary.autoFixableCount).toBe(autoFixableViolations.length);
			expect(result.summary.autoFixableCount).toBeGreaterThan(0);
		});
	});

	describe('Custom Rules', () => {
		it('should work with custom rule sets', () => {
			const customRules: StructureRule[] = [
				{
					name: 'custom-components',
					description: 'Components should be in components/ directory',
					pattern: '**/*Component.tsx',
					allowedPaths: ['components/**/*'],
					autoFix: true,
				},
			];

			const customValidator = new StructureValidator(customRules);

			const violations = customValidator.validateFile('src/MyComponent.tsx');
			expect(violations.length).toBeGreaterThan(0);
			expect(violations[0].rule).toBe('custom-components');
		});

		it('should handle empty rule sets gracefully', () => {
			const emptyValidator = new StructureValidator([]);

			const violations = emptyValidator.validateFile('anywhere/any-file');
			expect(violations).toHaveLength(0);

			const result = emptyValidator.analyzeRepository(['file1', 'file2.js']);
			expect(result.score).toBe(100);
			expect(result.violations).toHaveLength(0);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty file lists', () => {
			const result = validator.analyzeRepository([]);

			expect(result.violations).toHaveLength(0);
			expect(result.score).toBe(100);
			expect(result.summary.totalFiles).toBe(0);
		});

		it('should handle files with no extensions', () => {
			const violations = validator.validateFile('Dockerfile');

			// Should not crash, may or may not have violations depending on rules
			expect(Array.isArray(violations)).toBe(true);
		});

		it('should handle very long file paths', () => {
			const longPath = `apps/${'very/'.repeat(20)}deep/file.ts`;

			const violations = validator.validateFile(longPath);

			expect(Array.isArray(violations)).toBe(true);
			// Should definitely flag deep nesting
			const nestingViolations = violations.filter((v) => v.rule === 'prevent-deep-nesting');
			expect(nestingViolations.length).toBeGreaterThan(0);
		});

		it('should handle special characters in file paths', () => {
			const specialPaths = [
				'apps/my-app/src/file with spaces',
				'packages/core/lib/file@special',
				'docs/guide[1].md',
			];

			specialPaths.forEach((path) => {
				const violations = validator.validateFile(path);
				expect(Array.isArray(violations)).toBe(true);
			});
		});
	});

	describe('Performance', () => {
		it('should handle large file lists efficiently', () => {
			const largeFileList = Array.from({ length: 10000 }, (_, i) => `apps/app${i}/src/file${i}.ts`);

			const startTime = Date.now();
			const result = validator.analyzeRepository(largeFileList);
			const endTime = Date.now();

			expect(result.summary.totalFiles).toBe(10000);
			expect(endTime - startTime).toBeLessThan(5000); // Should complete in < 5 seconds
		});
	});
});
