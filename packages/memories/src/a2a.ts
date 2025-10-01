import type { TopicACL } from '@cortex-os/a2a-contracts';
import { SchemaCompatibility } from '@cortex-os/a2a-contracts';
import { type BusOptions, createBus } from '@cortex-os/a2a-core/bus';
import { SchemaRegistry } from '@cortex-os/a2a-core/schema-registry';
import type { Transport } from '@cortex-os/a2a-core/transport';
import { inproc } from '@cortex-os/a2a-transport/inproc';
import type { ZodTypeAny } from 'zod';
import {
	MEMORY_EVENT_SOURCE,
	MemoryCreatedEventSchema,
	MemoryDeletedEventSchema,
	MemoryRetrievedEventSchema,
	MemoryUpdatedEventSchema,
} from './events/memory-events.js';

const DEFAULT_MEMORY_ACL: TopicACL = {
	'memories.memory.created': { publish: true, subscribe: true },
	'memories.memory.retrieved': { publish: true, subscribe: true },
	'memories.memory.updated': { publish: true, subscribe: true },
	'memories.memory.deleted': { publish: true, subscribe: true },
};

function registerMemorySchema(
	registry: SchemaRegistry,
	eventType: keyof typeof DEFAULT_MEMORY_ACL,
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
			package: '@cortex-os/memories',
			source: MEMORY_EVENT_SOURCE,
		},
	});
}

export function createMemorySchemaRegistry(): SchemaRegistry {
	const registry = new SchemaRegistry({
		strictValidation: true,
		validateOnRegistration: true,
		enableCache: true,
	});

	registerMemorySchema(
		registry,
		'memories.memory.created',
		MemoryCreatedEventSchema,
		'Emitted when a new memory is stored in the system',
		['memories', 'storage'],
		[
			{
				memoryId: 'mem-001',
				kind: 'code-analysis',
				text: 'Analysis of security vulnerability in auth module',
				tags: ['security', 'analysis'],
				namespace: 'agents:security',
				createdAt: new Date('2024-01-01T08:00:00Z').toISOString(),
			},
		],
	);

	registerMemorySchema(
		registry,
		'memories.memory.retrieved',
		MemoryRetrievedEventSchema,
		'Records memory retrieval operations and similarity scores',
		['memories', 'retrieval'],
		[
			{
				memoryId: 'mem-001',
				query: 'security vulnerabilities',
				similarity: 0.87,
				retrievedAt: new Date('2024-01-01T08:05:00Z').toISOString(),
			},
		],
	);

	registerMemorySchema(
		registry,
		'memories.memory.updated',
		MemoryUpdatedEventSchema,
		'Captures memory modifications and metadata changes',
		['memories', 'update'],
		[
			{
				memoryId: 'mem-001',
				changes: {
					text: 'Updated analysis with additional context',
					tags: ['security', 'analysis', 'updated'],
				},
				updatedAt: new Date('2024-01-01T08:10:00Z').toISOString(),
			},
		],
	);

	registerMemorySchema(
		registry,
		'memories.memory.deleted',
		MemoryDeletedEventSchema,
		'Signals memory deletion for cleanup and auditing',
		['memories', 'deletion'],
		[
			{
				memoryId: 'mem-001',
				deletedAt: new Date('2024-01-01T08:15:00Z').toISOString(),
			},
		],
	);

	return registry;
}

export interface MemoryBusConfig {
	transport?: Transport;
	schemaRegistry?: SchemaRegistry;
	acl?: TopicACL;
	busOptions?: BusOptions;
}

export function createMemoryBus(config: MemoryBusConfig = {}) {
	const registry = config.schemaRegistry ?? createMemorySchemaRegistry();
	const acl: TopicACL = {
		...DEFAULT_MEMORY_ACL,
		...(config.acl ?? {}),
	};
	const transport = config.transport ?? inproc();
	const bus = createBus(transport, undefined, registry, acl, config.busOptions);
	return { bus, schemaRegistry: registry, transport };
}
