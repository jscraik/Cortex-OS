import { z } from "zod";
export declare const McpEventTypes: {
    readonly ToolCallBegin: "mcp.tool.call.begin";
    readonly ToolCallEnd: "mcp.tool.call.end";
};
export declare const McpToolCallBeginSchema: z.ZodObject<{
    callId: z.ZodString;
    name: z.ZodString;
    arguments: z.ZodOptional<z.ZodUnknown>;
    timestamp: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    callId: string;
    name: string;
    timestamp: number;
    arguments?: unknown;
}, {
    callId: string;
    name: string;
    timestamp: number;
    arguments?: unknown;
}>;
export type McpToolCallBegin = z.infer<typeof McpToolCallBeginSchema>;
export declare const McpToolCallEndSchema: z.ZodObject<{
    callId: z.ZodString;
    name: z.ZodString;
    durationMs: z.ZodNumber;
    success: z.ZodBoolean;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    callId: string;
    name: string;
    durationMs: number;
    success: boolean;
    error?: string | undefined;
}, {
    callId: string;
    name: string;
    durationMs: number;
    success: boolean;
    error?: string | undefined;
}>;
export type McpToolCallEnd = z.infer<typeof McpToolCallEndSchema>;
export type McpTelemetryEvent = {
    type: typeof McpEventTypes.ToolCallBegin;
    payload: McpToolCallBegin;
} | {
    type: typeof McpEventTypes.ToolCallEnd;
    payload: McpToolCallEnd;
};
//# sourceMappingURL=mcp-events.d.ts.map
