import { z } from 'zod';

/**
 * Tool mapper configuration schema
 */
export const ToolMapperConfigSchema = z.object({
    enableSafeFallbacks: z.boolean().default(true),
    maxRetries: z.number().min(0).max(10).default(3),
    fallbackTimeout: z.number().min(1000).max(30000).default(5000),
    supportedToolTypes: z.array(z.string()).min(1),
    securityLevel: z.enum(['strict', 'moderate', 'permissive', 'paranoid']).default('strict'),
    allowExternalTools: z.boolean().default(false),
    telemetryCallback: z.function().args(z.any()).returns(z.void()).optional()
});

/**
 * Unknown tool request schema
 */
export const UnknownToolRequestSchema = z.object({
    toolType: z.string().min(1),
    parameters: z.record(z.any()),
    context: z.object({
        source: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
        allowFallbacks: z.boolean().optional(),
        requiredVersion: z.string().optional(),
        compatibilityMode: z.enum(['strict', 'flexible']).optional(),
        pluginContext: z.boolean().optional(),
        enableMLSuggestions: z.boolean().optional()
    })
});

/**
 * Tool mapping result schema
 */
export const ToolMappingResultSchema = z.object({
    success: z.boolean(),
    mappedTool: z.object({
        type: z.string(),
        category: z.enum(['search', 'file', 'database', 'browser', 'utility', 'analysis']),
        parameters: z.record(z.any()),
        version: z.string().optional()
    }).optional(),
    fallbackUsed: z.boolean().optional(),
    confidence: z.number().min(0).max(1).optional(),
    processingTime: z.number(),
    error: z.string().optional(),
    securityReason: z.enum(['dangerous-operation', 'external-tools-disabled', 'invalid-parameters']).optional(),
    gracefulDegradation: z.boolean().optional(),
    discoveryAttempted: z.boolean().optional(),
    registeredNewTool: z.object({
        type: z.string(),
        category: z.string(),
        version: z.string()
    }).optional(),
    fromCache: z.boolean().optional(),
    versionCompatibility: z.object({
        requested: z.string(),
        resolved: z.string(),
        compatible: z.boolean()
    }).optional(),
    pluginUsed: z.boolean().optional(),
    pluginInfo: z.object({
        name: z.string(),
        version: z.string(),
        author: z.string().optional()
    }).optional(),
    mlSuggestions: z.array(z.object({
        toolType: z.string(),
        confidence: z.number(),
        reasoning: z.string()
    })).optional(),
    metadata: z.object({
        processor: z.string(),
        originalToolType: z.string(),
        timestamp: z.string(),
        sessionId: z.string().optional()
    })
});

/**
 * Tool health status schema
 */
export const ToolHealthStatusSchema = z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    registeredTools: z.number(),
    processorName: z.string(),
    lastError: z.string().optional(),
    cacheHitRate: z.number().optional(),
    averageResolutionTime: z.number().optional()
});

// Export TypeScript types
export type ToolMapperConfig = z.infer<typeof ToolMapperConfigSchema>;
export type UnknownToolRequest = z.infer<typeof UnknownToolRequestSchema>;
export type ToolMappingResult = z.infer<typeof ToolMappingResultSchema>;
export type ToolHealthStatus = z.infer<typeof ToolHealthStatusSchema>;

/**
 * Telemetry event types for tool mapping operations
 */
export interface ToolMappingTelemetryEvent {
    event: string;
    toolType?: string;
    processor?: string;
    processingTime?: number;
    success?: boolean;
    fallbackUsed?: boolean;
    confidence?: number;
    error?: string;
    timestamp: string;
}
