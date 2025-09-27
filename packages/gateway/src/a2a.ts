import { SchemaCompatibility } from '@cortex-os/a2a-contracts/schema-registry-types';
import type { TopicACL } from '@cortex-os/a2a-contracts/topic-acl';
import { type BusOptions, createBus } from '@cortex-os/a2a-core/bus';
import { SchemaRegistry } from '@cortex-os/a2a-core/schema-registry';
import type { Transport } from '@cortex-os/a2a-core/transport';
import { inproc } from '@cortex-os/a2a-transport/inproc';
import { RagEventSchemas, RagEventTypes } from '@cortex-os/contracts';
import type { ZodTypeAny } from 'zod';
import {
	GATEWAY_EVENT_SOURCE,
	RateLimitExceededEventSchema,
	RequestReceivedEventSchema,
	ResponseSentEventSchema,
	RouteCreatedEventSchema,
} from './events/gateway-events.js';

const DEFAULT_GATEWAY_ACL: TopicACL = {
	'gateway.route.created': { publish: true, subscribe: true },
	'gateway.request.received': { publish: true, subscribe: true },
	'gateway.response.sent': { publish: true, subscribe: true },
	'gateway.rate_limit.exceeded': { publish: true, subscribe: true },
};

// Test-only allowance for RAG events so integration tests can flow through the bus
const TEST_RAG_ACL: TopicACL = {
	'rag.query.executed': { publish: true, subscribe: true },
	'rag.query.completed': { publish: true, subscribe: true },
};

function registerGatewaySchema(
	registry: SchemaRegistry,
	eventType: keyof typeof DEFAULT_GATEWAY_ACL,
	schema: ZodTypeAny,
	description: string,
	tags: string[],
	examples: unknown[],
): void {
	registry.register({
		eventType: eventType as string,
		version: '1.0.0',
		schema,
		description,
		compatibility: SchemaCompatibility.BACKWARD,
		tags,
		examples,
		metadata: {
			package: '@cortex-os/gateway',
			source: GATEWAY_EVENT_SOURCE,
		},
	});
}

export function createGatewaySchemaRegistry(): SchemaRegistry {
	const registry = new SchemaRegistry({
		strictValidation: true,
		validateOnRegistration: true,
		enableCache: true,
	});

	registerGatewaySchema(
		registry,
		'gateway.route.created',
		RouteCreatedEventSchema,
		'Emitted when a new route is created in the gateway',
		['gateway', 'routing'],
		[
			{
				routeId: 'route-001',
				path: '/api/agents',
				method: 'POST',
				handler: 'AgentHandler',
				createdAt: new Date('2024-01-01T08:00:00Z').toISOString(),
			},
		],
	);

	registerGatewaySchema(
		registry,
		'gateway.request.received',
		RequestReceivedEventSchema,
		'Captures incoming HTTP requests for monitoring and routing',
		['gateway', 'request'],
		[
			{
				requestId: 'req-123',
				path: '/api/agents',
				method: 'POST',
				userAgent: 'Mozilla/5.0 (compatible; CortexAgent/1.0)',
				receivedAt: new Date('2024-01-01T08:05:00Z').toISOString(),
			},
		],
	);

	registerGatewaySchema(
		registry,
		'gateway.response.sent',
		ResponseSentEventSchema,
		'Records HTTP response metrics and completion status',
		['gateway', 'response'],
		[
			{
				requestId: 'req-123',
				statusCode: 200,
				duration: 150,
				sentAt: new Date('2024-01-01T08:05:01Z').toISOString(),
			},
		],
	);

	registerGatewaySchema(
		registry,
		'gateway.rate_limit.exceeded',
		RateLimitExceededEventSchema,
		'Alerts when rate limiting thresholds are exceeded',
		['gateway', 'security'],
		[
			{
				path: '/api/agents',
				clientIp: '192.168.1.100',
				limit: 100,
				window: 3600,
				exceededAt: new Date('2024-01-01T08:10:00Z').toISOString(),
			},
		],
	);

	// Register RAG events for A2A integration tests and runtime
	registry.register({
		eventType: RagEventTypes.QueryExecuted,
		version: '1.0.0',
		schema: RagEventSchemas[RagEventTypes.QueryExecuted],
		description: 'RAG query executed',
		compatibility: SchemaCompatibility.BACKWARD,
		tags: ['rag', 'query'],
		examples: [
			{
				queryId: 'qid-123',
				query: 'hello',
				topK: 3,
				timestamp: new Date('2024-01-01T08:00:00Z').toISOString(),
			},
		],
		metadata: { package: '@cortex-os/gateway', source: GATEWAY_EVENT_SOURCE },
	});

	registry.register({
		eventType: RagEventTypes.QueryCompleted,
		version: '1.0.0',
		schema: RagEventSchemas[RagEventTypes.QueryCompleted],
		description: 'RAG query completed',
		compatibility: SchemaCompatibility.BACKWARD,
		tags: ['rag', 'query'],
		examples: [
			{
				queryId: 'qid-123',
				results: [],
				provider: 'mock',
				duration: 10,
				timestamp: new Date('2024-01-01T08:00:01Z').toISOString(),
			},
		],
		metadata: { package: '@cortex-os/gateway', source: GATEWAY_EVENT_SOURCE },
	});

	return registry;
}

export interface GatewayBusConfig {
	transport?: Transport;
	schemaRegistry?: SchemaRegistry;
	acl?: TopicACL;
	busOptions?: BusOptions;
}

export function createGatewayBus(config: GatewayBusConfig = {}) {
	const registry = config.schemaRegistry ?? createGatewaySchemaRegistry();
	// Base ACL for gateway events
	let acl: TopicACL = {
		...DEFAULT_GATEWAY_ACL,
		...(config.acl ?? {}),
	};
	// Enable RAG topics when running tests or explicitly allowed via env
	if (process.env.NODE_ENV === 'test' || process.env.GATEWAY_ALLOW_RAG === '1') {
		acl = { ...acl, ...TEST_RAG_ACL };
	}
	const transport = config.transport ?? inproc();
	const bus = createBus(transport, undefined, registry, acl, config.busOptions);
	return { bus, schemaRegistry: registry, transport };
}

let GATEWAY_BUS_SINGLETON: ReturnType<typeof createGatewayBus> | null = null;

export function getGatewayBus(): ReturnType<typeof createGatewayBus> {
	GATEWAY_BUS_SINGLETON ??= createGatewayBus();
	return GATEWAY_BUS_SINGLETON;
}
