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
	analysisType: z.enum(['quality', 'security', 'performance', 'style', 'speed']).default('quality'),
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
		speedScore: z.number().optional(),
	}),
	summary: z.string(),
});

export type CodeAnalysisResult = z.infer<typeof CodeAnalysisResultSchema>;

/**
 * Create Code Analysis Agent following single-focus pattern
 */
export const createCodeAnalysisAgent = () => {
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

	const createNestedLoopIssue = (lineIndex: number) => ({
		type: 'nested-loop',
		severity: 'warning' as const,
		message: 'Nested loops detected; consider flattening to avoid O(n²) behavior',
		line: lineIndex + 1,
		suggestion: 'Refactor into smaller reusable routines or pre-compute lookups',
	});

	type BlockingPattern = {
		regex: RegExp;
		message: string;
		severity: 'info' | 'warning' | 'error';
	};

	const updateLoopDepth = (
		trimmedLine: string,
		lineIndex: number,
		loopStack: number[],
		issues: CodeAnalysisResult['issues'],
	): number => {
		let currentDepth = loopStack.length;
		if (/^(for|while)\b/.test(trimmedLine)) {
			loopStack.push(lineIndex);
			currentDepth = loopStack.length;
			if (currentDepth > 1) {
				issues.push(createNestedLoopIssue(lineIndex));
			}
		}

		const closingBraces = trimmedLine.match(/}/g)?.length ?? 0;
		for (let i = 0; i < closingBraces; i++) {
			loopStack.pop();
		}

		return currentDepth;
	};

	const recordBlockingOperations = (
		rawLine: string,
		lineIndex: number,
		patterns: BlockingPattern[],
		issues: CodeAnalysisResult['issues'],
	): number => {
		let matches = 0;
		for (const pattern of patterns) {
			if (!pattern.regex.test(rawLine)) continue;
			matches++;
			issues.push({
				type: 'performance',
				severity: pattern.severity,
				message: pattern.message,
				line: lineIndex + 1,
				suggestion: 'Move heavy work off the hot path or use async alternatives',
			});
		}
		return matches;
	};

	const analyzeQuality = (code: string): CodeAnalysisResult => {
		const issues: CodeAnalysisResult['issues'] = [];
		let complexity = 0;
		const lines = code.split('\n');

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (line.includes('function') || (line.includes('const ') && line.includes('=>'))) {
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

			if (line.includes('if') || line.includes('for') || line.includes('while')) {
				complexity++;
			}
		}

		return {
			issues,
			metrics: { complexity, maintainability: Math.max(0, 10 - complexity) },
			summary: `Found ${issues.length} issues with complexity score ${complexity}`,
		};
	};

	const analyzeSecurity = (code: string): CodeAnalysisResult => {
		const issues: CodeAnalysisResult['issues'] = [];
		const lines = code.split('\n');

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].toLowerCase();
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

	const analyzeSpeed = (code: string): CodeAnalysisResult => {
		const issues: CodeAnalysisResult['issues'] = [];
		const lines = code.split('\n');
		let maxLoopDepth = 0;
		let blockingOperations = 0;
		const loopStack: number[] = [];
		const patterns: BlockingPattern[] = [
			{
				regex: /\bfs\.[a-z]+Sync\b/i,
				message: 'Synchronous file system call blocks the event loop',
				severity: 'error',
			},
			{
				regex: /\bJSON\.parse\s*\(/,
				message: 'Heavy JSON parsing detected; cache parsed results when possible',
				severity: 'warning',
			},
			{
				regex: /\bsetTimeout\s*\(\s*0\s*,/,
				message: 'Zero-delay timers in loops can starve the event loop',
				severity: 'warning',
			},
		];

		for (let i = 0; i < lines.length; i++) {
			const rawLine = lines[i];
			const trimmed = rawLine.trim();
			maxLoopDepth = Math.max(maxLoopDepth, updateLoopDepth(trimmed, i, loopStack, issues));
			blockingOperations += recordBlockingOperations(rawLine, i, patterns, issues);
		}

		const depthPenalty = Math.max(0, maxLoopDepth - 1) * 3;
		const speedScore = Math.max(0, 10 - (blockingOperations * 2 + depthPenalty));

		return {
			issues,
			metrics: { speedScore },
			summary: `Speed analysis found ${issues.length} performance pitfalls with score ${speedScore}`,
		};
	};

	return {
		name: 'code-analysis-agent',
		capabilities: ['code-analysis', 'quality-review', 'security-scan', 'speed-scan'],

		async analyze(request: CodeAnalysisRequest): Promise<CodeAnalysisResult> {
			const validated = CodeAnalysisRequestSchema.parse(request);
			if (validated.analysisType === 'security') {
				return analyzeSecurity(validated.code);
			}
			if (validated.analysisType === 'speed') {
				return analyzeSpeed(validated.code);
			}
			return analyzeQuality(validated.code);
		},

		async executeMCPTool(toolName: string, parameters: unknown): Promise<unknown> {
			if (toolName === 'analyze_code') {
				return this.analyze(parameters as CodeAnalysisRequest);
			}
			throw new Error(`Unknown tool: ${toolName}`);
		},
	};
};
