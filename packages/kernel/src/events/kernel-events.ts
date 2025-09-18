import { z } from 'zod';

/**
 * Kernel-related A2A event schemas for inter-package communication
 */

// Node Execution Started Event
export const NodeExecutionStartedEventSchema = z.object({
	nodeId: z.string(),
	graphId: z.string(),
	inputs: z.record(z.unknown()),
	startedAt: z.string(),
});

// Node Execution Completed Event
export const NodeExecutionCompletedEventSchema = z.object({
	nodeId: z.string(),
	graphId: z.string(),
	outputs: z.record(z.unknown()),
	duration: z.number().positive(),
	completedAt: z.string(),
});

// Node Execution Failed Event
export const NodeExecutionFailedEventSchema = z.object({
	nodeId: z.string(),
	graphId: z.string(),
	error: z.string(),
	failedAt: z.string(),
});

// Graph State Changed Event
export const GraphStateChangedEventSchema = z.object({
	graphId: z.string(),
	previousState: z.string(),
	newState: z.string(),
	changedAt: z.string(),
});

// Export event type definitions
export type NodeExecutionStartedEvent = z.infer<typeof NodeExecutionStartedEventSchema>;
export type NodeExecutionCompletedEvent = z.infer<typeof NodeExecutionCompletedEventSchema>;
export type NodeExecutionFailedEvent = z.infer<typeof NodeExecutionFailedEventSchema>;
export type GraphStateChangedEvent = z.infer<typeof GraphStateChangedEventSchema>;

// Helper function to create kernel events
export const createKernelEvent = {
	nodeStarted: (data: NodeExecutionStartedEvent) => ({
		type: 'kernel.node.started' as const,
		data: NodeExecutionStartedEventSchema.parse(data),
	}),
	nodeCompleted: (data: NodeExecutionCompletedEvent) => ({
		type: 'kernel.node.completed' as const,
		data: NodeExecutionCompletedEventSchema.parse(data),
	}),
	nodeFailed: (data: NodeExecutionFailedEvent) => ({
		type: 'kernel.node.failed' as const,
		data: NodeExecutionFailedEventSchema.parse(data),
	}),
	graphStateChanged: (data: GraphStateChangedEvent) => ({
		type: 'kernel.graph.state_changed' as const,
		data: GraphStateChangedEventSchema.parse(data),
	}),
};
