import { z } from 'zod';
/**
 * Model Gateway-related A2A event schemas for inter-package communication
 */
export declare const RequestRoutedEventSchema: z.ZodObject<{
    requestId: z.ZodString;
    model: z.ZodString;
    provider: z.ZodString;
    routedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    requestId: string;
    model: string;
    provider: string;
    routedAt: string;
}, {
    requestId: string;
    model: string;
    provider: string;
    routedAt: string;
}>;
export declare const ModelResponseEventSchema: z.ZodObject<{
    requestId: z.ZodString;
    model: z.ZodString;
    provider: z.ZodString;
    latency: z.ZodNumber;
    tokens: z.ZodOptional<z.ZodObject<{
        input: z.ZodNumber;
        output: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        input: number;
        output: number;
    }, {
        input: number;
        output: number;
    }>>;
    completedAt: z.ZodString;
    evidence: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
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
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    completedAt: string;
    requestId: string;
    model: string;
    provider: string;
    latency: number;
    tokens?: {
        input: number;
        output: number;
    } | undefined;
    evidence?: {
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
    }[] | undefined;
}, {
    completedAt: string;
    requestId: string;
    model: string;
    provider: string;
    latency: number;
    tokens?: {
        input: number;
        output: number;
    } | undefined;
    evidence?: {
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
    }[] | undefined;
}>;
export declare const ModelErrorEventSchema: z.ZodObject<{
    requestId: z.ZodString;
    model: z.ZodString;
    provider: z.ZodString;
    error: z.ZodString;
    errorCode: z.ZodOptional<z.ZodString>;
    failedAt: z.ZodString;
    evidence: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
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
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    error: string;
    failedAt: string;
    requestId: string;
    model: string;
    provider: string;
    evidence?: {
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
    }[] | undefined;
    errorCode?: string | undefined;
}, {
    error: string;
    failedAt: string;
    requestId: string;
    model: string;
    provider: string;
    evidence?: {
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
    }[] | undefined;
    errorCode?: string | undefined;
}>;
export declare const ProviderHealthEventSchema: z.ZodObject<{
    provider: z.ZodString;
    status: z.ZodEnum<["healthy", "degraded", "unhealthy"]>;
    latency: z.ZodOptional<z.ZodNumber>;
    checkedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "degraded" | "healthy" | "unhealthy";
    provider: string;
    checkedAt: string;
    latency?: number | undefined;
}, {
    status: "degraded" | "healthy" | "unhealthy";
    provider: string;
    checkedAt: string;
    latency?: number | undefined;
}>;
export type RequestRoutedEvent = z.infer<typeof RequestRoutedEventSchema>;
export type ModelResponseEvent = z.infer<typeof ModelResponseEventSchema>;
export type ModelErrorEvent = z.infer<typeof ModelErrorEventSchema>;
export type ProviderHealthEvent = z.infer<typeof ProviderHealthEventSchema>;
export declare const createModelGatewayEvent: {
    requestRouted: (data: RequestRoutedEvent) => {
        type: "model_gateway.request.routed";
        data: {
            requestId: string;
            model: string;
            provider: string;
            routedAt: string;
        };
    };
    modelResponse: (data: ModelResponseEvent) => {
        type: "model_gateway.response.completed";
        data: {
            completedAt: string;
            requestId: string;
            model: string;
            provider: string;
            latency: number;
            tokens?: {
                input: number;
                output: number;
            } | undefined;
            evidence?: {
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
            }[] | undefined;
        };
    };
    modelError: (data: ModelErrorEvent) => {
        type: "model_gateway.response.error";
        data: {
            error: string;
            failedAt: string;
            requestId: string;
            model: string;
            provider: string;
            evidence?: {
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
            }[] | undefined;
            errorCode?: string | undefined;
        };
    };
    providerHealth: (data: ProviderHealthEvent) => {
        type: "model_gateway.provider.health";
        data: {
            status: "degraded" | "healthy" | "unhealthy";
            provider: string;
            checkedAt: string;
            latency?: number | undefined;
        };
    };
};
//# sourceMappingURL=model-gateway-events.d.ts.map