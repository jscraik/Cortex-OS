import { z } from 'zod';

// GitHub User Schema
export const GitHubUserSchema = z.object({
  id: z.number(),
  login: z.string(),
  avatar_url: z.string().url(),
  html_url: z.string().url(),
  type: z.enum(['User', 'Organization', 'Bot']),
  site_admin: z.boolean(),
  name: z.string().optional(),
  email: z.string().email().optional(),
});

export type GitHubUser = z.infer<typeof GitHubUserSchema>;

// GitHub Repository Schema
export const GitHubRepositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  owner: GitHubUserSchema,
  private: z.boolean(),
  html_url: z.string().url(),
  clone_url: z.string().url(),
  ssh_url: z.string(),
  default_branch: z.string(),
  description: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  pushed_at: z.string().datetime().nullable(),
  size: z.number(),
  stargazers_count: z.number(),
  watchers_count: z.number(),
  language: z.string().nullable(),
  has_issues: z.boolean(),
  has_projects: z.boolean(),
  has_wiki: z.boolean(),
  has_pages: z.boolean(),
  has_downloads: z.boolean(),
  archived: z.boolean(),
  disabled: z.boolean(),
  visibility: z.enum(['public', 'private', 'internal']),
});

export type GitHubRepository = z.infer<typeof GitHubRepositorySchema>;

// Repository Action Types
export const RepositoryActionSchema = z.enum([
  'created',
  'updated', 
  'deleted',
  'archived',
  'unarchived',
  'publicized',
  'privatized',
  'transferred'
]);

export type RepositoryAction = z.infer<typeof RepositoryActionSchema>;

// Repository Changes Schema
export const RepositoryChangesSchema = z.object({
  name: z.object({
    from: z.string()
  }).optional(),
  description: z.object({
    from: z.string().nullable()
  }).optional(),
  homepage: z.object({
    from: z.string().nullable()
  }).optional(),
  default_branch: z.object({
    from: z.string()
  }).optional(),
  visibility: z.object({
    from: z.string()
  }).optional(),
}).optional();

export type RepositoryChanges = z.infer<typeof RepositoryChangesSchema>;

// Repository Event Schema
export const RepositoryEventSchema = z.object({
  event_id: z.string().uuid(),
  event_type: z.literal('github.repository'),
  source: z.literal('github-client'),
  timestamp: z.string().datetime(),
  
  // Event-specific data
  action: RepositoryActionSchema,
  repository: GitHubRepositorySchema,
  actor: GitHubUserSchema,
  changes: RepositoryChangesSchema,
  
  // Metadata
  metadata: z.record(z.string()).optional(),
});

export type RepositoryEvent = z.infer<typeof RepositoryEventSchema>;

// Repository Event Topics Mapping
export const REPOSITORY_EVENT_TOPICS = {
  'created': 'github.repository.created',
  'updated': 'github.repository.updated',
  'deleted': 'github.repository.deleted',
  'archived': 'github.repository.archived',
  'unarchived': 'github.repository.unarchived',
  'publicized': 'github.repository.publicized',
  'privatized': 'github.repository.privatized',
  'transferred': 'github.repository.transferred',
} as const;

// Validation Functions
export function validateRepositoryEvent(data: unknown): RepositoryEvent {
  return RepositoryEventSchema.parse(data);
}

export function isRepositoryEvent(data: unknown): data is RepositoryEvent {
  return RepositoryEventSchema.safeParse(data).success;
}

// Helper Functions
export function createRepositoryEvent(
  action: RepositoryAction,
  repository: GitHubRepository,
  actor: GitHubUser,
  changes?: RepositoryChanges
): Omit<RepositoryEvent, 'event_id' | 'timestamp'> {
  return {
    event_type: 'github.repository',
    source: 'github-client',
    action,
    repository,
    actor,
    changes,
    metadata: {
      repository_id: repository.id.toString(),
      repository_name: repository.full_name,
      actor_id: actor.id.toString(),
      actor_login: actor.login,
    },
  };
}

export function getRepositoryEventTopic(action: RepositoryAction): string {
  return REPOSITORY_EVENT_TOPICS[action];
}