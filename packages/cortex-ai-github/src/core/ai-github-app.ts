/**
 * Core AI GitHub App - Production-ready AI automation for GitHub
 * Integrates with GitHub Models API for intelligent code analysis and automation
 */

import { EventEmitter } from "node:events";
import { z } from "zod";
import type {
	AITaskParams,
	AITaskResult,
	AITaskType,
	GitHubContext,
	GitHubModel,
	GitHubModelsConfig,
	ModelCompletionRequest,
	ModelCompletionResponse,
	ModelMessage,
} from "../types/github-models.js";

interface AiAppEvents {
	"task:queued": [taskId: string, taskType: AITaskType];
	"task:started": [taskId: string, model: GitHubModel];
	"task:completed": [result: AITaskResult];
	"task:failed": [taskId: string, error: Error];
	rate_limit: [remaining: number, resetAt: Date];
}

export class CortexAiGitHubApp extends EventEmitter<AiAppEvents> {
	private config: GitHubModelsConfig;
	private taskQueue = new Map<string, AITaskParams>();
	private activeRequests = new Set<string>();
	private rateLimitInfo = { remaining: 1000, resetAt: new Date() };

	constructor(config: GitHubModelsConfig) {
		super();
		this.config = {
			...config,
			baseUrl: config.baseUrl || "https://models.inference.ai.azure.com",
			maxTokens: config.maxTokens || 4096,
			temperature: config.temperature || 0.3,
		};
	}

	async queueTask(taskParams: AITaskParams): Promise<string> {
		const taskId = this.generateTaskId(taskParams.taskType);

		const validatedParams = this.validateTaskParams(taskParams);
		this.taskQueue.set(taskId, validatedParams);

		this.emit("task:queued", taskId, validatedParams.taskType);

		// Process immediately if within rate limits
		if (this.rateLimitInfo.remaining > 0) {
			setImmediate(() => this.processTask(taskId));
		}

		return taskId;
	}

	private async processTask(taskId: string): Promise<void> {
		const taskParams = this.taskQueue.get(taskId);
		if (!taskParams || this.activeRequests.has(taskId)) {
			return;
		}

		this.activeRequests.add(taskId);
		const startTime = Date.now();

		try {
			this.emit(
				"task:started",
				taskId,
				taskParams.model ?? this.config.defaultModel,
			);

			const messages = this.buildTaskMessages(taskParams);
			const model = taskParams.model ?? this.config.defaultModel;

			const response = await this.callModel(model, messages);

			const result: AITaskResult = {
				taskId,
				taskType: taskParams.taskType,
				status: "success",
				result: this.parseTaskResult(taskParams.taskType, response.content),
				model: model,
				tokensUsed: response.tokensUsed,
				executionTime: Date.now() - startTime,
			};

			this.emit("task:completed", result);
		} catch (error) {
			const failureResult: AITaskResult = {
				taskId,
				taskType: taskParams.taskType,
				status: "error",
				result: {
					summary: "Task failed due to error",
					details: {},
					recommendations: [],
					confidence: 0,
				},
				model: taskParams.model ?? this.config.defaultModel,
				tokensUsed: 0,
				executionTime: Date.now() - startTime,
				error: error instanceof Error ? error.message : String(error),
			};

			this.emit(
				"task:failed",
				taskId,
				error instanceof Error ? error : new Error(String(error)),
			);
			this.emit("task:completed", failureResult);
		} finally {
			this.activeRequests.delete(taskId);
			this.taskQueue.delete(taskId);
		}
	}

	private async callModel(
		model: GitHubModel,
		messages: ModelMessage[],
	): Promise<{
		content: string;
		tokensUsed: number;
		finishReason: string;
	}> {
		const request: ModelCompletionRequest = {
			model,
			messages,
			max_tokens: this.config.maxTokens,
			temperature: this.config.temperature,
		};

		const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.config.token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(request),
		});

		if (!response.ok) {
			// Update rate limit info from headers
			this.updateRateLimitInfo(response.headers);
			throw new Error(
				`GitHub Models API error: ${response.status} ${response.statusText}`,
			);
		}

		this.updateRateLimitInfo(response.headers);

		const completion = (await response.json()) as ModelCompletionResponse;

		return {
			content: completion.choices[0]?.message?.content ?? "",
			tokensUsed: completion.usage.total_tokens,
			finishReason: completion.choices[0]?.finish_reason ?? "unknown",
		};
	}

	private buildTaskMessages(params: AITaskParams): ModelMessage[] {
		const baseMessages: ModelMessage[] = [
			{
				role: "system",
				content: this.getSystemPromptForTask(params.taskType),
			},
		];

		const contextMessage = this.buildContextMessage(
			params.githubContext,
			params.taskType,
		);
		baseMessages.push(contextMessage);

		if (params.instructions) {
			baseMessages.push({
				role: "user",
				content: `Additional instructions: ${params.instructions}`,
			});
		}

		return baseMessages;
	}

	private getSystemPromptForTask(taskType: AITaskType): string {
		const prompts = {
			code_review: `You are an expert code reviewer for the Cortex AI system. Analyze code changes with focus on:
- Security vulnerabilities and OWASP compliance
- Performance implications and optimization opportunities
- Code quality, maintainability, and best practices
- Type safety and error handling
- Testing coverage and testability
Provide specific, actionable feedback with line-by-line recommendations.`,

			pr_analysis: `You are a PR analysis expert for Cortex. Evaluate pull requests holistically:
- Impact assessment and risk analysis
- Breaking changes and compatibility issues
- Documentation requirements and completeness
- Deployment considerations and rollback plans
- Team coordination and review assignments
Provide a structured analysis with priority recommendations.`,

			security_scan: `You are a security analysis expert for Cortex. Perform comprehensive security analysis:
- OWASP Top 10 vulnerability detection
- Dependency security analysis and CVE identification
- Authentication and authorization flaws
- Data protection and privacy compliance
- Infrastructure security and configuration issues
Focus on actionable security recommendations with severity ratings.`,

			documentation: `You are a technical documentation specialist for Cortex. Generate comprehensive documentation:
- API documentation with examples and use cases
- Architecture diagrams and system overviews
- Development guides and best practices
- Troubleshooting guides and FAQ sections
- Migration guides and upgrade instructions
Ensure documentation is accurate, complete, and developer-friendly.`,

			issue_triage: `You are an issue triage specialist for Cortex. Analyze and categorize issues:
- Priority classification based on impact and urgency
- Component identification and ownership assignment
- Reproduction steps and environment requirements
- Related issues and dependency identification
- Effort estimation and milestone assignment
Provide structured triage recommendations with clear rationale.`,

			workflow_optimize: `You are a DevOps workflow optimization expert for Cortex. Analyze and improve CI/CD:
- Build performance optimization and parallelization
- Test strategy improvements and coverage analysis
- Deployment pipeline security and reliability
- Resource utilization and cost optimization
- Developer experience and productivity improvements
Provide specific workflow improvements with measurable outcomes.`,

			repo_health: `You are a repository health analyst for Cortex. Assess overall repository health:
- Code quality metrics and technical debt analysis
- Contribution patterns and team collaboration
- Documentation completeness and maintenance
- Dependency health and update requirements
- Security posture and vulnerability management
Provide actionable health improvement recommendations with priorities.`,

			auto_fix: `You are an automated code fix specialist for Cortex. Generate safe, targeted fixes:
- Syntax error corrections and type fixes
- Security vulnerability patches and mitigations
- Performance optimization implementations
- Code style and linting corrections
- Test fixes and coverage improvements
Only suggest fixes you're confident are safe and correct.`,
		};

		return prompts[taskType] || prompts.code_review;
	}

	private buildContextMessage(
		context: GitHubContext,
		taskType: AITaskType,
	): ModelMessage {
		let content = `Repository: ${context.owner}/${context.repo}\n\n`;

		if (
			context.pr &&
			["code_review", "pr_analysis", "security_scan"].includes(taskType)
		) {
			content += `Pull Request #${context.pr.number}: ${context.pr.title}\n`;
			content += `Description: ${context.pr.body}\n`;
			content += `Base: ${context.pr.base} <- Head: ${context.pr.head}\n\n`;

			if (context.pr.files.length > 0) {
				content += `Changed Files (${context.pr.files.length}):\n`;
				context.pr.files.forEach((file) => {
					content += `- ${file.filename} (${file.status})\n`;
					if (file.patch && taskType === "code_review") {
						content += `\`\`\`diff\n${file.patch}\n\`\`\`\n\n`;
					}
				});
			}
		}

		if (context.issue && ["issue_triage", "documentation"].includes(taskType)) {
			content += `Issue #${context.issue.number}: ${context.issue.title}\n`;
			content += `Description: ${context.issue.body}\n`;
			if (context.issue.labels.length > 0) {
				content += `Labels: ${context.issue.labels.join(", ")}\n`;
			}
			content += "\n";
		}

		if (context.commit) {
			content += `Commit: ${context.commit.sha.substring(0, 7)}\n`;
			content += `Message: ${context.commit.message}\n`;
			content += `Author: ${context.commit.author}\n\n`;
		}

		return {
			role: "user",
			content,
		};
	}

	private parseTaskResult(
		_taskType: AITaskType,
		content: string,
	): AITaskResult["result"] {
		// Basic parsing - in production this would be more sophisticated
		const lines = content.split("\n").filter((line) => line.trim());

		return {
			summary: lines[0] || "No summary available",
			details: { rawContent: content },
			recommendations: lines.slice(1).filter((line) => line.startsWith("- ")),
			confidence: 0.85, // Default confidence score
		};
	}

	private validateTaskParams(params: AITaskParams): AITaskParams {
		const schema = z.object({
			taskType: z.enum([
				"code_review",
				"pr_analysis",
				"security_scan",
				"documentation",
				"issue_triage",
				"workflow_optimize",
				"repo_health",
				"auto_fix",
			]),
			githubContext: z.object({
				owner: z.string(),
				repo: z.string(),
				pr: z.optional(
					z.object({
						number: z.number(),
						title: z.string(),
						body: z.string(),
						base: z.string(),
						head: z.string(),
						files: z.array(
							z.object({
								filename: z.string(),
								status: z.enum(["added", "modified", "removed"]),
								patch: z.optional(z.string()),
							}),
						),
					}),
				),
				issue: z.optional(
					z.object({
						number: z.number(),
						title: z.string(),
						body: z.string(),
						labels: z.array(z.string()),
					}),
				),
				commit: z.optional(
					z.object({
						sha: z.string(),
						message: z.string(),
						author: z.string(),
					}),
				),
			}),
			instructions: z.optional(z.string()),
			model: z.optional(
				z.enum([
					"gpt-4o",
					"gpt-4o-mini",
					"claude-3-5-sonnet",
					"claude-3-haiku",
					"phi-3-medium-128k",
					"phi-3-mini-128k",
					"llama-3.1-70b",
					"llama-3.1-405b",
				]),
			),
		});

		return schema.parse(params);
	}

	private generateTaskId(taskType: AITaskType): string {
		const timestamp = Date.now().toString(36);
		const random = Math.random().toString(36).substring(2, 8);
		return `${taskType}_${timestamp}_${random}`;
	}

	private updateRateLimitInfo(headers: Headers): void {
		const remaining = headers.get("x-ratelimit-remaining");
		const resetTime = headers.get("x-ratelimit-reset");

		if (remaining) {
			this.rateLimitInfo.remaining = parseInt(remaining, 10);
		}

		if (resetTime) {
			this.rateLimitInfo.resetAt = new Date(parseInt(resetTime, 10) * 1000);
		}

		this.emit(
			"rate_limit",
			this.rateLimitInfo.remaining,
			this.rateLimitInfo.resetAt,
		);
	}

	// Public getters for monitoring
	get queueSize(): number {
		return this.taskQueue.size;
	}
	get activeTaskCount(): number {
		return this.activeRequests.size;
	}
	get rateLimit(): { remaining: number; resetAt: Date } {
		return { ...this.rateLimitInfo };
	}
}
