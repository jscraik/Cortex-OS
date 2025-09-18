import type { TestResult } from '../types/TDDTypes.js';
import type { TestRunConfiguration } from './BaseTestReporter.js';
import { BaseTestReporter } from './BaseTestReporter.js';

export class MockTestReporter extends BaseTestReporter {
	name = 'mock';
	language = 'mock';
	private mockResults: Map<string, TestResult[]> = new Map();
	private watchCallback?: (results: Map<string, TestResult[]>) => void;

	constructor(config: TestRunConfiguration) {
		super(config);
		this.setupMockData();
	}

	detectsTestFiles(_filePath: string): boolean {
		return true; // Mock reporter accepts all files
	}

	async runTests(_filePaths?: string[]): Promise<TestResult[]> {
		// Simulate test execution delay
		await this.delay(100);

		const allResults: TestResult[] = [];
		for (const [, results] of this.mockResults) {
			allResults.push(...results);
		}
		return allResults;
	}

	async runTestsForFile(filePath: string): Promise<TestResult[]> {
		// Simulate test execution delay
		await this.delay(100);

		return this.mockResults.get(filePath) || [];
	}

	async runAllTests(): Promise<Map<string, TestResult[]>> {
		// Simulate test execution delay
		await this.delay(200);

		return new Map(this.mockResults);
	}

	async startWatching(callback: (results: Map<string, TestResult[]>) => void): Promise<void> {
		this.watchCallback = callback;
		// Simulate initial watch callback
		setTimeout(() => {
			if (this.watchCallback) {
				this.watchCallback(new Map(this.mockResults));
			}
		}, 50);
	}

	async stopWatching(): Promise<void> {
		this.watchCallback = undefined;
	}

	getReporterInfo(): Array<{
		name: string;
		language: string;
		available: boolean;
	}> {
		return [
			{ name: 'mock-vitest', language: 'typescript', available: true },
			{ name: 'mock-pytest', language: 'python', available: true },
			{ name: 'mock-rust-test', language: 'rust', available: true },
		];
	}

	// Mock data setup
	private setupMockData(): void {
		this.mockResults.set('src/example.test.ts', [
			{
				id: 'example-test-1',
				name: 'example test 1',
				status: 'pass',
				duration: 10,
				file: 'src/example.test.ts',
				line: 5,
			},
			{
				id: 'example-test-2',
				name: 'example test 2',
				status: 'fail',
				duration: 15,
				file: 'src/example.test.ts',
				line: 10,
				error: 'Expected true but got false',
				stack: 'at example.test.ts:10:5',
			},
		]);

		this.mockResults.set('src/implementation.test.ts', [
			{
				id: 'implementation-test',
				name: 'implementation test',
				status: 'pass',
				duration: 8,
				file: 'src/implementation.test.ts',
				line: 3,
			},
		]);
	}

	// Add mock test results for testing
	addMockTestResult(filePath: string, result: TestResult): void {
		if (!this.mockResults.has(filePath)) {
			this.mockResults.set(filePath, []);
		}
		const results = this.mockResults.get(filePath);
		if (results) {
			results.push(result);
		}
	}

	// Clear mock results
	clearMockResults(): void {
		this.mockResults.clear();
	}

	// Trigger watch callback manually for testing
	triggerWatchCallback(): void {
		if (this.watchCallback) {
			this.watchCallback(new Map(this.mockResults));
		}
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
