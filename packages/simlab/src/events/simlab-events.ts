import { z } from 'zod';

/**
 * SimLab A2A event schemas for inter-package communication
 */

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
export type SimulationStartedEvent = z.infer<
	typeof SimulationStartedEventSchema
>;
export type AgentCreatedEvent = z.infer<typeof AgentCreatedEventSchema>;
export type ExperimentResultEvent = z.infer<typeof ExperimentResultEventSchema>;
export type SimulationCompletedEvent = z.infer<
	typeof SimulationCompletedEventSchema
>;

// Helper function to create SimLab events
export const createSimLabEvent = {
	simulationStarted: (data: SimulationStartedEvent) => ({
		type: 'simlab.simulation.started' as const,
		data: SimulationStartedEventSchema.parse(data),
	}),
	agentCreated: (data: AgentCreatedEvent) => ({
		type: 'simlab.agent.created' as const,
		data: AgentCreatedEventSchema.parse(data),
	}),
	experimentResult: (data: ExperimentResultEvent) => ({
		type: 'simlab.experiment.result' as const,
		data: ExperimentResultEventSchema.parse(data),
	}),
	simulationCompleted: (data: SimulationCompletedEvent) => ({
		type: 'simlab.simulation.completed' as const,
		data: SimulationCompletedEventSchema.parse(data),
	}),
};
