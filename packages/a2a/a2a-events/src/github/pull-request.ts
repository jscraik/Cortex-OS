import { z } from 'zod';
import { GitHubUserSchema, GitHubRepositorySchema } from './repository';

// Pull Request Branch Schema
export const PullRequestBranchSchema = z.object({
  label: z.string(),
  ref: z.string(),
  sha: z.string(),
  user: GitHubUserSchema,
  repo: GitHubRepositorySchema,
});

export type PullRequestBranch = z.infer<typeof PullRequestBranchSchema>;

// Pull Request Schema
export const PullRequestSchema = z.object({
  id: z.number(),
  number: z.number(),
  state: z.enum(['open', 'closed']),
  title: z.string(),
  body: z.string().nullable(),
  user: GitHubUserSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  closed_at: z.string().datetime().nullable(),
  merged_at: z.string().datetime().nullable(),
  merge_commit_sha: z.string().nullable(),
  assignee: GitHubUserSchema.nullable(),
  assignees: z.array(GitHubUserSchema),
  draft: z.boolean(),
  head: PullRequestBranchSchema,
  base: PullRequestBranchSchema,
  merged: z.boolean(),
  mergeable: z.boolean().nullable(),
  mergeable_state: z.string(),
  merged_by: GitHubUserSchema.nullable(),
  comments: z.number(),
  review_comments: z.number(),
  commits: z.number(),
  additions: z.number(),
  deletions: z.number(),
  changed_files: z.number(),
  url: z.string().url(),
  html_url: z.string().url(),
});

export type PullRequest = z.infer<typeof PullRequestSchema>;

// Pull Request Action Types
export const PullRequestActionSchema = z.enum([
  'opened',
  'closed',
  'merged',
  'reopened',
  'synchronized',
  'ready_for_review',
  'converted_to_draft',
  'assigned',
  'unassigned',
  'labeled',
  'unlabeled',
  'review_requested',
  'review_request_removed'
]);

export type PullRequestAction = z.infer<typeof PullRequestActionSchema>;

// Pull Request Changes Schema
export const PullRequestChangesSchema = z.object({
  title: z.object({
    from: z.string()
  }).optional(),
  body: z.object({
    from: z.string().nullable()
  }).optional(),
  base: z.object({
    ref: z.object({
      from: z.string()
    }),
    sha: z.object({
      from: z.string()
    })
  }).optional(),
}).optional();

export type PullRequestChanges = z.infer<typeof PullRequestChangesSchema>;

// Pull Request Event Schema
export const PullRequestEventSchema = z.object({
  event_id: z.string().uuid(),
  event_type: z.literal('github.pull_request'),
  source: z.literal('github-client'),
  timestamp: z.string().datetime(),
  
  // Event-specific data
  action: PullRequestActionSchema,
  pull_request: PullRequestSchema,
  repository: GitHubRepositorySchema,
  actor: GitHubUserSchema,
  changes: PullRequestChangesSchema,
  
  // Additional context
  assignee: GitHubUserSchema.optional(),
  requested_reviewer: GitHubUserSchema.optional(),
  label: z.object({
    id: z.number(),
    name: z.string(),
    color: z.string(),
    description: z.string().nullable(),
  }).optional(),
  
  // Metadata
  metadata: z.record(z.string()).optional(),
});

export type PullRequestEvent = z.infer<typeof PullRequestEventSchema>;

// Pull Request Event Topics Mapping
export const PULL_REQUEST_EVENT_TOPICS = {
  'opened': 'github.pullrequest.opened',
  'closed': 'github.pullrequest.closed',
  'merged': 'github.pullrequest.merged',
  'reopened': 'github.pullrequest.reopened',
  'synchronized': 'github.pullrequest.synchronized',
  'ready_for_review': 'github.pullrequest.ready_for_review',
  'converted_to_draft': 'github.pullrequest.converted_to_draft',
  'assigned': 'github.pullrequest.assigned',
  'unassigned': 'github.pullrequest.unassigned',
  'labeled': 'github.pullrequest.labeled',
  'unlabeled': 'github.pullrequest.unlabeled',
  'review_requested': 'github.pullrequest.review_requested',
  'review_request_removed': 'github.pullrequest.review_request_removed',
} as const;

// Validation Functions
export function validatePullRequestEvent(data: unknown): PullRequestEvent {
  return PullRequestEventSchema.parse(data);
}

export function isPullRequestEvent(data: unknown): data is PullRequestEvent {
  return PullRequestEventSchema.safeParse(data).success;
}

// Helper Functions
export function createPullRequestEvent(
  action: PullRequestAction,
  pullRequest: PullRequest,
  repository: GitHubRepositorySchema,
  actor: GitHubUserSchema,
  changes?: PullRequestChanges,
  additionalData?: {
    assignee?: GitHubUserSchema;
    requestedReviewer?: GitHubUserSchema;
    label?: { id: number; name: string; color: string; description: string | null };
  }
): Omit<PullRequestEvent, 'event_id' | 'timestamp'> {
  return {
    event_type: 'github.pull_request',
    source: 'github-client',
    action,
    pull_request: pullRequest,
    repository,
    actor,
    changes,
    assignee: additionalData?.assignee,
    requested_reviewer: additionalData?.requestedReviewer,
    label: additionalData?.label,
    metadata: {
      repository_id: repository.id.toString(),
      repository_name: repository.full_name,
      pull_request_id: pullRequest.id.toString(),
      pull_request_number: pullRequest.number.toString(),
      actor_id: actor.id.toString(),
      actor_login: actor.login,
      pr_state: pullRequest.state,
      pr_merged: pullRequest.merged.toString(),
      pr_draft: pullRequest.draft.toString(),
    },
  };
}

export function getPullRequestEventTopic(action: PullRequestAction): string {
  return PULL_REQUEST_EVENT_TOPICS[action];
}

// Pull Request State Helpers
export function isPullRequestMergeable(pr: PullRequest): boolean {
  return (pr.mergeable ?? false) && pr.state === 'open' && !pr.draft;
}

export function getPullRequestMergeStatus(pr: PullRequest): string {
  if (pr.draft) {
    return 'draft';
  } else if (pr.state === 'closed') {
    return pr.merged ? 'merged' : 'closed';
  } else if (pr.mergeable !== null) {
    if (pr.mergeable) {
      switch (pr.mergeable_state) {
        case 'clean': return 'ready';
        case 'unstable': return 'conflicts';
        case 'dirty': return 'failing_checks';
        default: return pr.mergeable_state;
      }
    } else {
      return 'blocked';
    }
  } else {
    return 'checking';
  }
}