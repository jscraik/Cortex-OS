/**
 * @file evaluation/tdd-validator.ts
 * @description TDD cycle validation utilities
 * @author Cortex-OS Team
 * @version 1.0.0
 */

import type { PRPState } from '../../state.js';

export interface TDDValidationResult {
	passed: boolean;
	testFiles: string[];
	testCount: number;
	coverage: number;
	failed: boolean;
	hasRedGreenEvidence: boolean;
	details: string[];
}

interface TestRunResult {
	success: boolean;
	coverage?: number;
	output: string;
}

/**
 * Validates TDD cycle completion (Red → Green)
 */
export const validateTDDCycle = async (
	state: PRPState,
): Promise<TDDValidationResult> => {
	const testFiles = await findTestFiles();
	const testRunResult = await runTestsWithCoverage();
	const redGreenEvidence = await checkRedGreenEvidence(state);

	return {
		passed: testFiles.length > 0 && testRunResult.success && redGreenEvidence,
		testFiles,
		testCount: testFiles.length,
		coverage: testRunResult.coverage || 0,
		failed: !testRunResult.success,
		hasRedGreenEvidence: redGreenEvidence,
		details: buildValidationDetails(testFiles, testRunResult, redGreenEvidence),
	};
};

/**
 * Finds test files using glob patterns
 */
const findTestFiles = async (): Promise<string[]> => {
	try {
		const glob = await import('glob');
		const testPatterns = [
			'**/*.test.{js,ts,jsx,tsx}',
			'**/*.spec.{js,ts,jsx,tsx}',
			'**/__tests__/**/*.{js,ts,jsx,tsx}',
			'tests/**/*.{js,ts,jsx,tsx}',
			'test/**/*.{js,ts,jsx,tsx}',
			'**/test_*.py',
			'**/*_test.py',
		];

		const allFiles: string[] = [];
		for (const pattern of testPatterns) {
			const files = await glob.glob(pattern, {
				cwd: process.cwd(),
				ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
			});
			allFiles.push(...files);
		}

		return [...new Set(allFiles)]; // Remove duplicates
	} catch {
		return [];
	}
};

/**
 * Runs tests and collects coverage information
 */
const runTestsWithCoverage = async (): Promise<TestRunResult> => {
	const { exec } = await import('node:child_process');
	const { promisify } = await import('node:util');
	const execAsync = promisify(exec);
	const fs = await import('node:fs');
	const path = await import('node:path');

	const projectRoot = process.cwd();
	const packageJsonPath = path.join(projectRoot, 'package.json');

	if (!fs.existsSync(packageJsonPath)) {
		return { success: false, output: 'No package.json found' };
	}

	try {
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
		const testScript =
			packageJson.scripts?.test || packageJson.scripts?.['test:coverage'];

		if (!testScript) {
			return { success: false, output: 'No test script found in package.json' };
		}

		const { stdout, stderr } = await execAsync(
			`pnpm run ${testScript.includes('coverage') ? 'test:coverage' : 'test'}`,
			{
				cwd: projectRoot,
				timeout: 60000,
			},
		);

		const coverage = extractCoverageFromOutput(stdout);
		return {
			success: !stderr.includes('FAILED') && !stderr.includes('ERROR'),
			coverage,
			output: stdout,
		};
	} catch (error) {
		return {
			success: false,
			output:
				error instanceof Error ? error.message : 'Unknown test execution error',
		};
	}
};

/**
 * Extracts coverage percentage from test output
 */
const extractCoverageFromOutput = (output: string): number => {
	const coverageRegex = /coverage[:\s]+(\d+(?:\.\d+)?)%/i;
	const match = output.match(coverageRegex);
	return match ? parseFloat(match[1]) : 0;
};

/**
 * Checks for Red → Green evidence in git history
 */
const checkRedGreenEvidence = async (state: PRPState): Promise<boolean> => {
	try {
		const { exec } = await import('node:child_process');
		const { promisify } = await import('node:util');
		const execAsync = promisify(exec);

		const { stdout } = await execAsync('git log --oneline -10 --grep="test"', {
			timeout: 10000,
		});

		// Look for evidence of test-first development
		const testCommits = stdout
			.split('\n')
			.filter(
				(line) =>
					line.toLowerCase().includes('test') ||
					line.toLowerCase().includes('red') ||
					line.toLowerCase().includes('green'),
			);

		return testCommits.length >= 2; // Need at least red and green commits
	} catch {
		// If git is not available or fails, check state for test evidence
		return state.evidence.some(
			(e) =>
				e.type === 'test' &&
				(e.content.includes('red') || e.content.includes('green')),
		);
	}
};

/**
 * Builds detailed validation information
 */
const buildValidationDetails = (
	testFiles: string[],
	testResult: TestRunResult,
	redGreenEvidence: boolean,
): string[] => {
	const details: string[] = [];

	details.push(`Found ${testFiles.length} test files`);

	if (testResult.success) {
		details.push('All tests are passing');
	} else {
		details.push('Some tests are failing');
	}

	if (testResult.coverage !== undefined) {
		details.push(`Code coverage: ${testResult.coverage}%`);
	}

	if (redGreenEvidence) {
		details.push('Red → Green evidence found in git history');
	} else {
		details.push('No clear Red → Green evidence found');
	}

	return details;
};
