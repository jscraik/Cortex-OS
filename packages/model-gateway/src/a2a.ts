import type { TopicACL } from '@cortex-os/a2a-contracts';
import { SchemaCompatibility } from '@cortex-os/a2a-contracts';
import { type BusOptions, createBus } from '@cortex-os/a2a-core/bus';
import { SchemaRegistry } from '@cortex-os/a2a-core/schema-registry';
import type { Transport } from '@cortex-os/a2a-core/transport';
import { inproc } from '@cortex-os/a2a-transport/inproc';
import type { ZodTypeAny } from 'zod';
import {
	MODEL_GATEWAY_EVENT_SOURCE,
	ModelErrorEventSchema,
	ModelResponseEventSchema,
	ProviderHealthEventSchema,
	RequestRoutedEventSchema,
} from './events/model-gateway-events.js';

const DEFAULT_MODEL_GATEWAY_ACL: TopicACL = {
	'model_gateway.request.routed': { publish: true, subscribe: true },
	'model_gateway.model.response': { publish: true, subscribe: true },
	'model_gateway.model.error': { publish: true, subscribe: true },
	'model_gateway.provider.health': { publish: true, subscribe: true },
};

function registerModelGatewaySchema(
	registry: SchemaRegistry,
	eventType: keyof typeof DEFAULT_MODEL_GATEWAY_ACL,
	schema: ZodTypeAny,
	description: string,
	tags: string[],
	examples: unknown[],
) {
	registry.register({
		eventType: eventType as string,
		version: '1.0.0',
		schema,
		description,
		compatibility: SchemaCompatibility.BACKWARD,
		tags,
		examples,
		metadata: {
			package: '@cortex-os/model-gateway',
			source: MODEL_GATEWAY_EVENT_SOURCE,
		},
	});
}

export function createModelGatewaySchemaRegistry(): SchemaRegistry {
	const registry = new SchemaRegistry({
		strictValidation: true,
		validateOnRegistration: true,
		enableCache: true,
	});

	registerModelGatewaySchema(
		registry,
		'model_gateway.request.routed',
		RequestRoutedEventSchema,
		'Emitted when a request is routed to a specific model provider',
		['model-gateway', 'routing'],
		[
			{
				requestId: 'req-001',
				model: 'gpt-4',
				provider: 'openai',
				routedAt: new Date('2024-01-01T08:00:00Z').toISOString(),
			},
		],
	);

	registerModelGatewaySchema(
		registry,
		'model_gateway.model.response',
		ModelResponseEventSchema,
		'Records model response metrics and performance data',
		['model-gateway', 'response'],
		[
			{
				requestId: 'req-001',
				model: 'gpt-4',
				provider: 'openai',
				latency: 1500,
				tokens: { input: 100, output: 50 },
				completedAt: new Date('2024-01-01T08:00:02Z').toISOString(),
			},
		],
	);

	registerModelGatewaySchema(
		registry,
		'model_gateway.model.error',
		ModelErrorEventSchema,
		'Captures model errors and failures for monitoring',
		['model-gateway', 'error'],
		[
			{
				requestId: 'req-002',
				model: 'gpt-4',
				provider: 'openai',
				error: 'Rate limit exceeded',
				errorCode: 'RATE_LIMIT',
				failedAt: new Date('2024-01-01T08:05:00Z').toISOString(),
			},
		],
	);

	registerModelGatewaySchema(
		registry,
		'model_gateway.provider.health',
		ProviderHealthEventSchema,
		'Reports health status of model providers',
		['model-gateway', 'health'],
		[
			{
				provider: 'openai',
				status: 'healthy',
				latency: 250,
				checkedAt: new Date('2024-01-01T08:00:00Z').toISOString(),
			},
		],
	);

	return registry;
}

export interface ModelGatewayBusConfig {
	transport?: Transport;
	schemaRegistry?: SchemaRegistry;
	acl?: TopicACL;
	busOptions?: BusOptions;
}

export function createModelGatewayBus(config: ModelGatewayBusConfig = {}) {
	const registry = config.schemaRegistry ?? createModelGatewaySchemaRegistry();
	const acl: TopicACL = {
		...DEFAULT_MODEL_GATEWAY_ACL,
		...(config.acl ?? {}),
	};
	const transport = config.transport ?? inproc();
	const bus = createBus(transport, undefined, registry, acl, config.busOptions);
	return { bus, schemaRegistry: registry, transport };
}
