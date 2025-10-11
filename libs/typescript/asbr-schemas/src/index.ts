import { z } from 'zod';

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

export type AriaLivePriority = 'polite' | 'assertive';
export type AnnouncementType = 'status' | 'progress' | 'error' | 'success' | 'info';

export const EvidencePointerSchema = z.object({
	path: z.string(),
	start: z.number().optional(),
	end: z.number().optional(),
	url: z.string().optional(),
	hash: z.string(),
});

export type EvidencePointer = z.infer<typeof EvidencePointerSchema>;

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

export const ArtifactRefSchema = z.object({
	id: z.string().uuid(),
	kind: z.enum(['diff', 'doc', 'plan', 'report']),
	path: z.string(),
	digest: z.string(),
	createdAt: z.string().datetime(),
	schema: z.literal('cortex.artifact@1'),
});

export type ArtifactRef = z.infer<typeof ArtifactRefSchema>;

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

export const PreferencesSchema = z.object({
	risk: z.enum(['low', 'balanced', 'high']).optional(),
	verbosity: z.enum(['low', 'high']).optional(),
	motion: z.enum(['reduced', 'full']).optional(),
	contrast: z.enum(['high', 'default']).optional(),
});

export type Preferences = z.infer<typeof PreferencesSchema>;

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
	traceparent: z
		.string()
		.regex(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/)
		.optional(),
});

export type Event = z.infer<typeof EventSchema>;

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

export interface TaskRef {
	id: string;
	status: TaskStatus;
	subscribe(callback: (event: Event) => void): () => void;
	getTask(): Promise<Task>;
	cancel(): Promise<void>;
	resume(): Promise<void>;
}

export type UnsubscribeFunction = () => void;

export const ConfigSchema = z.object({
	events: z.object({
		transport: z.enum(['socket', 'sse']),
		heartbeat_ms: z.number().positive(),
		idle_timeout_ms: z.number().positive(),
		max_task_events: z.number().positive(),
		max_global_events: z.number().positive(),
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
	cache_ttl_ms: z.number().positive(),
});

export type Config = z.infer<typeof ConfigSchema>;

export const VersionPinsSchema = z.record(
	z.string(),
	z.string().regex(/^(\d+)\.(\d+)\.(\d+)(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/),
);

export type VersionPins = z.infer<typeof VersionPinsSchema>;

export interface XDGPaths {
	config: string;
	data: string;
	state: string;
	cache: string;
}

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

export const RouteInfoSchema = z.object({
	path: z.string(),
	methods: z.array(z.string()),
	version: z.string(),
});

export const ServiceMapSchema = z.object({
        routes: z.array(RouteInfoSchema),
});

export type RouteInfo = z.infer<typeof RouteInfoSchema>;
export type ServiceMap = z.infer<typeof ServiceMapSchema>;

const ConnectorAuthSchema = z
        .object({
                type: z.enum(['apiKey', 'bearer', 'none']),
                headerName: z.string().min(1).optional(),
        })
        .strict();

const ConnectorQuotaBudgetSchema = z
        .object({
                perMinute: z.number().int().min(0).optional(),
                perHour: z.number().int().min(0).optional(),
                concurrent: z.number().int().min(0).optional(),
        })
        .strict();

export const ConnectorManifestEntrySchema = z
        .object({
                id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}$/),
                name: z.string().min(1),
                displayName: z.string().min(1),
                version: z.string().min(1),
                description: z.string().min(1).optional(),
                scopes: z.array(z.string().min(1)).min(1),
                quotas: z.record(z.number().int().nonnegative()).default({}),
                timeouts: z.record(z.number().int().nonnegative()).default({}),
                status: z.enum(['enabled', 'disabled', 'preview']).optional(),
                enabled: z.boolean().default(true),
                ttlSeconds: z.number().int().positive(),
                metadata: z.record(z.unknown()).optional(),
                endpoint: z.string().url(),
                auth: ConnectorAuthSchema,
                status: z.enum(['enabled', 'disabled', 'preview']).default('enabled'),
                description: z.string().min(1).optional(),
                endpoint: z.string().url(),
                authentication: z
                        .object({
                                headers: z
                                        .array(
                                                z
                                                        .object({
                                                                name: z.string().min(1),
                                                                value: z.string().min(1),
                                                        })
                                                        .strict(),
                                        )
                                        .min(1),
                        })
                        .strict(),
                scopes: z
                        .array(z.string().min(1))
                        .min(1)
                        .superRefine((value, ctx) => {
                                if (new Set(value).size !== value.length) {
                                        ctx.addIssue({
                                                code: z.ZodIssueCode.custom,
                                                message: 'Scopes must be unique',
                                        });
                                }
                        }),
                quotas: z
                        .object({
                                per_minute: z.number().int().min(0).optional(),
                                per_hour: z.number().int().min(0).optional(),
                                per_day: z.number().int().min(0).optional(),
                                concurrent: z.number().int().min(0).optional(),
                        })
                        .strict(),
                ttl_seconds: z.number().int().min(1),
                metadata: z.record(z.string(), z.unknown()).optional(),
                headers: z.record(z.string().min(1), z.string()).optional(),
                tags: z.array(z.string().min(1)).optional(),
        })
        .strict();

export const ConnectorsManifestSchema = z
        .object({
                $schema: z.string().min(1).optional(),
                id: z.string().min(1),
                manifestVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
                generatedAt: z.string().datetime({ offset: true }).optional(),
                ttlSeconds: z.number().int().positive().optional(),
                id: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),
                $schema: z.string().min(1).optional(),
                schema_version: z.string().regex(/^\d+\.\d+\.\d+$/),
                generated_at: z.string().datetime({ offset: true }).optional(),
                connectors: z.array(ConnectorManifestEntrySchema).min(1),
        })
        .strict();

export type ConnectorManifestEntry = z.infer<typeof ConnectorManifestEntrySchema>;
export type ConnectorsManifest = z.infer<typeof ConnectorsManifestSchema>;

export const ConnectorServiceEntrySchema = z
        .object({
                id: z.string().min(1),
                version: z.string().min(1),
                displayName: z.string().min(1),
                endpoint: z.string().url(),
                auth: ConnectorAuthSchema,
                scopes: z.array(z.string().min(1)).min(1),
                ttlSeconds: z.number().int().positive(),
                enabled: z.boolean().default(true),
                metadata: z.record(z.unknown()).optional(),
                quotas: z.record(z.number().int().nonnegative()).optional(),
                timeouts: z.record(z.number().int().nonnegative()).optional(),
                description: z.string().min(1).optional(),
                enabled: z.boolean(),
                metadata: z
                        .object({ brand: z.literal('brAInwav') })
                        .passthrough()
                        .default({ brand: 'brAInwav' }),
                quotas: ConnectorQuotaBudgetSchema.optional(),
                headers: z.record(z.string().min(1), z.string()).optional(),
                description: z.string().optional(),
                tags: z.array(z.string().min(1)).optional(),
        })
        .strict();

export const ConnectorServiceMapSchema = z
        .object({
                id: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),
                brand: z.literal('brAInwav'),
                generatedAt: z.string().datetime(),
                ttlSeconds: z.number().int().positive(),
                connectors: z.array(ConnectorServiceEntrySchema).min(1),
                signature: z.string().min(1),
        })
        .strict();

export type ConnectorServiceEntry = z.infer<typeof ConnectorServiceEntrySchema>;
export type ConnectorServiceMap = z.infer<typeof ConnectorServiceMapSchema>;

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
