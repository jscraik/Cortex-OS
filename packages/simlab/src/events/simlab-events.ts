import { createEnvelope } from '@cortex-os/a2a-contracts';
import { z } from 'zod';

/**
 * SimLab A2A event schemas for inter-package communication
 */

export const SIMLAB_EVENT_SOURCE = 'https://cortex-os.dev/simlab';
const SIMLAB_EVENT_SCHEMA_VERSION = '1';
const SIMLAB_DATACONTENTTYPE = 'application/json';

const schemaUri = (eventType: string) =>
	`https://schemas.cortex-os.dev/simlab/${eventType}/v${SIMLAB_EVENT_SCHEMA_VERSION}`;

// Simulation Started Event
export const SimulationStartedEventSchema = z.object({
	simulationId: z.string(),
	name: z.string(),
	type: z.enum(['agent', 'environment', 'network', 'performance']),
	parameters: z.record(z.any()),
	duration: z.number().int().positive().optional(),
	startedBy: z.string(),
	startedAt: z.string(),
});

// Agent Created Event
export const AgentCreatedEventSchema = z.object({
	simulationId: z.string(),
	agentId: z.string(),
	type: z.enum(['llm', 'rule_based', 'ml', 'hybrid']),
	capabilities: z.array(z.string()),
	initialState: z.record(z.any()).optional(),
	createdAt: z.string(),
});

// Experiment Result Event
export const ExperimentResultEventSchema = z.object({
	simulationId: z.string(),
	experimentId: z.string(),
	agentId: z.string().optional(),
	metric: z.string(),
	value: z.number(),
	unit: z.string().optional(),
	timestamp: z.number().int().nonnegative(),
	recordedAt: z.string(),
});

// Simulation Completed Event
export const SimulationCompletedEventSchema = z.object({
	simulationId: z.string(),
	status: z.enum(['completed', 'failed', 'cancelled']),
	duration: z.number().int().nonnegative(),
	totalAgents: z.number().int().nonnegative(),
	totalExperiments: z.number().int().nonnegative(),
	results: z.record(z.any()).optional(),
	completedAt: z.string(),
});

// Export event type definitions
export type SimulationStartedEvent = z.infer<typeof SimulationStartedEventSchema>;
export type AgentCreatedEvent = z.infer<typeof AgentCreatedEventSchema>;
export type ExperimentResultEvent = z.infer<typeof ExperimentResultEventSchema>;
export type SimulationCompletedEvent = z.infer<typeof SimulationCompletedEventSchema>;

// Helper function to create SimLab events
export const createSimLabEvent = {
	simulationStarted: (data: SimulationStartedEvent) =>
		createEnvelope({
			type: 'simlab.simulation.started' as const,
			source: SIMLAB_EVENT_SOURCE,
			data: SimulationStartedEventSchema.parse(data),
			datacontenttype: SIMLAB_DATACONTENTTYPE,
			dataschema: schemaUri('simlab.simulation.started'),
		}),
	agentCreated: (data: AgentCreatedEvent) =>
		createEnvelope({
			type: 'simlab.agent.created' as const,
			source: SIMLAB_EVENT_SOURCE,
			data: AgentCreatedEventSchema.parse(data),
			datacontenttype: SIMLAB_DATACONTENTTYPE,
			dataschema: schemaUri('simlab.agent.created'),
		}),
	experimentResult: (data: ExperimentResultEvent) =>
		createEnvelope({
			type: 'simlab.experiment.result' as const,
			source: SIMLAB_EVENT_SOURCE,
			data: ExperimentResultEventSchema.parse(data),
			datacontenttype: SIMLAB_DATACONTENTTYPE,
			dataschema: schemaUri('simlab.experiment.result'),
		}),
	simulationCompleted: (data: SimulationCompletedEvent) =>
		createEnvelope({
			type: 'simlab.simulation.completed' as const,
			source: SIMLAB_EVENT_SOURCE,
			data: SimulationCompletedEventSchema.parse(data),
			datacontenttype: SIMLAB_DATACONTENTTYPE,
			dataschema: schemaUri('simlab.simulation.completed'),
		}),
};
