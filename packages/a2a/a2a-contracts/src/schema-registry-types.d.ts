import type { z } from 'zod';
/**
 * Schema registry types for centralized event schema management
 */
/**
 * Schema metadata information
 */
export interface SchemaMetadata {
    /** Unique identifier for the schema */
    id: string;
    /** Event type this schema validates */
    eventType: string;
    /** Schema version (semantic versioning) */
    version: string;
    /** Human-readable description */
    description?: string;
    /** Schema author/owner */
    author?: string;
    /** Creation timestamp */
    createdAt: Date;
    /** Last modification timestamp */
    updatedAt: Date;
    /** Whether this schema is deprecated */
    deprecated?: boolean;
    /** Compatibility mode for schema evolution */
    compatibility: SchemaCompatibility;
    /** Custom metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Schema compatibility modes for evolution
 */
export declare enum SchemaCompatibility {
    /** New schemas must be backward compatible */
    BACKWARD = "BACKWARD",
    /** New schemas must be forward compatible */
    FORWARD = "FORWARD",
    /** New schemas must be both backward and forward compatible */
    FULL = "FULL",
    /** No compatibility requirements */
    NONE = "NONE"
}
/**
 * Registered schema with validation capabilities
 */
export interface RegisteredSchema extends SchemaMetadata {
    /** Zod schema for validation */
    schema: z.ZodSchema;
    /** Examples for documentation/testing */
    examples?: unknown[];
    /** Schema tags for categorization */
    tags?: string[];
}
/**
 * Schema validation result
 */
export interface ValidationResult {
    /** Whether validation passed */
    valid: boolean;
    /** Validation errors (if any) */
    errors?: z.ZodError[];
    /** Validated and transformed data */
    data?: unknown;
    /** Schema used for validation */
    schemaId?: string;
    /** Schema version used */
    schemaVersion?: string;
}
/**
 * Schema registry configuration
 */
export interface SchemaRegistryConfig {
    /** Whether to enable strict validation */
    strictValidation?: boolean;
    /** Whether to cache schemas in memory */
    enableCache?: boolean;
    /** Cache TTL in milliseconds */
    cacheTtlMs?: number;
    /** Whether to validate schemas on registration */
    validateOnRegistration?: boolean;
    /** Maximum number of schema versions to keep per event type */
    maxVersionsPerType?: number;
}
/**
 * Schema search/filter options
 */
export interface SchemaSearchOptions {
    /** Filter by event type */
    eventType?: string;
    /** Filter by version */
    version?: string;
    /** Filter by tags */
    tags?: string[];
    /** Filter by author */
    author?: string;
    /** Include deprecated schemas */
    includeDeprecated?: boolean;
    /** Limit number of results */
    limit?: number;
    /** Offset for pagination */
    offset?: number;
}
/**
 * Schema evolution result
 */
export interface SchemaEvolutionResult {
    /** Whether evolution is compatible */
    compatible: boolean;
    /** Compatibility issues found */
    issues?: string[];
    /** Recommended actions */
    recommendations?: string[];
    /** Breaking changes detected */
    breakingChanges?: boolean;
}
/**
 * Schema registry statistics
 */
export interface SchemaRegistryStats {
    /** Total number of registered schemas */
    totalSchemas: number;
    /** Number of unique event types */
    uniqueEventTypes: number;
    /** Schemas per event type */
    schemasPerType: Record<string, number>;
    /** Cache hit rate (if caching enabled) */
    cacheHitRate?: number;
    /** Average validation time */
    avgValidationTimeMs?: number;
}
//# sourceMappingURL=schema-registry-types.d.ts.map