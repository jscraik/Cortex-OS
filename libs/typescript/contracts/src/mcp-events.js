import { z } from "zod";
// Event type constants for MCP telemetry
export const McpEventTypes = {
    ToolCallBegin: "mcp.tool.call.begin",
    ToolCallEnd: "mcp.tool.call.end",
};
export const McpToolCallBeginSchema = z.object({
    callId: z.string().min(1),
    name: z.string().min(1),
    // Arguments are redacted before emission; keep loose typing here
    arguments: z.unknown().optional(),
    timestamp: z.number().int().nonnegative(),
});
export const McpToolCallEndSchema = z.object({
    callId: z.string().min(1),
    name: z.string().min(1),
    durationMs: z.number().int().nonnegative(),
    success: z.boolean(),
    error: z.string().optional(),
});
//# sourceMappingURL=mcp-events.js.map
