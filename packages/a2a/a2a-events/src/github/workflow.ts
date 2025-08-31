import { z } from 'zod';
import { GitHubUserSchema, GitHubRepositorySchema } from './repository';

// Workflow Commit Schema
export const WorkflowCommitSchema = z.object({
  id: z.string(),
  tree_id: z.string(),
  message: z.string(),
  timestamp: z.string().datetime(),
  author: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
  committer: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
});

export type WorkflowCommit = z.infer<typeof WorkflowCommitSchema>;

// Workflow Job Step Schema
export const WorkflowStepSchema = z.object({
  name: z.string(),
  status: z.enum(['queued', 'in_progress', 'completed']),
  conclusion: z.enum(['success', 'failure', 'neutral', 'cancelled', 'timed_out', 'action_required', 'skipped']).nullable(),
  number: z.number(),
  started_at: z.string().datetime().nullable(),
  completed_at: z.string().datetime().nullable(),
});

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

// Workflow Job Schema
export const WorkflowJobSchema = z.object({
  id: z.number(),
  run_id: z.number(),
  workflow_name: z.string().nullable(),
  head_branch: z.string().nullable(),
  run_url: z.string().url(),
  run_attempt: z.number(),
  node_id: z.string(),
  head_sha: z.string(),
  url: z.string().url(),
  html_url: z.string().url(),
  status: z.enum(['queued', 'in_progress', 'completed']),
  conclusion: z.enum(['success', 'failure', 'neutral', 'cancelled', 'timed_out', 'action_required', 'skipped']).nullable(),
  created_at: z.string().datetime(),
  started_at: z.string().datetime().nullable(),
  completed_at: z.string().datetime().nullable(),
  name: z.string(),
  steps: z.array(WorkflowStepSchema),
  check_run_url: z.string().url(),
  labels: z.array(z.string()),
  runner_id: z.number().nullable(),
  runner_name: z.string().nullable(),
  runner_group_id: z.number().nullable(),
  runner_group_name: z.string().nullable(),
});

export type WorkflowJob = z.infer<typeof WorkflowJobSchema>;

// Workflow Referenced Workflow Schema
export const ReferencedWorkflowSchema = z.object({
  path: z.string(),
  sha: z.string(),
  ref: z.string().nullable(),
});

export type ReferencedWorkflow = z.infer<typeof ReferencedWorkflowSchema>;

// Workflow Run Schema
export const WorkflowRunSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  head_branch: z.string().nullable(),
  head_sha: z.string(),
  path: z.string(),
  display_title: z.string(),
  run_number: z.number(),
  event: z.string(),
  status: z.enum(['queued', 'in_progress', 'completed']),
  conclusion: z.enum(['success', 'failure', 'neutral', 'cancelled', 'timed_out', 'action_required', 'stale']).nullable(),
  workflow_id: z.number(),
  check_suite_id: z.number(),
  check_suite_node_id: z.string(),
  url: z.string().url(),
  html_url: z.string().url(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  actor: GitHubUserSchema,
  run_attempt: z.number(),
  referenced_workflows: z.array(ReferencedWorkflowSchema),
  run_started_at: z.string().datetime().nullable(),
  triggering_actor: GitHubUserSchema,
  jobs_url: z.string().url(),
  logs_url: z.string().url(),
  check_suite_url: z.string().url(),
  artifacts_url: z.string().url(),
  cancel_url: z.string().url(),
  rerun_url: z.string().url(),
  previous_attempt_url: z.string().url().nullable(),
  workflow_url: z.string().url(),
  head_commit: WorkflowCommitSchema,
  repository: GitHubRepositorySchema,
  head_repository: GitHubRepositorySchema,
});

export type WorkflowRun = z.infer<typeof WorkflowRunSchema>;

// Workflow Action Types
export const WorkflowActionSchema = z.enum([
  'started',
  'completed',
  'cancelled',
  'failed',
  'requested',
  'in_progress'
]);

export type WorkflowAction = z.infer<typeof WorkflowActionSchema>;

// Workflow Event Schema
export const WorkflowEventSchema = z.object({
  event_id: z.string().uuid(),
  event_type: z.literal('github.workflow'),
  source: z.literal('github-client'),
  timestamp: z.string().datetime(),
  
  // Event-specific data
  action: WorkflowActionSchema,
  workflow_run: WorkflowRunSchema,
  repository: GitHubRepositorySchema,
  actor: GitHubUserSchema,
  
  // Additional context
  jobs: z.array(WorkflowJobSchema).optional(),
  triggering_event: z.string().optional(),
  
  // Metadata
  metadata: z.record(z.string()).optional(),
});

export type WorkflowEvent = z.infer<typeof WorkflowEventSchema>;

// Workflow Event Topics Mapping
export const WORKFLOW_EVENT_TOPICS = {
  'started': 'github.workflow.started',
  'completed': 'github.workflow.completed',
  'cancelled': 'github.workflow.cancelled',
  'failed': 'github.workflow.failed',
  'requested': 'github.workflow.requested',
  'in_progress': 'github.workflow.in_progress',
} as const;

// Validation Functions
export function validateWorkflowEvent(data: unknown): WorkflowEvent {
  return WorkflowEventSchema.parse(data);
}

export function isWorkflowEvent(data: unknown): data is WorkflowEvent {
  return WorkflowEventSchema.safeParse(data).success;
}

// Helper Functions
export function createWorkflowEvent(
  action: WorkflowAction,
  workflowRun: WorkflowRun,
  repository: GitHubRepositorySchema,
  actor: GitHubUserSchema,
  additionalData?: {
    jobs?: WorkflowJob[];
    triggeringEvent?: string;
  }
): Omit<WorkflowEvent, 'event_id' | 'timestamp'> {
  const duration = workflowRun.run_started_at && workflowRun.updated_at 
    ? (new Date(workflowRun.updated_at).getTime() - new Date(workflowRun.run_started_at).getTime()) / 1000
    : null;

  return {
    event_type: 'github.workflow',
    source: 'github-client',
    action,
    workflow_run: workflowRun,
    repository,
    actor,
    jobs: additionalData?.jobs,
    triggering_event: additionalData?.triggeringEvent,
    metadata: {
      repository_id: repository.id.toString(),
      repository_name: repository.full_name,
      workflow_id: workflowRun.workflow_id.toString(),
      workflow_run_id: workflowRun.id.toString(),
      workflow_run_number: workflowRun.run_number.toString(),
      actor_id: actor.id.toString(),
      actor_login: actor.login,
      workflow_status: workflowRun.status,
      workflow_conclusion: workflowRun.conclusion ?? 'null',
      workflow_event: workflowRun.event,
      workflow_branch: workflowRun.head_branch ?? 'null',
      workflow_duration_seconds: duration?.toString() ?? 'null',
      workflow_attempt: workflowRun.run_attempt.toString(),
    },
  };
}

export function getWorkflowEventTopic(action: WorkflowAction): string {
  return WORKFLOW_EVENT_TOPICS[action];
}

// Workflow Helper Functions
export function isWorkflowRunning(run: WorkflowRun): boolean {
  return run.status === 'queued' || run.status === 'in_progress';
}

export function isWorkflowCompleted(run: WorkflowRun): boolean {
  return run.status === 'completed';
}

export function isWorkflowSuccessful(run: WorkflowRun): boolean {
  return run.status === 'completed' && run.conclusion === 'success';
}

export function isWorkflowFailed(run: WorkflowRun): boolean {
  return run.status === 'completed' && 
         (run.conclusion === 'failure' || run.conclusion === 'cancelled' || run.conclusion === 'timed_out');
}

export function getWorkflowDurationInSeconds(run: WorkflowRun): number | null {
  if (!run.run_started_at || !run.updated_at) {
    return null;
  }
  
  const startTime = new Date(run.run_started_at);
  const endTime = new Date(run.updated_at);
  return Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
}

export function getWorkflowDurationInMinutes(run: WorkflowRun): number | null {
  const seconds = getWorkflowDurationInSeconds(run);
  return seconds ? Math.floor(seconds / 60) : null;
}

// Workflow Job Helpers
export function getFailedJobs(jobs: WorkflowJob[]): WorkflowJob[] {
  return jobs.filter(job => job.conclusion === 'failure');
}

export function getSuccessfulJobs(jobs: WorkflowJob[]): WorkflowJob[] {
  return jobs.filter(job => job.conclusion === 'success');
}

export function getRunningJobs(jobs: WorkflowJob[]): WorkflowJob[] {
  return jobs.filter(job => job.status === 'in_progress');
}

export function getJobDurationInSeconds(job: WorkflowJob): number | null {
  if (!job.started_at || !job.completed_at) {
    return null;
  }
  
  const startTime = new Date(job.started_at);
  const endTime = new Date(job.completed_at);
  return Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
}

// Workflow Step Helpers
export function getFailedSteps(job: WorkflowJob): WorkflowStep[] {
  return job.steps.filter(step => step.conclusion === 'failure');
}

export function getSuccessfulSteps(job: WorkflowJob): WorkflowStep[] {
  return job.steps.filter(step => step.conclusion === 'success');
}

// Workflow Run Analysis
export interface WorkflowRunAnalysis {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  duration: number | null;
  successRate: number;
  failureReasons: string[];
}

export function analyzeWorkflowRun(run: WorkflowRun, jobs?: WorkflowJob[]): WorkflowRunAnalysis {
  const analysis: WorkflowRunAnalysis = {
    totalJobs: jobs?.length ?? 0,
    successfulJobs: jobs?.filter(j => j.conclusion === 'success').length ?? 0,
    failedJobs: jobs?.filter(j => j.conclusion === 'failure').length ?? 0,
    cancelledJobs: jobs?.filter(j => j.conclusion === 'cancelled').length ?? 0,
    duration: getWorkflowDurationInSeconds(run),
    successRate: 0,
    failureReasons: [],
  };

  if (analysis.totalJobs > 0) {
    analysis.successRate = (analysis.successfulJobs / analysis.totalJobs) * 100;
  }

  // Extract failure reasons from failed jobs
  if (jobs) {
    const failedJobs = getFailedJobs(jobs);
    analysis.failureReasons = failedJobs.map(job => job.name);
  }

  return analysis;
}