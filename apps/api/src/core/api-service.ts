import { randomUUID } from 'node:crypto';

import { ResponseCache } from './cache.js';
import {
	AuditLogger,
	MetricsCollector,
	PerformanceMonitor,
	StructuredLogger,
} from './observability.js';
import { RateLimitError, RateLimiter } from './rate-limiter.js';
import { RequestRouter } from './request-router.js';
import { sanitizeHeaders, sanitizePayload } from './sanitizer.js';
import { SecurityError, SecurityGuard } from './security.js';
import { TransactionError, TransactionManager } from './transaction.js';
import type {
	ApiOperationMetadata,
	GatewayRequest,
	GatewayResponse,
	InternalRequest,
	RouteDefinition,
	RouteResolution,
} from './types.js';

export interface ApiHandlerResult {
	readonly statusCode: number;
	readonly body: unknown;
	readonly headers?: Record<string, string>;
}

export interface ApiHandlerContext {
	readonly metadata: ApiOperationMetadata;
	readonly logger: StructuredLogger;
}

export type ApiHandler = (
	request: InternalRequest,
	context: ApiHandlerContext,
) => Promise<ApiHandlerResult> | ApiHandlerResult;

export interface ApiServiceDependencies {
	readonly router: RequestRouter;
	readonly security: SecurityGuard;
	readonly rateLimiter: RateLimiter;
	readonly cache: ResponseCache<GatewayResponse>;
	readonly logger: StructuredLogger;
	readonly metrics: MetricsCollector;
	readonly audit: AuditLogger;
	readonly performance: PerformanceMonitor;
	readonly transactions: TransactionManager;
	readonly handlers: Record<string, ApiHandler>;
}

export class ApiServiceError extends Error {
	constructor(
		message: string,
		readonly code: string,
		readonly details?: Record<string, unknown>,
	) {
		super(message);
		this.name = 'ApiServiceError';
	}
}

export class ApiService {
	private readonly router: RequestRouter;
	private readonly security: SecurityGuard;
	private readonly rateLimiter: RateLimiter;
	private readonly cache: ResponseCache<GatewayResponse>;
	private readonly logger: StructuredLogger;
	private readonly metrics: MetricsCollector;
	private readonly audit: AuditLogger;
	private readonly performance: PerformanceMonitor;
	private readonly transactions: TransactionManager;
	private readonly handlers: Record<string, ApiHandler>;

	constructor(dependencies: ApiServiceDependencies) {
		this.router = dependencies.router;
		this.security = dependencies.security;
		this.rateLimiter = dependencies.rateLimiter;
		this.cache = dependencies.cache;
		this.logger = dependencies.logger;
		this.metrics = dependencies.metrics;
		this.audit = dependencies.audit;
		this.performance = dependencies.performance;
		this.transactions = dependencies.transactions;
		this.handlers = dependencies.handlers;
	}

	async execute(request: GatewayRequest): Promise<GatewayResponse> {
		const sanitizedHeaders = sanitizeHeaders(request.headers);
		const sanitizedPayload = sanitizePayload(request.payload);
		const routeResolution = this.resolveRoute(request, sanitizedHeaders);
		const { route } = routeResolution;

		if (route.requiresAuth) {
			this.security.verify(request.apiKey);
		}

		if (route.rateLimitPerMinute && request.apiKey) {
			this.rateLimiter.consume(`${request.apiKey}:${route.id}`, 1);
		}

		const metadata = this.createMetadata(request);
		const cacheKey = this.createCacheKey(
			route,
			sanitizedPayload,
			sanitizedHeaders,
		);
		if (route.cacheTtlSeconds) {
			const cached = this.cache.get(cacheKey);
			if (cached) {
				this.metrics.increment('mcp.api.cache.hit');
				return { ...cached, fromCache: true } satisfies GatewayResponse;
			}
			this.metrics.increment('mcp.api.cache.miss');
		}

		const internalRequest: InternalRequest = {
			route,
			payload: sanitizedPayload,
			query: sanitizePayload(request.query ?? {}),
			headers: sanitizedHeaders,
			metadata,
		};

		const handlerKey = this.getHandlerKey(route);
		const handler = this.handlers[handlerKey];
		if (!handler) {
			throw new ApiServiceError(
				`No handler registered for ${handlerKey}`,
				'E_HANDLER_NOT_FOUND',
				{ route: route.id },
			);
		}

		let handlerResult: ApiHandlerResult;
		let durationMs = 0;
		try {
			const execution = await this.performance.measure(handlerKey, async () => {
				if (route.transactional) {
					const { result } = await this.transactions.runInTransaction(() =>
						handler(internalRequest, { metadata, logger: this.logger }),
					);
					return result;
				}
				return handler(internalRequest, { metadata, logger: this.logger });
			});
			handlerResult = execution.result;
			durationMs = execution.durationMs;
		} catch (error) {
			if (
				error instanceof TransactionError ||
				error instanceof SecurityError ||
				error instanceof RateLimitError
			) {
				throw error;
			}
			this.metrics.increment('mcp.api.errors');
			this.logger.error('API handler threw unexpected error', {
				error: (error as Error).message,
				handler: handlerKey,
			});
			throw new ApiServiceError(
				'Internal API handler failure',
				'E_HANDLER_FAILURE',
				{ handler: handlerKey },
			);
		}

		const gatewayResponse: GatewayResponse = {
			statusCode: handlerResult.statusCode,
			body: handlerResult.body,
			headers: sanitizeHeaders(handlerResult.headers ?? {}),
			durationMs,
			fromCache: false,
			requestId: metadata.requestId,
			auditId: '',
		};

		const recorded = this.audit.record({
			routeId: route.id,
			statusCode: gatewayResponse.statusCode,
			latencyMs: gatewayResponse.durationMs,
			requestId: metadata.requestId,
			correlationId: metadata.correlationId,
			metadata: request.metadata,
		});
		gatewayResponse.auditId = recorded.id;

		this.metrics.increment('mcp.api.requests');

		if (
			route.cacheTtlSeconds &&
			gatewayResponse.statusCode >= 200 &&
			gatewayResponse.statusCode < 300
		) {
			this.cache.set(cacheKey, gatewayResponse, route.cacheTtlSeconds);
		}

		return gatewayResponse;
	}

	private resolveRoute(
		request: GatewayRequest,
		headers: Record<string, string>,
	): RouteResolution {
		try {
			if (request.operationId) {
				return this.router.resolveById(request.operationId);
			}
			return this.router.resolve(request.method, request.path);
		} catch (_error) {
			this.logger.warn('Failed to resolve route', { request, headers });
			throw new ApiServiceError('Unknown API operation', 'E_ROUTE_NOT_FOUND', {
				method: request.method,
				path: request.path,
				operationId: request.operationId,
			});
		}
	}

	private getHandlerKey(route: RouteDefinition): string {
		return `${route.service}.${route.action}`;
	}

	private createMetadata(request: GatewayRequest): ApiOperationMetadata {
		const correlationId = (request.metadata?.correlationId ??
			request.headers?.['x-correlation-id']) as string | undefined;
		return {
			requestId: randomUUID(),
			source: (request.metadata?.source as string | undefined) ?? 'mcp',
			correlationId,
			timestamp: Date.now(),
		};
	}

	private createCacheKey(
		route: RouteDefinition,
		payload: unknown,
		headers: Record<string, string>,
	): string {
		return JSON.stringify({
			id: route.id,
			payload,
			headers,
		});
	}
}

export function createDefaultApiService(
	dependencies: Partial<ApiServiceDependencies> &
		Pick<ApiServiceDependencies, 'handlers'>,
): ApiService {
	const router = dependencies.router ?? new RequestRouter();
	const logger = dependencies.logger ?? new StructuredLogger();
	return new ApiService({
		router,
		security:
			dependencies.security ??
			new SecurityGuard({ acceptedApiKeys: ['local-api-key'] }),
		rateLimiter:
			dependencies.rateLimiter ??
			new RateLimiter({ windowMs: 60_000, maxRequests: 30 }),
		cache: dependencies.cache ?? new ResponseCache<GatewayResponse>(30),
		logger,
		metrics: dependencies.metrics ?? new MetricsCollector(),
		audit: dependencies.audit ?? new AuditLogger(),
		performance: dependencies.performance ?? new PerformanceMonitor(),
		transactions: dependencies.transactions ?? new TransactionManager(),
		handlers: dependencies.handlers,
	});
}
