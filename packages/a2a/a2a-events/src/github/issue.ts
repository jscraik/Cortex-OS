import { z } from 'zod';
import { GitHubUserSchema, GitHubRepositorySchema } from './repository';

// Issue Label Schema
export const IssueLabelSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string(),
  description: z.string().nullable(),
  default: z.boolean(),
  url: z.string().url(),
});

export type IssueLabel = z.infer<typeof IssueLabelSchema>;

// Issue Milestone Schema
export const IssueMilestoneSchema = z.object({
  id: z.number(),
  number: z.number(),
  state: z.enum(['open', 'closed']),
  title: z.string(),
  description: z.string().nullable(),
  creator: GitHubUserSchema,
  open_issues: z.number(),
  closed_issues: z.number(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  closed_at: z.string().datetime().nullable(),
  due_on: z.string().datetime().nullable(),
  url: z.string().url(),
  html_url: z.string().url(),
});

export type IssueMilestone = z.infer<typeof IssueMilestoneSchema>;

// Issue Schema
export const IssueSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  body: z.string().nullable(),
  user: GitHubUserSchema,
  labels: z.array(IssueLabelSchema),
  state: z.enum(['open', 'closed']),
  locked: z.boolean(),
  assignee: GitHubUserSchema.nullable(),
  assignees: z.array(GitHubUserSchema),
  milestone: IssueMilestoneSchema.nullable(),
  comments: z.number(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  closed_at: z.string().datetime().nullable(),
  author_association: z.enum([
    'OWNER',
    'MEMBER',
    'COLLABORATOR', 
    'CONTRIBUTOR',
    'FIRST_TIME_CONTRIBUTOR',
    'FIRST_TIMER',
    'NONE'
  ]),
  active_lock_reason: z.enum(['resolved', 'off-topic', 'too heated', 'spam']).nullable(),
  closed_by: GitHubUserSchema.nullable(),
  html_url: z.string().url(),
  url: z.string().url(),
});

export type Issue = z.infer<typeof IssueSchema>;

// Issue Action Types
export const IssueActionSchema = z.enum([
  'opened',
  'closed',
  'reopened',
  'assigned',
  'unassigned',
  'labeled',
  'unlabeled',
  'milestoned',
  'demilestoned',
  'edited',
  'locked',
  'unlocked',
  'pinned',
  'unpinned',
  'transferred'
]);

export type IssueAction = z.infer<typeof IssueActionSchema>;

// Issue Changes Schema
export const IssueChangesSchema = z.object({
  title: z.object({
    from: z.string()
  }).optional(),
  body: z.object({
    from: z.string().nullable()
  }).optional(),
}).optional();

export type IssueChanges = z.infer<typeof IssueChangesSchema>;

// Issue Event Schema
export const IssueEventSchema = z.object({
  event_id: z.string().uuid(),
  event_type: z.literal('github.issue'),
  source: z.literal('github-client'),
  timestamp: z.string().datetime(),
  
  // Event-specific data
  action: IssueActionSchema,
  issue: IssueSchema,
  repository: GitHubRepositorySchema,
  actor: GitHubUserSchema,
  changes: IssueChangesSchema,
  
  // Additional context
  assignee: GitHubUserSchema.optional(),
  label: IssueLabelSchema.optional(),
  milestone: IssueMilestoneSchema.optional(),
  
  // Metadata
  metadata: z.record(z.string()).optional(),
});

export type IssueEvent = z.infer<typeof IssueEventSchema>;

// Issue Event Topics Mapping
export const ISSUE_EVENT_TOPICS = {
  'opened': 'github.issue.opened',
  'closed': 'github.issue.closed',
  'reopened': 'github.issue.reopened',
  'assigned': 'github.issue.assigned',
  'unassigned': 'github.issue.unassigned',
  'labeled': 'github.issue.labeled',
  'unlabeled': 'github.issue.unlabeled',
  'milestoned': 'github.issue.milestoned',
  'demilestoned': 'github.issue.demilestoned',
  'edited': 'github.issue.edited',
  'locked': 'github.issue.locked',
  'unlocked': 'github.issue.unlocked',
  'pinned': 'github.issue.pinned',
  'unpinned': 'github.issue.unpinned',
  'transferred': 'github.issue.transferred',
} as const;

// Validation Functions
export function validateIssueEvent(data: unknown): IssueEvent {
  return IssueEventSchema.parse(data);
}

export function isIssueEvent(data: unknown): data is IssueEvent {
  return IssueEventSchema.safeParse(data).success;
}

// Helper Functions
export function createIssueEvent(
  action: IssueAction,
  issue: Issue,
  repository: GitHubRepositorySchema,
  actor: GitHubUserSchema,
  changes?: IssueChanges,
  additionalData?: {
    assignee?: GitHubUserSchema;
    label?: IssueLabel;
    milestone?: IssueMilestone;
  }
): Omit<IssueEvent, 'event_id' | 'timestamp'> {
  return {
    event_type: 'github.issue',
    source: 'github-client',
    action,
    issue,
    repository,
    actor,
    changes,
    assignee: additionalData?.assignee,
    label: additionalData?.label,
    milestone: additionalData?.milestone,
    metadata: {
      repository_id: repository.id.toString(),
      repository_name: repository.full_name,
      issue_id: issue.id.toString(),
      issue_number: issue.number.toString(),
      actor_id: actor.id.toString(),
      actor_login: actor.login,
      issue_state: issue.state,
      issue_locked: issue.locked.toString(),
      assignee_count: issue.assignees.length.toString(),
      labels_count: issue.labels.length.toString(),
      comments_count: issue.comments.toString(),
    },
  };
}

export function getIssueEventTopic(action: IssueAction): string {
  return ISSUE_EVENT_TOPICS[action];
}

// Issue Helper Functions
export function isIssueOpen(issue: Issue): boolean {
  return issue.state === 'open';
}

export function getIssuePriority(issue: Issue): 'low' | 'medium' | 'high' | 'critical' | 'unknown' {
  const labels = issue.labels.map(l => l.name.toLowerCase());
  
  if (labels.some(l => l.includes('critical') || l.includes('p0'))) {
    return 'critical';
  } else if (labels.some(l => l.includes('high') || l.includes('p1'))) {
    return 'high';
  } else if (labels.some(l => l.includes('medium') || l.includes('p2'))) {
    return 'medium';
  } else if (labels.some(l => l.includes('low') || l.includes('p3'))) {
    return 'low';
  }
  
  return 'unknown';
}

export function getIssueType(issue: Issue): 'bug' | 'feature' | 'enhancement' | 'question' | 'documentation' | 'other' {
  const labels = issue.labels.map(l => l.name.toLowerCase());
  
  if (labels.some(l => l.includes('bug') || l.includes('error') || l.includes('fix'))) {
    return 'bug';
  } else if (labels.some(l => l.includes('feature') || l.includes('new'))) {
    return 'feature';
  } else if (labels.some(l => l.includes('enhancement') || l.includes('improve'))) {
    return 'enhancement';
  } else if (labels.some(l => l.includes('question') || l.includes('help'))) {
    return 'question';
  } else if (labels.some(l => l.includes('doc') || l.includes('readme'))) {
    return 'documentation';
  }
  
  return 'other';
}

export function hasIssueLabel(issue: Issue, labelName: string): boolean {
  return issue.labels.some(label => label.name.toLowerCase() === labelName.toLowerCase());
}

export function getIssueAssigneeLogins(issue: Issue): string[] {
  return issue.assignees.map(user => user.login);
}

export function getIssueLabelNames(issue: Issue): string[] {
  return issue.labels.map(label => label.name);
}

// Issue Age Calculation
export function getIssueAgeInDays(issue: Issue): number {
  const createdAt = new Date(issue.created_at);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - createdAt.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getIssueLastUpdateInDays(issue: Issue): number {
  const updatedAt = new Date(issue.updated_at);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - updatedAt.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}