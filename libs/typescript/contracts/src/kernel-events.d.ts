import { z } from 'zod';
/**
 * Kernel-related A2A event schemas for inter-package communication
 */
export declare const NodeExecutionStartedEventSchema: z.ZodObject<{
    nodeId: z.ZodString;
    graphId: z.ZodString;
    inputs: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    startedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    startedAt: string;
    inputs: Record<string, unknown>;
    nodeId: string;
    graphId: string;
}, {
    startedAt: string;
    inputs: Record<string, unknown>;
    nodeId: string;
    graphId: string;
}>;
export declare const NodeExecutionCompletedEventSchema: z.ZodObject<{
    nodeId: z.ZodString;
    graphId: z.ZodString;
    outputs: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    duration: z.ZodNumber;
    completedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    duration: number;
    completedAt: string;
    nodeId: string;
    graphId: string;
    outputs: Record<string, unknown>;
}, {
    duration: number;
    completedAt: string;
    nodeId: string;
    graphId: string;
    outputs: Record<string, unknown>;
}>;
export declare const NodeExecutionFailedEventSchema: z.ZodObject<{
    nodeId: z.ZodString;
    graphId: z.ZodString;
    error: z.ZodString;
    failedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    error: string;
    failedAt: string;
    nodeId: string;
    graphId: string;
}, {
    error: string;
    failedAt: string;
    nodeId: string;
    graphId: string;
}>;
export declare const GraphStateChangedEventSchema: z.ZodObject<{
    graphId: z.ZodString;
    previousState: z.ZodString;
    newState: z.ZodString;
    changedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    graphId: string;
    previousState: string;
    newState: string;
    changedAt: string;
}, {
    graphId: string;
    previousState: string;
    newState: string;
    changedAt: string;
}>;
export type NodeExecutionStartedEvent = z.infer<typeof NodeExecutionStartedEventSchema>;
export type NodeExecutionCompletedEvent = z.infer<typeof NodeExecutionCompletedEventSchema>;
export type NodeExecutionFailedEvent = z.infer<typeof NodeExecutionFailedEventSchema>;
export type GraphStateChangedEvent = z.infer<typeof GraphStateChangedEventSchema>;
export declare const createKernelEvent: {
    nodeStarted: (data: NodeExecutionStartedEvent) => {
        type: "kernel.node.started";
        data: {
            startedAt: string;
            inputs: Record<string, unknown>;
            nodeId: string;
            graphId: string;
        };
    };
    nodeCompleted: (data: NodeExecutionCompletedEvent) => {
        type: "kernel.node.completed";
        data: {
            duration: number;
            completedAt: string;
            nodeId: string;
            graphId: string;
            outputs: Record<string, unknown>;
        };
    };
    nodeFailed: (data: NodeExecutionFailedEvent) => {
        type: "kernel.node.failed";
        data: {
            error: string;
            failedAt: string;
            nodeId: string;
            graphId: string;
        };
    };
    graphStateChanged: (data: GraphStateChangedEvent) => {
        type: "kernel.graph.state_changed";
        data: {
            graphId: string;
            previousState: string;
            newState: string;
            changedAt: string;
        };
    };
};
//# sourceMappingURL=kernel-events.d.ts.map