import { z } from 'zod';
import type {
	Event,
	Task,
	TaskStatus,
} from '@cortex-os/asbr-schemas';

export * from '@cortex-os/asbr-schemas';

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
