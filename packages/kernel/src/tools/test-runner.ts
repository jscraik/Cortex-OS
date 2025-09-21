/**
 * @file test-runner.ts
 * @description Real Test Execution for Cortex Kernel
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */

import { execAsync } from '../utils/exec.js';

export interface TestResult {
	passed: boolean;
	details: {
		compilation: string;
		testsPassed: number;
		testsFailed: number;
		coverage: number;
		duration: number;
		testFramework: string;
		coverageThreshold: number;
		failedTests?: TestFailure[];
	};
}

export interface TestFailure {
	name: string;
	file: string;
	line?: number;
	error: string;
	stack?: string;
}

/**
 * Real test runner that integrates with actual testing frameworks
 */
export class TestRunner {
	async runTests(): Promise<TestResult> {
		const startTime = Date.now();

		try {
			// Detect test environment
			const testEnv = await this.detectTestEnvironment();

			// Check compilation first
			const compilationResult = await this.checkCompilation(testEnv.packageManager);
			if (!compilationResult.success) {
				return this.createCompilationFailureResult(testEnv, startTime);
			}

			// Execute tests and coverage
			const testResult = await this.executeTests(testEnv.framework, testEnv.packageManager);
			const coverageResult = await this.extractCoverage();

			return this.createTestResult(testResult, coverageResult, testEnv, startTime);
		} catch (error) {
			console.warn('Test execution encountered errors:', error);
			return this.createErrorResult(error, startTime);
		}
	}

	private async detectTestEnvironment(): Promise<{ framework: string; packageManager: string }> {
		const framework = await this.detectTestFramework();
		const packageManager = await this.detectPackageManager();
		return { framework, packageManager };
	}

	private createCompilationFailureResult(
		testEnv: { framework: string; packageManager: string },
		startTime: number,
	): TestResult {
		return {
			passed: false,
			details: {
				compilation: 'failed',
				testsPassed: 0,
				testsFailed: 0,
				coverage: 0,
				duration: Date.now() - startTime,
				testFramework: testEnv.framework,
				coverageThreshold: 80,
			},
		};
	}

	private createTestResult(
		testResult: { success: boolean; passed: number; failed: number; failures: TestFailure[] },
		coverageResult: { coverage: number },
		testEnv: { framework: string; packageManager: string },
		startTime: number,
	): TestResult {
		return {
			passed: testResult.success && coverageResult.coverage >= 80,
			details: {
				compilation: 'success',
				testsPassed: testResult.passed,
				testsFailed: testResult.failed,
				coverage: coverageResult.coverage,
				duration: Date.now() - startTime,
				testFramework: testEnv.framework,
				coverageThreshold: 80,
				failedTests: testResult.failures,
			},
		};
	}

	private createErrorResult(error: unknown, startTime: number): TestResult {
		return {
			passed: false,
			details: {
				compilation: 'error',
				testsPassed: 0,
				testsFailed: 1,
				coverage: 0,
				duration: Date.now() - startTime,
				testFramework: 'unknown',
				coverageThreshold: 80,
				failedTests: [
					{
						name: 'test-execution-error',
						file: 'test-runner',
						error: error instanceof Error ? error.message : 'Unknown test error',
					},
				],
			},
		};
	}

	private async detectTestFramework(): Promise<string> {
		try {
			const packageJson = await execAsync('cat package.json');
			const pkg = JSON.parse(packageJson.stdout);

			// Check dependencies and devDependencies
			const deps = { ...pkg.dependencies, ...pkg.devDependencies };

			if (deps.vitest) return 'vitest';
			if (deps.jest) return 'jest';
			if (deps.mocha) return 'mocha';
			if (deps['@playwright/test']) return 'playwright';
			if (deps.cypress) return 'cypress';

			return 'unknown';
		} catch {
			return 'unknown';
		}
	}

	private async detectPackageManager(): Promise<string> {
		try {
			// Check for lock files
			const pmLock = await execAsync(
				'ls package-lock.json yarn.lock pnpm-lock.yaml bun.lockb 2>/dev/null || true',
			);

			if (pmLock.stdout.includes('bun.lockb')) return 'bun';
			if (pmLock.stdout.includes('pnpm-lock.yaml')) return 'pnpm';
			if (pmLock.stdout.includes('yarn.lock')) return 'yarn';
			if (pmLock.stdout.includes('package-lock.json')) return 'npm';

			return 'npm'; // Default fallback
		} catch {
			return 'npm';
		}
	}

	private async checkCompilation(
		packageManager: string,
	): Promise<{ success: boolean; error?: string }> {
		try {
			// Try TypeScript compilation if tsconfig exists
			const tsconfigCheck = await execAsync('ls tsconfig.json 2>/dev/null || true');
			if (tsconfigCheck.stdout.includes('tsconfig.json')) {
				const tscResult = await execAsync('npx tsc --noEmit', { timeout: 60000 });
				if (tscResult.exitCode !== 0) {
					return { success: false, error: tscResult.stderr };
				}
			}

			// Try build command if available
			const packageJson = await execAsync('cat package.json');
			const pkg = JSON.parse(packageJson.stdout);

			if (pkg.scripts?.build) {
				const buildResult = await execAsync(`${packageManager} run build`, { timeout: 120000 });
				if (buildResult.exitCode !== 0) {
					return { success: false, error: buildResult.stderr };
				}
			}

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Compilation check failed',
			};
		}
	}

	private async executeTests(
		framework: string,
		packageManager: string,
	): Promise<{
		success: boolean;
		passed: number;
		failed: number;
		failures: TestFailure[];
	}> {
		let command = '';

		switch (framework) {
			case 'vitest':
				command = `${packageManager} run test -- --reporter=json`;
				break;
			case 'jest':
				command = `${packageManager} run test -- --json`;
				break;
			case 'mocha':
				command = `${packageManager} run test -- --reporter json`;
				break;
			case 'playwright':
				command = `${packageManager} run test -- --reporter=json`;
				break;
			default:
				// Try generic test script
				command = `${packageManager} run test`;
		}

		try {
			const result = await execAsync(command, { timeout: 300000 }); // 5 minutes
			return this.parseTestResults(result, framework);
		} catch (error) {
			return {
				success: false,
				passed: 0,
				failed: 1,
				failures: [
					{
						name: 'test-execution-error',
						file: 'test-runner',
						error: error instanceof Error ? error.message : 'Test execution failed',
					},
				],
			};
		}
	}

	private parseTestResults(
		result: any,
		framework: string,
	): {
		success: boolean;
		passed: number;
		failed: number;
		failures: TestFailure[];
	} {
		try {
			// Try to parse JSON output if available
			if (result.stdout && (result.stdout.includes('{') || result.stdout.includes('['))) {
				const lines = result.stdout.split('\n');
				for (const line of lines) {
					try {
						const parsed = JSON.parse(line);
						if (parsed && typeof parsed === 'object') {
							return this.extractTestStats(parsed, framework);
						}
					} catch {
						// Continue looking for valid JSON
					}
				}
			}

			// Fallback to text parsing
			return this.parseTextOutput(result.stdout + result.stderr);
		} catch {
			// Last resort: basic exit code check
			return {
				success: result.exitCode === 0,
				passed: result.exitCode === 0 ? 1 : 0,
				failed: result.exitCode === 0 ? 0 : 1,
				failures:
					result.exitCode !== 0
						? [
								{
									name: 'test-parse-error',
									file: 'unknown',
									error: 'Could not parse test results',
								},
							]
						: [],
			};
		}
	}

	private extractTestStats(
		parsed: any,
		framework: string,
	): {
		success: boolean;
		passed: number;
		failed: number;
		failures: TestFailure[];
	} {
		switch (framework) {
			case 'jest':
				return {
					success: parsed.success || false,
					passed: parsed.numPassedTests || 0,
					failed: parsed.numFailedTests || 0,
					failures: this.extractJestFailures(parsed),
				};
			case 'vitest':
				return {
					success: parsed.success || false,
					passed:
						parsed.testResults?.reduce(
							(sum: number, file: any) => sum + (file.numPassingTests || 0),
							0,
						) || 0,
					failed:
						parsed.testResults?.reduce(
							(sum: number, file: any) => sum + (file.numFailingTests || 0),
							0,
						) || 0,
					failures: this.extractVitestFailures(parsed),
				};
			default:
				return {
					success: false,
					passed: 0,
					failed: 1,
					failures: [
						{
							name: 'unsupported-framework',
							file: 'test-runner',
							error: `Framework ${framework} not supported for result parsing`,
						},
					],
				};
		}
	}

	private extractJestFailures(parsed: any): TestFailure[] {
		const failures: TestFailure[] = [];

		if (parsed.testResults && Array.isArray(parsed.testResults)) {
			for (const testFile of parsed.testResults) {
				if (testFile.assertionResults && Array.isArray(testFile.assertionResults)) {
					for (const test of testFile.assertionResults) {
						if (test.status === 'failed') {
							failures.push({
								name: test.title || test.fullName || 'unknown test',
								file: testFile.name || 'unknown file',
								error: test.failureMessages?.join('\n') || 'Test failed',
							});
						}
					}
				}
			}
		}

		return failures;
	}

	private extractVitestFailures(parsed: any): TestFailure[] {
		const failures: TestFailure[] = [];

		if (parsed.testResults && Array.isArray(parsed.testResults)) {
			for (const testFile of parsed.testResults) {
				if (testFile.assertionResults && Array.isArray(testFile.assertionResults)) {
					for (const test of testFile.assertionResults) {
						if (test.status === 'failed') {
							failures.push({
								name: test.title || 'unknown test',
								file: testFile.name || 'unknown file',
								error: test.message || 'Test failed',
							});
						}
					}
				}
			}
		}

		return failures;
	}

	private parseTextOutput(output: string): {
		success: boolean;
		passed: number;
		failed: number;
		failures: TestFailure[];
	} {
		// Basic regex patterns for common test output formats
		const passedMatch = output.match(/(\d+)\s+passed/i);
		const failedMatch = output.match(/(\d+)\s+failed/i);

		const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
		const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;

		return {
			success: failed === 0 && passed > 0,
			passed,
			failed,
			failures:
				failed > 0
					? [
							{
								name: 'text-parsed-failure',
								file: 'unknown',
								error: 'Test failures detected in output',
							},
						]
					: [],
		};
	}

	private async extractCoverage(): Promise<{ coverage: number }> {
		try {
			// Try to read coverage from common locations
			const coverageFiles = [
				'coverage/coverage-summary.json',
				'coverage/lcov-report/index.html',
				'coverage/clover.xml',
			];

			for (const file of coverageFiles) {
				try {
					const content = await execAsync(`cat ${file}`);
					if (content.exitCode === 0) {
						const coverage = this.parseCoverageFile(content.stdout, file);
						if (coverage > 0) {
							return { coverage };
						}
					}
				} catch {
					// Continue to next file
				}
			}

			return { coverage: 0 };
		} catch {
			return { coverage: 0 };
		}
	}

	private parseCoverageFile(content: string, filename: string): number {
		try {
			if (filename.includes('coverage-summary.json')) {
				const summary = JSON.parse(content);
				const total = summary.total;
				if (total && total.lines && total.lines.pct !== undefined) {
					return total.lines.pct;
				}
			}

			if (filename.includes('index.html')) {
				// Parse HTML coverage report
				const match = content.match(/<span class="strong">(\d+\.?\d*)%<\/span>/);
				if (match) {
					return parseFloat(match[1]);
				}
			}

			if (filename.includes('clover.xml')) {
				// Parse Clover XML format
				const match = content.match(/statements="(\d+)" coveredstatements="(\d+)"/);
				if (match) {
					const total = parseInt(match[1], 10);
					const covered = parseInt(match[2], 10);
					return Math.round((covered / total) * 100);
				}
			}

			return 0;
		} catch {
			return 0;
		}
	}
}
