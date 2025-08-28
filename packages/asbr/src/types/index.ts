/**
 * Core ASBR Types and Data Models
 * Implements the stable v1 schema from the blueprint
 */

import { z } from 'zod';

// Base types
export type UUID = string;
export type EvidenceRisk = 'low' | 'medium' | 'high' | 'unknown';
export type TaskStatus =
  | 'queued'
  | 'planning'
  | 'running'
  | 'paused'
  | 'canceled'
  | 'succeeded'
  | 'failed';
export type SkillLevel = 'beginner' | 'intermediate' | 'expert';
export type RiskPreference = 'low' | 'balanced' | 'high';
export type Verbosity = 'low' | 'high';
export type Motion = 'reduced' | 'full';
export type Contrast = 'high' | 'default';
export type EventType =
  | 'PlanStarted'
  | 'StepCompleted'
  | 'AwaitingApproval'
  | 'Canceled'
  | 'Resumed'
  | 'DeliverableReady'
  | 'Failed';

// Accessibility types
export type AriaLivePriority = 'polite' | 'assertive';
export type AnnouncementType = 'status' | 'progress' | 'error' | 'success' | 'info';

// Evidence Pointer Schema
export const EvidencePointerSchema = z.object({
  path: z.string(),
  start: z.number().optional(),
  end: z.number().optional(),
  url: z.string().optional(),
  hash: z.string(),
});

export type EvidencePointer = z.infer<typeof EvidencePointerSchema>;

// Evidence Schema
export const EvidenceSchema = z.object({
  id: z.string().uuid(),
  source: z.enum(['file', 'url', 'repo', 'note']),
  pointers: z.array(EvidencePointerSchema),
  claim: z.string(),
  confidence: z.number().min(0).max(1),
  risk: z.enum(['low', 'medium', 'high', 'unknown']),
  createdAt: z.string().datetime(),
  schema: z.literal('cortex.evidence@1'),
});

export type Evidence = z.infer<typeof EvidenceSchema>;

// Task Input Schema
export const TaskInputSchema = z.object({
  title: z.string().min(1),
  brief: z.string().min(1),
  inputs: z.array(
    z.union([
      z.object({ kind: z.literal('repo'), path: z.string() }),
      z.object({ kind: z.literal('doc'), path: z.string() }),
      z.object({ kind: z.literal('text'), value: z.string() }),
    ]),
  ),
  scopes: z.array(z.string()),
  deadlines: z
    .object({
      soft: z.string().datetime().optional(),
      hard: z.string().datetime().optional(),
    })
    .optional(),
  a11yProfileId: z.string().uuid().optional(),
  preferences: z
    .object({
      risk: z.enum(['low', 'balanced', 'high']).optional(),
      verbosity: z.enum(['low', 'high']).optional(),
      motion: z.enum(['reduced', 'full']).optional(),
      contrast: z.enum(['high', 'default']).optional(),
    })
    .optional(),
  schema: z.literal('cortex.task.input@1'),
});

export type TaskInput = z.infer<typeof TaskInputSchema>;

// Artifact Reference Schema
export const ArtifactRefSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(['diff', 'doc', 'plan', 'report']),
  path: z.string(),
  digest: z.string(),
  createdAt: z.string().datetime(),
  schema: z.literal('cortex.artifact@1'),
});

export type ArtifactRef = z.infer<typeof ArtifactRefSchema>;

// Task Schema
export const TaskSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['queued', 'planning', 'running', 'paused', 'canceled', 'succeeded', 'failed']),
  currentStep: z.string().optional(),
  artifacts: z.array(ArtifactRefSchema),
  evidenceIds: z.array(z.string().uuid()),
  approvals: z.array(
    z.object({
      step: z.string(),
      at: z.string().datetime(),
      by: z.enum(['user', 'policy']),
    }),
  ),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  schema: z.literal('cortex.task@1'),
});

export type Task = z.infer<typeof TaskSchema>;

// User Preferences Schema - defined here as it's used by ProfileSchema
export const PreferencesSchema = z.object({
  risk: z.enum(['low', 'balanced', 'high']).optional(),
  verbosity: z.enum(['low', 'high']).optional(),
  motion: z.enum(['reduced', 'full']).optional(),
  contrast: z.enum(['high', 'default']).optional(),
});

export type Preferences = z.infer<typeof PreferencesSchema>;

// User Profile Schema - references PreferencesSchema above
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  skill: z.enum(['beginner', 'intermediate', 'expert']),
  tools: z.array(z.string()),
  a11y: z.object({
    keyboardOnly: z.boolean().optional(),
    screenReader: z.boolean().optional(),
    reducedMotion: z.boolean().optional(),
    highContrast: z.boolean().optional(),
  }),
  preferences: PreferencesSchema.optional(),
  schema: z.literal('cortex.profile@1'),
});

export type Profile = z.infer<typeof ProfileSchema>;

// Event Schema
export const EventSchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    'PlanStarted',
    'StepCompleted',
    'AwaitingApproval',
    'Canceled',
    'Resumed',
    'DeliverableReady',
    'Failed',
  ]),
  taskId: z.string().uuid(),
  step: z.string().optional(),
  ariaLiveHint: z.string().optional(),
  evidenceDelta: z.array(z.string().uuid()).optional(),
  timestamp: z.string().datetime(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export type Event = z.infer<typeof EventSchema>;

// API Request/Response Types
export interface CreateTaskRequest {
  input: TaskInput;
  idempotencyKey?: string;
}

export interface CreateTaskResponse {
  task: Task;
}

export interface GetTaskResponse {
  task: Task;
}

export interface ListArtifactsQuery {
  kind?: string;
  createdAfter?: string;
  createdBefore?: string;
  limit?: number;
  offset?: number;
}

export interface ListArtifactsResponse {
  artifacts: ArtifactRef[];
  total: number;
}

export interface CreateProfileRequest {
  profile: Omit<Profile, 'id'>;
}

export interface CreateProfileResponse {
  profile: Profile;
}

// SDK Interface Types
export interface TaskRef {
  id: string;
  status: TaskStatus;
  subscribe(callback: (event: Event) => void): () => void;
  getTask(): Promise<Task>;
  cancel(): Promise<void>;
  resume(): Promise<void>;
}

export interface UnsubscribeFunction {
  (): void;
}

// Configuration Types
export const ConfigSchema = z.object({
  events: z.object({
    transport: z.enum(['socket', 'sse', 'poll']),
    poll_interval_ms: z.number().positive(),
    heartbeat_ms: z.number().positive(),
    idle_timeout_ms: z.number().positive(),
    backoff: z.object({
      base_ms: z.number().positive(),
      max_ms: z.number().positive(),
      factor: z.number().positive(),
    }),
  }),
  determinism: z.object({
    max_normalize_bytes: z.number().positive(),
    max_concurrency: z.number().positive(),
    normalize: z.object({
      newline: z.enum(['LF', 'CRLF']),
      trim_trailing_ws: z.boolean(),
      strip_dates: z.boolean(),
    }),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

// XDG Directory Structure
export interface XDGPaths {
  config: string; // $XDG_CONFIG_HOME/cortex/asbr/
  data: string; // $XDG_DATA_HOME/cortex/asbr/
  state: string; // $XDG_STATE_HOME/cortex/asbr/
  cache: string; // $XDG_CACHE_HOME/cortex/asbr/
}

// Security and MCP Types
export interface MCPAllowlistEntry {
  name: string;
  version: string;
  scopes: string[];
  ttl?: number;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  rules: SecurityRule[];
  enabled: boolean;
}

export interface SecurityRule {
  type: 'shell_deny' | 'egress_deny' | 'file_access' | 'api_rate_limit';
  pattern?: string;
  allowlist?: string[];
  limit?: number;
}

// Error Types
export class ASBRError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ASBRError';
  }
}

export class ValidationError extends ASBRError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ASBRError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ASBRError {
  constructor(message: string = 'Insufficient privileges') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends ASBRError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}
