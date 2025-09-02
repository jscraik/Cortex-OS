import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { GitHubAuth } from "../auth/github-auth.js";
import type { GitHubMCPConfig } from "../config/schema.js";
import type { A2AEventBridge } from "../events/a2a-bridge.js";
import { createStructuredLogger } from "../utils/logger.js";
import { IssueTools } from "./issue.js";
import { PullRequestTools } from "./pull-request.js";
// Import individual tool implementations
import { RepositoryTools } from "./repository.js";
import { SearchTools } from "./search.js";
import { UserTools } from "./user.js";
import { WorkflowTools } from "./workflow.js";

const logger = createStructuredLogger("github-tools");

// Tool execution context
export interface ToolContext {
	config: GitHubMCPConfig;
	auth: GitHubAuth;
	eventBridge?: A2AEventBridge;
	correlationId?: string;
}

// Tool execution result
export interface ToolResult {
	success: boolean;
	data?: any;
	error?: string;
	metadata?: Record<string, any>;
}

// Base tool interface
export interface GitHubTool {
	name: string;
	description: string;
	execute(args: Record<string, any>, context: ToolContext): Promise<ToolResult>;
}

// GitHub MCP Tools manager
export class GitHubMCPTools {
	private config: GitHubMCPConfig;
	private auth: GitHubAuth;
	private eventBridge?: A2AEventBridge;
	private tools: Map<string, GitHubTool> = new Map();
	private toolCategories: Map<string, GitHubTool[]> = new Map();

	constructor(
		config: GitHubMCPConfig,
		auth: GitHubAuth,
		eventBridge?: A2AEventBridge,
	) {
		this.config = config;
		this.auth = auth;
		this.eventBridge = eventBridge;

		this.initializeTools();
	}

	private initializeTools(): void {
		logger.info("Initializing GitHub MCP tools");

		const context: ToolContext = {
			config: this.config,
			auth: this.auth,
			eventBridge: this.eventBridge,
		};

		// Repository tools
		const repoTools = new RepositoryTools(context);
		this.registerToolCategory("repository", repoTools.getTools());

		// Pull request tools
		const prTools = new PullRequestTools(context);
		this.registerToolCategory("pull_request", prTools.getTools());

		// Issue tools
		const issueTools = new IssueTools(context);
		this.registerToolCategory("issue", issueTools.getTools());

		// Workflow tools
		const workflowTools = new WorkflowTools(context);
		this.registerToolCategory("workflow", workflowTools.getTools());

		// Search tools
		const searchTools = new SearchTools(context);
		this.registerToolCategory("search", searchTools.getTools());

		// User tools
		const userTools = new UserTools(context);
		this.registerToolCategory("user", userTools.getTools());

		logger.info(
			`Initialized ${this.tools.size} GitHub MCP tools across ${this.toolCategories.size} categories`,
		);
	}

	private registerToolCategory(category: string, tools: GitHubTool[]): void {
		this.toolCategories.set(category, tools);

		for (const tool of tools) {
			this.tools.set(tool.name, tool);
		}

		logger.debug(`Registered ${tools.length} tools in category: ${category}`);
	}

	// Get MCP tool definitions
	getToolDefinitions(): Tool[] {
		return Array.from(this.tools.values()).map((tool) => ({
			name: tool.name,
			description: tool.description,
			inputSchema: {
				type: "object",
				properties: this.getToolInputSchema(tool.name),
				required: this.getRequiredParameters(tool.name),
			},
		}));
	}

	private getToolInputSchema(toolName: string): Record<string, any> {
		// Define input schemas for each tool
		const schemas: Record<string, Record<string, any>> = {
			// Repository tools
			github_get_repository: {
				owner: { type: "string", description: "Repository owner" },
				repo: { type: "string", description: "Repository name" },
			},
			github_list_repositories: {
				type: {
					type: "string",
					enum: ["all", "owner", "public", "private", "member"],
					default: "all",
				},
				sort: {
					type: "string",
					enum: ["created", "updated", "pushed", "full_name"],
					default: "created",
				},
				direction: { type: "string", enum: ["asc", "desc"], default: "desc" },
				per_page: { type: "number", minimum: 1, maximum: 100, default: 30 },
			},
			github_create_repository: {
				name: { type: "string", description: "Repository name" },
				description: { type: "string", description: "Repository description" },
				private: { type: "boolean", default: false },
				auto_init: { type: "boolean", default: true },
			},
			github_get_file_content: {
				owner: { type: "string", description: "Repository owner" },
				repo: { type: "string", description: "Repository name" },
				path: { type: "string", description: "File path" },
				ref: { type: "string", description: "Branch, tag, or commit SHA" },
			},
			github_create_or_update_file: {
				owner: { type: "string", description: "Repository owner" },
				repo: { type: "string", description: "Repository name" },
				path: { type: "string", description: "File path" },
				content: {
					type: "string",
					description: "File content (base64 encoded)",
				},
				message: { type: "string", description: "Commit message" },
				branch: { type: "string", description: "Branch name" },
				sha: {
					type: "string",
					description: "SHA of existing file (for updates)",
				},
			},

			// Pull request tools
			github_list_pull_requests: {
				owner: { type: "string", description: "Repository owner" },
				repo: { type: "string", description: "Repository name" },
				state: {
					type: "string",
					enum: ["open", "closed", "all"],
					default: "open",
				},
				sort: {
					type: "string",
					enum: ["created", "updated", "popularity"],
					default: "created",
				},
				direction: { type: "string", enum: ["asc", "desc"], default: "desc" },
			},
			github_get_pull_request: {
				owner: { type: "string", description: "Repository owner" },
				repo: { type: "string", description: "Repository name" },
				pull_number: { type: "number", description: "Pull request number" },
			},
			github_create_pull_request: {
				owner: { type: "string", description: "Repository owner" },
				repo: { type: "string", description: "Repository name" },
				title: { type: "string", description: "Pull request title" },
				body: { type: "string", description: "Pull request description" },
				head: { type: "string", description: "Source branch" },
				base: { type: "string", description: "Target branch" },
				draft: { type: "boolean", default: false },
			},
			github_merge_pull_request: {
				owner: { type: "string", description: "Repository owner" },
				repo: { type: "string", description: "Repository name" },
				pull_number: { type: "number", description: "Pull request number" },
				merge_method: {
					type: "string",
					enum: ["merge", "squash", "rebase"],
					default: "merge",
				},
				commit_title: { type: "string", description: "Commit title" },
				commit_message: { type: "string", description: "Commit message" },
			},

			// Issue tools
			github_list_issues: {
				owner: { type: "string", description: "Repository owner" },
				repo: { type: "string", description: "Repository name" },
				state: {
					type: "string",
					enum: ["open", "closed", "all"],
					default: "open",
				},
				labels: {
					type: "string",
					description: "Comma-separated list of labels",
				},
				assignee: { type: "string", description: "Username of assignee" },
			},
			github_get_issue: {
				owner: { type: "string", description: "Repository owner" },
				repo: { type: "string", description: "Repository name" },
				issue_number: { type: "number", description: "Issue number" },
			},
			github_create_issue: {
				owner: { type: "string", description: "Repository owner" },
				repo: { type: "string", description: "Repository name" },
				title: { type: "string", description: "Issue title" },
				body: { type: "string", description: "Issue description" },
				labels: {
					type: "array",
					items: { type: "string" },
					description: "Issue labels",
				},
				assignees: {
					type: "array",
					items: { type: "string" },
					description: "Assignees",
				},
			},
			github_update_issue: {
				owner: { type: "string", description: "Repository owner" },
				repo: { type: "string", description: "Repository name" },
				issue_number: { type: "number", description: "Issue number" },
				title: { type: "string", description: "Issue title" },
				body: { type: "string", description: "Issue description" },
				state: { type: "string", enum: ["open", "closed"] },
				labels: { type: "array", items: { type: "string" } },
			},

			// Workflow tools
			github_list_workflows: {
				owner: { type: "string", description: "Repository owner" },
				repo: { type: "string", description: "Repository name" },
			},
			github_get_workflow_runs: {
				owner: { type: "string", description: "Repository owner" },
				repo: { type: "string", description: "Repository name" },
				workflow_id: { type: "string", description: "Workflow ID or filename" },
				status: {
					type: "string",
					enum: [
						"completed",
						"action_required",
						"cancelled",
						"failure",
						"neutral",
						"skipped",
						"stale",
						"success",
						"timed_out",
						"in_progress",
						"queued",
					],
				},
				branch: { type: "string", description: "Branch name" },
			},
			github_trigger_workflow: {
				owner: { type: "string", description: "Repository owner" },
				repo: { type: "string", description: "Repository name" },
				workflow_id: { type: "string", description: "Workflow ID or filename" },
				ref: { type: "string", description: "Branch or tag name" },
				inputs: { type: "object", description: "Workflow inputs" },
			},

			// Search tools
			github_search_repositories: {
				q: { type: "string", description: "Search query" },
				sort: {
					type: "string",
					enum: ["stars", "forks", "help-wanted-issues", "updated"],
					default: "best-match",
				},
				order: { type: "string", enum: ["desc", "asc"], default: "desc" },
				per_page: { type: "number", minimum: 1, maximum: 100, default: 30 },
			},
			github_search_issues: {
				q: { type: "string", description: "Search query" },
				sort: {
					type: "string",
					enum: [
						"comments",
						"reactions",
						"reactions-+1",
						"reactions--1",
						"reactions-smile",
						"reactions-thinking_face",
						"reactions-heart",
						"reactions-tada",
						"interactions",
						"created",
						"updated",
					],
					default: "best-match",
				},
				order: { type: "string", enum: ["desc", "asc"], default: "desc" },
				per_page: { type: "number", minimum: 1, maximum: 100, default: 30 },
			},
			github_search_code: {
				q: { type: "string", description: "Search query" },
				sort: { type: "string", enum: ["indexed"], default: "best-match" },
				order: { type: "string", enum: ["desc", "asc"], default: "desc" },
				per_page: { type: "number", minimum: 1, maximum: 100, default: 30 },
			},

			// User tools
			github_get_user: {
				username: { type: "string", description: "GitHub username" },
			},
			github_get_authenticated_user: {},
			github_list_user_repositories: {
				username: { type: "string", description: "GitHub username" },
				type: {
					type: "string",
					enum: ["all", "owner", "member"],
					default: "owner",
				},
				sort: {
					type: "string",
					enum: ["created", "updated", "pushed", "full_name"],
					default: "created",
				},
				direction: { type: "string", enum: ["asc", "desc"], default: "desc" },
			},
		};

		return schemas[toolName] || {};
	}

	private getRequiredParameters(toolName: string): string[] {
		const requiredParams: Record<string, string[]> = {
			github_get_repository: ["owner", "repo"],
			github_create_repository: ["name"],
			github_get_file_content: ["owner", "repo", "path"],
			github_create_or_update_file: [
				"owner",
				"repo",
				"path",
				"content",
				"message",
			],
			github_list_pull_requests: ["owner", "repo"],
			github_get_pull_request: ["owner", "repo", "pull_number"],
			github_create_pull_request: ["owner", "repo", "title", "head", "base"],
			github_merge_pull_request: ["owner", "repo", "pull_number"],
			github_list_issues: ["owner", "repo"],
			github_get_issue: ["owner", "repo", "issue_number"],
			github_create_issue: ["owner", "repo", "title"],
			github_update_issue: ["owner", "repo", "issue_number"],
			github_list_workflows: ["owner", "repo"],
			github_get_workflow_runs: ["owner", "repo", "workflow_id"],
			github_trigger_workflow: ["owner", "repo", "workflow_id", "ref"],
			github_search_repositories: ["q"],
			github_search_issues: ["q"],
			github_search_code: ["q"],
			github_get_user: ["username"],
		};

		return requiredParams[toolName] || [];
	}

	// Execute a tool
	async executeTool(
		toolName: string,
		args: Record<string, any>,
		correlationId?: string,
	): Promise<any> {
		const tool = this.tools.get(toolName);
		if (!tool) {
			throw new Error(`Unknown tool: ${toolName}`);
		}

		const context: ToolContext = {
			config: this.config,
			auth: this.auth,
			eventBridge: this.eventBridge,
			correlationId,
		};

		logger.info(`Executing GitHub tool: ${toolName}`, {
			tool: toolName,
			correlationId,
			argsKeys: Object.keys(args),
		});

		try {
			const startTime = Date.now();
			const result = await tool.execute(args, context);
			const duration = Date.now() - startTime;

			logger.info(`GitHub tool executed successfully: ${toolName}`, {
				tool: toolName,
				success: result.success,
				duration,
				correlationId,
			});

			return result;
		} catch (error) {
			logger.error(
				`GitHub tool execution failed: ${toolName}`,
				error as Error,
				{
					tool: toolName,
					correlationId,
					args,
				},
			);

			throw error;
		}
	}

	// Get available tools by category
	getToolsByCategory(category: string): GitHubTool[] {
		return this.toolCategories.get(category) || [];
	}

	// Get all available categories
	getCategories(): string[] {
		return Array.from(this.toolCategories.keys());
	}

	// Get tool by name
	getTool(name: string): GitHubTool | undefined {
		return this.tools.get(name);
	}

	// Health check
	async healthCheck(): Promise<{
		status: "healthy" | "unhealthy";
		details: {
			toolsCount: number;
			categoriesCount: number;
			authStatus: any;
			eventBridgeStatus?: any;
		};
	}> {
		const authHealth = await this.auth.healthCheck();
		const eventBridgeHealth = this.eventBridge
			? await this.eventBridge.healthCheck()
			: undefined;

		const isHealthy =
			authHealth.status === "healthy" &&
			(!this.eventBridge || eventBridgeHealth?.status === "healthy");

		return {
			status: isHealthy ? "healthy" : "unhealthy",
			details: {
				toolsCount: this.tools.size,
				categoriesCount: this.toolCategories.size,
				authStatus: authHealth,
				eventBridgeStatus: eventBridgeHealth,
			},
		};
	}

	// Cleanup
	async cleanup(): Promise<void> {
		logger.info("Cleaning up GitHub MCP tools");

		if (this.eventBridge) {
			await this.eventBridge.disconnect();
		}

		await this.auth.cleanup();

		this.tools.clear();
		this.toolCategories.clear();

		logger.info("GitHub MCP tools cleanup complete");
	}
}
