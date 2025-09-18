import type { z } from 'zod';
import type {
	RegisteredSchema,
	SchemaEvolutionResult,
	SchemaRegistryConfig,
	SchemaRegistryStats,
	SchemaSearchOptions,
	ValidationResult,
} from '../../a2a-contracts/src/schema-registry-types.js';
/**
 * In-memory schema registry implementation
 * Provides centralized schema management for A2A events
 */
export declare class SchemaRegistry {
	private readonly schemas;
	private readonly schemaCache;
	private readonly config;
	private stats;
	constructor(config?: SchemaRegistryConfig);
	/**
	 * Register a new schema
	 */
	register(schema: Omit<RegisteredSchema, 'id' | 'createdAt' | 'updatedAt'>): string;
	/**
	 * Get schema by ID
	 */
	getSchema(id: string): RegisteredSchema | undefined;
	/**
	 * Get latest schema for event type
	 */
	getLatestSchema(eventType: string): RegisteredSchema | undefined;
	/**
	 * Get schema by event type and version
	 */
	getSchemaByVersion(eventType: string, version: string): RegisteredSchema | undefined;
	/**
	 * Validate data against schema
	 */
	validate(eventType: string, data: unknown, version?: string): ValidationResult;
	/**
	 * Search schemas with filters
	 */
	searchSchemas(options: SchemaSearchOptions): RegisteredSchema[];
	/**
	 * Deprecate a schema
	 */
	deprecateSchema(id: string): boolean;
	/**
	 * Check schema compatibility for evolution
	 */
	checkCompatibility(eventType: string, newSchema: z.ZodSchema): SchemaEvolutionResult;
	/**
	 * Get registry statistics
	 */
	getStats(): SchemaRegistryStats;
	/**
	 * Clear all schemas and cache
	 */
	clear(): void;
	private generateSchemaId;
	private getSchemasByType;
	private compareVersions;
	private validateSchema;
	private enforceVersionLimit;
	private updateStats;
	private invalidateCache;
	private generateTestData;
}
//# sourceMappingURL=schema-registry.d.ts.map
