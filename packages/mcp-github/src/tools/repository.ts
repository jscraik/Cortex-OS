import { createErrorEvent, createRepositoryEvent } from "@cortex-os/a2a-events";
import { z } from "zod";
import { CorrelationManager, createStructuredLogger } from "../utils/logger.js";
import type { GitHubTool, ToolContext, ToolResult } from "./index.js";

const logger = createStructuredLogger("repository-tools");

// Input validation schemas
const GetRepositorySchema = z.object({
	owner: z.string().min(1),
	repo: z.string().min(1),
});

const ListRepositoriesSchema = z.object({
	type: z.enum(["all", "owner", "public", "private", "member"]).default("all"),
	sort: z
		.enum(["created", "updated", "pushed", "full_name"])
		.default("created"),
	direction: z.enum(["asc", "desc"]).default("desc"),
	per_page: z.number().int().min(1).max(100).default(30),
	page: z.number().int().min(1).default(1),
});

const CreateRepositorySchema = z.object({
	name: z.string().min(1).max(100),
	description: z.string().optional(),
	homepage: z.string().url().optional(),
	private: z.boolean().default(false),
	has_issues: z.boolean().default(true),
	has_projects: z.boolean().default(true),
	has_wiki: z.boolean().default(true),
	auto_init: z.boolean().default(true),
	gitignore_template: z.string().optional(),
	license_template: z.string().optional(),
	allow_squash_merge: z.boolean().default(true),
	allow_merge_commit: z.boolean().default(true),
	allow_rebase_merge: z.boolean().default(true),
});

const GetFileContentSchema = z.object({
	owner: z.string().min(1),
	repo: z.string().min(1),
	path: z.string().min(1),
	ref: z.string().optional(),
});

const CreateOrUpdateFileSchema = z.object({
	owner: z.string().min(1),
	repo: z.string().min(1),
	path: z.string().min(1),
	content: z.string(),
	message: z.string().min(1),
	branch: z.string().optional(),
	sha: z.string().optional(), // Required for updates
	author: z
		.object({
			name: z.string(),
			email: z.string().email(),
		})
		.optional(),
	committer: z
		.object({
			name: z.string(),
			email: z.string().email(),
		})
		.optional(),
});

// Repository Tools implementation
export class RepositoryTools {
	private context: ToolContext;

	constructor(context: ToolContext) {
		this.context = context;
	}

	getTools(): GitHubTool[] {
		return [
			new GetRepositoryTool(this.context),
			new ListRepositoriesTool(this.context),
			new CreateRepositoryTool(this.context),
			new GetFileContentTool(this.context),
			new CreateOrUpdateFileTool(this.context),
			new DeleteFileTool(this.context),
			new ListBranchesTool(this.context),
			new CreateBranchTool(this.context),
			new GetCommitTool(this.context),
			new ListCommitsTool(this.context),
		];
	}
}

// Get Repository Tool
class GetRepositoryTool implements GitHubTool {
	name = "github_get_repository";
	description = "Get detailed information about a GitHub repository";
	private context: ToolContext;

	constructor(context: ToolContext) {
		this.context = context;
	}

	async execute(args: Record<string, any>): Promise<ToolResult> {
		const correlationId =
			this.context.correlationId || CorrelationManager.generateCorrelationId();

		try {
			const { owner, repo } = GetRepositorySchema.parse(args);
			const octokit = this.context.auth.getOctokit();

			logger.info("Getting repository information", {
				owner,
				repo,
				correlationId,
			});

			const { data: repository } = await octokit.rest.repos.get({
				owner,
				repo,
			});

			// Publish repository event if A2A bridge is available
			if (this.context.eventBridge) {
				const repositoryEvent = createRepositoryEvent(
					"updated", // Using 'updated' as we're accessing repo info
					repository as any,
					repository.owner as any,
				);

				await this.context.eventBridge.publishEvent(repositoryEvent, {
					correlationId,
					priority: "low",
					metadata: {
						operation: "get_repository",
						tool: this.name,
					},
				});
			}

			logger.info("Successfully retrieved repository information", {
				owner,
				repo,
				repositoryId: repository.id,
				correlationId,
			});

			return {
				success: true,
				data: {
					id: repository.id,
					name: repository.name,
					full_name: repository.full_name,
					description: repository.description,
					private: repository.private,
					fork: repository.fork,
					created_at: repository.created_at,
					updated_at: repository.updated_at,
					pushed_at: repository.pushed_at,
					size: repository.size,
					stargazers_count: repository.stargazers_count,
					watchers_count: repository.watchers_count,
					forks_count: repository.forks_count,
					language: repository.language,
					topics: repository.topics,
					default_branch: repository.default_branch,
					clone_url: repository.clone_url,
					ssh_url: repository.ssh_url,
					homepage: repository.homepage,
					has_issues: repository.has_issues,
					has_projects: repository.has_projects,
					has_wiki: repository.has_wiki,
					has_pages: repository.has_pages,
					archived: repository.archived,
					disabled: repository.disabled,
					visibility: repository.visibility,
					permissions: repository.permissions,
					owner: {
						id: repository.owner.id,
						login: repository.owner.login,
						type: repository.owner.type,
						avatar_url: repository.owner.avatar_url,
					},
				},
				metadata: {
					correlationId,
					operation: "get_repository",
					repository: `${owner}/${repo}`,
				},
			};
		} catch (error: any) {
			logger.error("Failed to get repository information", error, {
				owner: args.owner,
				repo: args.repo,
				correlationId,
			});

			// Publish error event
			if (this.context.eventBridge && args.owner && args.repo) {
				const errorEvent = createErrorEvent(
					{
						id: correlationId,
						message: error.message || "Failed to get repository",
						category: error.status === 404 ? "not_found" : "api",
						severity: "medium",
						is_retryable: error.status !== 404,
						context: {
							operation: "get_repository",
							method: "GET",
							status_code: error.status,
						},
						timestamp: new Date().toISOString(),
					},
					undefined, // No repository data available on error
					undefined, // No actor data available
				);

				await this.context.eventBridge.publishEvent(errorEvent, {
					correlationId,
					priority: "normal",
				});
			}

			return {
				success: false,
				error: error.message || "Failed to get repository information",
				metadata: {
					correlationId,
					statusCode: error.status,
				},
			};
		}
	}
}

// List Repositories Tool
class ListRepositoriesTool implements GitHubTool {
	name = "github_list_repositories";
	description = "List repositories for the authenticated user or organization";
	private context: ToolContext;

	constructor(context: ToolContext) {
		this.context = context;
	}

	async execute(args: Record<string, any>): Promise<ToolResult> {
		const correlationId =
			this.context.correlationId || CorrelationManager.generateCorrelationId();

		try {
			const params = ListRepositoriesSchema.parse(args);
			const octokit = this.context.auth.getOctokit();

			logger.info("Listing repositories", {
				params,
				correlationId,
			});

			const { data: repositories } =
				await octokit.rest.repos.listForAuthenticatedUser(params);

			logger.info("Successfully listed repositories", {
				count: repositories.length,
				correlationId,
			});

			return {
				success: true,
				data: {
					repositories: repositories.map((repo) => ({
						id: repo.id,
						name: repo.name,
						full_name: repo.full_name,
						description: repo.description,
						private: repo.private,
						fork: repo.fork,
						created_at: repo.created_at,
						updated_at: repo.updated_at,
						pushed_at: repo.pushed_at,
						size: repo.size,
						stargazers_count: repo.stargazers_count,
						watchers_count: repo.watchers_count,
						forks_count: repo.forks_count,
						language: repo.language,
						default_branch: repo.default_branch,
						topics: repo.topics,
						archived: repo.archived,
						disabled: repo.disabled,
						visibility: repo.visibility,
						owner: {
							id: repo.owner.id,
							login: repo.owner.login,
							type: repo.owner.type,
						},
					})),
					pagination: {
						total_count: repositories.length,
						page: params.page,
						per_page: params.per_page,
					},
				},
				metadata: {
					correlationId,
					operation: "list_repositories",
					count: repositories.length,
				},
			};
		} catch (error: any) {
			logger.error("Failed to list repositories", error, {
				correlationId,
			});

			return {
				success: false,
				error: error.message || "Failed to list repositories",
				metadata: {
					correlationId,
					statusCode: error.status,
				},
			};
		}
	}
}

// Create Repository Tool
class CreateRepositoryTool implements GitHubTool {
	name = "github_create_repository";
	description = "Create a new GitHub repository";
	private context: ToolContext;

	constructor(context: ToolContext) {
		this.context = context;
	}

	async execute(args: Record<string, any>): Promise<ToolResult> {
		const correlationId =
			this.context.correlationId || CorrelationManager.generateCorrelationId();

		try {
			const params = CreateRepositorySchema.parse(args);
			const octokit = this.context.auth.getOctokit();
			const authContext = this.context.auth.getAuthContext();

			logger.info("Creating repository", {
				name: params.name,
				private: params.private,
				correlationId,
			});

			const { data: repository } =
				await octokit.rest.repos.createForAuthenticatedUser(params);

			// Publish repository created event
			if (this.context.eventBridge) {
				const repositoryEvent = createRepositoryEvent(
					"created",
					repository as any,
					authContext.user as any,
				);

				await this.context.eventBridge.publishEvent(repositoryEvent, {
					correlationId,
					priority: "normal",
					metadata: {
						operation: "create_repository",
						tool: this.name,
					},
				});
			}

			logger.info("Successfully created repository", {
				name: params.name,
				repositoryId: repository.id,
				fullName: repository.full_name,
				correlationId,
			});

			return {
				success: true,
				data: {
					id: repository.id,
					name: repository.name,
					full_name: repository.full_name,
					description: repository.description,
					private: repository.private,
					html_url: repository.html_url,
					clone_url: repository.clone_url,
					ssh_url: repository.ssh_url,
					default_branch: repository.default_branch,
					created_at: repository.created_at,
					owner: {
						id: repository.owner.id,
						login: repository.owner.login,
						type: repository.owner.type,
					},
				},
				metadata: {
					correlationId,
					operation: "create_repository",
					repository: repository.full_name,
				},
			};
		} catch (error: any) {
			logger.error("Failed to create repository", error, {
				name: args.name,
				correlationId,
			});

			return {
				success: false,
				error: error.message || "Failed to create repository",
				metadata: {
					correlationId,
					statusCode: error.status,
				},
			};
		}
	}
}

// Get File Content Tool
class GetFileContentTool implements GitHubTool {
	name = "github_get_file_content";
	description = "Get the contents of a file in a repository";
	private context: ToolContext;

	constructor(context: ToolContext) {
		this.context = context;
	}

	async execute(args: Record<string, any>): Promise<ToolResult> {
		const correlationId =
			this.context.correlationId || CorrelationManager.generateCorrelationId();

		try {
			const { owner, repo, path, ref } = GetFileContentSchema.parse(args);
			const octokit = this.context.auth.getOctokit();

			logger.info("Getting file content", {
				owner,
				repo,
				path,
				ref: ref || "default",
				correlationId,
			});

			const { data: fileData } = await octokit.rest.repos.getContent({
				owner,
				repo,
				path,
				ref,
			});

			// Handle different content types
			if (Array.isArray(fileData)) {
				// Directory listing
				return {
					success: true,
					data: {
						type: "directory",
						contents: fileData.map((item) => ({
							name: item.name,
							path: item.path,
							type: item.type,
							size: item.size,
							sha: item.sha,
							download_url: item.download_url,
							html_url: item.html_url,
						})),
					},
					metadata: {
						correlationId,
						operation: "get_file_content",
						repository: `${owner}/${repo}`,
						path,
						type: "directory",
					},
				};
			} else if (fileData.type === "file") {
				// File content
				const content =
					fileData.encoding === "base64"
						? Buffer.from(fileData.content, "base64").toString("utf-8")
						: fileData.content;

				logger.info("Successfully retrieved file content", {
					owner,
					repo,
					path,
					size: fileData.size,
					correlationId,
				});

				return {
					success: true,
					data: {
						type: "file",
						name: fileData.name,
						path: fileData.path,
						sha: fileData.sha,
						size: fileData.size,
						encoding: fileData.encoding,
						content,
						raw_content: fileData.content,
						download_url: fileData.download_url,
						html_url: fileData.html_url,
					},
					metadata: {
						correlationId,
						operation: "get_file_content",
						repository: `${owner}/${repo}`,
						path,
						type: "file",
						size: fileData.size,
					},
				};
			} else {
				throw new Error(`Unsupported content type: ${fileData.type}`);
			}
		} catch (error: any) {
			logger.error("Failed to get file content", error, {
				owner: args.owner,
				repo: args.repo,
				path: args.path,
				correlationId,
			});

			return {
				success: false,
				error: error.message || "Failed to get file content",
				metadata: {
					correlationId,
					statusCode: error.status,
				},
			};
		}
	}
}

// Create or Update File Tool
class CreateOrUpdateFileTool implements GitHubTool {
	name = "github_create_or_update_file";
	description = "Create or update a file in a repository";
	private context: ToolContext;

	constructor(context: ToolContext) {
		this.context = context;
	}

	async execute(args: Record<string, any>): Promise<ToolResult> {
		const correlationId =
			this.context.correlationId || CorrelationManager.generateCorrelationId();

		try {
			const params = CreateOrUpdateFileSchema.parse(args);
			const octokit = this.context.auth.getOctokit();
			const _authContext = this.context.auth.getAuthContext();

			// Encode content to base64 if it's not already
			const encodedContent = Buffer.from(params.content, "utf-8").toString(
				"base64",
			);

			const isUpdate = Boolean(params.sha);
			logger.info(`${isUpdate ? "Updating" : "Creating"} file`, {
				owner: params.owner,
				repo: params.repo,
				path: params.path,
				branch: params.branch || "default",
				isUpdate,
				correlationId,
			});

			const { data: fileData } =
				await octokit.rest.repos.createOrUpdateFileContents({
					owner: params.owner,
					repo: params.repo,
					path: params.path,
					message: params.message,
					content: encodedContent,
					branch: params.branch,
					sha: params.sha,
					author: params.author,
					committer: params.committer,
				});

			logger.info(`Successfully ${isUpdate ? "updated" : "created"} file`, {
				owner: params.owner,
				repo: params.repo,
				path: params.path,
				commitSha: fileData.commit.sha,
				correlationId,
			});

			return {
				success: true,
				data: {
					content: {
						name: fileData.content?.name,
						path: fileData.content?.path,
						sha: fileData.content?.sha,
						size: fileData.content?.size,
						html_url: fileData.content?.html_url,
						download_url: fileData.content?.download_url,
					},
					commit: {
						sha: fileData.commit.sha,
						html_url: fileData.commit.html_url,
						author: fileData.commit.author,
						committer: fileData.commit.committer,
						message: fileData.commit.message,
					},
				},
				metadata: {
					correlationId,
					operation: isUpdate ? "update_file" : "create_file",
					repository: `${params.owner}/${params.repo}`,
					path: params.path,
				},
			};
		} catch (error: any) {
			logger.error("Failed to create/update file", error, {
				owner: args.owner,
				repo: args.repo,
				path: args.path,
				correlationId,
			});

			return {
				success: false,
				error: error.message || "Failed to create or update file",
				metadata: {
					correlationId,
					statusCode: error.status,
				},
			};
		}
	}
}

// Additional tools with basic implementations
class DeleteFileTool implements GitHubTool {
	name = "github_delete_file";
	description = "Delete a file from a repository";

	constructor(context: ToolContext) {
		this.context = context;
	}

	async execute(_args: Record<string, any>): Promise<ToolResult> {
		// Implementation would be similar to create/update but calling deleteFile
		return {
			success: false,
			error: "Delete file tool not yet implemented",
		};
	}
}

class ListBranchesTool implements GitHubTool {
	name = "github_list_branches";
	description = "List branches in a repository";

	constructor(context: ToolContext) {
		this.context = context;
	}

	async execute(_args: Record<string, any>): Promise<ToolResult> {
		// Implementation would list repository branches
		return {
			success: false,
			error: "List branches tool not yet implemented",
		};
	}
}

class CreateBranchTool implements GitHubTool {
	name = "github_create_branch";
	description = "Create a new branch in a repository";

	constructor(context: ToolContext) {
		this.context = context;
	}

	async execute(_args: Record<string, any>): Promise<ToolResult> {
		// Implementation would create a new branch
		return {
			success: false,
			error: "Create branch tool not yet implemented",
		};
	}
}

class GetCommitTool implements GitHubTool {
	name = "github_get_commit";
	description = "Get details of a specific commit";

	constructor(context: ToolContext) {
		this.context = context;
	}

	async execute(_args: Record<string, any>): Promise<ToolResult> {
		// Implementation would get commit details
		return {
			success: false,
			error: "Get commit tool not yet implemented",
		};
	}
}

class ListCommitsTool implements GitHubTool {
	name = "github_list_commits";
	description = "List commits in a repository";

	constructor(context: ToolContext) {
		this.context = context;
	}

	async execute(_args: Record<string, any>): Promise<ToolResult> {
		// Implementation would list repository commits
		return {
			success: false,
			error: "List commits tool not yet implemented",
		};
	}
}
