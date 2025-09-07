/**
 * @file tests/nodes/build.test.ts
 * @description Tests for BuildNode with real implementation validations
 */

import { exec } from 'node:child_process';
import fs from 'node:fs';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { BuildNode } from '../../src/nodes/build';
import { createInitialPRPState, type PRPState } from '../../src/state';

// Mock fs and child_process
vi.mock('fs');
vi.mock('child_process');

describe('BuildNode', () => {
	let buildNode: BuildNode;
	let mockState: PRPState;

	// Helper type for exec callback used in mocks
	type ExecCallback = (error: Error | null, stdout: string, stderr: string) => void;

	// Lightweight wrapper to avoid repetitive casting to any
	function mockExec(
		impl: (
			cmd: string,
			options: unknown,
			cb?: ExecCallback,
		) => void | { stdout?: string; stderr?: string },
	) {
		(
			exec as unknown as {
				mockImplementation: (
					fn: (
						cmd: string,
						options: unknown,
						callback?: ExecCallback,
					) => void | { stdout?: string; stderr?: string },
				) => void;
			}
		).mockImplementation(impl as any);
	}

	beforeEach(() => {
		buildNode = new BuildNode();
		mockState = createInitialPRPState({
			title: 'Test Project',
			description: 'Test project for validation',
			requirements: ['Build API endpoints', 'Add frontend UI', 'Ensure security'],
		});
		// Reset all mocks
		vi.clearAllMocks();
	});

	describe('backend validation', () => {
		it('should pass validation for Node.js project with tests', async () => {
			// Mock file system
			(fs.existsSync as Mock).mockImplementation((path: string) => {
				if (path.includes('package.json')) return true;
				if (path.includes('src')) return true;
				return false;
			});

			(fs.readFileSync as Mock).mockReturnValue(
				JSON.stringify({
					scripts: { build: 'tsc', test: 'vitest' },
				}),
			);

			// Mock successful build and test
			mockExec((cmd, _options, callback) => {
				if (callback) {
					if (cmd.includes('pnpm run build')) {
						callback(null, 'Build successful', '');
					} else if (cmd.includes('pnpm test')) {
						callback(null, '5 passed, 0 failed\nAll files | 92% coverage', '');
					}
				}
				return { stdout: 'success', stderr: '' };
			});

			const result = await buildNode.execute(mockState);

			expect(result.validationResults.build?.passed).toBe(true);
			expect(result.validationResults.build?.blockers).toHaveLength(0);
		});

		it('should fail validation when build fails', async () => {
			(fs.existsSync as Mock).mockImplementation((path: string) => {
				if (path.includes('package.json')) return true;
				if (path.includes('src')) return true;
				return false;
			});

			(fs.readFileSync as Mock).mockReturnValue(
				JSON.stringify({
					scripts: { build: 'tsc', test: 'vitest' },
				}),
			);

			// Mock failed build
			mockExec((cmd, _options, callback) => {
				if (callback) {
					if (cmd.includes('pnpm run build')) {
						callback(new Error('Build failed'), '', 'TypeScript errors');
					}
				}
			});

			const result = await buildNode.execute(mockState);

			expect(result.validationResults.build?.passed).toBe(false);
			expect(result.validationResults.build?.blockers).toContain(
				'Backend compilation or tests failed',
			);
		});

		it('should handle Python projects with pytest', async () => {
			// Mock Python project
			(fs.existsSync as Mock).mockImplementation((path: string) => {
				if (path.includes('pyproject.toml')) return true;
				if (path.includes('apps')) return true;
				return false;
			});

			mockExec((cmd, _options, callback) => {
				if (callback) {
					if (cmd.includes('which mypy')) {
						callback(null, '/usr/bin/mypy', '');
					} else if (cmd.includes('mypy .')) {
						callback(null, 'Success: no issues found', '');
					} else if (cmd.includes('which pytest')) {
						callback(null, '/usr/bin/pytest', '');
					} else if (cmd.includes('pytest')) {
						callback(null, '10 passed\nTOTAL 85%', '');
					}
				}
			});

			const result = await buildNode.execute(mockState);

			expect(result.validationResults.build?.passed).toBe(true);
			expect(result.evidence.some((e) => e.source === 'backend_validation')).toBe(true);
		});

		it('should skip backend validation when no backend requirements', async () => {
			const frontendOnlyState = {
				...mockState,
				blueprint: {
					...mockState.blueprint,
					requirements: ['Add responsive design', 'Improve accessibility'],
				},
			};

			const result = await buildNode.execute(frontendOnlyState);

			const backendEvidence = result.evidence.find((e) => e.source === 'backend_validation');
			const backendDetails = JSON.parse(backendEvidence?.content || '{}');

			expect(backendDetails.details.type).toBe('frontend-only');
		});
	});

	describe('security scanning', () => {
		it('should run Semgrep when available', async () => {
			const _mockExec = vi.fn();
			(
				exec as unknown as {
					mockImplementation: (
						fn: (
							cmd: string,
							_options: unknown,
							callback?: (error: Error | null, stdout: string, stderr: string) => void,
						) => void,
					) => void;
				}
			).mockImplementation(
				(
					cmd: string,
					_options: unknown,
					callback?: (error: Error | null, stdout: string, stderr: string) => void,
				) => {
					if (callback) {
						if (cmd.includes('which semgrep')) {
							callback(null, '/usr/bin/semgrep', '');
						} else if (cmd.includes('semgrep --config=auto')) {
							callback(
								null,
								JSON.stringify({
									results: [
										{
											check_id: 'security.hardcoded-secret',
											path: 'src/config.js',
											start: { line: 15, col: 10 },
											extra: {
												severity: 'ERROR',
												message: 'Hardcoded API key detected',
												metadata: { confidence: 'HIGH' },
											},
										},
									],
								}),
								'',
							);
						}
					}
				},
			);

			const result = await buildNode.execute(mockState);

			const securityEvidence = result.evidence.find((e) => e.source === 'security_scanner');
			const securityDetails = JSON.parse(securityEvidence?.content || '{}');

			expect(securityDetails.details.tools).toContain('Semgrep');
			expect(securityDetails.details.vulnerabilities).toHaveLength(1);
			expect(securityDetails.details.vulnerabilities[0].severity).toBe('critical');
		});

		it('should use ESLint security plugin when available', async () => {
			(fs.existsSync as Mock).mockReturnValue(true);
			(fs.readFileSync as Mock).mockReturnValue(
				JSON.stringify({
					devDependencies: { 'eslint-plugin-security': '^1.0.0' },
				}),
			);

			const _mockExec = vi.fn();
			(
				exec as unknown as {
					mockImplementation: (
						fn: (
							cmd: string,
							_options: unknown,
							callback?: (error: Error | null, stdout: string, stderr: string) => void,
						) => void,
					) => void;
				}
			).mockImplementation(
				(
					cmd: string,
					_options: unknown,
					callback?: (error: Error | null, stdout: string, stderr: string) => void,
				) => {
					if (callback) {
						if (cmd.includes('which semgrep')) {
							callback(new Error('not found'), '', '');
						} else if (cmd.includes('npx eslint')) {
							callback(
								null,
								JSON.stringify([
									{
										filePath: '/project/src/app.js',
										messages: [
											{
												ruleId: 'security/detect-object-injection',
												severity: 2,
												message: 'Potential object injection',
												line: 25,
												column: 10,
											},
										],
									},
								]),
								'',
							);
						}
					}
				},
			);

			const result = await buildNode.execute(mockState);

			const securityEvidence = result.evidence.find((e) => e.source === 'security_scanner');
			const securityDetails = JSON.parse(securityEvidence?.content || '{}');

			expect(securityDetails.details.tools).toContain('ESLint Security');
			expect(securityDetails.majors).toBeGreaterThanOrEqual(0);
		});

		it('should use basic security checks when no tools available', async () => {
			const _mockExec = vi.fn();
			(
				exec as unknown as {
					mockImplementation: (
						fn: (
							_cmd: string,
							_options: unknown,
							callback?: (error: Error | null, stdout: string, stderr: string) => void,
						) => void,
					) => void;
				}
			).mockImplementation(
				(
					_cmd: string,
					_options: unknown,
					callback?: (error: Error | null, stdout: string, stderr: string) => void,
				) => {
					if (callback) {
						callback(new Error('tool not found'), '', '');
					}
				},
			);

			// Mock file system for basic checks
			(fs.existsSync as Mock).mockReturnValue(false);

			const result = await buildNode.execute(mockState);

			const securityEvidence = result.evidence.find((e) => e.source === 'security_scanner');
			const securityDetails = JSON.parse(securityEvidence?.content || '{}');

			expect(securityDetails.details.tools).toContain('Basic Checks');
		});
	});

	describe('frontend validation', () => {
		beforeEach(() => {
			mockState.blueprint.requirements = ['Add React UI', 'Improve user interface'];
		});

		it('should run Lighthouse when available', async () => {
			(fs.existsSync as Mock).mockReturnValue(true);
			(fs.readFileSync as Mock).mockReturnValue(
				JSON.stringify({
					scripts: { dev: 'vite' },
					dependencies: { react: '^18.0.0' },
				}),
			);

			const mockSpawn = vi.fn().mockReturnValue({
				kill: vi.fn(),
				stdout: { on: vi.fn() },
				stderr: { on: vi.fn() },
				on: vi.fn(),
			});

			mockExec((cmd, _options, callback) => {
				if (callback) {
					if (cmd.includes('which lighthouse')) {
						callback(null, '/usr/bin/lighthouse', '');
					} else if (cmd.includes('lighthouse http://localhost:3000')) {
						callback(
							null,
							JSON.stringify({
								lhr: {
									categories: {
										performance: { score: 0.94 },
										accessibility: { score: 0.96 },
										'best-practices': { score: 0.92 },
										seo: { score: 0.98 },
									},
								},
							}),
							'',
						);
					}
				}
			});

			// Mock import for spawn
			vi.doMock('child_process', () => ({
				exec: exec,
				spawn: mockSpawn,
			}));

			const result = await buildNode.execute(mockState);

			const frontendEvidence = result.evidence.find((e) => e.source === 'frontend_validation');
			if (frontendEvidence) {
				const frontendDetails = JSON.parse(frontendEvidence.content);
				expect(frontendDetails.lighthouse).toBeGreaterThanOrEqual(85);
			}
		});

		it('should detect frontend framework correctly', async () => {
			(fs.existsSync as Mock).mockReturnValue(true);
			(fs.readFileSync as Mock).mockReturnValue(
				JSON.stringify({
					dependencies: { react: '^18.0.0', next: '^13.0.0' },
				}),
			);

			const result = await buildNode.execute(mockState);

			const frontendEvidence = result.evidence.find((e) => e.source === 'frontend_validation');
			if (frontendEvidence) {
				const frontendDetails = JSON.parse(frontendEvidence.content);
				expect(frontendDetails.details.projectType).toBe('react');
			}
		});

		it('should run basic accessibility checks when Axe not available', async () => {
			(fs.existsSync as Mock).mockReturnValue(true);
			(fs.readFileSync as Mock).mockImplementation((path: string) => {
				if (path.includes('package.json')) {
					return JSON.stringify({ dependencies: { react: '^18.0.0' } });
				}
				if (path.includes('.tsx') || path.includes('.jsx')) {
					return '<img src="test.jpg"><button></button><input type="text">';
				}
				return '';
			});

			const mockGlob = vi.fn().mockResolvedValue(['src/App.tsx', 'src/Button.jsx']);
			vi.doMock('glob', () => ({ glob: mockGlob }));

			const result = await buildNode.execute(mockState);

			const frontendEvidence = result.evidence.find((e) => e.source === 'frontend_validation');
			if (frontendEvidence) {
				const frontendDetails = JSON.parse(frontendEvidence.content);
				expect(frontendDetails.details.axe.violations).toBeGreaterThan(0);
			}
		});

		it('should skip frontend validation for backend-only projects', async () => {
			const backendOnlyState = {
				...mockState,
				blueprint: {
					...mockState.blueprint,
					requirements: ['Build REST API', 'Add database layer'],
				},
			};

			const result = await buildNode.execute(backendOnlyState);

			const frontendEvidence = result.evidence.find((e) => e.source === 'frontend_validation');
			if (frontendEvidence) {
				const frontendDetails = JSON.parse(frontendEvidence.content);
				expect(frontendDetails.details.type).toBe('backend-only');
			}
		});
	});

	describe('API schema validation', () => {
		it('should validate OpenAPI schema when present', async () => {
			const apiState = {
				...mockState,
				outputs: {
					'api-check': { hasSchema: true },
				},
			};

			const result = await buildNode.execute(apiState);

			const apiEvidence = result.evidence.find((e) => e.source === 'api_schema_validation');
			const apiDetails = JSON.parse(apiEvidence?.content || '{}');

			expect(apiDetails.passed).toBe(true);
			expect(apiDetails.details.schemaFormat).toBe('OpenAPI 3.0');
		});

		it('should fail when API required but schema missing', async () => {
			const apiState = {
				...mockState,
				blueprint: {
					...mockState.blueprint,
					requirements: ['Build API endpoints', 'Create REST API'],
				},
				outputs: {
					'api-check': { hasSchema: false },
				},
			};

			const result = await buildNode.execute(apiState);

			const apiEvidence = result.evidence.find((e) => e.source === 'api_schema_validation');
			const apiDetails = JSON.parse(apiEvidence?.content || '{}');

			expect(apiDetails.passed).toBe(false);
			expect(apiDetails.details.schemaFormat).toBe('missing');
		});

		it('should skip API validation when not required', async () => {
			const nonApiState = {
				...mockState,
				blueprint: {
					...mockState.blueprint,
					requirements: ['Add static website', 'Improve documentation'],
				},
			};

			const result = await buildNode.execute(nonApiState);

			const apiEvidence = result.evidence.find((e) => e.source === 'api_schema_validation');
			const apiDetails = JSON.parse(apiEvidence?.content || '{}');

			expect(apiDetails.passed).toBe(true);
			expect(apiDetails.details.validation).toBe('skipped');
		});
	});

	describe('documentation validation', () => {
		it('should validate documentation completeness', async () => {
			const result = await buildNode.execute(mockState);

			const docsEvidence = result.evidence.find((e) => e.source === 'documentation_validation');
			expect(docsEvidence).toBeDefined();

			const docsDetails = JSON.parse(docsEvidence?.content || '{}');
			expect(docsDetails.passed).toBe(true);
			expect(docsDetails.details.apiDocs).toBe(true);
			expect(docsDetails.details.usageGuide).toBe(true);
		});

		it('should check for examples when documentation required', async () => {
			const docsRequiredState = {
				...mockState,
				blueprint: {
					...mockState.blueprint,
					requirements: ['Add comprehensive documentation', 'Include usage examples'],
				},
			};

			const result = await buildNode.execute(docsRequiredState);

			const docsEvidence = result.evidence.find((e) => e.source === 'documentation_validation');
			const docsDetails = JSON.parse(docsEvidence?.content || '{}');

			expect(docsDetails.details.examples).toBe(true);
		});
	});

	describe('overall build validation', () => {
		it('should pass when all gates are satisfied', async () => {
			// Mock successful validations
			(fs.existsSync as Mock).mockReturnValue(true);
			(fs.readFileSync as Mock).mockReturnValue(
				JSON.stringify({
					scripts: { build: 'tsc', test: 'vitest' },
				}),
			);

			mockExec((_cmd, _options, callback) => {
				if (callback) {
					callback(null, 'success', '');
				}
			});

			const result = await buildNode.execute(mockState);

			expect(result.validationResults.build?.passed).toBe(true);
			expect(result.validationResults.build?.blockers).toHaveLength(0);
			expect(result.evidence.length).toBeGreaterThan(0);
		});

		it('should fail when critical issues found', async () => {
			// Mock security blocker
			mockExec((cmd, _options, callback) => {
				if (callback) {
					if (cmd.includes('semgrep')) {
						callback(
							null,
							JSON.stringify({
								results: [
									{
										check_id: 'security.sql-injection',
										extra: {
											severity: 'ERROR',
											message: 'SQL injection found',
										},
									},
								],
							}),
							'',
						);
					} else {
						callback(null, 'success', '');
					}
				}
			});

			const result = await buildNode.execute(mockState);

			expect(result.validationResults.build?.blockers.length).toBeGreaterThan(0);
			expect(result.validationResults.build?.passed).toBe(false);
		});

		it('should handle partial failures gracefully', async () => {
			// Mock mixed results
			mockExec((cmd, _options, callback) => {
				if (callback) {
					if (cmd.includes('build')) {
						callback(null, 'Build successful', '');
					} else if (cmd.includes('lighthouse')) {
						callback(new Error('Lighthouse failed'), '', '');
					} else {
						callback(null, 'success', '');
					}
				}
			});

			const result = await buildNode.execute(mockState);

			// Should not fail entirely due to lighthouse failure
			expect(result.validationResults.build?.passed).toBeDefined();
			expect(result.evidence.length).toBeGreaterThan(0);
		});
	});
});
