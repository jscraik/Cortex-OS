/**
 * A2A Bus Integration for Agents Package
 * Implements A2A native communication following standardized pattern
 */

import { type AccessControlList, type BusOptions, type BusTransport, type EventHandler, type SchemaRegistry } from './types.js';

// Mock implementation until @cortex-os/a2a-core is available
const createBus = () => {
	const handlers = new Map<string, Array<EventHandler>>();

	return {
		emit: async <T>(event: string, data: T) => {
			const eventHandlers = handlers.get(event) || [];
			for (const handler of eventHandlers) {
				try {
					handler(data);
				} catch (error) {
					console.error(`Error in event handler for ${event}:`, error);
				}
			}
		},
		subscribe: <T>(event: string, handler: EventHandler<T>) => {
			const eventHandlers = handlers.get(event) || [];
			eventHandlers.push(handler as EventHandler);
			handlers.set(event, eventHandlers);
			return () => {
				const index = eventHandlers.indexOf(handler as EventHandler);
				if (index > -1) eventHandlers.splice(index, 1);
			};
		},
		destroy: async () => {
			handlers.clear();
		},
	};
};

import { z } from 'zod';

// Agent Events Schema
export const AgentCreatedSchema = z.object({
	agentId: z.string(),
	agentType: z.string(),
	capabilities: z.array(z.string()),
	configuration: z.record(z.unknown()),
	createdBy: z.string().optional(),
	createdAt: z.string(),
});

export const AgentTaskStartedSchema = z.object({
	taskId: z.string(),
	agentId: z.string(),
	taskType: z.string(),
	description: z.string(),
	priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
	estimatedDuration: z.number().optional(),
	startedAt: z.string(),
});

export const AgentTaskCompletedSchema = z.object({
	taskId: z.string(),
	agentId: z.string(),
	taskType: z.string(),
	status: z.enum(['success', 'failed', 'cancelled']),
	durationMs: z.number(),
	result: z.record(z.unknown()).optional(),
	errorMessage: z.string().optional(),
	completedAt: z.string(),
});

export const AgentCommunicationSchema = z.object({
	communicationId: z.string(),
	fromAgent: z.string(),
	toAgent: z.string(),
	messageType: z.string(),
	content: z.record(z.unknown()),
	correlationId: z.string().optional(),
	timestamp: z.string(),
});

// Schema Registry
export function createAgentsSchemaRegistry() {
	const schemas = new Map();

	schemas.set('agents.agent_created', AgentCreatedSchema);
	schemas.set('agents.task_started', AgentTaskStartedSchema);
	schemas.set('agents.task_completed', AgentTaskCompletedSchema);
	schemas.set('agents.communication', AgentCommunicationSchema);

	return {
		register: (name: string, schema: z.ZodSchema) => {
			schemas.set(name, schema);
		},
		get: (name: string) => schemas.get(name),
		validate: (name: string, data: unknown) => {
			const schema = schemas.get(name);
			if (!schema) throw new Error(`Schema not found: ${name}`);
			return schema.parse(data);
		},
	};
}

// Agent Bus Configuration
export interface AgentsBusConfig {
	transport?: BusTransport;
	schemaRegistry?: SchemaRegistry;
	acl?: AccessControlList;
	busOptions?: BusOptions;
}

// Create Agents Bus following standardized pattern
export function createAgentsBus(config: AgentsBusConfig = {}) {
	const schemaRegistry = config.schemaRegistry || createAgentsSchemaRegistry();

	const bus = createBus();

	return {
		bus,
		schemaRegistry,

		// Agent lifecycle events
		async emitAgentCreated(data: z.infer<typeof AgentCreatedSchema>) {
			return bus.emit('agents.agent_created', data);
		},

		async emitTaskStarted(data: z.infer<typeof AgentTaskStartedSchema>) {
			return bus.emit('agents.task_started', data);
		},

		async emitTaskCompleted(data: z.infer<typeof AgentTaskCompletedSchema>) {
			return bus.emit('agents.task_completed', data);
		},

		async emitCommunication(data: z.infer<typeof AgentCommunicationSchema>) {
			return bus.emit('agents.communication', data);
		},

		// Subscribe to events
		onAgentCreated(handler: (data: z.infer<typeof AgentCreatedSchema>) => void) {
			return bus.subscribe('agents.agent_created', handler);
		},

		onTaskStarted(handler: (data: z.infer<typeof AgentTaskStartedSchema>) => void) {
			return bus.subscribe('agents.task_started', handler);
		},

		onTaskCompleted(handler: (data: z.infer<typeof AgentTaskCompletedSchema>) => void) {
			return bus.subscribe('agents.task_completed', handler);
		},

		onCommunication(handler: (data: z.infer<typeof AgentCommunicationSchema>) => void) {
			return bus.subscribe('agents.communication', handler);
		},

		// Cleanup
		async destroy() {
			return bus.destroy();
		},
	};
}
