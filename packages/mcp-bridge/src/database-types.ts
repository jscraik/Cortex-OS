import { z } from 'zod';

/**
 * Database executor configuration schema
 */
export const DatabaseExecutorConfigSchema = z.object({
    connectionString: z.string().min(1),
    readReplicaConnectionString: z.string().optional(),
    poolSize: z.number().min(1).max(100).default(10),
    queryTimeout: z.number().min(1000).max(300000).default(30000),
    enableParameterValidation: z.boolean().default(true),
    allowedOperations: z.array(z.enum(['SELECT', 'INSERT', 'UPDATE', 'DELETE'])).min(1),
    maxConcurrentQueries: z.number().min(1).max(50).default(5),
    preferReadReplica: z.boolean().default(false),
    telemetryCallback: z.function().args(z.any()).returns(z.void()).optional()
});

/**
 * Query request schema
 */
export const QueryRequestSchema = z.object({
    query: z.string().min(1),
    parameters: z.array(z.any()).default([]),
    timeout: z.number().min(1000).max(60000).optional(),
    cacheTTL: z.number().min(0).max(3600).optional(),
    validateSchema: z.boolean().optional(),
    expectedColumns: z.array(z.string()).optional(),
    usePreparedStatement: z.boolean().optional(),
    statementName: z.string().optional()
});

/**
 * Query result schema
 */
export const QueryResultSchema = z.object({
    success: z.boolean(),
    rows: z.array(z.record(z.any())),
    rowCount: z.number(),
    processingTime: z.number(),
    error: z.string().optional(),
    fallbackUsed: z.boolean().optional(),
    fromCache: z.boolean().optional(),
    usedReadReplica: z.boolean().optional(),
    connectionType: z.enum(['primary', 'read-replica']).optional(),
    usedPreparedStatement: z.boolean().optional(),
    statementName: z.string().optional(),
    schemaValidation: z.object({
        valid: z.boolean(),
        expectedColumns: z.array(z.string()),
        actualColumns: z.array(z.string()).optional()
    }).optional(),
    metadata: z.object({
        processorName: z.string(),
        queryHash: z.string(),
        timestamp: z.string(),
        databaseVersion: z.string().optional()
    })
});

/**
 * Transaction result schema
 */
export const TransactionResultSchema = z.object({
    success: z.boolean(),
    transactionId: z.string(),
    results: z.array(QueryResultSchema),
    processingTime: z.number(),
    error: z.string().optional()
});

/**
 * Pool status schema
 */
export const PoolStatusSchema = z.object({
    activeConnections: z.number(),
    idleConnections: z.number(),
    totalConnections: z.number(),
    pendingRequests: z.number()
});

/**
 * Database health status schema
 */
export const DatabaseHealthStatusSchema = z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    databaseConnected: z.boolean(),
    activeConnections: z.number(),
    processorName: z.string(),
    lastError: z.string().optional(),
    responseTime: z.number().optional(),
    version: z.string().optional()
});

// Export TypeScript types
export type DatabaseExecutorConfig = z.infer<typeof DatabaseExecutorConfigSchema>;
export type QueryRequest = z.infer<typeof QueryRequestSchema>;
export type QueryResult = z.infer<typeof QueryResultSchema>;
export type TransactionResult = z.infer<typeof TransactionResultSchema>;
export type PoolStatus = z.infer<typeof PoolStatusSchema>;
export type DatabaseHealthStatus = z.infer<typeof DatabaseHealthStatusSchema>;

/**
 * Telemetry event types for database operations
 */
export interface DatabaseTelemetryEvent {
    event: string;
    queryHash?: string;
    processor?: string;
    processingTime?: number;
    success?: boolean;
    rowCount?: number;
    error?: string;
    timestamp: string;
}
