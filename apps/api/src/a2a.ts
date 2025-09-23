import { SchemaCompatibility } from '@cortex-os/a2a-contracts/schema-registry-types';
import type { TopicACL } from '@cortex-os/a2a-contracts/topic-acl';
import { type BusOptions, createBus } from '@cortex-os/a2a-core/bus';
import { SchemaRegistry } from '@cortex-os/a2a-core/schema-registry';
import type { Transport } from '@cortex-os/a2a-core/transport';
import { inproc } from '@cortex-os/a2a-transport/inproc';
import type { ZodTypeAny } from 'zod';
import {
	API_EVENT_SOURCE,
	ApiJobCreatedEventSchema,
	ApiRequestReceivedEventSchema,
	ApiRequestRoutedEventSchema,
	ApiResponseGeneratedEventSchema,
	ApiWebhookReceivedEventSchema,
} from './events/api-events.js';

const DEFAULT_API_ACL: TopicACL = {
	'api.request.received': { publish: true, subscribe: true },
	'api.request.routed': { publish: true, subscribe: true },
	'api.response.generated': { publish: true, subscribe: true },
	'api.webhook.received': { publish: true, subscribe: true },
	'api.job.created': { publish: true, subscribe: true },
};

function registerApiSchema(
	registry: SchemaRegistry,
	eventType: string,
	schema: ZodTypeAny,
	description: string,
	tags: string[],
	examples: unknown[],
) {
	registry.register({
		eventType,
		version: '1.0.0',
		schema,
		description,
		compatibility: SchemaCompatibility.BACKWARD,
		tags,
		examples,
		metadata: {
			package: '@cortex-os/api',
			source: API_EVENT_SOURCE,
		},
	});
}

export function createApiSchemaRegistry(): SchemaRegistry {
	const registry = new SchemaRegistry({
		strictValidation: true,
		validateOnRegistration: true,
		enableCache: true,
	});

	registerApiSchema(
		registry,
		'api.request.received',
		ApiRequestReceivedEventSchema,
		'Emitted when a new HTTP request is received by the API gateway',
		['api', 'request'],
		[
			{
				requestId: 'req-001',
				method: 'POST',
				path: '/api/agents',
				correlationId: 'corr-123',
				source: 'web-client',
				timestamp: Date.now(),
				userAgent: 'Mozilla/5.0',
				bodySize: 512,
			},
		],
	);

	registerApiSchema(
		registry,
		'api.request.routed',
		ApiRequestRoutedEventSchema,
		'Records request routing decisions and handler assignments',
		['api', 'routing'],
		[
			{
				requestId: 'req-001',
				routeId: 'agents.create',
				handlerKey: 'agents.createAgent',
				requiresAuth: true,
				cacheable: false,
				timestamp: Date.now(),
			},
		],
	);

	registerApiSchema(
		registry,
		'api.response.generated',
		ApiResponseGeneratedEventSchema,
		'Captures API response metrics and performance data',
		['api', 'response'],
		[
			{
				requestId: 'req-001',
				method: 'POST',
				path: '/api/agents',
				statusCode: 201,
				durationMs: 250,
				fromCache: false,
				bodySize: 1024,
				timestamp: Date.now(),
			},
		],
	);

	registerApiSchema(
		registry,
		'api.webhook.received',
		ApiWebhookReceivedEventSchema,
		'Logs incoming webhook events for processing',
		['api', 'webhook'],
		[
			{
				webhookId: 'webhook-001',
				source: 'github',
				event: 'push',
				timestamp: Date.now(),
				verified: true,
				payloadSize: 2048,
			},
		],
	);

	registerApiSchema(
		registry,
		'api.job.created',
		ApiJobCreatedEventSchema,
		'Tracks asynchronous job creation and lifecycle',
		['api', 'jobs'],
		[
			{
				jobId: 'job-001',
				type: 'data-processing',
				status: 'created',
				estimatedDuration: 30000,
				metadata: { priority: 'high' },
				createdAt: Date.now(),
			},
		],
	);

	return registry;
}

export interface ApiBusConfig {
	transport?: Transport;
	schemaRegistry?: SchemaRegistry;
	acl?: TopicACL;
	busOptions?: BusOptions;
}

export function createApiBus(config: ApiBusConfig = {}) {
	const registry = config.schemaRegistry ?? createApiSchemaRegistry();
	const acl: TopicACL = {
		...DEFAULT_API_ACL,
		...(config.acl ?? {}),
	};
	const transport = config.transport ?? inproc();
	const bus = createBus(transport, undefined, registry, acl, config.busOptions);
	return { bus, schemaRegistry: registry, transport };
}
