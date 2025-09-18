import { z } from 'zod';

/**
 * GitHub integration A2A event schemas for inter-package communication
 */

// Repository Connected Event
export const RepositoryConnectedEventSchema = z.object({
	repositoryId: z.string(),
	owner: z.string(),
	name: z.string(),
	fullName: z.string(),
	isPrivate: z.boolean(),
	defaultBranch: z.string(),
	connectedAt: z.string(),
});

// Pull Request Event
export const PullRequestEventSchema = z.object({
	repositoryId: z.string(),
	pullRequestId: z.string(),
	number: z.number().int().positive(),
	title: z.string(),
	author: z.string(),
	state: z.enum(['open', 'closed', 'merged']),
	action: z.enum(['opened', 'closed', 'merged', 'reviewed', 'updated']),
	baseBranch: z.string(),
	headBranch: z.string(),
	triggeredAt: z.string(),
});

// Issue Event
export const IssueEventSchema = z.object({
	repositoryId: z.string(),
	issueId: z.string(),
	number: z.number().int().positive(),
	title: z.string(),
	author: z.string(),
	state: z.enum(['open', 'closed']),
	action: z.enum(['opened', 'closed', 'assigned', 'labeled', 'commented']),
	labels: z.array(z.string()),
	triggeredAt: z.string(),
});

// Workflow Event
export const WorkflowEventSchema = z.object({
	repositoryId: z.string(),
	workflowId: z.string(),
	runId: z.string(),
	name: z.string(),
	status: z.enum(['queued', 'in_progress', 'completed']),
	conclusion: z.enum(['success', 'failure', 'cancelled', 'skipped', 'neutral']).optional(),
	branch: z.string(),
	commit: z.string(),
	triggeredBy: z.string(),
	triggeredAt: z.string(),
});

// Export event type definitions
export type RepositoryConnectedEvent = z.infer<typeof RepositoryConnectedEventSchema>;
export type PullRequestEvent = z.infer<typeof PullRequestEventSchema>;
export type IssueEvent = z.infer<typeof IssueEventSchema>;
export type WorkflowEvent = z.infer<typeof WorkflowEventSchema>;

// Helper function to create GitHub events
export const createGitHubEvent = {
	repositoryConnected: (data: RepositoryConnectedEvent) => ({
		type: 'github.repository.connected' as const,
		data: RepositoryConnectedEventSchema.parse(data),
	}),
	pullRequest: (data: PullRequestEvent) => ({
		type: 'github.pull_request.action' as const,
		data: PullRequestEventSchema.parse(data),
	}),
	issue: (data: IssueEvent) => ({
		type: 'github.issue.action' as const,
		data: IssueEventSchema.parse(data),
	}),
	workflow: (data: WorkflowEvent) => ({
		type: 'github.workflow.status' as const,
		data: WorkflowEventSchema.parse(data),
	}),
};
