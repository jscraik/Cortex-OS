/**
 * Code Analysis Agent - Single-Focus Agent for Code Review and Analysis
 *
 * Specialized agent following Cortex-OS single-focus architecture
 * with MCP integration for tool execution and A2A for coordination.
 */

import { z } from 'zod';

// Code analysis request schema
export const CodeAnalysisRequestSchema = z.object({
	code: z.string().min(1),
	language: z.string().optional(),
	analysisType: z
		.enum(['quality', 'security', 'performance', 'style'])
		.default('quality'),
	strictness: z.enum(['low', 'medium', 'high']).default('medium'),
});

export type CodeAnalysisRequest = z.infer<typeof CodeAnalysisRequestSchema>;

// Analysis result schema
export const CodeAnalysisResultSchema = z.object({
	issues: z.array(
		z.object({
			type: z.string(),
			severity: z.enum(['info', 'warning', 'error']),
			message: z.string(),
			line: z.number().optional(),
			column: z.number().optional(),
			suggestion: z.string().optional(),
		}),
	),
	metrics: z.object({
		complexity: z.number().optional(),
		maintainability: z.number().optional(),
		testCoverage: z.number().optional(),
	}),
	summary: z.string(),
});

export type CodeAnalysisResult = z.infer<typeof CodeAnalysisResultSchema>;

/**
 * Create Code Analysis Agent following single-focus pattern
 */
export const createCodeAnalysisAgent = () => {
	/**
	 * Analyze code quality (≤40 lines)
	 */
	const analyzeQuality = (code: string): CodeAnalysisResult => {
		const issues: CodeAnalysisResult['issues'] = [];
		let complexity = 0;

		// Basic quality checks
		const lines = code.split('\n');
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Function length check
			if (
				line.includes('function') ||
				(line.includes('const ') && line.includes('=>'))
			) {
				const functionLines = countFunctionLines(lines, i);
				if (functionLines > 40) {
					issues.push({
						type: 'function-length',
						severity: 'warning',
						message: `Function exceeds 40 lines (${functionLines} lines)`,
						line: i + 1,
						suggestion: 'Break down into smaller functions',
					});
				}
			}

			// Complexity indicators
			if (
				line.includes('if') ||
				line.includes('for') ||
				line.includes('while')
			) {
				complexity++;
			}
		}

		return {
			issues,
			metrics: { complexity, maintainability: Math.max(0, 10 - complexity) },
			summary: `Found ${issues.length} issues with complexity score ${complexity}`,
		};
	};

	/**
	 * Analyze security issues (≤40 lines)
	 */
	const analyzeSecurity = (code: string): CodeAnalysisResult => {
		const issues: CodeAnalysisResult['issues'] = [];
		const lines = code.split('\n');

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].toLowerCase();

			// Basic security patterns
			if (line.includes('eval(') || line.includes('innerhtml')) {
				issues.push({
					type: 'security',
					severity: 'error',
					message: 'Potential XSS vulnerability',
					line: i + 1,
					suggestion: 'Use safe alternatives',
				});
			}

			if (line.includes('password') && line.includes('=')) {
				issues.push({
					type: 'security',
					severity: 'warning',
					message: 'Hardcoded credentials detected',
					line: i + 1,
					suggestion: 'Use environment variables',
				});
			}
		}

		return {
			issues,
			metrics: {},
			summary: `Security scan found ${issues.length} potential issues`,
		};
	};

	/**
	 * Helper: Count function lines (≤40 lines)
	 */
	const countFunctionLines = (lines: string[], startIndex: number): number => {
		let braceCount = 0;
		let lineCount = 0;
		let inFunction = false;

		for (let i = startIndex; i < lines.length; i++) {
			const line = lines[i];
			lineCount++;

			for (const char of line) {
				if (char === '{') {
					braceCount++;
					inFunction = true;
				} else if (char === '}') {
					braceCount--;
					if (inFunction && braceCount === 0) {
						return lineCount;
					}
				}
			}

			if (lineCount > 200) break; // Safety limit
		}

		return lineCount;
	};

	return {
		name: 'code-analysis-agent',
		capabilities: ['code-analysis', 'quality-review', 'security-scan'],

		/**
		 * Main analysis method
		 */
		async analyze(request: CodeAnalysisRequest): Promise<CodeAnalysisResult> {
			const validated = CodeAnalysisRequestSchema.parse(request);

			switch (validated.analysisType) {
				case 'security':
					return analyzeSecurity(validated.code);
				default:
					return analyzeQuality(validated.code);
			}
		},

		/**
		 * MCP tool integration point
		 */
		async executeMCPTool(
			toolName: string,
			parameters: unknown,
		): Promise<unknown> {
			if (toolName === 'analyze_code') {
				return this.analyze(parameters as CodeAnalysisRequest);
			}
			throw new Error(`Unknown tool: ${toolName}`);
		},
	};
};

export type CodeAnalysisAgent = ReturnType<typeof createCodeAnalysisAgent>;
