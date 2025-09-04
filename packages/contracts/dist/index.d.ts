import { z } from "zod";
export declare const MessageEnvelopeSchema: z.ZodObject<{
    id: z.ZodString;
    kind: z.ZodEnum<["MCP", "A2A", "RAG", "SIMLAB"]>;
    ts: z.ZodString;
    payload: z.ZodUnknown;
    meta: z.ZodObject<{
        seed: z.ZodNumber;
        traceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        seed: number;
        traceId?: string | undefined;
    }, {
        seed: number;
        traceId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    kind: "MCP" | "A2A" | "RAG" | "SIMLAB";
    ts: string;
    meta: {
        seed: number;
        traceId?: string | undefined;
    };
    payload?: unknown;
}, {
    id: string;
    kind: "MCP" | "A2A" | "RAG" | "SIMLAB";
    ts: string;
    meta: {
        seed: number;
        traceId?: string | undefined;
    };
    payload?: unknown;
}>;
export type MessageEnvelope = z.infer<typeof MessageEnvelopeSchema>;
export declare const AgentConfigSchema: z.ZodObject<{
    seed: z.ZodDefault<z.ZodNumber>;
    maxTokens: z.ZodDefault<z.ZodNumber>;
    timeoutMs: z.ZodDefault<z.ZodNumber>;
    memory: z.ZodObject<{
        maxItems: z.ZodNumber;
        maxBytes: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        maxItems: number;
        maxBytes: number;
    }, {
        maxItems: number;
        maxBytes: number;
    }>;
}, "strip", z.ZodTypeAny, {
    seed: number;
    maxTokens: number;
    timeoutMs: number;
    memory: {
        maxItems: number;
        maxBytes: number;
    };
}, {
    memory: {
        maxItems: number;
        maxBytes: number;
    };
    seed?: number | undefined;
    maxTokens?: number | undefined;
    timeoutMs?: number | undefined;
}>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export declare const ErrorResponseSchema: z.ZodObject<{
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        details?: Record<string, unknown> | undefined;
    }, {
        code: string;
        message: string;
        details?: Record<string, unknown> | undefined;
    }>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    error: {
        code: string;
        message: string;
        details?: Record<string, unknown> | undefined;
    };
    timestamp: string;
}, {
    error: {
        code: string;
        message: string;
        details?: Record<string, unknown> | undefined;
    };
    timestamp: string;
}>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export declare const A2AMessageSchema: z.ZodObject<{
    from: z.ZodString;
    to: z.ZodString;
    action: z.ZodString;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    from: string;
    to: string;
    action: string;
    data?: Record<string, unknown> | undefined;
}, {
    from: string;
    to: string;
    action: string;
    data?: Record<string, unknown> | undefined;
}>;
export type A2AMessage = z.infer<typeof A2AMessageSchema>;
export declare const MCPRequestSchema: z.ZodObject<{
    tool: z.ZodString;
    args: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    tool: string;
    args?: Record<string, unknown> | undefined;
}, {
    tool: string;
    args?: Record<string, unknown> | undefined;
}>;
export type MCPRequest = z.infer<typeof MCPRequestSchema>;
export declare const RAGQuerySchema: z.ZodObject<{
    query: z.ZodString;
    topK: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    query: string;
    topK: number;
}, {
    query: string;
    topK?: number | undefined;
}>;
export type RAGQuery = z.infer<typeof RAGQuerySchema>;
export declare const SimlabCommandSchema: z.ZodObject<{
    scenario: z.ZodString;
    step: z.ZodString;
    params: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    scenario: string;
    step: string;
    params?: Record<string, unknown> | undefined;
}, {
    scenario: string;
    step: string;
    params?: Record<string, unknown> | undefined;
}>;
export type SimlabCommand = z.infer<typeof SimlabCommandSchema>;
