/**
 * @file tests/nodes/evaluation.test.ts
 * @description Tests for EvaluationNode with real TDD validation, code review, and quality budgets
 */

import { exec } from 'node:child_process';
import fs from 'node:fs';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { EvaluationNode } from '../../src/nodes/evaluation.js';
import { createInitialPRPState, type PRPState } from '../../src/state.js';

// Mock dependencies
vi.mock('fs');
vi.mock('child_process');
vi.mock('glob');

describe('EvaluationNode', () => {
	let evaluationNode: EvaluationNode;
	let mockState: PRPState;

	// Helper types and utilities for exec mocking
	type ExecCallback = (error: Error | null, stdout: string, stderr: string) => void;
	type ExecMockFn = (cmd: string, options: unknown, callback?: ExecCallback) => void;
	function mockExec(impl: ExecMockFn) {
		(exec as unknown as { mockImplementation: (fn: ExecMockFn) => void }).mockImplementation(impl);
	}

	beforeEach(() => {
		evaluationNode = new EvaluationNode();
		const base = createInitialPRPState({
			title: 'Test Project',
			description: 'Test evaluation project',
			requirements: ['Add comprehensive tests', 'Ensure code quality'],
		});
		// Seed build phase evidence and build validation gate to mimic prior phase completion
		base.evidence.push(
			{
				id: 'build-backend-123',
				type: 'test',
				source: 'backend_validation',
				content: JSON.stringify({ details: { coverage: 85 } }),
				timestamp: new Date().toISOString(),
				phase: 'build',
			},
			{
				id: 'build-security-456',
				type: 'analysis',
				source: 'security_scanner',
				content: JSON.stringify({
					details: { summary: { critical: 0, high: 1, medium: 2, total: 3 } },
				}),
				timestamp: new Date().toISOString(),
				phase: 'build',
			},
			{
				id: 'build-frontend-789',
				type: 'analysis',
				source: 'frontend_validation',
				content: JSON.stringify({ lighthouse: 94, axe: 96 }),
				timestamp: new Date().toISOString(),
				phase: 'build',
			},
		);
		base.validationResults.build = {
			passed: true,
			blockers: [],
			majors: [],
			evidence: ['build-backend-123', 'build-security-456', 'build-frontend-789'],
			timestamp: new Date().toISOString(),
		};
		mockState = base;
		vi.clearAllMocks();
	});

	describe('TDD validation', () => {
		it('should pass TDD validation with comprehensive tests', async () => {
			// Mock file system for test files
			const mockGlob = vi
				.fn()
				.mockResolvedValueOnce(['src/utils.test.ts', 'src/api.test.ts'])
				.mockResolvedValueOnce([]);
			vi.doMock('glob', () => ({ glob: mockGlob }));

			(fs.existsSync as Mock).mockImplementation((path: string) => {
				if (path.includes('package.json')) return true;
				if (path.includes('coverage-summary.json')) return true;
				return false;
			});

			(fs.readFileSync as Mock).mockImplementation((path: string) => {
				if (path.includes('package.json')) {
					return JSON.stringify({ scripts: { test: 'vitest --coverage' } });
				}
				if (path.includes('coverage-summary.json')) {
					return JSON.stringify({
						total: {
							statements: { pct: 85 },
							branches: { pct: 82 },
							functions: { pct: 90 },
							lines: { pct: 88 },
						},
					});
				}
				return '{}';
			});

			mockExec((cmd, _options, callback) => {
				if (callback) {
					if (cmd.includes('pnpm test')) {
						callback(null, '15 passed, 0 failed\nAll files | 86% coverage', '');
					} else if (cmd.includes('git log')) {
						callback(
							null,
							'feat: add user tests\ntest: implement TDD cycle\nrefactor: clean up code',
							'',
						);
					}
				}
			});

			const result = await evaluationNode.execute(mockState);

			const tddEvidence = result.evidence.find((e) => e.source === 'tdd_validator');
			const tddDetails = JSON.parse(tddEvidence?.content || '{}');

			expect(tddDetails.passed).toBe(true);
			expect(tddDetails.details.testCount).toBe(2);
			expect(tddDetails.details.coverage).toBeGreaterThanOrEqual(80);
			expect(tddDetails.details.redGreenCycle).toBe(true);
		});

		it('should fail TDD validation with insufficient coverage', async () => {
			const mockGlob = vi.fn().mockResolvedValue(['src/basic.test.ts']);
			vi.doMock('glob', () => ({ glob: mockGlob }));

			(fs.existsSync as Mock).mockReturnValue(true);
			(fs.readFileSync as Mock).mockReturnValue(
				JSON.stringify({
					scripts: { test: 'vitest' },
				}),
			);

			mockExec((cmd, _options, callback) => {
				if (callback && cmd.includes('pnpm test')) {
					callback(null, '3 passed, 0 failed\nAll files | 65% coverage', '');
				}
			});

			const result = await evaluationNode.execute(mockState);

			expect(result.validationResults.evaluation?.blockers).toContain(
				'TDD cycle not completed - missing tests or failing tests',
			);

			const tddEvidence = result.evidence.find((e) => e.source === 'tdd_validator');
			const tddDetails = JSON.parse(tddEvidence?.content || '{}');
			expect(tddDetails.passed).toBe(false);
			expect(tddDetails.details.coverage).toBeLessThan(80);
		});

		it('should handle Python projects with pytest', async () => {
			const mockGlob = vi.fn().mockResolvedValue(['test_main.py', 'test_api.py']);
			vi.doMock('glob', () => ({ glob: mockGlob }));

			(fs.existsSync as Mock).mockImplementation((path: string) => {
				return path.includes('pyproject.toml');
			});

			mockExec((cmd, _options, callback) => {
				if (callback) {
					if (cmd.includes('which pytest')) {
						callback(null, '/usr/bin/pytest', '');
					} else if (cmd.includes('pytest --cov')) {
						callback(null, '25 passed\nTOTAL 88%', '');
					}
				}
			});

			const result = await evaluationNode.execute(mockState);

			const tddEvidence = result.evidence.find((e) => e.source === 'tdd_validator');
			const tddDetails = JSON.parse(tddEvidence?.content || '{}');

			expect(tddDetails.passed).toBe(true);
			expect(tddDetails.details.coverage).toBe(88);
		});

		it('should detect TDD evidence in git history', async () => {
			const mockGlob = vi.fn().mockResolvedValue(['src/app.test.ts']);
			vi.doMock('glob', () => ({ glob: mockGlob }));

			mockExec((cmd, _options, callback) => {
				if (callback) {
					if (cmd.includes('git log')) {
						callback(
							null,
							'feat: red test for user creation\nfeat: green test passing\nrefactor: clean up user model',
							'',
						);
					} else if (cmd.includes('pnpm test')) {
						callback(null, '5 passed, 0 failed\nAll files | 85% coverage', '');
					}
				}
			});

			const result = await evaluationNode.execute(mockState);

			const tddEvidence = result.evidence.find((e) => e.source === 'tdd_validator');
			const tddDetails = JSON.parse(tddEvidence?.content || '{}');

			expect(tddDetails.details.gitTddEvidence).toBe(true);
			expect(tddDetails.details.redGreenCycle).toBe(true);
		});
	});

	describe('code review validation', () => {
		it('should run comprehensive code review with multiple tools', async () => {
			(fs.existsSync as Mock).mockReturnValue(true);
			(fs.readFileSync as Mock).mockReturnValue(
				JSON.stringify({
					devDependencies: { 'eslint-plugin-security': '^1.0.0' },
				}),
			);

			mockExec((cmd, _options, callback) => {
				if (callback) {
					if (cmd.includes('which eslint')) {
						callback(null, '/usr/bin/eslint', '');
					} else if (cmd.includes('npx eslint --format json')) {
						callback(
							null,
							JSON.stringify([
								{
									filePath: '/project/src/app.ts',
									messages: [
										{
											ruleId: 'complexity',
											severity: 2,
											message: 'Function complexity too high',
											line: 15,
											column: 8,
										},
										{
											ruleId: 'security/detect-object-injection',
											severity: 2,
											message: 'Potential object injection',
											line: 25,
											column: 12,
										},
									],
								},
							]),
							'',
						);
					}
				}
			});

			const mockGlob = vi.fn().mockResolvedValue(['src/app.ts', 'src/utils.ts']);
			vi.doMock('glob', () => ({ glob: mockGlob }));

			const result = await evaluationNode.execute(mockState);

			const reviewEvidence = result.evidence.find((e) => e.source === 'code_reviewer');
			const reviewDetails = JSON.parse(reviewEvidence?.content || '{}');

			expect(reviewDetails.details.tools).toContain('ESLint');
			expect(reviewDetails.details.totalIssues).toBeGreaterThan(0);
			expect(reviewDetails.details.codeQualityScore).toBeDefined();
			expect(reviewDetails.details.maintainabilityIndex).toBeDefined();
		});

		it('should analyze code complexity', async () => {
			const mockGlob = vi.fn().mockResolvedValue(['src/complex.ts']);
			vi.doMock('glob', () => ({ glob: mockGlob }));

			(fs.readFileSync as Mock).mockReturnValue(`
        function complexFunction() {
          if (condition1) {
            if (condition2) {
              for (let i = 0; i < items.length; i++) {
                if (items[i].type === 'special') {
                  switch (items[i].status) {
                    case 'active':
                      if (items[i].priority > 5) {
                        // High complexity function
                      }
                      break;
                  }
                }
              }
            }
          }
        }
      `);

			const result = await evaluationNode.execute(mockState);

			const reviewEvidence = result.evidence.find((e) => e.source === 'code_reviewer');
			const reviewDetails = JSON.parse(reviewEvidence?.content || '{}');

			expect(reviewDetails.details.tools).toContain('Complexity Analysis');
			expect(reviewDetails.details.categories.complexity).toBeGreaterThan(0);
		});

		it('should find TODO/FIXME comments', async () => {
			const mockGlob = vi.fn().mockResolvedValue(['src/app.ts']);
			vi.doMock('glob', () => ({ glob: mockGlob }));

			(fs.readFileSync as Mock).mockReturnValue(`
        // TODO: Implement proper error handling
        function processData() {
          // FIXME: This is a temporary hack
          return data;
        }
        // XXX: Security vulnerability here
      `);

			const result = await evaluationNode.execute(mockState);

			const reviewEvidence = result.evidence.find((e) => e.source === 'code_reviewer');
			const reviewDetails = JSON.parse(reviewEvidence?.content || '{}');

			expect(reviewDetails.details.tools).toContain('TODO/FIXME Scanner');
			expect(reviewDetails.details.categories.maintenance).toBeGreaterThan(0);
		});

		it('should handle Python code review with Pylint', async () => {
			(fs.existsSync as Mock).mockImplementation((path: string) => {
				return path.includes('pyproject.toml');
			});

			mockExec((cmd, _options, callback) => {
				if (callback) {
					if (cmd.includes('which pylint')) {
						callback(null, '/usr/bin/pylint', '');
					} else if (cmd.includes('pylint . --output-format=json')) {
						callback(
							null,
							JSON.stringify([
								{
									type: 'warning',
									symbol: 'unused-variable',
									message: 'Unused variable "temp"',
									path: 'src/main.py',
									line: 15,
									column: 8,
								},
								{
									type: 'error',
									symbol: 'undefined-variable',
									message: 'Undefined variable "missing_var"',
									path: 'src/utils.py',
									line: 25,
									column: 12,
								},
							]),
							'',
						);
					}
				}
			});

			const result = await evaluationNode.execute(mockState);

			const reviewEvidence = result.evidence.find((e) => e.source === 'code_reviewer');
			const reviewDetails = JSON.parse(reviewEvidence?.content || '{}');

			expect(reviewDetails.details.tools).toContain('Pylint');
			expect(reviewDetails.blockers).toBeGreaterThan(0); // Error severity
		});

		it('should provide actionable recommendations', async () => {
			// Mock high complexity and security issues
			const mockGlob = vi.fn().mockResolvedValue(['src/app.ts']);
			vi.doMock('glob', () => ({ glob: mockGlob }));

			(fs.readFileSync as Mock).mockReturnValue(`
        function veryComplexFunction() {
          // Many if/else statements to trigger complexity
          ${Array(20)
						.fill(0)
						.map((_, i) => `if (condition${i}) { /* logic */ }`)
						.join('\n')}
        }
      `);

			const result = await evaluationNode.execute(mockState);

			const reviewEvidence = result.evidence.find((e) => e.source === 'code_reviewer');
			const reviewDetails = JSON.parse(reviewEvidence?.content || '{}');

			expect(reviewDetails.details.recommendations).toContain(
				'Consider refactoring complex functions to improve maintainability',
			);
		});
	});

	describe('quality budgets validation', () => {
		it('should extract real scores from build evidence', async () => {
			const result = await evaluationNode.execute(mockState);

			const budgetEvidence = result.evidence.find((e) => e.source === 'quality_budgets');
			const budgetDetails = JSON.parse(budgetEvidence?.content || '{}');

			expect(budgetDetails.accessibility.score).toBe(96); // From frontend evidence
			expect(budgetDetails.performance.score).toBe(94); // From lighthouse
			expect(budgetDetails.security.score).toBeGreaterThan(0); // Calculated from security scan
		});

		it('should provide detailed accessibility budget info', async () => {
			const result = await evaluationNode.execute(mockState);

			const budgetEvidence = result.evidence.find((e) => e.source === 'quality_budgets');
			const budgetDetails = JSON.parse(budgetEvidence?.content || '{}');

			expect(budgetDetails.accessibility.details.wcagLevel).toBe('AAA');
			expect(budgetDetails.accessibility.details.keyMetrics.colorContrast).toBe(true);
			expect(budgetDetails.accessibility.details.auditTools).toContain('Axe-core');
		});

		it('should provide detailed performance budget info', async () => {
			const result = await evaluationNode.execute(mockState);

			const budgetEvidence = result.evidence.find((e) => e.source === 'quality_budgets');
			const budgetDetails = JSON.parse(budgetEvidence?.content || '{}');

			expect(budgetDetails.performance.details.coreWebVitals.lcp).toBe('good');
			expect(budgetDetails.performance.details.budgets.totalJavaScript).toBeDefined();
			expect(budgetDetails.performance.details.auditTools).toContain('Lighthouse');
		});

		it('should provide detailed security budget info', async () => {
			const result = await evaluationNode.execute(mockState);

			const budgetEvidence = result.evidence.find((e) => e.source === 'quality_budgets');
			const budgetDetails = JSON.parse(budgetEvidence?.content || '{}');

			expect(budgetDetails.security.details.riskLevel).toBeDefined();
			expect(budgetDetails.security.details.compliance.owaspTop10).toBeDefined();
			expect(budgetDetails.security.details.scanTools).toContain('Semgrep');
		});

		it('should fail when accessibility below threshold', async () => {
			// Mock low accessibility score
			const lowScoreState: PRPState = {
				...mockState,
				evidence: [
					...mockState.evidence.filter((e) => e.source !== 'frontend_validation'),
					{
						id: 'build-frontend-low',
						type: 'analysis',
						source: 'frontend_validation',
						content: JSON.stringify({ lighthouse: 85, axe: 75 }),
						timestamp: new Date().toISOString(),
						phase: 'build',
					},
				],
			};

			const result = await evaluationNode.execute(lowScoreState);

			expect(result.validationResults.evaluation?.majors).toContain(
				'Accessibility score 75 below threshold',
			);

			const budgetEvidence = result.evidence.find((e) => e.source === 'quality_budgets');
			const budgetDetails = JSON.parse(budgetEvidence?.content || '{}');
			expect(budgetDetails.accessibility.passed).toBe(false);
			expect(budgetDetails.accessibility.details.recommendations).toContain(
				'Improve color contrast ratios to meet WCAG AA standards',
			);
		});

		it('should fail when security below threshold', async () => {
			// Mock high security issues
			const highSecurityIssuesState: PRPState = {
				...mockState,
				evidence: [
					...mockState.evidence.filter((e) => e.source !== 'security_scanner'),
					{
						id: 'build-security-high',
						type: 'analysis',
						source: 'security_scanner',
						content: JSON.stringify({
							details: {
								summary: { critical: 2, high: 5, medium: 3, total: 10 },
							},
						}),
						timestamp: new Date().toISOString(),
						phase: 'build',
					},
				],
			};

			const result = await evaluationNode.execute(highSecurityIssuesState);

			expect(
				result.validationResults.evaluation?.blockers.some((b) => b.includes('Security score')),
			).toBe(true);

			const budgetEvidence = result.evidence.find((e) => e.source === 'quality_budgets');
			const budgetDetails = JSON.parse(budgetEvidence?.content || '{}');
			expect(budgetDetails.security.passed).toBe(false);
		});

		it('should provide appropriate recommendations based on scores', async () => {
			// Mock medium performance score
			const mediumPerfState: PRPState = {
				...mockState,
				evidence: [
					...mockState.evidence.filter((e) => e.source !== 'frontend_validation'),
					{
						id: 'build-frontend-med',
						type: 'analysis',
						source: 'frontend_validation',
						content: JSON.stringify({ lighthouse: 75, axe: 95 }),
						timestamp: new Date().toISOString(),
						phase: 'build',
					},
				],
			};

			const result = await evaluationNode.execute(mediumPerfState);

			const budgetEvidence = result.evidence.find((e) => e.source === 'quality_budgets');
			const budgetDetails = JSON.parse(budgetEvidence?.content || '{}');

			expect(budgetDetails.performance.details.recommendations).toContain(
				'Optimize images with modern formats (WebP, AVIF)',
			);
			expect(budgetDetails.performance.details.recommendations).toContain(
				'Implement code splitting and lazy loading',
			);
		});
	});

	describe('pre-Cerebrum validation', () => {
		it('should pass when all phases complete and sufficient evidence', async () => {
			const completeState: PRPState = {
				...mockState,
				validationResults: {
					strategy: {
						passed: true,
						blockers: [],
						majors: [],
						evidence: [],
						timestamp: new Date().toISOString(),
					},
					build: {
						passed: true,
						blockers: [],
						majors: [],
						evidence: [],
						timestamp: new Date().toISOString(),
					},
					evaluation: {
						passed: true,
						blockers: [],
						majors: [],
						evidence: [],
						timestamp: new Date().toISOString(),
					},
				},
				evidence: Array(10)
					.fill(null)
					.map((_, i) => ({
						id: `evidence-${i}`,
						type: 'test',
						source: 'test_source',
						content: '{}',
						timestamp: new Date().toISOString(),
						phase: 'build' as const,
					})),
			};

			const result = await evaluationNode.execute(completeState);

			expect(result.validationResults.evaluation?.passed).toBe(true);
			expect(result.validationResults.evaluation?.blockers).not.toContain(
				'System not ready for Cerebrum decision',
			);
		});

		it('should fail when insufficient evidence', async () => {
			const insufficientEvidenceState: PRPState = {
				...mockState,
				evidence: [mockState.evidence[0]], // Only one piece of evidence
			};

			const result = await evaluationNode.execute(insufficientEvidenceState);

			expect(result.validationResults.evaluation?.blockers).toContain(
				'System not ready for Cerebrum decision',
			);
		});

		it('should fail when phases not passed', async () => {
			const failedPhasesState: PRPState = {
				...mockState,
				validationResults: {
					strategy: {
						passed: false,
						blockers: ['Strategy issue'],
						majors: [],
						evidence: [],
						timestamp: new Date().toISOString(),
					},
					build: {
						passed: true,
						blockers: [],
						majors: [],
						evidence: [],
						timestamp: new Date().toISOString(),
					},
				},
			};

			const result = await evaluationNode.execute(failedPhasesState);

			expect(result.validationResults.evaluation?.blockers).toContain(
				'System not ready for Cerebrum decision',
			);
		});
	});

	describe('overall evaluation', () => {
		it('should pass evaluation with all gates satisfied', async () => {
			// Mock comprehensive successful state
			const mockGlob = vi.fn().mockResolvedValue(['test1.test.ts', 'test2.test.ts']);
			vi.doMock('glob', () => ({ glob: mockGlob }));

			(fs.existsSync as Mock).mockReturnValue(true);
			(fs.readFileSync as Mock).mockReturnValue(
				JSON.stringify({
					scripts: { test: 'vitest --coverage' },
				}),
			);

			mockExec((_cmd, _options, callback) => {
				if (callback) {
					callback(null, '20 passed, 0 failed\nAll files | 90% coverage', '');
				}
			});

			const result = await evaluationNode.execute(mockState);

			expect(result.validationResults.evaluation?.passed).toBe(true);
			expect(result.validationResults.evaluation?.blockers).toHaveLength(0);
			expect(result.evidence.length).toBeGreaterThan(mockState.evidence.length);
		});

		it('should aggregate all evaluation evidence', async () => {
			const result = await evaluationNode.execute(mockState);

			expect(result.evidence.some((e) => e.source === 'tdd_validator')).toBe(true);
			expect(result.evidence.some((e) => e.source === 'code_reviewer')).toBe(true);
			expect(result.evidence.some((e) => e.source === 'quality_budgets')).toBe(true);
			expect(result.validationResults.evaluation?.evidence.length).toBeGreaterThan(0);
		});

		it('should handle evaluation errors gracefully', async () => {
			// Mock filesystem error
			(fs.existsSync as Mock).mockImplementation(() => {
				throw new Error('File system error');
			});

			const result = await evaluationNode.execute(mockState);

			// Should not crash, should provide error details
			expect(result.validationResults.evaluation).toBeDefined();
			expect(result.evidence.some((e) => e.source === 'tdd_validator')).toBe(true);
		});
	});
});
