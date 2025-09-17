export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RouteDefinition {
	readonly id: string;
	readonly method: HttpMethod;
	readonly path: string;
	readonly service: string;
	readonly action: string;
	readonly description: string;
	readonly transactional: boolean;
	readonly requiresAuth: boolean;
	readonly cacheTtlSeconds?: number;
	readonly rateLimitPerMinute?: number;
	readonly tags?: readonly string[];
}

export interface ApiOperationMetadata {
	readonly requestId: string;
	readonly source?: string;
	readonly correlationId?: string;
	readonly timestamp: number;
}

export interface GatewayRequest {
	readonly operationId: string;
	readonly method: HttpMethod;
	readonly path: string;
	readonly payload?: unknown;
	readonly query?: Record<string, unknown>;
	readonly headers?: Record<string, string>;
	readonly apiKey?: string;
	readonly metadata?: Record<string, unknown>;
}

export interface InternalRequest {
	readonly route: RouteDefinition;
	readonly payload?: unknown;
	readonly query?: Record<string, unknown>;
	readonly headers: Record<string, string>;
	readonly metadata: ApiOperationMetadata;
}

export interface InternalResponse {
	readonly statusCode: number;
	readonly body: unknown;
	readonly headers: Record<string, string>;
	readonly durationMs: number;
	readonly fromCache: boolean;
}

export interface GatewayResponse extends InternalResponse {
	readonly requestId: string;
	readonly auditId: string;
}

export interface RouteResolution {
	readonly route: RouteDefinition;
	readonly inputShape: Record<string, unknown>;
	readonly outputShape: Record<string, unknown>;
}

export interface AuditEntry {
	readonly id: string;
	readonly timestamp: number;
	readonly routeId: string;
	readonly statusCode: number;
	readonly latencyMs: number;
	readonly requestId: string;
	readonly correlationId?: string;
	readonly metadata?: Record<string, unknown>;
}

export interface ToolContracts {
	readonly name: string;
	readonly description: string;
	readonly inputExample: Record<string, unknown>;
	readonly outputExample: Record<string, unknown>;
	readonly errors: readonly string[];
}
