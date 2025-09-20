import type { TopicACL } from '@cortex-os/a2a-contracts/topic-acl';
import { type BusOptions, createBus } from '@cortex-os/a2a-core/bus';
import { SchemaRegistry } from '@cortex-os/a2a-core/schema-registry';
import { SchemaCompatibility } from '@cortex-os/a2a-contracts/schema-registry-types';
import type { Transport } from '@cortex-os/a2a-core/transport';
import { inproc } from '@cortex-os/a2a-transport/inproc';
import type { ZodTypeAny } from 'zod';
import { z } from 'zod';

// Event source identifier for cortex-os events
export const CORTEX_OS_EVENT_SOURCE = 'urn:cortex-os:runtime';

// Event schemas for cortex-os
export const CortexOsHealthEventSchema = z.object({
	status: z.string(),
	timestamp: z.number(),
	version: z.string().optional(),
});

export const CortexOsMcpEventSchema = z.object({
	type: z.string(),
	payload: z.record(z.unknown()),
	timestamp: z.number(),
	source: z.string().optional(),
});

export const CortexOsConfigEventSchema = z.object({
	key: z.string(),
	value: z.unknown(),
	action: z.enum(['set', 'get', 'list']),
	timestamp: z.number(),
});

export const CortexOsServiceEventSchema = z.object({
	service: z.string(),
	action: z.string(),
	status: z.enum(['starting', 'running', 'stopping', 'stopped', 'error']),
	timestamp: z.number(),
	details: z.record(z.unknown()).optional(),
});

const DEFAULT_CORTEX_OS_ACL: TopicACL = {
	'cortex.health.check': { publish: true, subscribe: true },
	'cortex.mcp.event': { publish: true, subscribe: true },
	'cortex.config.change': { publish: true, subscribe: true },
	'cortex.service.status': { publish: true, subscribe: true },
};

function registerCortexOsSchema(
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
			package: '@cortex-os/app',
			source: CORTEX_OS_EVENT_SOURCE,
		},
	});
}

export function createCortexOsSchemaRegistry(): SchemaRegistry {
	const registry = new SchemaRegistry({
		strictValidation: true,
		validateOnRegistration: true,
		enableCache: true,
	});

	registerCortexOsSchema(
		registry,
		'cortex.health.check',
		CortexOsHealthEventSchema,
		'Emitted when a health check is performed on the cortex-os runtime',
		['health', 'runtime'],
		[
			{
				status: 'healthy',
				timestamp: Date.now(),
				version: '1.0.0',
			},
		],
	);

	registerCortexOsSchema(
		registry,
		'cortex.mcp.event',
		CortexOsMcpEventSchema,
		'Records MCP events and tool executions',
		['mcp', 'events'],
		[
			{
				type: 'system.status',
				payload: { services: [] },
				timestamp: Date.now(),
				source: 'urn:cortex-os:mcp',
			},
		],
	);

	registerCortexOsSchema(
		registry,
		'cortex.config.change',
		CortexOsConfigEventSchema,
		'Tracks configuration changes in the cortex-os runtime',
		['config', 'runtime'],
		[
			{
				key: 'CORTEX_MCP_MANAGER_PORT',
				value: 3000,
				action: 'set',
				timestamp: Date.now(),
			},
		],
	);

	registerCortexOsSchema(
		registry,
		'cortex.service.status',
		CortexOsServiceEventSchema,
		'Records service lifecycle events in the cortex-os runtime',
		['service', 'runtime'],
		[
			{
				service: 'memories',
				action: 'start',
				status: 'running',
				timestamp: Date.now(),
			},
		],
	);

	return registry;
}

export interface CortexOsBusConfig {
	transport?: Transport;
	schemaRegistry?: SchemaRegistry;
	acl?: TopicACL;
	busOptions?: BusOptions;
}

export function createCortexOsBus(config: CortexOsBusConfig = {}) {
	const registry = config.schemaRegistry ?? createCortexOsSchemaRegistry();
	const acl: TopicACL = {
		...DEFAULT_CORTEX_OS_ACL,
		...(config.acl ?? {}),
	};
	const transport = config.transport ?? inproc();
	const bus = createBus(transport, undefined, registry, acl, config.busOptions);
	return { bus, schemaRegistry: registry, transport };
}
