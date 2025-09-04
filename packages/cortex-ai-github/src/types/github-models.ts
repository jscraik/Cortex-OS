/**
 * GitHub Models API Types and Interfaces
 * Provides type-safe access to GitHub's AI models via REST API
 */

export interface GitHubModelsConfig {
        token: string;
        baseUrl: string;
        defaultModel: GitHubModel;
        maxTokens: number;
        temperature: number;
        requestTimeoutMs?: number;
}

export type GitHubModel =
        | "gpt-4o"
        | "gpt-4o-mini"
        | "claude-3-5-sonnet"
        | "claude-3-haiku"
        | "phi-3-medium-128k"
        | "phi-3-mini-128k"
        | "llama-3.1-70b"
        | "llama-3.1-405b";

export interface ModelMessage {
        role: "system" | "user" | "assistant";
        content: string;
}

export interface ModelCompletionRequest {
        model: GitHubModel;
        messages: ModelMessage[];
        max_tokens?: number;
        temperature?: number;
        top_p?: number;
        stream?: boolean;
}

export interface ModelCompletionResponse {
        id: string;
        object: "chat.completion";
        created: number;
        model: string;
        choices: Array<{
                index: number;
                message: {
                        role: "assistant";
                        content: string;
                };
                finish_reason: "stop" | "length" | "content_filter";
        }>;
        usage: {
                prompt_tokens: number;
                completion_tokens: number;
                total_tokens: number;
        };
}

export interface AITaskParams {
        taskType: AITaskType;
        githubContext: GitHubContext;
        instructions?: string;
        model?: GitHubModel;
}

export type AITaskType =
        | "code_review"
        | "pr_analysis"
        | "security_scan"
        | "documentation"
        | "issue_triage"
        | "workflow_optimize"
        | "repo_health"
        | "auto_fix";

export interface GitHubContext {
        owner: string;
        repo: string;
        pr?: {
                number: number;
                title: string;
                body: string;
                base: string;
                head: string;
                files: Array<{
                        filename: string;
                        status: "added" | "modified" | "removed";
                        patch?: string;
                }>;
        };
        issue?: {
                number: number;
                title: string;
                body: string;
                labels: string[];
        };
        commit?: {
                sha: string;
                message: string;
                author: string;
        };
}

export interface AITaskResult {
        taskId: string;
        taskType: AITaskType;
        status: "success" | "error" | "timeout";
        result: {
                summary: string;
                details: Record<string, any>;
                recommendations: string[];
                confidence: number;
        };
        model: string;
        tokensUsed: number;
        executionTime: number;
        error?: string;
}

export interface CommentTrigger {
        pattern: RegExp;
        taskType: AITaskType;
        description: string;
        requiredPermissions: ("read" | "write" | "admin")[];
}
