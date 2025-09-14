import { z } from 'zod';

// GitHub Integration MCP Tool Schemas
const CreatePullRequestInputSchema = z.object({
	repository: z.string(),
	title: z.string(),
	body: z.string().optional(),
	head: z.string(),
	base: z.string().default('main'),
	draft: z.boolean().default(false),
});

const GetRepositoryInfoInputSchema = z.object({
	repository: z.string(),
	includeStats: z.boolean().default(false),
	includeBranches: z.boolean().default(false),
});

const ListIssuesInputSchema = z.object({
	repository: z.string(),
	state: z.enum(['open', 'closed', 'all']).default('open'),
	labels: z.array(z.string()).optional(),
	assignee: z.string().optional(),
	limit: z.number().int().positive().max(100).default(20),
});

const CreateBranchInputSchema = z.object({
	repository: z.string(),
	branchName: z.string(),
	fromBranch: z.string().default('main'),
});

const RunActionInputSchema = z.object({
	repository: z.string(),
	workflow: z.string(),
	ref: z.string().default('main'),
	inputs: z.record(z.string()).optional(),
});

// GitHub MCP Tool Definitions
export interface GitHubTool {
	name: string;
	description: string;
	inputSchema: z.ZodSchema;
}

export const githubMcpTools: GitHubTool[] = [
	{
		name: 'create_pull_request',
		description: 'Create a new pull request',
		inputSchema: CreatePullRequestInputSchema,
	},
	{
		name: 'get_repository_info',
		description: 'Get repository information and statistics',
		inputSchema: GetRepositoryInfoInputSchema,
	},
	{
		name: 'list_issues',
		description: 'List repository issues with filtering',
		inputSchema: ListIssuesInputSchema,
	},
	{
		name: 'create_branch',
		description: 'Create a new branch in the repository',
		inputSchema: CreateBranchInputSchema,
	},
	{
		name: 'run_action',
		description: 'Trigger a GitHub Actions workflow',
		inputSchema: RunActionInputSchema,
	},
];

// Export types for external use
export type CreatePullRequestInput = z.infer<
	typeof CreatePullRequestInputSchema
>;
export type GetRepositoryInfoInput = z.infer<
	typeof GetRepositoryInfoInputSchema
>;
export type ListIssuesInput = z.infer<typeof ListIssuesInputSchema>;
export type CreateBranchInput = z.infer<typeof CreateBranchInputSchema>;
export type RunActionInput = z.infer<typeof RunActionInputSchema>;
