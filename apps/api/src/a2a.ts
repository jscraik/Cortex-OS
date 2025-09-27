import { SchemaCompatibility } from '@cortex-os/a2a-contracts/schema-registry-types.js';
import type { TopicACL } from '@cortex-os/a2a-contracts/topic-acl.js';
import { type BusOptions, createBus } from '@cortex-os/a2a-core/bus.js';
import { SchemaRegistry } from '@cortex-os/a2a-core/schema-registry.js';
import type { Transport } from '@cortex-os/a2a-core/transport.js';
import { inproc } from '@cortex-os/a2a-transport/inproc.js';
import { API_EVENT_DEFINITIONS, API_EVENT_SOURCE } from './events/api-events.js';

const DEFAULT_API_ACL: TopicACL = Object.fromEntries(
	Object.keys(API_EVENT_DEFINITIONS).map((eventType) => [
		eventType,
		{ publish: true, subscribe: true },
	]),
) as TopicACL;

function registerApiSchemas(registry: SchemaRegistry) {
	for (const [eventType, definition] of Object.entries(API_EVENT_DEFINITIONS)) {
		registry.register({
			eventType,
			version: '1.0.0',
			schema: definition.schema,
			description: definition.description,
			compatibility: SchemaCompatibility.BACKWARD,
			tags: Array.from(definition.tags),
			examples: definition.examples ? [...(definition.examples as readonly unknown[])] : undefined,
			metadata: {
				package: '@cortex-os/api',
				source: API_EVENT_SOURCE,
			},
		});
	}
}

export function createApiSchemaRegistry(): SchemaRegistry {
	const registry = new SchemaRegistry({
		strictValidation: true,
		validateOnRegistration: true,
		enableCache: true,
	});

	registerApiSchemas(registry);
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
