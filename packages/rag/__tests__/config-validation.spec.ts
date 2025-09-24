import { describe, expect, it } from 'vitest';
import {
	backpressureConfigSchema,
	componentTimeoutConfigSchema,
	enhancedRAGConfigSchema,
	mimePolicyConfigSchema,
	pgVectorConfigSchema,
	ragPipelineConfigSchema,
	ragReliabilityConfigSchema,
	remoteRAGConfigSchema,
	safeValidateConfig,
	validateConfig,
} from '../src/lib/config-validation.js';

describe('Config Validation', () => {
	describe('validateConfig', () => {
		it('should validate valid configurations', () => {
			const validTimeouts = {
				embedder: 30000,
				store: 5000,
				reranker: 15000,
				healthCheck: 2000,
				httpRequest: 10000,
			};

			const result = validateConfig(componentTimeoutConfigSchema, validTimeouts, 'timeout');

			expect(result).toEqual(validTimeouts);
		});

		it('should throw detailed error for invalid configuration', () => {
			const invalidTimeouts = {
				embedder: -1000, // Invalid: negative
				store: 'invalid', // Invalid: not a number
				// Missing required fields
			};

			expect(() => {
				validateConfig(componentTimeoutConfigSchema, invalidTimeouts, 'timeout');
			}).toThrow('Invalid timeout configuration');
		});
	});

	describe('safeValidateConfig', () => {
		it('should return success for valid configuration', () => {
			const validConfig = {
				embedder: 30000,
				store: 5000,
				reranker: 15000,
				healthCheck: 2000,
				httpRequest: 10000,
			};

			const result = safeValidateConfig(componentTimeoutConfigSchema, validConfig);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual(validConfig);
			}
		});

		it('should return failure details for invalid configuration', () => {
			const invalidConfig = {
				embedder: -1000,
				store: 'invalid',
			};

			const result = safeValidateConfig(componentTimeoutConfigSchema, invalidConfig);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toContain('Configuration validation failed');
				expect(result.details).toBeInstanceOf(Array);
				expect(result.details.length).toBeGreaterThan(0);
			}
		});
	});

	describe('componentTimeoutConfigSchema', () => {
		it('should validate valid timeout configuration', () => {
			const validConfig = {
				embedder: 30000,
				store: 5000,
				reranker: 15000,
				healthCheck: 2000,
				httpRequest: 10000,
			};

			const result = componentTimeoutConfigSchema.safeParse(validConfig);
			expect(result.success).toBe(true);
		});

		it('should reject negative timeouts', () => {
			const invalidConfig = {
				embedder: -1000,
				store: 5000,
				reranker: 15000,
				healthCheck: 2000,
				httpRequest: 10000,
			};

			const result = componentTimeoutConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});

		it('should reject excessively large timeouts', () => {
			const invalidConfig = {
				embedder: 999999999, // Too large
				store: 5000,
				reranker: 15000,
				healthCheck: 2000,
				httpRequest: 10000,
			};

			const result = componentTimeoutConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});
	});

	describe('backpressureConfigSchema', () => {
		it('should validate valid backpressure configuration', () => {
			const validConfig = {
				maxConcurrent: {
					embedder: 4,
					store: 10,
					reranker: 2,
				},
				maxQueueSize: {
					embedder: 20,
					store: 50,
					reranker: 10,
				},
				adaptive: true,
				resourceThresholds: {
					memoryPercent: 80,
					cpuPercent: 75,
				},
			};

			const result = backpressureConfigSchema.safeParse(validConfig);
			expect(result.success).toBe(true);
		});

		it('should reject invalid resource thresholds', () => {
			const invalidConfig = {
				maxConcurrent: {
					embedder: 4,
					store: 10,
					reranker: 2,
				},
				maxQueueSize: {
					embedder: 20,
					store: 50,
					reranker: 10,
				},
				adaptive: true,
				resourceThresholds: {
					memoryPercent: 150, // Invalid: > 100
					cpuPercent: -10, // Invalid: < 0
				},
			};

			const result = backpressureConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});
	});

	describe('ragReliabilityConfigSchema', () => {
		it('should validate complete reliability configuration', () => {
			const validConfig = {
				timeouts: {
					embedder: 30000,
					store: 5000,
					reranker: 15000,
					healthCheck: 2000,
					httpRequest: 10000,
				},
				backpressure: {
					maxConcurrent: {
						embedder: 4,
						store: 10,
						reranker: 2,
					},
					maxQueueSize: {
						embedder: 20,
						store: 50,
						reranker: 10,
					},
					adaptive: true,
					resourceThresholds: {
						memoryPercent: 80,
						cpuPercent: 75,
					},
				},
				policies: {
					embedder: {
						retry: { maxAttempts: 3, baseDelayMs: 1000 },
						breaker: { failureThreshold: 5, resetTimeoutMs: 60000 },
					},
					store: {
						retry: { maxAttempts: 3, baseDelayMs: 500 },
						breaker: { failureThreshold: 10, resetTimeoutMs: 30000 },
					},
					reranker: {
						retry: { maxAttempts: 2, baseDelayMs: 2000 },
						breaker: { failureThreshold: 3, resetTimeoutMs: 120000 },
					},
				},
				rateLimits: {
					embedder: {
						tokensPerSecond: 10,
						bucketSize: 20,
					},
					store: {
						tokensPerSecond: 50,
						bucketSize: 100,
					},
					reranker: {
						tokensPerSecond: 2,
						bucketSize: 5,
					},
				},
			};

			const result = ragReliabilityConfigSchema.safeParse(validConfig);
			expect(result.success).toBe(true);
		});
	});

	describe('remoteRAGConfigSchema', () => {
		it('should validate valid MCP stdio configuration', () => {
			const validConfig = {
				serverName: 'test-server',
				transport: {
					type: 'stdio' as const,
					command: '/usr/bin/python3',
					args: ['-m', 'server'],
					env: { PATH: '/usr/bin' },
				},
				capabilities: {
					tools: true,
					resources: false,
				},
				timeout: 30000,
				enableRemoteRetrieval: true,
				fallbackToLocal: true,
			};

			const result = remoteRAGConfigSchema.safeParse(validConfig);
			expect(result.success).toBe(true);
		});

		it('should validate valid MCP SSE configuration', () => {
			const validConfig = {
				serverName: 'sse-server',
				transport: {
					type: 'sse' as const,
					url: 'https://api.example.com/mcp',
					headers: { Authorization: 'Bearer token123' },
				},
				enableDocumentSync: true,
				remoteSearchLimit: 100,
			};

			const result = remoteRAGConfigSchema.safeParse(validConfig);
			expect(result.success).toBe(true);
		});

		it('should validate hybrid search weights that sum to 1.0', () => {
			const validConfig = {
				serverName: 'hybrid-server',
				transport: {
					type: 'stdio' as const,
					command: '/usr/bin/python3',
				},
				hybridSearchWeights: {
					local: 0.6,
					remote: 0.4,
				},
			};

			const result = remoteRAGConfigSchema.safeParse(validConfig);
			expect(result.success).toBe(true);
		});

		it('should reject hybrid search weights that do not sum to 1.0', () => {
			const invalidConfig = {
				serverName: 'hybrid-server',
				transport: {
					type: 'stdio' as const,
					command: '/usr/bin/python3',
				},
				hybridSearchWeights: {
					local: 0.3,
					remote: 0.3, // Sum = 0.6, should be 1.0
				},
			};

			const result = remoteRAGConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});

		it('should reject invalid transport type', () => {
			const invalidConfig = {
				serverName: 'test-server',
				transport: {
					type: 'websocket', // Invalid transport type
					url: 'ws://example.com',
				},
			} as const;

			const result = remoteRAGConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});
	});

	describe('mimePolicyConfigSchema', () => {
		it('should validate valid MIME policy configuration', () => {
			const validConfig = {
				allowedTypes: ['text/plain', 'application/json', 'text/html'],
				blockedTypes: ['application/x-executable'],
				maxFileSize: 10 * 1024 * 1024, // 10MB
				scanForMalware: true,
				extractMetadata: true,
				processing: {
					maxSizeBytes: 50 * 1024 * 1024, // 50MB
					timeoutMs: 30000,
					retries: 3,
				},
			};

			const result = mimePolicyConfigSchema.safeParse(validConfig);
			expect(result.success).toBe(true);
		});

		it('should reject invalid MIME types', () => {
			const invalidConfig = {
				allowedTypes: ['invalid-mime-type'], // Invalid MIME format
				maxFileSize: 1024,
			};

			const result = mimePolicyConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});

		it('should require at least one allowed type', () => {
			const invalidConfig = {
				allowedTypes: [], // Empty array not allowed
				maxFileSize: 1024,
			};

			const result = mimePolicyConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});
	});

	describe('pgVectorConfigSchema', () => {
		it('should validate valid pgVector configuration', () => {
			const validConfig = {
				connectionString: 'postgresql://user:pass@localhost:5432/db',
				tableName: 'embeddings',
				dimensions: 1536,
				metric: 'cosine' as const,
				indexType: 'hnsw' as const,
				indexOptions: { m: 16, ef_construction: 64 },
				maxConnections: 10,
				connectionTimeout: 5000,
			};

			const result = pgVectorConfigSchema.safeParse(validConfig);
			expect(result.success).toBe(true);
		});

		it('should reject invalid table names', () => {
			const invalidConfig = {
				connectionString: 'postgresql://user:pass@localhost:5432/db',
				tableName: '123invalid', // Cannot start with number
				dimensions: 1536,
			};

			const result = pgVectorConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});

		it('should reject excessive dimensions', () => {
			const invalidConfig = {
				connectionString: 'postgresql://user:pass@localhost:5432/db',
				tableName: 'embeddings',
				dimensions: 10000, // Too large
			};

			const result = pgVectorConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});
	});

	describe('enhancedRAGConfigSchema', () => {
		it('should validate enhanced configuration with semantic/keyword weights', () => {
			const validConfig = {
				embedder: {}, // Mock embedder
				store: {}, // Mock store
				hybridSearch: true,
				semanticWeight: 0.7,
				keywordWeight: 0.3,
				fusionMethod: 'weighted' as const,
			};

			const result = enhancedRAGConfigSchema.safeParse(validConfig);
			expect(result.success).toBe(true);
		});

		it('should reject semantic/keyword weights that do not sum to 1.0', () => {
			const invalidConfig = {
				embedder: {},
				store: {},
				semanticWeight: 0.4,
				keywordWeight: 0.4, // Sum = 0.8, should be 1.0
			};

			const result = enhancedRAGConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});
	});

	describe('ragPipelineConfigSchema', () => {
		it('should validate minimal RAG pipeline configuration', () => {
			const validConfig = {
				embedder: {}, // Mock embedder
				store: {}, // Mock store
			};

			const result = ragPipelineConfigSchema.safeParse(validConfig);
			expect(result.success).toBe(true);
		});

		it('should validate full RAG pipeline configuration', () => {
			const validConfig = {
				embedder: {},
				store: {},
				chunkSize: 1000,
				chunkOverlap: 200,
				freshnessEpsilon: 3600000, // 1 hour
				cacheThresholdMs: 300000, // 5 minutes
				preferCache: true,
				evidenceGate: {
					minCitations: 2,
					maxCitations: 10,
					citationThreshold: 0.7,
					requireEvidence: true,
				},
				reliability: {
					embedder: {
						retry: { maxAttempts: 3 },
						breaker: { failureThreshold: 5, resetTimeoutMs: 60000 },
					},
					store: {
						retry: { maxAttempts: 2, baseDelayMs: 100 },
					},
				},
				security: {
					allowedEmbeddingDims: [384, 768, 1536],
					maxContentChars: 50000,
				},
				retrieval: {
					hierarchical: {
						expandContext: true,
						maxLevels: 3,
						dedupe: true,
						maxContextChars: 100000,
					},
				},
			};

			const result = ragPipelineConfigSchema.safeParse(validConfig);
			expect(result.success).toBe(true);
		});

		it('should reject excessive chunk sizes', () => {
			const invalidConfig = {
				embedder: {},
				store: {},
				chunkSize: 50000, // Too large
			};

			const result = ragPipelineConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});
	});
});
