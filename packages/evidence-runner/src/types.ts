import { z } from 'zod';

/**
 * Evidence source types supported by brAInwav Cortex-OS
 */
export const EvidenceSourceSchema = z.object({
    type: z.enum(['file', 'log', 'metric', 'report', 'database', 'api']),
    path: z.string(),
    content: z.string(),
    metadata: z.record(z.unknown()).optional()
});

/**
 * Context for evidence enhancement processing
 */
export const EvidenceContextSchema = z.object({
    taskId: z.string(),
    claim: z.string(),
    sources: z.array(EvidenceSourceSchema),
    metadata: z.object({
        priority: z.enum(['low', 'medium', 'high']).optional(),
        domain: z.string().optional(),
        requester: z.string().optional()
    }).optional()
});

/**
 * Enhanced evidence result with AI analysis
 */
export const EnhancedEvidenceSchema = z.object({
    id: z.string(),
    taskId: z.string(),
    originalClaim: z.string(),
    confidence: z.number().min(0).max(1),
    aiAnalysis: z.string(),
    relatedEvidence: z.array(z.object({
        claim: z.string(),
        similarity: z.number(),
        source: z.string()
    })),
    enhancements: z.array(z.string()),
    processingTime: z.number(),
    errors: z.array(z.string()).optional(),
    fallbackUsed: z.boolean().optional(),
    metadata: z.object({
        processor: z.string(),
        processorVersion: z.string(),
        timestamp: z.string(),
        mlxModel: z.string().optional(),
        embeddingModel: z.string().optional(),
        // New fields for real MLX integration
        mlxModelLoaded: z.boolean().optional(),
        realMLXInference: z.boolean().optional(),
        confidenceMethod: z.string().optional(),
        mlxConfidenceScores: z.array(z.number()).optional(),
        embeddingVectors: z.array(z.number()).optional(),
        vectorSimilarityUsed: z.boolean().optional(),
        // New fields for code quality compliance
        methodSizeCompliant: z.boolean().optional(),
        maxMethodLines: z.number().optional()
    })
});

/**
 * Configuration for Evidence Enhancer
 */
export const EvidenceEnhancerConfigSchema = z.object({
    mlxModelPath: z.string().min(1),
    embeddingModelPath: z.string().optional(),
    enableMLXGeneration: z.boolean().default(true),
    enableEmbeddingSearch: z.boolean().default(true),
    confidenceBoost: z.number().min(0).max(0.5).default(0.1),
    temperature: z.number().min(0).max(2.0).default(0.3),
    maxTokens: z.number().min(1).max(4096).default(512),
    telemetryCallback: z.function().args(z.any()).returns(z.void()).optional(),
    // New fields for memory management
    maxCacheSize: z.number().optional()
});

/**
 * Health check status for Evidence Enhancer
 */
export const HealthStatusSchema = z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    mlxAvailable: z.boolean(),
    embeddingAvailable: z.boolean().optional(),
    processorName: z.string(),
    lastError: z.string().optional(),
    memoryUsage: z.number().optional(),
    modelsLoaded: z.number().optional(),
    // New fields for memory management
    cacheSize: z.number().optional(),
    memoryLeakDetected: z.boolean().optional()
});

// Export TypeScript types
export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;
export type EvidenceContext = z.infer<typeof EvidenceContextSchema>;
export type EnhancedEvidence = z.infer<typeof EnhancedEvidenceSchema>;
export type EvidenceEnhancerConfig = z.infer<typeof EvidenceEnhancerConfigSchema>;
export type HealthStatus = z.infer<typeof HealthStatusSchema>;

/**
 * Telemetry event types for observability
 */
export interface TelemetryEvent {
    event: string;
    taskId?: string;
    processor?: string;
    processingTime?: number;
    confidence?: number;
    error?: string;
    timestamp: string;
}
