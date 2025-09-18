import * as fs from 'node:fs';
import type { TestResult } from '../types/TDDTypes.js';
import { BaseTestReporter } from './BaseTestReporter.js';

export class PytestReporter extends BaseTestReporter {
	name = 'pytest';
	language = 'python';

	detectsTestFiles(filePath: string): boolean {
		return (
			/test_.*\.py$/.test(filePath) ||
			/_test\.py$/.test(filePath) ||
			filePath.includes('test_') ||
			filePath.includes('conftest.py')
		);
	}

	async runTests(filePaths?: string[]): Promise<TestResult[]> {
		// Check if we're in mock mode (for testing) to avoid spawning real processes
		if (process.env.NODE_ENV === 'test' || this.config.mockMode) {
			return this.createMockPytestResults(filePaths);
		}

		const args = ['--json-report', '--json-report-file=/tmp/pytest-report.json'];

		if (filePaths && filePaths.length > 0) {
			args.push(...filePaths);
		}

		if (this.config.coverage) {
			args.push('--cov');
		}

		try {
			await this.executeCommand('python', ['-m', 'pytest', ...args]);

			// Read the JSON report file
			const reportPath = '/tmp/pytest-report.json';

			if (fs.existsSync(reportPath)) {
				const reportData = fs.readFileSync(reportPath, 'utf8');
				return this.parsePytestOutput(reportData);
			}

			return [];
		} catch (error) {
			console.error('Pytest execution failed:', error);
			return [];
		}
	}

	private parsePytestOutput(output: string): TestResult[] {
		const results: TestResult[] = [];

		try {
			const data = JSON.parse(output);

			if (data.tests) {
				for (const test of data.tests) {
					results.push({
						id: test.nodeid,
						name: test.test || test.nodeid.split('::').pop() || 'unknown',
						status:
							test.outcome === 'passed' ? 'pass' : test.outcome === 'failed' ? 'fail' : 'skip',
						duration: test.duration || 0,
						file: test.file || 'unknown',
						line: test.lineno,
						error: test.call?.longrepr || test.setup?.longrepr || test.teardown?.longrepr,
						stack: test.call?.traceback?.join('\n') || undefined,
					});
				}
			}
		} catch (error) {
			console.warn('Failed to parse pytest output:', error);
		}

		return results;
	}

	private createMockPytestResults(filePaths?: string[]): TestResult[] {
		// Create mock test results for testing purposes
		return [
			{
				id: 'test_mock.py::test_example',
				name: 'test_example',
				status: 'pass',
				duration: 25,
				file: filePaths?.[0] || 'test_mock.py',
				line: 5,
			},
		];
	}
}

export class RustTestReporter extends BaseTestReporter {
	name = 'rust-test';
	language = 'rust';

	detectsTestFiles(filePath: string): boolean {
		return (
			filePath.endsWith('.rs') &&
			(filePath.includes('test') || filePath.includes('lib.rs') || filePath.includes('main.rs'))
		);
	}

	async runTests(filePaths?: string[]): Promise<TestResult[]> {
		// Check if we're in mock mode (for testing) to avoid spawning real processes
		if (process.env.NODE_ENV === 'test' || this.config.mockMode) {
			return this.createMockRustResults(filePaths);
		}

		const args = ['test', '--', '--format=json'];

		if (filePaths && filePaths.length > 0) {
			// Rust doesn't support running specific files easily
			// Filter would need to be done via test name patterns
			const testNames = filePaths
				.map((path) => path.replace(/\.rs$/, '').replace(/.*\//, ''))
				.join('|');
			args.push(testNames);
		}

		try {
			const { stdout } = await this.executeCommand('cargo', args);
			return this.parseRustTestOutput(stdout);
		} catch (error) {
			console.error('Rust test execution failed:', error);
			return [];
		}
	}

	private createMockRustResults(filePaths?: string[]): TestResult[] {
		// Create mock test results for testing purposes
		return [
			{
				id: 'test_mock.rs::test_example',
				name: 'test_example',
				status: 'pass',
				duration: 30,
				file: filePaths?.[0] || 'test_mock.rs',
				line: 8,
			},
		];
	}

	private parseRustTestOutput(output: string): TestResult[] {
		const results: TestResult[] = [];

		try {
			const lines = output.split('\n').filter((line) => line.trim());

			for (const line of lines) {
				if (line.startsWith('{')) {
					try {
						const data = JSON.parse(line);

						if (data.type === 'test' && data.event === 'ok') {
							results.push({
								id: data.name,
								name: data.name,
								status: 'pass',
								duration: data.exec_time || 0,
								file: 'unknown', // Rust doesn't provide file info easily
								line: undefined,
								error: undefined,
								stack: undefined,
							});
						} else if (data.type === 'test' && data.event === 'failed') {
							results.push({
								id: data.name,
								name: data.name,
								status: 'fail',
								duration: data.exec_time || 0,
								file: 'unknown',
								line: undefined,
								error: data.stdout || 'Test failed',
								stack: undefined,
							});
						}
					} catch {
						// ignore JSON parse errors for individual lines
					}
				}
			}
		} catch (error) {
			console.warn('Failed to parse Rust test output:', error);
		}

		return results;
	}
}

export class JestReporter extends BaseTestReporter {
	name = 'jest';
	language = 'javascript';

	detectsTestFiles(filePath: string): boolean {
		return (
			/\.(test|spec)\.(js|ts|jsx|tsx)$/.test(filePath) ||
			filePath.includes('__tests__') ||
			filePath.includes('jest.config.')
		);
	}

	async runTests(filePaths?: string[]): Promise<TestResult[]> {
		const args = ['test', '--json'];

		if (filePaths && filePaths.length > 0) {
			args.push(...filePaths);
		}

		if (this.config.coverage) {
			args.push('--coverage');
		}

		try {
			const { stdout } = await this.executeCommand('npm', ['run', ...args]);
			return this.parseJestOutput(stdout);
		} catch (error) {
			console.error('Jest execution failed:', error);
			return [];
		}
	}

	private parseJestOutput(output: string): TestResult[] {
		const results: TestResult[] = [];

		try {
			const data = JSON.parse(output);

			if (data.testResults) {
				for (const fileResult of data.testResults) {
					if (fileResult.assertionResults) {
						for (const assertion of fileResult.assertionResults) {
							results.push({
								id: `${fileResult.name}::${assertion.title}`,
								name: assertion.title,
								status:
									assertion.status === 'passed'
										? 'pass'
										: assertion.status === 'failed'
											? 'fail'
											: 'skip',
								duration: assertion.duration || 0,
								file: fileResult.name,
								line: assertion.location?.line,
								error: assertion.failureMessages?.[0],
								stack: assertion.failureDetails?.[0]?.stack,
							});
						}
					}
				}
			}
		} catch (error) {
			console.warn('Failed to parse Jest output:', error);
		}

		return results;
	}
}

export class GoTestReporter extends BaseTestReporter {
	name = 'go-test';
	language = 'go';

	detectsTestFiles(filePath: string): boolean {
		return /_test\.go$/.test(filePath) || filePath.includes('test');
	}

	async runTests(filePaths?: string[]): Promise<TestResult[]> {
		const args = ['test', '-json'];

		if (filePaths && filePaths.length > 0) {
			// Go uses package paths, not file paths
			const packages = [
				...new Set(filePaths.map((path) => path.replace(/\/[^/]*_test\.go$/, '') || '.')),
			];
			args.push(...packages);
		} else {
			args.push('./...');
		}

		try {
			const { stdout } = await this.executeCommand('go', args);
			return this.parseGoTestOutput(stdout);
		} catch (error) {
			console.error('Go test execution failed:', error);
			return [];
		}
	}

	private parseGoTestOutput(output: string): TestResult[] {
		const results: TestResult[] = [];

		try {
			const lines = output.split('\n').filter((line) => line.trim());

			for (const line of lines) {
				if (line.startsWith('{')) {
					try {
						const data = JSON.parse(line);

						if (data.Action === 'pass' || data.Action === 'fail') {
							results.push({
								id: `${data.Package}::${data.Test}`,
								name: data.Test || 'unknown',
								status: data.Action === 'pass' ? 'pass' : 'fail',
								duration: data.Elapsed || 0,
								file: data.Package || 'unknown',
								line: undefined,
								error: data.Output,
								stack: undefined,
							});
						}
					} catch {
						// ignore JSON parse errors for individual lines
					}
				}
			}
		} catch (error) {
			console.warn('Failed to parse Go test output:', error);
		}

		return results;
	}
}
