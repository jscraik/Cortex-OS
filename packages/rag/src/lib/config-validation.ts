/**
 * Strict Zod schema validation for RAG configuration interfaces.
 *
 * This module provides comprehensive schema validation for all configuration
 * interfaces used throughout the RAG package, ensuring type safety and
 * preventing runtime errors from invalid configurations.
 */

import { z } from 'zod';

// Reliability policy schemas
export const retryPolicySchema = z.object({
	maxAttempts: z.number().int().positive().max(10),
	baseDelayMs: z.number().int().nonnegative().max(30000).optional(),
});

export const breakerPolicySchema = z.object({
	failureThreshold: z.number().int().positive().max(100),
	resetTimeoutMs: z.number().int().positive().max(300000), // 5 minutes max
});

export const reliabilityPolicySchema = z.object({
	retry: retryPolicySchema.optional(),
	breaker: breakerPolicySchema.optional(),
});

// Security configuration schema
export const securityConfigSchema = z.object({
	allowedEmbeddingDims: z.array(z.number().int().positive().max(4096)).optional(),
	maxContentChars: z.number().int().positive().max(100000).optional(),
});

// Evidence gate options schema
export const evidenceGateOptionsSchema = z.object({
	minCitations: z.number().int().nonnegative().max(50).optional(),
	maxCitations: z.number().int().positive().max(100).optional(),
	citationThreshold: z.number().min(0).max(1).optional(),
	requireEvidence: z.boolean().optional(),
});

// Hierarchical retrieval options schema
export const hierarchicalRetrievalSchema = z.object({
	expandContext: z.boolean().optional(),
	maxLevels: z.number().int().positive().max(10).optional(),
	dedupe: z.boolean().optional(),
	maxContextChars: z.number().int().positive().max(200000).optional(),
});

export const retrievalConfigSchema = z.object({
	hierarchical: hierarchicalRetrievalSchema.optional(),
	postChunking: z
		.object({
			enabled: z.boolean().optional(),
			maxChars: z.number().int().positive().max(20000).optional(),
			intentStrategy: z.enum(['none', 'stub']).optional(),
		})
		.optional(),
});

// Main RAG Pipeline configuration schema
export const ragPipelineConfigSchema = z.object({
	// Core components - these would be validated at runtime since they're objects
	embedder: z.any(), // Interface validation at runtime
	store: z.any(), // Interface validation at runtime

	// Chunking configuration
	chunkSize: z.number().int().positive().max(10000).optional(),
	chunkOverlap: z.number().int().nonnegative().max(2000).optional(),

	// Freshness and caching
	freshnessEpsilon: z.number().nonnegative().max(86400000).optional(), // 24 hours max
	cacheThresholdMs: z.number().int().nonnegative().max(3600000).optional(), // 1 hour max
	preferCache: z.boolean().optional(),

	// Evidence gate
	evidenceGate: evidenceGateOptionsSchema.optional(),

	// Reliability policies
	reliability: z
		.object({
			embedder: reliabilityPolicySchema.optional(),
			store: reliabilityPolicySchema.optional(),
		})
		.optional(),

	// Security settings
	security: securityConfigSchema.optional(),

	// Retrieval options
	retrieval: retrievalConfigSchema.optional(),
});

// Component timeout configuration schema
export const componentTimeoutConfigSchema = z.object({
	embedder: z.number().int().positive().max(300000), // 5 minutes max
	store: z.number().int().positive().max(60000), // 1 minute max
	reranker: z.number().int().positive().max(180000), // 3 minutes max
	healthCheck: z.number().int().positive().max(30000), // 30 seconds max
	httpRequest: z.number().int().positive().max(120000), // 2 minutes max
});

// Backpressure configuration schema
export const backpressureConfigSchema = z.object({
	maxConcurrent: z.object({
		embedder: z.number().int().positive().max(20),
		store: z.number().int().positive().max(50),
		reranker: z.number().int().positive().max(10),
	}),
	maxQueueSize: z.object({
		embedder: z.number().int().nonnegative().max(1000),
		store: z.number().int().nonnegative().max(2000),
		reranker: z.number().int().nonnegative().max(500),
	}),
	adaptive: z.boolean(),
	resourceThresholds: z.object({
		memoryPercent: z.number().min(0).max(100),
		cpuPercent: z.number().min(0).max(100),
	}),
});

// Rate limiting configuration schema
export const rateLimitConfigSchema = z.object({
	embedder: z.object({
		tokensPerSecond: z.number().positive().max(1000),
		bucketSize: z.number().int().positive().max(5000),
	}),
	store: z.object({
		tokensPerSecond: z.number().positive().max(2000),
		bucketSize: z.number().int().positive().max(10000),
	}),
	reranker: z.object({
		tokensPerSecond: z.number().positive().max(100),
		bucketSize: z.number().int().positive().max(500),
	}),
});

// RAG Reliability configuration schema
export const ragReliabilityConfigSchema = z.object({
	timeouts: componentTimeoutConfigSchema,
	backpressure: backpressureConfigSchema,
	policies: z.object({
		embedder: reliabilityPolicySchema,
		store: reliabilityPolicySchema,
		reranker: reliabilityPolicySchema,
	}),
	rateLimits: rateLimitConfigSchema,
});

// MCP integration configuration schema
export const mcpIntegrationConfigSchema = z.object({
	serverName: z.string().min(1).max(100),
	transport: z.union([
		z.object({
			type: z.literal('stdio'),
			command: z.string().min(1).max(500),
			args: z.array(z.string().max(200)).optional(),
			env: z.record(z.string().max(1000)).optional(),
		}),
		z.object({
			type: z.literal('sse'),
			url: z.string().url(),
			headers: z.record(z.string().max(1000)).optional(),
		}),
	]),
	capabilities: z
		.object({
			tools: z.boolean().optional(),
			resources: z.boolean().optional(),
			prompts: z.boolean().optional(),
		})
		.optional(),
	timeout: z.number().int().positive().max(300000).optional(), // 5 minutes max
});

// Remote RAG configuration schema
export const remoteRAGConfigSchema = mcpIntegrationConfigSchema
	.extend({
		enableRemoteRetrieval: z.boolean().optional(),
		enableDocumentSync: z.boolean().optional(),
		fallbackToLocal: z.boolean().optional(),
		remoteSearchLimit: z.number().int().positive().max(1000).optional(),
		hybridSearchWeights: z
			.object({
				local: z.number().min(0).max(1),
				remote: z.number().min(0).max(1),
			})
			.optional(),
	})
	.refine(
		(config) => {
			// Validate that hybrid search weights sum to 1.0 if provided
			if (config.hybridSearchWeights) {
				const sum = config.hybridSearchWeights.local + config.hybridSearchWeights.remote;
				return Math.abs(sum - 1.0) < 0.001;
			}
			return true;
		},
		{
			message: 'Hybrid search weights must sum to 1.0',
			path: ['hybridSearchWeights'],
		},
	);

// MIME policy configuration schema
export const processingConfigSchema = z.object({
	maxSizeBytes: z
		.number()
		.int()
		.positive()
		.max(100 * 1024 * 1024), // 100MB max
	timeoutMs: z.number().int().positive().max(300000), // 5 minutes max
	retries: z.number().int().nonnegative().max(5),
});

export const mimePolicyConfigSchema = z.object({
	allowedTypes: z.array(z.string().regex(/^\w+\/[\w\-+.]+$/)).min(1),
	blockedTypes: z.array(z.string().regex(/^\w+\/[\w\-+.]+$/)).optional(),
	maxFileSize: z
		.number()
		.int()
		.positive()
		.max(1024 * 1024 * 1024), // 1GB max
	scanForMalware: z.boolean().optional(),
	extractMetadata: z.boolean().optional(),
	processing: processingConfigSchema.optional(),
});

// PgVector store configuration schema
export const pgVectorConfigSchema = z.object({
	connectionString: z.string().min(1).max(1000),
	tableName: z
		.string()
		.regex(/^[a-zA-Z_]\w*$/)
		.max(100),
	dimensions: z.number().int().positive().max(4096),
	metric: z.enum(['cosine', 'l2', 'inner_product']).optional(),
	indexType: z.enum(['ivfflat', 'hnsw']).optional(),
	indexOptions: z.record(z.union([z.string(), z.number()])).optional(),
	maxConnections: z.number().int().positive().max(100).optional(),
	connectionTimeout: z.number().int().positive().max(60000).optional(),
});

// Enhanced RAG configuration schema
export const enhancedRAGConfigSchema = ragPipelineConfigSchema
	.extend({
		reranker: z.any().optional(), // Runtime validation
		rerankTopK: z.number().int().positive().max(1000).optional(),
		hybridSearch: z.boolean().optional(),
		semanticWeight: z.number().min(0).max(1).optional(),
		keywordWeight: z.number().min(0).max(1).optional(),
		fusionMethod: z.enum(['weighted', 'rrf']).optional(),
		rrfK: z.number().int().positive().max(1000).optional(),
	})
	.refine(
		(config) => {
			// Validate that semantic and keyword weights sum to 1.0 if provided
			if (config.semanticWeight !== undefined && config.keywordWeight !== undefined) {
				const sum = config.semanticWeight + config.keywordWeight;
				return Math.abs(sum - 1.0) < 0.001;
			}
			return true;
		},
		{
			message: 'Semantic and keyword weights must sum to 1.0',
			path: ['semanticWeight', 'keywordWeight'],
		},
	);

// Dispatcher configuration schema
export const dispatcherConfigSchema = z.object({
	defaultStrategy: z.enum(['sentence', 'token', 'recursive']),
	chunkSize: z.number().int().positive().max(10000),
	overlap: z.number().int().nonnegative().max(2000),
	strategies: z
		.record(
			z.object({
				chunkSize: z.number().int().positive().max(10000).optional(),
				overlap: z.number().int().nonnegative().max(2000).optional(),
				separator: z.string().max(10).optional(),
				minChunkSize: z.number().int().positive().max(1000).optional(),
			}),
		)
		.optional(),
});

// Generation configuration schema
export const generationConfigSchema = z.object({
	model: z.string().min(1).max(200),
	temperature: z.number().min(0).max(2).optional(),
	maxTokens: z.number().int().positive().max(32000).optional(),
	topP: z.number().min(0).max(1).optional(),
	stopSequences: z.array(z.string().max(100)).max(10).optional(),
	presencePenalty: z.number().min(-2).max(2).optional(),
	frequencyPenalty: z.number().min(-2).max(2).optional(),
});

/**
 * Validate a configuration object against a schema.
 * @param schema - Zod schema to validate against
 * @param config - Configuration object to validate
 * @param configName - Name of the configuration for error messages
 * @returns Validated configuration object
 * @throws ZodError if validation fails
 */
export function validateConfig<T>(schema: z.ZodSchema<T>, config: unknown, configName: string): T {
	try {
		return schema.parse(config);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const details = error.issues.map(
				(issue) => `${issue.path.join('.') || issue.code}: ${issue.message}`,
			);
			throw new Error(`Invalid ${configName} configuration: ${details.join(', ')}`);
		}
		throw error;
	}
}

/**
 * Safely validate a configuration object, returning validation result.
 * @param schema - Zod schema to validate against
 * @param config - Configuration object to validate
 * @returns Object with success flag and either data or error details
 */
export function safeValidateConfig<T>(
	schema: z.ZodSchema<T>,
	config: unknown,
): { success: true; data: T } | { success: false; error: string; details: string[] } {
	const result = schema.safeParse(config);
	if (result.success) {
		return { success: true, data: result.data };
	}

	const details = result.error.issues.map(
		(issue) => `${issue.path.join('.') || issue.code}: ${issue.message}`,
	);

	return {
		success: false,
		error: `Configuration validation failed`,
		details,
	};
}
