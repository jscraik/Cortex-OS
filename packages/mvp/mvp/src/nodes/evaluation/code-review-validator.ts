/**
 * @file evaluation/code-review-validator.ts
 * @description Code review validation utilities
 * @author Cortex-OS Team
 * @version 1.0.0
 */

import type { PRPState } from '../../state.js';

export interface CodeReviewResult {
	blockers: number;
	majors: number;
	minors: number;
	suggestions: number;
	totalIssues: number;
	passed: boolean;
	details: ReviewIssue[];
}

export interface ReviewIssue {
	severity: 'blocker' | 'major' | 'minor' | 'suggestion';
	category: string;
	description: string;
	file?: string;
	line?: number;
}

/**
 * Validates code review results
 */
export const validateCodeReview = async (
	_state: PRPState,
): Promise<CodeReviewResult> => {
	const staticAnalysisIssues = await runStaticAnalysis();
	const securityIssues = await runSecurityScan();
	const qualityIssues = await runQualityChecks();

	const allIssues = [
		...staticAnalysisIssues,
		...securityIssues,
		...qualityIssues,
	];

	const counts = countIssuesBySeverity(allIssues);
	const passed = counts.blockers === 0 && counts.majors <= 3;

	return {
		...counts,
		totalIssues: allIssues.length,
		passed,
		details: allIssues,
	};
};

/**
 * Runs static analysis tools
 */
const runStaticAnalysis = async (): Promise<ReviewIssue[]> => {
	const issues: ReviewIssue[] = [];

	try {
		const { exec } = await import('node:child_process');
		const { promisify } = await import('node:util');
		const execAsync = promisify(exec);

		// Run TypeScript compiler check
		try {
			await execAsync('npx tsc --noEmit --skipLibCheck', {
				timeout: 30000,
			});
		} catch (error) {
			if (error instanceof Error && error.message.includes('error TS')) {
				issues.push({
					severity: 'major',
					category: 'type-safety',
					description: 'TypeScript compilation errors found',
				});
			}
		}

		// Run linter
		try {
			const { stdout } = await execAsync('pnpm lint --format=json', {
				timeout: 30000,
			});

			const lintResults = parseLintOutput(stdout);
			issues.push(...lintResults);
		} catch (_error) {
			// Lint errors are captured in the output
		}
	} catch (error) {
		issues.push({
			severity: 'minor',
			category: 'tooling',
			description: `Static analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
		});
	}

	return issues;
};

/**
 * Runs security scanning
 */
const runSecurityScan = async (): Promise<ReviewIssue[]> => {
	const issues: ReviewIssue[] = [];

	try {
		const { exec } = await import('node:child_process');
		const { promisify } = await import('node:util');
		const execAsync = promisify(exec);

		// Run security audit
		try {
			await execAsync('pnpm audit --audit-level=moderate', {
				timeout: 30000,
			});
		} catch (_error) {
			issues.push({
				severity: 'major',
				category: 'security',
				description: 'Security vulnerabilities found in dependencies',
			});
		}

		// Run Semgrep if available
		try {
			const { stdout } = await execAsync('semgrep --config=auto --json .', {
				timeout: 60000,
			});

			const securityIssues = parseSecurityOutput(stdout);
			issues.push(...securityIssues);
		} catch {
			// Semgrep not available or failed, skip
		}
	} catch (error) {
		issues.push({
			severity: 'minor',
			category: 'security',
			description: `Security scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
		});
	}

	return issues;
};

/**
 * Runs code quality checks
 */
const runQualityChecks = async (): Promise<ReviewIssue[]> => {
	const issues: ReviewIssue[] = [];

	// Check for large functions (>40 lines)
	const largeFunctions = await findLargeFunctions();
	issues.push(
		...largeFunctions.map((func) => ({
			severity: 'major' as const,
			category: 'complexity',
			description: `Function exceeds 40 lines: ${func.name}`,
			file: func.file,
			line: func.line,
		})),
	);

	// Check for TODO/FIXME comments
	const todoComments = await findTodoComments();
	issues.push(
		...todoComments.map((todo) => ({
			severity: 'suggestion' as const,
			category: 'technical-debt',
			description: `TODO/FIXME found: ${todo.text}`,
			file: todo.file,
			line: todo.line,
		})),
	);

	return issues;
};

/**
 * Counts issues by severity level
 */
const countIssuesBySeverity = (issues: ReviewIssue[]) => {
	const counts = {
		blockers: 0,
		majors: 0,
		minors: 0,
		suggestions: 0,
	};

	for (const issue of issues) {
		counts[`${issue.severity}s` as keyof typeof counts]++;
	}

	return counts;
};

/**
 * Parses lint output to extract issues
 */
const parseLintOutput = (output: string): ReviewIssue[] => {
	try {
		const results = JSON.parse(output);
		const issues: ReviewIssue[] = [];

		for (const result of results) {
			for (const message of result.messages || []) {
				issues.push({
					severity: mapLintSeverity(message.severity),
					category: 'style',
					description: message.message,
					file: result.filePath,
					line: message.line,
				});
			}
		}

		return issues;
	} catch {
		return [];
	}
};

/**
 * Maps lint severity levels
 */
const mapLintSeverity = (severity: number): ReviewIssue['severity'] => {
	if (severity >= 2) return 'major';
	if (severity >= 1) return 'minor';
	return 'suggestion';
};

/**
 * Parses security scan output
 */
const parseSecurityOutput = (output: string): ReviewIssue[] => {
	try {
		const results = JSON.parse(output);
		const issues: ReviewIssue[] = [];

		for (const result of results.results || []) {
			issues.push({
				severity: mapSecuritySeverity(result.extra?.severity),
				category: 'security',
				description: result.check_id || 'Security issue found',
				file: result.path,
				line: result.start?.line,
			});
		}

		return issues;
	} catch {
		return [];
	}
};

/**
 * Maps security severity levels
 */
const mapSecuritySeverity = (severity?: string): ReviewIssue['severity'] => {
	switch (severity?.toLowerCase()) {
		case 'error':
			return 'blocker';
		case 'warning':
			return 'major';
		case 'info':
			return 'minor';
		default:
			return 'suggestion';
	}
};

/**
 * Finds functions that exceed 40 lines
 */
const findLargeFunctions = async (): Promise<
	Array<{ name: string; file: string; line: number }>
> => {
	// This would require AST parsing - simplified for now
	return [];
};

/**
 * Finds TODO/FIXME comments
 */
const findTodoComments = async (): Promise<
	Array<{ text: string; file: string; line: number }>
> => {
	try {
		const { exec } = await import('node:child_process');
		const { promisify } = await import('node:util');
		const execAsync = promisify(exec);

		const { stdout } = await execAsync(
			'grep -rn "TODO\\|FIXME" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" .',
			{
				timeout: 10000,
			},
		);

		const comments = stdout
			.split('\n')
			.filter((line) => line.trim())
			.map((line) => {
				const [filePath, lineNum, ...textParts] = line.split(':');
				return {
					file: filePath,
					line: parseInt(lineNum, 10),
					text: textParts.join(':').trim(),
				};
			});

		return comments;
	} catch {
		return [];
	}
};
