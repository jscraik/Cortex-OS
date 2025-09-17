import { z } from 'zod';
/**
 * Evidence item representing a citation supporting an LLM claim or agent action.
 * At least one of `text` or `uri` must be provided. When both are present, `text`
 * is considered an extracted snippet from the canonical `uri` source.
 */
export declare const evidenceItemSchema: z.ZodEffects<z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    kind: z.ZodDefault<z.ZodEnum<["document", "code", "web", "memory", "log", "other"]>>;
    text: z.ZodOptional<z.ZodString>;
    uri: z.ZodOptional<z.ZodString>;
    startOffset: z.ZodOptional<z.ZodNumber>;
    endOffset: z.ZodOptional<z.ZodNumber>;
    score: z.ZodOptional<z.ZodNumber>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    hash: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    kind: "code" | "document" | "web" | "memory" | "log" | "other";
    text?: string | undefined;
    id?: string | undefined;
    timestamp?: string | undefined;
    uri?: string | undefined;
    startOffset?: number | undefined;
    endOffset?: number | undefined;
    score?: number | undefined;
    metadata?: Record<string, unknown> | undefined;
    hash?: string | undefined;
}, {
    text?: string | undefined;
    id?: string | undefined;
    timestamp?: string | undefined;
    kind?: "code" | "document" | "web" | "memory" | "log" | "other" | undefined;
    uri?: string | undefined;
    startOffset?: number | undefined;
    endOffset?: number | undefined;
    score?: number | undefined;
    metadata?: Record<string, unknown> | undefined;
    hash?: string | undefined;
}>, {
    kind: "code" | "document" | "web" | "memory" | "log" | "other";
    text?: string | undefined;
    id?: string | undefined;
    timestamp?: string | undefined;
    uri?: string | undefined;
    startOffset?: number | undefined;
    endOffset?: number | undefined;
    score?: number | undefined;
    metadata?: Record<string, unknown> | undefined;
    hash?: string | undefined;
}, {
    text?: string | undefined;
    id?: string | undefined;
    timestamp?: string | undefined;
    kind?: "code" | "document" | "web" | "memory" | "log" | "other" | undefined;
    uri?: string | undefined;
    startOffset?: number | undefined;
    endOffset?: number | undefined;
    score?: number | undefined;
    metadata?: Record<string, unknown> | undefined;
    hash?: string | undefined;
}>;
/**
 * Array of evidence items with an upper bound to prevent unbounded event size
 * and downstream memory pressure.
 */
export declare const evidenceArraySchema: z.ZodArray<z.ZodEffects<z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    kind: z.ZodDefault<z.ZodEnum<["document", "code", "web", "memory", "log", "other"]>>;
    text: z.ZodOptional<z.ZodString>;
    uri: z.ZodOptional<z.ZodString>;
    startOffset: z.ZodOptional<z.ZodNumber>;
    endOffset: z.ZodOptional<z.ZodNumber>;
    score: z.ZodOptional<z.ZodNumber>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    hash: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    kind: "code" | "document" | "web" | "memory" | "log" | "other";
    text?: string | undefined;
    id?: string | undefined;
    timestamp?: string | undefined;
    uri?: string | undefined;
    startOffset?: number | undefined;
    endOffset?: number | undefined;
    score?: number | undefined;
    metadata?: Record<string, unknown> | undefined;
    hash?: string | undefined;
}, {
    text?: string | undefined;
    id?: string | undefined;
    timestamp?: string | undefined;
    kind?: "code" | "document" | "web" | "memory" | "log" | "other" | undefined;
    uri?: string | undefined;
    startOffset?: number | undefined;
    endOffset?: number | undefined;
    score?: number | undefined;
    metadata?: Record<string, unknown> | undefined;
    hash?: string | undefined;
}>, {
    kind: "code" | "document" | "web" | "memory" | "log" | "other";
    text?: string | undefined;
    id?: string | undefined;
    timestamp?: string | undefined;
    uri?: string | undefined;
    startOffset?: number | undefined;
    endOffset?: number | undefined;
    score?: number | undefined;
    metadata?: Record<string, unknown> | undefined;
    hash?: string | undefined;
}, {
    text?: string | undefined;
    id?: string | undefined;
    timestamp?: string | undefined;
    kind?: "code" | "document" | "web" | "memory" | "log" | "other" | undefined;
    uri?: string | undefined;
    startOffset?: number | undefined;
    endOffset?: number | undefined;
    score?: number | undefined;
    metadata?: Record<string, unknown> | undefined;
    hash?: string | undefined;
}>, "many">;
export type EvidenceItem = z.infer<typeof evidenceItemSchema>;
export type EvidenceArray = z.infer<typeof evidenceArraySchema>;
//# sourceMappingURL=evidence.d.ts.map