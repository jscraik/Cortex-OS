/**
 * In-memory schema registry implementation
 * Provides centralized schema management for A2A events
 */
export class SchemaRegistry {
	schemas = new Map();
	schemaCache = new Map();
	config;
	stats = {
		totalSchemas: 0,
		uniqueEventTypes: 0,
		schemasPerType: {},
		cacheHits: 0,
		cacheMisses: 0,
		validationCount: 0,
		totalValidationTime: 0,
	};
	constructor(config = {}) {
		this.config = {
			strictValidation: config.strictValidation ?? true,
			enableCache: config.enableCache ?? true,
			cacheTtlMs: config.cacheTtlMs ?? 300000, // 5 minutes
			validateOnRegistration: config.validateOnRegistration ?? true,
			maxVersionsPerType: config.maxVersionsPerType ?? 10,
		};
	}
	/**
	 * Register a new schema
	 */
	register(schema) {
		const id = this.generateSchemaId(schema.eventType, schema.version);
		const now = new Date();
		// Validate schema on registration if enabled
		if (this.config.validateOnRegistration) {
			this.validateSchema(schema.schema);
		}
		// Check version limits
		this.enforceVersionLimit(schema.eventType);
		const registeredSchema = {
			...schema,
			id,
			createdAt: now,
			updatedAt: now,
		};
		this.schemas.set(id, registeredSchema);
		this.updateStats(schema.eventType);
		this.invalidateCache(id);
		return id;
	}
	/**
	 * Get schema by ID
	 */
	getSchema(id) {
		if (this.config.enableCache) {
			const cached = this.schemaCache.get(id);
			if (cached) {
				this.stats.cacheHits++;
				return cached;
			}
			this.stats.cacheMisses++;
		}
		const schema = this.schemas.get(id);
		if (schema && this.config.enableCache) {
			this.schemaCache.set(id, schema);
			// Set cache expiration
			setTimeout(() => {
				this.schemaCache.delete(id);
			}, this.config.cacheTtlMs);
		}
		return schema;
	}
	/**
	 * Get latest schema for event type
	 */
	getLatestSchema(eventType) {
		const schemas = this.getSchemasByType(eventType);
		return schemas
			.filter((s) => !s.deprecated)
			.sort((a, b) => this.compareVersions(b.version, a.version))[0];
	}
	/**
	 * Get schema by event type and version
	 */
	getSchemaByVersion(eventType, version) {
		const id = this.generateSchemaId(eventType, version);
		return this.getSchema(id);
	}
	/**
	 * Validate data against schema
	 */
	validate(eventType, data, version) {
		const startTime = Date.now();
		try {
			let schema;
			if (version) {
				schema = this.getSchemaByVersion(eventType, version);
			} else {
				schema = this.getLatestSchema(eventType);
			}
			if (!schema) {
				return {
					valid: false,
					errors: [
						{
							// mimic ZodError issue shape
							code: 'custom',
							message: version
								? `No schema found for event type '${eventType}' version '${version}'`
								: `No schema found for event type '${eventType}'`,
							path: [],
						},
					],
				};
			}
			const result = schema.schema.safeParse(data);
			const validationTime = Date.now() - startTime;
			this.stats.validationCount++;
			this.stats.totalValidationTime += validationTime;
			if (result.success) {
				return {
					valid: true,
					data: result.data,
					schemaId: schema.id,
					schemaVersion: schema.version,
				};
			} else {
				return {
					valid: false,
					errors: [result.error],
					schemaId: schema.id,
					schemaVersion: schema.version,
				};
			}
		} catch (error) {
			return {
				valid: false,
				errors: [
					{
						code: 'custom',
						message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
						path: [],
					},
				],
			};
		}
	}
	/**
	 * Search schemas with filters
	 */
	searchSchemas(options) {
		let results = Array.from(this.schemas.values());
		if (options.eventType) {
			results = results.filter((s) => s.eventType === options.eventType);
		}
		if (options.version) {
			results = results.filter((s) => s.version === options.version);
		}
		if (options.tags && options.tags.length > 0) {
			results = results.filter((s) =>
				options.tags?.some((tag) => s.tags?.includes(tag)),
			);
		}
		if (options.author) {
			results = results.filter((s) => s.author === options.author);
		}
		if (!options.includeDeprecated) {
			results = results.filter((s) => !s.deprecated);
		}
		// Sort by creation date (newest first)
		results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
		// Apply pagination
		if (options.offset) {
			results = results.slice(options.offset);
		}
		if (options.limit) {
			results = results.slice(0, options.limit);
		}
		return results;
	}
	/**
	 * Deprecate a schema
	 */
	deprecateSchema(id) {
		const schema = this.schemas.get(id);
		if (!schema) {
			return false;
		}
		schema.deprecated = true;
		schema.updatedAt = new Date();
		this.invalidateCache(id);
		return true;
	}
	/**
	 * Check schema compatibility for evolution
	 */
	checkCompatibility(eventType, newSchema) {
		const latestSchema = this.getLatestSchema(eventType);
		if (!latestSchema) {
			return { compatible: true };
		}
		// For now, implement basic compatibility checking
		// In a production system, this would be more sophisticated
		const issues = [];
		const recommendations = [];
		// Check if new schema is more restrictive (potential breaking change)
		try {
			// This is a simplified compatibility check
			// Real implementation would analyze schema differences
			const testData = this.generateTestData(latestSchema.schema);
			const newResult = newSchema.safeParse(testData);
			if (!newResult.success) {
				issues.push(
					'New schema rejects data that was valid in previous version',
				);
				recommendations.push(
					'Consider making the new schema more permissive or providing migration guidance',
				);
			}
		} catch (error) {
			issues.push(
				`Compatibility check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
		return {
			compatible: issues.length === 0,
			issues,
			recommendations,
			breakingChanges: issues.length > 0,
		};
	}
	/**
	 * Get registry statistics
	 */
	getStats() {
		const cacheHitRate =
			this.stats.cacheHits + this.stats.cacheMisses > 0
				? this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)
				: 0;
		const avgValidationTime =
			this.stats.validationCount > 0
				? this.stats.totalValidationTime / this.stats.validationCount
				: 0;
		return {
			totalSchemas: this.stats.totalSchemas,
			uniqueEventTypes: this.stats.uniqueEventTypes,
			schemasPerType: { ...this.stats.schemasPerType },
			cacheHitRate,
			avgValidationTimeMs: avgValidationTime,
		};
	}
	/**
	 * Clear all schemas and cache
	 */
	clear() {
		this.schemas.clear();
		this.schemaCache.clear();
		this.stats = {
			totalSchemas: 0,
			uniqueEventTypes: 0,
			schemasPerType: {},
			cacheHits: 0,
			cacheMisses: 0,
			validationCount: 0,
			totalValidationTime: 0,
		};
	}
	// Private helper methods
	generateSchemaId(eventType, version) {
		return `${eventType}:${version}`;
	}
	getSchemasByType(eventType) {
		return Array.from(this.schemas.values()).filter(
			(s) => s.eventType === eventType,
		);
	}
	compareVersions(version1, version2) {
		const v1 = version1.split('.').map(Number);
		const v2 = version2.split('.').map(Number);
		for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
			const part1 = v1[i] || 0;
			const part2 = v2[i] || 0;
			if (part1 > part2) return 1;
			if (part1 < part2) return -1;
		}
		return 0;
	}
	validateSchema(schema) {
		// Basic schema validation - ensure it's a valid Zod schema
		if (!schema || typeof schema.parse !== 'function') {
			throw new Error('Invalid schema: must be a valid Zod schema');
		}
	}
	enforceVersionLimit(eventType) {
		const schemas = this.getSchemasByType(eventType);
		if (schemas.length >= this.config.maxVersionsPerType) {
			// Remove oldest non-deprecated schema
			const toRemove = schemas
				.filter((s) => !s.deprecated)
				.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
			if (toRemove) {
				this.schemas.delete(toRemove.id);
				this.invalidateCache(toRemove.id);
			}
		}
	}
	updateStats(eventType) {
		this.stats.totalSchemas = this.schemas.size;
		const eventTypes = new Set(
			Array.from(this.schemas.values()).map((s) => s.eventType),
		);
		this.stats.uniqueEventTypes = eventTypes.size;
		this.stats.schemasPerType[eventType] =
			(this.stats.schemasPerType[eventType] || 0) + 1;
	}
	invalidateCache(schemaId) {
		this.schemaCache.delete(schemaId);
	}
	generateTestData(_schema) {
		// Simple test data generation for compatibility checking
		// In production, this would be more sophisticated
		return {};
	}
}
//# sourceMappingURL=schema-registry.js.map
