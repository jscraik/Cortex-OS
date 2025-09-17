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
// Helper function to create kernel events
export const createKernelEvent = {
	nodeStarted: (data) => ({
		type: 'kernel.node.started',
		data: NodeExecutionStartedEventSchema.parse(data),
	}),
	nodeCompleted: (data) => ({
		type: 'kernel.node.completed',
		data: NodeExecutionCompletedEventSchema.parse(data),
	}),
	nodeFailed: (data) => ({
		type: 'kernel.node.failed',
		data: NodeExecutionFailedEventSchema.parse(data),
	}),
	graphStateChanged: (data) => ({
		type: 'kernel.graph.state_changed',
		data: GraphStateChangedEventSchema.parse(data),
	}),
};
//# sourceMappingURL=kernel-events.js.map
