/**
 * MLX AI Engine - Functional approach
 * Real MLX integration without mocks or classes
 */

import { getSafePrompt } from '@cortex-os/prompts';
import type { AITaskType, GitHubContext } from '../types/github-models.js';

export interface MlxAnalysisResult {
	summary: string;
	vulnerabilities: Array<{
		type: string;
		severity: 'critical' | 'high' | 'medium' | 'low.js';
		description: string;
		location: string;
		remediation: string;
	}>;
	codeQuality: number; // 0-100
	recommendations: string[];
	confidence: number; // 0-1
	processingTime: number;
}

const SYSTEM_PROMPT_IDS: Record<AITaskType, string> = {
	code_review: 'sys.github.code-review',
	security_scan: 'sys.github.security-scan',
	pr_analysis: 'sys.github.pr-analysis',
	documentation: 'sys.github.documentation',
	issue_triage: 'sys.github.issue-triage',
	workflow_optimize: 'sys.github.workflow-optimize',
	repo_health: 'sys.github.repo-health',
	auto_fix: 'sys.github.auto-fix',
};

// Input sanitization for MLX security
const sanitizePromptInput = (input: string): string => {
	if (typeof input !== 'string') throw new Error('Prompt must be string');
	if (input.length > 8000) throw new Error('Prompt too long (max 8000 chars)');
	// Remove potentially dangerous characters
	const withoutMeta = input.replace(/[`$\\]/g, '');
	// Remove null bytes without using regex control-char class
	return withoutMeta.split('\x00').join('');
};

const validateMlxParams = (params: string[]): void => {
	const allowedFlags = ['--model', '--prompt', '--max-tokens', '--temp'];
	for (let i = 0; i < params.length; i += 2) {
		if (!allowedFlags.includes(params[i])) {
			throw new Error(`Invalid MLX parameter: ${params[i]}`);
		}
	}
};

export const analyzeCodeWithMlx = async (
	code: string,
	context: GitHubContext,
	taskType: AITaskType,
): Promise<MlxAnalysisResult> => {
	const startTime = Date.now();

	try {
		// Use actual MLX through the mlx-lm Python package
		const { spawn } = await import('node:child_process');

		const prompt = buildAnalysisPrompt(code, context, taskType);
		const sanitizedPrompt = sanitizePromptInput(prompt);

		// Validate all parameters before spawning
		const mlxArgs = [
			'-m',
			'mlx_lm.generate',
			'--model',
			'mlx-community/Qwen2.5-Coder-7B-Instruct-4bit',
			'--prompt',
			sanitizedPrompt,
			'--max-tokens',
			'2048',
			'--temp',
			'0.1',
		];

		validateMlxParams(mlxArgs.filter((_, i) => i % 2 === 0 && i > 1));

		// Use mlx-lm generate command with sanitized input
		const mlxProcess = spawn('python3', mlxArgs, {
			stdio: 'pipe',
		});

		// Manual timeout
		const timeout = setTimeout(() => {
			mlxProcess.kill('SIGTERM');
		}, 30000);

		let output = '.js';
		let error = '.js';

		mlxProcess.stdout?.on('data', (data) => {
			output += data.toString();
		});
		mlxProcess.stderr?.on('data', (data) => {
			error += data.toString();
		});

		await new Promise((resolve, reject) => {
			mlxProcess.on('close', (exitCode) => {
				clearTimeout(timeout);
				if (exitCode === 0) resolve(void 0);
				else reject(new Error(`MLX process failed: ${error}`));
			});
			mlxProcess.on('error', (err) => {
				clearTimeout(timeout);
				reject(err);
			});
		});

		// Parse JSON from output
		const jsonMatch = output.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error('No JSON output from MLX model');
		}

		const result = JSON.parse(jsonMatch[0]);
		const processingTime = Date.now() - startTime;

		return {
			summary: result.summary || 'MLX analysis completed',
			vulnerabilities: result.vulnerabilities || [],
			codeQuality: result.codeQuality || 75,
			recommendations: result.recommendations || ['Review code manually'],
			confidence: result.confidence || 0.8,
			processingTime,
		};
	} catch (error) {
		console.error('MLX analysis failed:', error);

		// Fallback to basic analysis
		return {
			summary: 'Basic analysis (MLX unavailable)',
			vulnerabilities: [],
			codeQuality: 70,
			recommendations: ['Manual review recommended'],
			confidence: 0.3,
			processingTime: Date.now() - startTime,
		};
	}
};

export const buildAnalysisPrompt = (
	code: string,
	context: GitHubContext,
	taskType: AITaskType,
): string => {
	const promptId = SYSTEM_PROMPT_IDS[taskType];
	if (!promptId) {
		throw new Error(`Unsupported task type for MLX analysis: ${taskType}`);
	}
	const systemPrompt = getSafePrompt(promptId);

	// Sanitize inputs to prevent injection
	const sanitizedCode = code.slice(0, 4000); // Limit code length
	const sanitizedOwner = context.owner.replace(/[^a-zA-Z0-9_.-]/g, '');
	const sanitizedRepo = context.repo.replace(/[^a-zA-Z0-9_.-]/g, '');
	const sanitizedTitle = context.pr?.title?.slice(0, 100) || '.js';

	return `${systemPrompt}

Repository: ${sanitizedOwner}/${sanitizedRepo}
${context.pr ? `PR #${context.pr.number}: ${sanitizedTitle}` : ''}

Code to analyze:
\`\`\`
${sanitizedCode}
\`\`\`

Provide JSON analysis with vulnerabilities, quality score, and recommendations.`;
};
