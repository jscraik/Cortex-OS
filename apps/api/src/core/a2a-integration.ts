import { randomUUID } from 'node:crypto';

import { createApiBus } from '../a2a.js';
import type { StructuredLogger } from './observability.js';
import type {
	ApiOperationMetadata,
	GatewayRequest,
	GatewayResponse,
	InternalRequest,
	RouteDefinition,
} from './types.js';

// ================================
// API A2A Event Type Constants
// ================================

export const ApiEventTypes = {
	// Request Processing Events
	REQUEST_RECEIVED: 'cortex.api.request.received',
	REQUEST_ROUTED: 'cortex.api.request.routed',
	REQUEST_VALIDATED: 'cortex.api.request.validated',
	REQUEST_REJECTED: 'cortex.api.request.rejected',

	// Response Events
	RESPONSE_GENERATED: 'cortex.api.response.generated',
	RESPONSE_CACHED: 'cortex.api.response.cached',
	RESPONSE_SENT: 'cortex.api.response.sent',

	// Webhook Events
	WEBHOOK_RECEIVED: 'cortex.api.webhook.received',
	WEBHOOK_PROCESSED: 'cortex.api.webhook.processed',
	WEBHOOK_FAILED: 'cortex.api.webhook.failed',

	// Async Job Events
	JOB_CREATED: 'cortex.api.job.created',
	JOB_STARTED: 'cortex.api.job.started',
	JOB_PROGRESS: 'cortex.api.job.progress',
	JOB_COMPLETED: 'cortex.api.job.completed',
	JOB_FAILED: 'cortex.api.job.failed',

	// Cross-Service Coordination Events
	SERVICE_REQUEST: 'cortex.api.service.request',
	SERVICE_RESPONSE: 'cortex.api.service.response',
	SERVICE_ERROR: 'cortex.api.service.error',

	// Security & Rate Limiting Events
	RATE_LIMIT_HIT: 'cortex.api.rate_limit.hit',
	AUTH_FAILED: 'cortex.api.auth.failed',
	SECURITY_VIOLATION: 'cortex.api.security.violation',
} as const;

// ================================
// A2A Event Envelope Interface (CloudEvents 1.0 Compatible)
// ================================

export interface A2AEnvelope {
	readonly specversion: string;
	readonly id: string;
	readonly source: string;
	readonly type: string;
	readonly datacontenttype?: string;
	readonly dataschema?: string;
	readonly subject?: string;
	readonly time?: string;
	readonly data: unknown;
	readonly correlationId?: string;
	readonly causationId?: string;
}

// ================================
// API A2A Event Data Interfaces
// ================================

export interface ApiRequestEvent {
	readonly requestId: string;
	readonly method: string;
	readonly path: string;
	readonly operationId?: string;
	readonly correlationId?: string;
	readonly source?: string;
	readonly timestamp: number;
	readonly metadata?: Record<string, unknown>;
}

export interface ApiRouteEvent extends ApiRequestEvent {
	readonly route: RouteDefinition;
	readonly handlerKey: string;
	readonly requiresAuth: boolean;
	readonly cacheable: boolean;
}

export interface ApiResponseEvent extends ApiRequestEvent {
	readonly statusCode: number;
	readonly durationMs: number;
	readonly fromCache: boolean;
	readonly bodySize?: number;
	readonly headers?: Record<string, string>;
}

export interface WebhookEvent {
	readonly webhookId: string;
	readonly source: string;
	readonly event: string;
	readonly payload: unknown;
	readonly headers: Record<string, string>;
	readonly timestamp: number;
	readonly signature?: string;
	readonly verified: boolean;
}

export interface AsyncJobEvent {
	readonly jobId: string;
	readonly type: string;
	readonly status: 'created' | 'started' | 'progress' | 'completed' | 'failed';
	readonly progress?: number;
	readonly result?: unknown;
	readonly error?: string;
	readonly metadata: Record<string, unknown>;
	readonly timestamp: number;
	readonly estimatedDuration?: number;
	readonly actualDuration?: number;
}

export interface ServiceEvent extends ApiRequestEvent {
	readonly targetService: string;
	readonly action: string;
	readonly timeout?: number;
	readonly retryCount?: number;
}

export interface SecurityEvent extends ApiRequestEvent {
	readonly violationType: 'rate_limit' | 'auth_failure' | 'security_violation';
	readonly details: Record<string, unknown>;
	readonly severity: 'low' | 'medium' | 'high' | 'critical';
	readonly clientIp?: string;
	readonly userAgent?: string;
}

// ================================
// Event Handler Types
// ================================

export type EventHandler = (envelope: A2AEnvelope) => Promise<void> | void;

// ================================
// API A2A Bus Integration Service
// ================================

export class ApiBusIntegration {
	private readonly source = 'cortex.api';
	private readonly logger: StructuredLogger;
	private readonly activeJobs = new Map<string, AsyncJobEvent>();
	private readonly webhookHandlers = new Map<
		string,
		(event: WebhookEvent) => Promise<void>
	>();
	private readonly eventHandlers = new Map<string, EventHandler[]>();
	private readonly events: A2AEnvelope[] = [];
	private readonly a2aBus: ReturnType<typeof createApiBus>;

	constructor(logger: StructuredLogger) {
		this.logger = logger;
		// Initialize real A2A core integration
		this.a2aBus = createApiBus({
			busOptions: {
				enableTracing: true,
				strictValidation: true,
			},
		});
	}

	// ================================
	// Bus Lifecycle Management
	// ================================

	async start(): Promise<void> {
		try {
			this.logger.info('Starting API A2A bus integration');

			// Bind event handlers to the real A2A bus
			const handlerMappings = Object.entries(this.eventHandlers).map(
				([eventType, handlers]) => ({
					type: eventType,
					handle: async (envelope: A2AEnvelope) => {
						// Store for history tracking
						this.events.push(envelope);

						// Execute all handlers
						for (const handler of handlers) {
							try {
								await handler(envelope);
							} catch (error) {
								this.logger.error(`Error in event handler for ${eventType}`, {
									error,
								});
							}
						}
					},
				}),
			);

			if (handlerMappings.length > 0) {
				await this.a2aBus.bus.bind(handlerMappings);
			}

			this.logger.info('API A2A bus integration started successfully');
		} catch (error) {
			this.logger.error('Failed to start API A2A bus integration', { error });
			throw error;
		}
	}

	async stop(): Promise<void> {
		try {
			this.logger.info('Stopping API A2A bus integration');

			// Stop the real A2A bus
			if (this.a2aBus.bus && typeof this.a2aBus.bus.close === 'function') {
				await this.a2aBus.bus.close();
			}

			this.activeJobs.clear();
			this.webhookHandlers.clear();
			this.eventHandlers.clear();
			this.events.length = 0;
			this.logger.info('API A2A bus integration stopped');
		} catch (error) {
			this.logger.error('Failed to stop API A2A bus integration', { error });
			throw error;
		}
	}

	// ================================
	// Event Publishing
	// ================================

	private async publishEvent(type: string, data: unknown): Promise<void> {
		const envelope: A2AEnvelope = {
			specversion: '1.0',
			id: randomUUID(),
			source: this.source,
			type,
			time: new Date().toISOString(),
			data,
			datacontenttype: 'application/json',
		};

		// Store event for retrieval
		this.events.push(envelope);

		// Publish through real A2A bus instead of local handlers
		try {
			await this.a2aBus.bus.publish(envelope);
			this.logger.debug(`Published A2A event via real bus: ${type}`, {
				eventId: envelope.id,
			});
		} catch (error) {
			this.logger.error(`Failed to publish A2A event: ${type}`, { error });

			// Fallback to local handlers if bus publish fails
			const handlers = this.eventHandlers.get(type) || [];
			for (const handler of handlers) {
				try {
					await handler(envelope);
				} catch (handlerError) {
					this.logger.error(`Error in fallback handler for ${type}`, {
						error: handlerError,
					});
				}
			}
		}
	}

	// ================================
	// Request Processing Events
	// ================================

	async publishRequestReceived(
		request: GatewayRequest,
		metadata: ApiOperationMetadata,
	): Promise<void> {
		const data: ApiRequestEvent = {
			requestId: metadata.requestId,
			method: request.method,
			path: request.path,
			operationId: request.operationId,
			correlationId: metadata.correlationId,
			source: metadata.source,
			timestamp: metadata.timestamp,
			metadata: request.metadata as Record<string, unknown> | undefined,
		};

		await this.publishEvent(ApiEventTypes.REQUEST_RECEIVED, data);
		this.logger.debug('Published request received event', {
			requestId: metadata.requestId,
		});
	}

	async publishRequestRouted(request: InternalRequest): Promise<void> {
		const data: ApiRouteEvent = {
			requestId: request.metadata.requestId,
			method: request.route.method,
			path: request.route.path,
			operationId: request.route.id,
			correlationId: request.metadata.correlationId,
			source: request.metadata.source,
			timestamp: request.metadata.timestamp,
			route: request.route,
			handlerKey: `${request.route.service}.${request.route.action}`,
			requiresAuth: request.route.requiresAuth,
			cacheable: !!request.route.cacheTtlSeconds,
			metadata: request.metadata as unknown as Record<string, unknown>,
		};

		await this.publishEvent(ApiEventTypes.REQUEST_ROUTED, data);
		this.logger.debug('Published request routed event', {
			requestId: request.metadata.requestId,
		});
	}

	async publishRequestRejected(
		request: GatewayRequest,
		reason: string,
		metadata: ApiOperationMetadata,
	): Promise<void> {
		const data: ApiRequestEvent & { reason: string } = {
			requestId: metadata.requestId,
			method: request.method,
			path: request.path,
			operationId: request.operationId,
			correlationId: metadata.correlationId,
			source: metadata.source,
			timestamp: metadata.timestamp,
			metadata: {
				...(request.metadata as Record<string, unknown>),
				rejectionReason: reason,
			},
			reason,
		};

		await this.publishEvent(ApiEventTypes.REQUEST_REJECTED, data);
		this.logger.warn('Published request rejected event', {
			requestId: metadata.requestId,
			reason,
		});
	}

	async publishResponseGenerated(
		response: GatewayResponse,
		metadata: ApiOperationMetadata,
	): Promise<void> {
		const data: ApiResponseEvent = {
			requestId: metadata.requestId,
			method: 'unknown', // Would need to be passed in real implementation
			path: 'unknown', // Would need to be passed in real implementation
			correlationId: metadata.correlationId,
			source: metadata.source,
			timestamp: metadata.timestamp,
			statusCode: response.statusCode,
			durationMs: response.durationMs,
			fromCache: response.fromCache,
			bodySize: JSON.stringify(response.body).length,
			headers: response.headers,
		};

		await this.publishEvent(ApiEventTypes.RESPONSE_GENERATED, data);
		this.logger.debug('Published response generated event', {
			requestId: metadata.requestId,
			statusCode: response.statusCode,
		});
	}

	// ================================
	// Webhook Processing Events
	// ================================

	async publishWebhookReceived(webhook: WebhookEvent): Promise<void> {
		await this.publishEvent(ApiEventTypes.WEBHOOK_RECEIVED, webhook);
		this.logger.info('Published webhook received event', {
			webhookId: webhook.webhookId,
			source: webhook.source,
		});
	}

	async publishWebhookProcessed(
		webhook: WebhookEvent,
		result: unknown,
	): Promise<void> {
		const data = { ...webhook, result };
		await this.publishEvent(ApiEventTypes.WEBHOOK_PROCESSED, data);
		this.logger.info('Published webhook processed event', {
			webhookId: webhook.webhookId,
		});
	}

	async publishWebhookFailed(
		webhook: WebhookEvent,
		error: string,
	): Promise<void> {
		const data = { ...webhook, error };
		await this.publishEvent(ApiEventTypes.WEBHOOK_FAILED, data);
		this.logger.error('Published webhook failed event', {
			webhookId: webhook.webhookId,
			error,
		});
	}

	registerWebhookHandler(
		source: string,
		handler: (event: WebhookEvent) => Promise<void>,
	): void {
		this.webhookHandlers.set(source, handler);
		this.logger.info('Registered webhook handler', { source });
	}

	// ================================
	// Async Job Coordination Events
	// ================================

	async createJob(
		type: string,
		metadata: Record<string, unknown>,
	): Promise<string> {
		const jobId = randomUUID();
		const job: AsyncJobEvent = {
			jobId,
			type,
			status: 'created',
			metadata,
			timestamp: Date.now(),
		};

		this.activeJobs.set(jobId, job);

		await this.publishEvent(ApiEventTypes.JOB_CREATED, job);
		this.logger.info('Created async job', { jobId, type });
		return jobId;
	}

	async startJob(jobId: string, estimatedDuration?: number): Promise<void> {
		const job = this.activeJobs.get(jobId);
		if (!job) {
			throw new Error(`Job ${jobId} not found`);
		}

		const updatedJob: AsyncJobEvent = {
			...job,
			status: 'started',
			timestamp: Date.now(),
			estimatedDuration,
		};

		this.activeJobs.set(jobId, updatedJob);

		await this.publishEvent(ApiEventTypes.JOB_STARTED, updatedJob);
		this.logger.info('Started async job', { jobId });
	}

	async updateJobProgress(jobId: string, progress: number): Promise<void> {
		const job = this.activeJobs.get(jobId);
		if (!job) {
			throw new Error(`Job ${jobId} not found`);
		}

		const updatedJob: AsyncJobEvent = {
			...job,
			status: 'progress',
			progress,
			timestamp: Date.now(),
		};

		this.activeJobs.set(jobId, updatedJob);

		await this.publishEvent(ApiEventTypes.JOB_PROGRESS, updatedJob);
		this.logger.debug('Updated job progress', { jobId, progress });
	}

	async completeJob(jobId: string, result: unknown): Promise<void> {
		const job = this.activeJobs.get(jobId);
		if (!job) {
			throw new Error(`Job ${jobId} not found`);
		}

		const startTime = job.timestamp;
		const completedJob: AsyncJobEvent = {
			...job,
			status: 'completed',
			result,
			timestamp: Date.now(),
			actualDuration: Date.now() - startTime,
		};

		this.activeJobs.set(jobId, completedJob);

		await this.publishEvent(ApiEventTypes.JOB_COMPLETED, completedJob);
		this.logger.info('Completed async job', { jobId });

		// Clean up completed job after a delay
		setTimeout(() => {
			this.activeJobs.delete(jobId);
		}, 300_000); // 5 minutes
	}

	async failJob(jobId: string, error: string): Promise<void> {
		const job = this.activeJobs.get(jobId);
		if (!job) {
			throw new Error(`Job ${jobId} not found`);
		}

		const failedJob: AsyncJobEvent = {
			...job,
			status: 'failed',
			error,
			timestamp: Date.now(),
		};

		this.activeJobs.set(jobId, failedJob);

		await this.publishEvent(ApiEventTypes.JOB_FAILED, failedJob);
		this.logger.error('Failed async job', { jobId, error });

		// Clean up failed job after a delay
		setTimeout(() => {
			this.activeJobs.delete(jobId);
		}, 300_000); // 5 minutes
	}

	getJobStatus(jobId: string): AsyncJobEvent | undefined {
		return this.activeJobs.get(jobId);
	}

	listActiveJobs(): AsyncJobEvent[] {
		return Array.from(this.activeJobs.values()).filter(
			(job) => job.status === 'started' || job.status === 'progress',
		);
	}

	// ================================
	// Cross-Service Events
	// ================================

	async publishServiceRequest(
		targetService: string,
		action: string,
		data: unknown,
		timeout?: number,
	): Promise<void> {
		const requestId = randomUUID();
		const serviceEvent: ServiceEvent = {
			requestId,
			method: 'A2A',
			path: `/${targetService}/${action}`,
			timestamp: Date.now(),
			targetService,
			action,
			timeout,
			metadata: { data },
		};

		await this.publishEvent(ApiEventTypes.SERVICE_REQUEST, serviceEvent);
		this.logger.debug('Published service request', {
			targetService,
			action,
			requestId,
		});
	}

	// ================================
	// Security Events
	// ================================

	async publishSecurityEvent(
		violationType: SecurityEvent['violationType'],
		details: Record<string, unknown>,
		severity: SecurityEvent['severity'] = 'medium',
	): Promise<void> {
		const securityEvent: SecurityEvent = {
			requestId: randomUUID(),
			method: 'unknown',
			path: 'unknown',
			timestamp: Date.now(),
			violationType,
			details,
			severity,
		};

		const eventType =
			violationType === 'rate_limit'
				? ApiEventTypes.RATE_LIMIT_HIT
				: violationType === 'auth_failure'
					? ApiEventTypes.AUTH_FAILED
					: ApiEventTypes.SECURITY_VIOLATION;

		await this.publishEvent(eventType, securityEvent);
		this.logger.warn('Published security event', { violationType, severity });
	}

	// ================================
	// Event Subscription
	// ================================

	subscribe(eventType: string, handler: EventHandler): void {
		if (!this.eventHandlers.has(eventType)) {
			this.eventHandlers.set(eventType, []);
		}
		this.eventHandlers.get(eventType)?.push(handler);
		this.logger.info('Subscribed to event type', { eventType });

		// If bus is already started, bind this handler immediately
		if (this.a2aBus) {
			this.a2aBus.bus
				.bind([
					{
						type: eventType,
						handle: async (envelope: A2AEnvelope) => {
							this.events.push(envelope);
							try {
								await handler(envelope);
							} catch (error) {
								this.logger.error(`Error in event handler for ${eventType}`, {
									error,
								});
							}
						},
					},
				])
				.catch((error) => {
					this.logger.error(`Failed to bind handler for ${eventType}`, {
						error,
					});
				});
		}
	}

	unsubscribe(eventType: string, handler: EventHandler): void {
		const handlers = this.eventHandlers.get(eventType);
		if (handlers) {
			const index = handlers.indexOf(handler);
			if (index !== -1) {
				handlers.splice(index, 1);
				this.logger.info('Unsubscribed from event type', { eventType });
			}
		}
	}

	// ================================
	// Bus Access and Advanced Usage
	// ================================

	/**
	 * Get access to the underlying A2A bus for advanced usage
	 * @returns The real A2A bus instance
	 */
	getA2ABus() {
		return this.a2aBus;
	}

	/**
	 * Check if the A2A bus is properly initialized
	 * @returns True if bus is ready for use
	 */
	isA2ABusReady(): boolean {
		return !!this.a2aBus && !!this.a2aBus.bus;
	}

	// ================================
	// Event History and Status
	// ================================

	getEventHistory(): A2AEnvelope[] {
		return [...this.events];
	}

	getEventsByType(eventType: string): A2AEnvelope[] {
		return this.events.filter((event) => event.type === eventType);
	}

	getRecentEvents(limit: number = 100): A2AEnvelope[] {
		return this.events.slice(-limit);
	}

	clearEventHistory(): void {
		this.events.length = 0;
		this.logger.info('Cleared event history');
	}
}

// ================================
// Factory Function
// ================================

export function createApiBusIntegration(
	logger: StructuredLogger,
): ApiBusIntegration {
	return new ApiBusIntegration(logger);
}

// ================================
// Helper Functions for Webhook Processing
// ================================

export function createWebhookEvent(
	source: string,
	event: string,
	payload: unknown,
	headers: Record<string, string>,
	signature?: string,
): WebhookEvent {
	return {
		webhookId: randomUUID(),
		source,
		event,
		payload,
		headers,
		timestamp: Date.now(),
		signature,
		verified: !!signature, // Simple verification check
	};
}

// ================================
// Helper Functions for Job Management
// ================================

export interface JobOptions {
	type: string;
	metadata?: Record<string, unknown>;
	estimatedDuration?: number;
}

export class JobManager {
	private apiBus: ApiBusIntegration;

	constructor(apiBus: ApiBusIntegration) {
		this.apiBus = apiBus;
	}

	async startJob(options: JobOptions): Promise<string> {
		const jobId = await this.apiBus.createJob(
			options.type,
			options.metadata || {},
		);
		await this.apiBus.startJob(jobId, options.estimatedDuration);
		return jobId;
	}

	async updateProgress(jobId: string, progress: number): Promise<void> {
		await this.apiBus.updateJobProgress(jobId, progress);
	}

	async completeJob(jobId: string, result: unknown): Promise<void> {
		await this.apiBus.completeJob(jobId, result);
	}

	async failJob(jobId: string, error: string): Promise<void> {
		await this.apiBus.failJob(jobId, error);
	}

	getJobStatus(jobId: string): AsyncJobEvent | undefined {
		return this.apiBus.getJobStatus(jobId);
	}

	listActiveJobs(): AsyncJobEvent[] {
		return this.apiBus.listActiveJobs();
	}
}
