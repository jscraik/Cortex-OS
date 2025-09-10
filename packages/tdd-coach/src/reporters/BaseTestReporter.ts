import { spawn } from 'child_process';
import type { TestResult } from '../types/TDDTypes.js';

export interface TestReporter {
	name: string;
	language: string;
	detectsTestFiles(filePath: string): boolean;
	runTests(filePaths?: string[]): Promise<TestResult[]>;
	watchTests?(callback: (results: TestResult[]) => void): Promise<void>;
	killWatcher?(): Promise<void>;
}

export interface TestRunConfiguration {
	workspaceRoot: string;
	testPatterns: string[];
	timeout: number;
	coverage: boolean;
	parallel: boolean;
	mockMode?: boolean;
}

// Base class for test reporters
export abstract class BaseTestReporter implements TestReporter {
	abstract name: string;
	abstract language: string;

	constructor(protected config: TestRunConfiguration) {}

	abstract detectsTestFiles(filePath: string): boolean;
	abstract runTests(filePaths?: string[]): Promise<TestResult[]>;

	protected parseTestOutput(output: string): TestResult[] {
		// Override in subclasses for format-specific parsing
		// Base implementation ignores output for extensibility
		void output; // Explicitly mark as intentionally unused
		return [];
	}

	protected executeCommand(
		command: string,
		args: string[],
	): Promise<{ stdout: string; stderr: string }> {
		return new Promise((resolve, reject) => {
			const proc = spawn(command, args, {
				cwd: this.config.workspaceRoot,
				stdio: 'pipe',
			});

			let stdout = '';
			let stderr = '';

			proc.stdout?.on('data', (data: Buffer) => {
				stdout += data.toString();
			});

			proc.stderr?.on('data', (data: Buffer) => {
				stderr += data.toString();
			});

			proc.on('close', (code: number | null) => {
				if (code === 0 || code === 1) {
					// 1 is ok for test failures
					resolve({ stdout, stderr });
				} else {
					reject(new Error(`Command failed with code ${code}: ${stderr}`));
				}
			});

			proc.on('error', reject);
		});
	}
}
