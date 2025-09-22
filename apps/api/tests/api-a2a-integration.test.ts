import { beforeEach, describe, expect, it } from 'vitest';

import {
	type ApiBusIntegration,
	ApiEventTypes,
	createApiBusIntegration,
	createWebhookEvent,
	JobManager,
	type WebhookEvent,
} from '../src/core/a2a-integration.js';
import { StructuredLogger } from '../src/core/observability.js';
import type {
	ApiOperationMetadata,
	GatewayRequest,
	GatewayResponse,
	InternalRequest,
	RouteDefinition,
} from '../src/core/types.js';

describe('API A2A Integration', () => {
	let logger: StructuredLogger;
	let apiBus: ApiBusIntegration;

	beforeEach(() => {
		logger = new StructuredLogger();
		apiBus = createApiBusIntegration(logger);
	});

	describe('Bus Lifecycle', () => {
		it('should start and stop successfully', async () => {
			await apiBus.start();
			expect(logger.history.some((entry) => entry.message.includes('started successfully'))).toBe(
				true,
			);

			// Verify real A2A bus is accessible
			expect(apiBus.getA2ABus()).toBeDefined();
			expect(apiBus.isA2ABusReady()).toBe(true);

			await apiBus.stop();
			expect(logger.history.some((entry) => entry.message.includes('stopped'))).toBe(true);
		});
	});

	describe('Request Processing Events', () => {
		it('should publish request received events', async () => {
			const request: GatewayRequest = {
				operationId: 'users.list',
				method: 'GET',
				path: '/users',
				headers: { 'x-correlation-id': 'test-123' },
				metadata: { source: 'test' },
			};

			const metadata: ApiOperationMetadata = {
				requestId: 'req-123',
				correlationId: 'test-123',
				timestamp: Date.now(),
				source: 'test',
			};

			await apiBus.publishRequestReceived(request, metadata);

			const events = apiBus.getEventsByType(ApiEventTypes.REQUEST_RECEIVED);
			expect(events).toHaveLength(1);
			expect(events[0]?.data).toMatchObject({
				requestId: 'req-123',
				method: 'GET',
				path: '/users',
			});
		});

		it('should publish request routed events', async () => {
			const route: RouteDefinition = {
				id: 'users.list',
				method: 'GET',
				path: '/users',
				service: 'users',
				action: 'listUsers',
				description: 'List users',
				transactional: false,
				requiresAuth: true,
				cacheTtlSeconds: 30,
			};

			const request: InternalRequest = {
				route,
				headers: {},
				metadata: {
					requestId: 'req-456',
					timestamp: Date.now(),
					correlationId: 'test-456',
				},
			};

			await apiBus.publishRequestRouted(request);

			const events = apiBus.getEventsByType(ApiEventTypes.REQUEST_ROUTED);
			expect(events).toHaveLength(1);
			expect(events[0]?.data).toMatchObject({
				requestId: 'req-456',
				handlerKey: 'users.listUsers',
				requiresAuth: true,
				cacheable: true,
			});
		});

		it('should publish response generated events', async () => {
			const response: GatewayResponse = {
				statusCode: 200,
				body: { users: [] },
				headers: { 'content-type': 'application/json' },
				durationMs: 45,
				fromCache: false,
				requestId: 'req-789',
				auditId: 'audit-123',
			};

			const metadata: ApiOperationMetadata = {
				requestId: 'req-789',
				timestamp: Date.now(),
			};

			await apiBus.publishResponseGenerated(response, metadata);

			const events = apiBus.getEventsByType(ApiEventTypes.RESPONSE_GENERATED);
			expect(events).toHaveLength(1);
			expect(events[0]?.data).toMatchObject({
				requestId: 'req-789',
				statusCode: 200,
				durationMs: 45,
				fromCache: false,
			});
		});
	});

	describe('Webhook Processing', () => {
		it('should create and publish webhook events', async () => {
			const webhook = createWebhookEvent(
				'github',
				'push',
				{ ref: 'refs/heads/main' },
				{ 'x-github-event': 'push' },
				'sha256=abc123',
			);

			await apiBus.publishWebhookReceived(webhook);

			const events = apiBus.getEventsByType(ApiEventTypes.WEBHOOK_RECEIVED);
			expect(events).toHaveLength(1);
			expect(events[0]?.data).toMatchObject({
				source: 'github',
				event: 'push',
				verified: true,
			});
		});

		it('should register and handle webhook events', async () => {
			let handledWebhook: WebhookEvent | null = null;

			apiBus.registerWebhookHandler('github', async (event) => {
				handledWebhook = event;
			});

			const webhook = createWebhookEvent('github', 'push', { commits: [] }, {});

			// Simulate webhook handling by triggering event subscription
			apiBus.subscribe(ApiEventTypes.WEBHOOK_RECEIVED, async (envelope) => {
				const handler = apiBus.webhookHandlers.get(envelope.data.source);
				if (handler) {
					await handler(envelope.data);
				}
			});

			await apiBus.publishWebhookReceived(webhook);

			// Wait for async processing
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(handledWebhook).toMatchObject({
				source: 'github',
				event: 'push',
			});
		});

		it('should handle webhook processing success and failure', async () => {
			const webhook = createWebhookEvent('stripe', 'payment.succeeded', { amount: 1000 }, {});

			// Test successful processing
			await apiBus.publishWebhookProcessed(webhook, { processed: true });

			let events = apiBus.getEventsByType(ApiEventTypes.WEBHOOK_PROCESSED);
			expect(events).toHaveLength(1);
			expect(events[0]?.data).toMatchObject({
				source: 'stripe',
				result: { processed: true },
			});

			// Test failed processing
			await apiBus.publishWebhookFailed(webhook, 'Invalid signature');

			events = apiBus.getEventsByType(ApiEventTypes.WEBHOOK_FAILED);
			expect(events).toHaveLength(1);
			expect(events[0]?.data).toMatchObject({
				source: 'stripe',
				error: 'Invalid signature',
			});
		});
	});

	describe('Async Job Coordination', () => {
		it('should create and manage job lifecycle', async () => {
			const jobId = await apiBus.createJob('data-processing', {
				inputFile: 'users.csv',
				outputFormat: 'json',
			});

			expect(jobId).toBeDefined();
			expect(apiBus.getJobStatus(jobId)).toMatchObject({
				jobId,
				type: 'data-processing',
				status: 'created',
			});

			// Start the job
			await apiBus.startJob(jobId, 120000); // 2 minutes estimated
			expect(apiBus.getJobStatus(jobId)?.status).toBe('started');

			// Update progress
			await apiBus.updateJobProgress(jobId, 50);
			expect(apiBus.getJobStatus(jobId)?.progress).toBe(50);

			// Complete the job
			await apiBus.completeJob(jobId, { processedRecords: 1000 });
			const completedJob = apiBus.getJobStatus(jobId);
			expect(completedJob?.status).toBe('completed');
			expect(completedJob?.result).toMatchObject({ processedRecords: 1000 });
		});

		it('should handle job failures', async () => {
			const jobId = await apiBus.createJob('file-upload', {
				filename: 'test.pdf',
			});
			await apiBus.startJob(jobId);

			await apiBus.failJob(jobId, 'File format not supported');

			const failedJob = apiBus.getJobStatus(jobId);
			expect(failedJob?.status).toBe('failed');
			expect(failedJob?.error).toBe('File format not supported');
		});

		it('should list active jobs correctly', async () => {
			const job1 = await apiBus.createJob('task1', {});
			const job2 = await apiBus.createJob('task2', {});
			const job3 = await apiBus.createJob('task3', {});

			await apiBus.startJob(job1);
			await apiBus.startJob(job2);
			await apiBus.updateJobProgress(job2, 25);
			await apiBus.completeJob(job3, {}); // This shouldn't appear in active jobs

			const activeJobs = apiBus.listActiveJobs();
			expect(activeJobs).toHaveLength(2);
			expect(activeJobs.map((job) => job.jobId)).toContain(job1);
			expect(activeJobs.map((job) => job.jobId)).toContain(job2);
			expect(activeJobs.map((job) => job.jobId)).not.toContain(job3);
		});
	});

	describe('JobManager Helper', () => {
		it('should provide convenient job management interface', async () => {
			const jobManager = new JobManager(apiBus);

			const jobId = await jobManager.startJob({
				type: 'image-processing',
				metadata: { format: 'jpeg', resolution: '1920x1080' },
				estimatedDuration: 30000,
			});

			expect(jobManager.getJobStatus(jobId)?.status).toBe('started');

			await jobManager.updateProgress(jobId, 75);
			expect(jobManager.getJobStatus(jobId)?.progress).toBe(75);

			await jobManager.completeJob(jobId, {
				outputUrl: '/processed/image.jpg',
			});
			expect(jobManager.getJobStatus(jobId)?.status).toBe('completed');
		});
	});

	describe('Cross-Service Communication', () => {
		it('should publish service request events', async () => {
			await apiBus.publishServiceRequest(
				'user-service',
				'validateUser',
				{ userId: 'user-123' },
				5000,
			);

			const events = apiBus.getEventsByType(ApiEventTypes.SERVICE_REQUEST);
			expect(events).toHaveLength(1);
			expect(events[0]?.data).toMatchObject({
				targetService: 'user-service',
				action: 'validateUser',
				timeout: 5000,
			});
		});
	});

	describe('Security Events', () => {
		it('should publish security violation events', async () => {
			await apiBus.publishSecurityEvent(
				'rate_limit',
				{ clientIp: '192.168.1.100', requestCount: 1000 },
				'high',
			);

			const events = apiBus.getEventsByType(ApiEventTypes.RATE_LIMIT_HIT);
			expect(events).toHaveLength(1);
			expect(events[0]?.data).toMatchObject({
				violationType: 'rate_limit',
				severity: 'high',
			});
		});

		it('should publish auth failure events', async () => {
			await apiBus.publishSecurityEvent(
				'auth_failure',
				{ apiKey: 'invalid-key', endpoint: '/secure/data' },
				'medium',
			);

			const events = apiBus.getEventsByType(ApiEventTypes.AUTH_FAILED);
			expect(events).toHaveLength(1);
		});
	});

	describe('Event Subscription and History', () => {
		it('should allow event subscription and unsubscription', async () => {
			const receivedEvents: unknown[] = [];

			const handler = (envelope: unknown) => {
				receivedEvents.push(envelope);
			};

			apiBus.subscribe(ApiEventTypes.JOB_CREATED, handler);

			await apiBus.createJob('test-job', {});
			expect(receivedEvents).toHaveLength(1);

			apiBus.unsubscribe(ApiEventTypes.JOB_CREATED, handler);

			await apiBus.createJob('test-job-2', {});
			expect(receivedEvents).toHaveLength(1); // Should not receive the second event
		});

		it('should maintain event history', async () => {
			await apiBus.createJob('job1', {});
			await apiBus.createJob('job2', {});
			await apiBus.publishSecurityEvent('rate_limit', {}, 'low');

			const allEvents = apiBus.getEventHistory();
			expect(allEvents.length).toBeGreaterThanOrEqual(3);

			const jobEvents = apiBus.getEventsByType(ApiEventTypes.JOB_CREATED);
			expect(jobEvents).toHaveLength(2);

			const recentEvents = apiBus.getRecentEvents(2);
			expect(recentEvents).toHaveLength(2);
		});

		it('should clear event history', async () => {
			await apiBus.createJob('test', {});
			expect(apiBus.getEventHistory()).toHaveLength(1);

			apiBus.clearEventHistory();
			expect(apiBus.getEventHistory()).toHaveLength(0);
		});
	});

	describe('Error Handling', () => {
		it('should handle job operations on non-existent jobs', async () => {
			await expect(apiBus.startJob('non-existent')).rejects.toThrow('Job non-existent not found');
			await expect(apiBus.updateJobProgress('non-existent', 50)).rejects.toThrow(
				'Job non-existent not found',
			);
			await expect(apiBus.completeJob('non-existent', {})).rejects.toThrow(
				'Job non-existent not found',
			);
			await expect(apiBus.failJob('non-existent', 'error')).rejects.toThrow(
				'Job non-existent not found',
			);
		});

		it('should handle handler errors gracefully', async () => {
			const errorHandler = () => {
				throw new Error('Handler error');
			};

			apiBus.subscribe(ApiEventTypes.JOB_CREATED, errorHandler);

			// Should not throw, but log error
			await apiBus.createJob('test-job', {});

			expect(
				logger.history.some(
					(entry) => entry.level === 'error' && entry.message.includes('Error in event handler'),
				),
			).toBe(true);
		});
	});
});
