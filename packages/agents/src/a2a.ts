import { SchemaCompatibility } from '@cortex-os/a2a-contracts/schema-registry-types';
import type { TopicACL } from '@cortex-os/a2a-contracts/topic-acl';
import { type BusOptions, createBus } from '@cortex-os/a2a-core/bus';
import { SchemaRegistry } from '@cortex-os/a2a-core/schema-registry';
import type { Transport } from '@cortex-os/a2a-core/transport';
import { inproc } from '@cortex-os/a2a-transport/inproc';
import type { ZodTypeAny } from 'zod';
import {
	AGENTS_EVENT_SOURCE,
	AgentCommunicationEventSchema,
	AgentCreatedEventSchema,
	AgentTaskCompletedEventSchema,
	AgentTaskStartedEventSchema,
} from './events/agents-events.js';

const DEFAULT_AGENTS_ACL: TopicACL = {
	'agents.agent.created': { publish: true, subscribe: true },
	'agents.task.started': { publish: true, subscribe: true },
	'agents.task.completed': { publish: true, subscribe: true },
	'agents.communication.sent': { publish: true, subscribe: true },
};

function registerAgentsSchema(
	registry: SchemaRegistry,
	eventType: keyof typeof DEFAULT_AGENTS_ACL,
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
			package: 'agents',
			source: AGENTS_EVENT_SOURCE,
		},
	});
}

export function createAgentsSchemaRegistry(): SchemaRegistry {
	const registry = new SchemaRegistry({
		strictValidation: true,
		validateOnRegistration: true,
		enableCache: true,
	});

	registerAgentsSchema(
		registry,
		'agents.agent.created',
		AgentCreatedEventSchema,
		'Emitted when a new agent is created and initialized',
		['agents', 'lifecycle'],
		[
			{
				agentId: 'agent-001',
				agentType: 'code-analysis',
				capabilities: ['static-analysis', 'security-scan'],
				configuration: { language: 'typescript', maxConcurrency: 3 },
				createdBy: 'system',
				createdAt: new Date('2024-01-01T08:00:00Z').toISOString(),
			},
		],
	);

	registerAgentsSchema(
		registry,
		'agents.task.started',
		AgentTaskStartedEventSchema,
		'Records when an agent starts executing a task',
		['agents', 'tasks'],
		[
			{
				taskId: 'task-001',
				agentId: 'agent-001',
				taskType: 'code-review',
				description: 'Review pull request #123',
				priority: 'high',
				estimatedDuration: 300000,
				startedAt: new Date('2024-01-01T08:05:00Z').toISOString(),
			},
		],
	);

	registerAgentsSchema(
		registry,
		'agents.task.completed',
		AgentTaskCompletedEventSchema,
		'Captures task completion results and metrics',
		['agents', 'tasks'],
		[
			{
				taskId: 'task-001',
				agentId: 'agent-001',
				taskType: 'code-review',
				status: 'success',
				durationMs: 285000,
				result: {
					issues: 3,
					suggestions: 7,
					rating: 'good',
				},
				completedAt: new Date('2024-01-01T08:09:45Z').toISOString(),
			},
		],
	);

	registerAgentsSchema(
		registry,
		'agents.communication.sent',
		AgentCommunicationEventSchema,
		'Logs inter-agent communication messages',
		['agents', 'communication'],
		[
			{
				communicationId: 'comm-001',
				fromAgent: 'agent-001',
				toAgent: 'agent-002',
				messageType: 'task-delegation',
				content: {
					taskType: 'dependency-check',
					parameters: { packageName: 'lodash' },
				},
				correlationId: 'corr-123',
				timestamp: new Date('2024-01-01T08:10:00Z').toISOString(),
			},
		],
	);

	return registry;
}

export interface AgentsBusConfig {
	transport?: Transport;
	schemaRegistry?: SchemaRegistry;
	acl?: TopicACL;
	busOptions?: BusOptions;
}

export function createAgentsBus(config: AgentsBusConfig = {}) {
	const registry = config.schemaRegistry ?? createAgentsSchemaRegistry();
	const acl: TopicACL = {
		...DEFAULT_AGENTS_ACL,
		...(config.acl ?? {}),
	};
	const transport = config.transport ?? inproc();
	const bus = createBus(transport, undefined, registry, acl, config.busOptions);
	return { bus, schemaRegistry: registry, transport };
}
