import { z } from 'zod';
export declare const diagnosticCheckStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["ok", "freed", "error", "degraded"]>;
    details: z.ZodOptional<z.ZodString>;
    latencyMs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "error" | "ok" | "freed" | "degraded";
    details?: string | undefined;
    latencyMs?: number | undefined;
}, {
    status: "error" | "ok" | "freed" | "degraded";
    details?: string | undefined;
    latencyMs?: number | undefined;
}>;
export declare const diagnosticsResultSchema: z.ZodObject<{
    timestamp: z.ZodString;
    port_guard: z.ZodObject<{
        status: z.ZodEnum<["ok", "freed", "error", "degraded"]>;
        details: z.ZodOptional<z.ZodString>;
        latencyMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        status: "error" | "ok" | "freed" | "degraded";
        details?: string | undefined;
        latencyMs?: number | undefined;
    }, {
        status: "error" | "ok" | "freed" | "degraded";
        details?: string | undefined;
        latencyMs?: number | undefined;
    }>;
    health: z.ZodObject<{
        status: z.ZodEnum<["ok", "freed", "error", "degraded"]>;
        details: z.ZodOptional<z.ZodString>;
    } & {
        latencyMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        status: "error" | "ok" | "freed" | "degraded";
        details?: string | undefined;
        latencyMs?: number | undefined;
    }, {
        status: "error" | "ok" | "freed" | "degraded";
        details?: string | undefined;
        latencyMs?: number | undefined;
    }>;
    tunnel: z.ZodObject<{
        status: z.ZodEnum<["ok", "freed", "error", "degraded"]>;
        details: z.ZodOptional<z.ZodString>;
        latencyMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        status: "error" | "ok" | "freed" | "degraded";
        details?: string | undefined;
        latencyMs?: number | undefined;
    }, {
        status: "error" | "ok" | "freed" | "degraded";
        details?: string | undefined;
        latencyMs?: number | undefined;
    }>;
    summary: z.ZodObject<{
        overall: z.ZodEnum<["ok", "degraded", "failed"]>;
    }, "strip", z.ZodTypeAny, {
        overall: "failed" | "ok" | "degraded";
    }, {
        overall: "failed" | "ok" | "degraded";
    }>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    summary: {
        overall: "failed" | "ok" | "degraded";
    };
    port_guard: {
        status: "error" | "ok" | "freed" | "degraded";
        details?: string | undefined;
        latencyMs?: number | undefined;
    };
    health: {
        status: "error" | "ok" | "freed" | "degraded";
        details?: string | undefined;
        latencyMs?: number | undefined;
    };
    tunnel: {
        status: "error" | "ok" | "freed" | "degraded";
        details?: string | undefined;
        latencyMs?: number | undefined;
    };
}, {
    timestamp: string;
    summary: {
        overall: "failed" | "ok" | "degraded";
    };
    port_guard: {
        status: "error" | "ok" | "freed" | "degraded";
        details?: string | undefined;
        latencyMs?: number | undefined;
    };
    health: {
        status: "error" | "ok" | "freed" | "degraded";
        details?: string | undefined;
        latencyMs?: number | undefined;
    };
    tunnel: {
        status: "error" | "ok" | "freed" | "degraded";
        details?: string | undefined;
        latencyMs?: number | undefined;
    };
}>;
export type DiagnosticsResult = z.infer<typeof diagnosticsResultSchema>;
export declare function parseDiagnosticsResult(input: unknown): DiagnosticsResult;
//# sourceMappingURL=diagnostics.d.ts.map