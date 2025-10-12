/**
 * GraphRAG Service for brAInwav Cortex-OS
 *
 * Implements the hybrid retrieval pipeline:
 * 1. Qdrant hybrid search (dense + sparse)
 * 2. Lift Qdrant points to graph nodes stored in Prisma/SQLite
 * 3. One-hop graph expansion with edge whitelisting
 * 4. Context assembly with prioritized chunk selection
 * 5. brAInwav-branded response with optional citations
 */

import { SecureNeo4j } from '@cortex-os/utils';
import { GraphEdgeType, GraphNodeType } from '../db/prismaEnums.js';
import { z } from 'zod';
import { createPrefixedId } from '../../../agents/src/lib/secure-random.js';
import { prisma, shutdownPrisma } from '../db/prismaClient.js';
import { assembleContext } from '../retrieval/contextAssembler.js';
import { expandNeighbors } from '../retrieval/expandGraph.js';
import {
	type GraphRAGSearchResult,
	QdrantConfigSchema,
	QdrantHybridSearch,
} from '../retrieval/QdrantHybrid.js';
import {
	type ExternalCitationProvider,
	type ExternalProviderConfig,
	validateProviderConfig,
} from './external/ExternalKnowledge.js';
import { MCPKnowledgeProvider } from './external/MCPKnowledgeProvider.js';
import { performanceMonitor } from '../monitoring/PerformanceMonitor.js';
import { getQueryPrecomputer, type PrecomputationConfig } from '../precomputation/QueryPrecomputer.js';
import { getStreamingResponse, type StreamingOptions, type StreamingConfig } from '../streaming/StreamingResponse.js';
import { getGPUAccelerationManager, type GPUAccelerationConfig } from '../acceleration/GPUAcceleration.js';
import { getAutoScalingManager, type AutoScalingConfig } from '../scaling/AutoScalingManager.js';
import { getMLOptimizationManager, type MLOptimizationConfig } from '../ml/MLOptimizationManager.js';
import { getCDNCacheManager, type CDNConfig } from '../cdn/CDNCacheManager.js';

const DEFAULT_QDRANT_CONFIG = {
	url: process.env.QDRANT_URL ?? 'http://localhost:6333',
	apiKey: process.env.QDRANT_API_KEY,
	collection: process.env.QDRANT_COLLECTION ?? 'local_memory_v1',
	timeout: 30000,
	maxRetries: 3,
	brainwavBranding: true,
};

export const GraphRAGServiceConfigSchema = z.object({
	qdrant: QdrantConfigSchema.default(DEFAULT_QDRANT_CONFIG),
	expansion: z.object({
		allowedEdges: z
			.array(z.nativeEnum(GraphEdgeType))
			.default([
				GraphEdgeType.IMPORTS,
				GraphEdgeType.DEPENDS_ON,
				GraphEdgeType.IMPLEMENTS_CONTRACT,
				GraphEdgeType.CALLS_TOOL,
				GraphEdgeType.EMITS_EVENT,
				GraphEdgeType.EXPOSES_PORT,
				GraphEdgeType.REFERENCES_DOC,
				GraphEdgeType.DECIDES_WITH,
			]),
		maxHops: z.number().int().min(1).max(3).default(1),
		maxNeighborsPerNode: z.number().int().min(1).max(50).default(20),
	}),
	limits: z.object({
		maxContextChunks: z.number().int().min(1).max(100).default(24),
		queryTimeoutMs: z.number().int().min(1000).max(60000).default(30000),
		maxConcurrentQueries: z.number().int().min(1).max(20).default(5),
	}),
	branding: z.object({
		enabled: z.boolean().default(true),
		sourceAttribution: z.string().default('brAInwav Cortex-OS GraphRAG'),
		emitBrandedEvents: z.boolean().default(true),
	}),
	streaming: z.object({
		enabled: z.boolean().default(false),
		defaultOptions: z.object({
			enabled: z.boolean().default(true),
			strategy: z.enum(['progressive', 'batch', 'hybrid']).default('progressive'),
			chunkSize: z.number().int().min(1).max(50).default(10),
			bufferTime: z.number().int().min(0).max(1000).default(100),
			prioritizeCritical: z.boolean().default(true),
			includeMetadata: z.boolean().default(true),
		}),
		config: z.object({
			maxConcurrentStreams: z.number().int().min(1).max(100).default(10),
			bufferSize: z.number().int().min(1).max(100).default(50),
			timeoutMs: z.number().int().min(5000).max(60000).default(30000),
			compressionEnabled: z.boolean().default(false),
		}),
	}).default({
		enabled: false,
		defaultOptions: {
			enabled: true,
			strategy: 'progressive',
			chunkSize: 10,
			bufferTime: 100,
			prioritizeCritical: true,
			includeMetadata: true,
		},
		config: {
			maxConcurrentStreams: 10,
			bufferSize: 50,
			timeoutMs: 30000,
			compressionEnabled: false,
		},
	}),
	externalKg: z
		.object({
			enabled: z.boolean().default(false),
			provider: z.enum(['none', 'neo4j', 'mcp']).default('none'),
			// Neo4j specific settings
			uri: z.string().min(1).optional(),
			user: z.string().min(1).optional(),
			password: z.string().min(1).optional(),
			// MCP specific settings
			slug: z.string().optional(),
			tool: z.string().optional(),
			maxResults: z.number().int().min(1).max(50).default(5),
			requestTimeoutMs: z.number().int().min(1000).max(30000).default(10000),
			// Common settings
			maxDepth: z.number().int().min(1).max(3).default(1),
			citationPrefix: z.string().default('neo4j'),
		})
		.default({
			enabled: false,
			provider: 'none',
			maxDepth: 1,
			citationPrefix: 'neo4j',
		}),
	precomputation: z.object({
		enabled: z.boolean().default(false),
		maxPrecomputedQueries: z.number().int().min(1).max(100).default(20),
		patternAnalysis: z.object({
			minFrequency: z.number().int().min(1).default(3),
			confidenceThreshold: z.number().min(0).max(1).default(0.7),
			analysisWindow: z.number().int().min(300000).default(3600000), // 1 hour
		}),
		scheduling: z.object({
			interval: z.number().int().min(60000).default(300000), // 5 minutes
			maxConcurrentJobs: z.number().int().min(1).max(10).default(3),
			offPeakHours: z.array(z.number().int().min(0).max(23)).default([2, 3, 4, 5, 6, 22, 23, 0, 1]),
		}),
		freshness: z.object({
			defaultTTL: z.number().int().min(300000).default(1800000), // 30 minutes
			maxTTL: z.number().int().min(600000).default(7200000), // 2 hours
			refreshThreshold: z.number().min(0).max(1).default(0.3),
		}),
	}).default({
		enabled: false,
		maxPrecomputedQueries: 20,
		patternAnalysis: {
			minFrequency: 3,
			confidenceThreshold: 0.7,
			analysisWindow: 3600000,
		},
		scheduling: {
			interval: 300000,
			maxConcurrentJobs: 3,
			offPeakHours: [2, 3, 4, 5, 6, 22, 23, 0, 1],
		},
		freshness: {
			defaultTTL: 1800000,
			maxTTL: 7200000,
			refreshThreshold: 0.3,
		},
	}),
	gpuAcceleration: z.object({
		enabled: z.boolean().default(false),
		cuda: z.object({
			enabled: z.boolean().default(true),
			deviceIds: z.array(z.number().int()).default([0]),
			maxMemoryUsage: z.number().int().min(1024).default(8192), // 8GB
			batchSize: z.number().int().min(1).max(128).default(32),
			maxConcurrentBatches: z.number().int().min(1).max(10).default(3),
			timeout: z.number().int().min(5000).max(120000).default(30000),
		}),
		fallback: z.object({
			toCPU: z.boolean().default(true),
			cpuBatchSize: z.number().int().min(1).max(64).default(16),
			maxQueueSize: z.number().int().min(10).max(1000).default(100),
		}),
		monitoring: z.object({
			enabled: z.boolean().default(true),
			metricsInterval: z.number().int().min(5000).default(30000), // 30 seconds
			performanceThreshold: z.number().int().min(100).default(5000), // 5 seconds
			memoryThreshold: z.number().min(50).max(95).default(80), // 80%
		}),
		optimization: z.object({
			autoBatching: z.boolean().default(true),
			batchTimeout: z.number().int().min(50).max(5000).default(1000), // 1 second
			memoryOptimization: z.boolean().default(true),
			preferGPUForBatches: z.boolean().default(true),
		}),
	}).default({
		enabled: false,
		cuda: {
			enabled: true,
			deviceIds: [0],
			maxMemoryUsage: 8192,
			batchSize: 32,
			maxConcurrentBatches: 3,
			timeout: 30000,
		},
		fallback: {
			toCPU: true,
			cpuBatchSize: 16,
			maxQueueSize: 100,
		},
		monitoring: {
			enabled: true,
			metricsInterval: 30000,
			performanceThreshold: 5000,
			memoryThreshold: 80,
		},
		optimization: {
			autoBatching: true,
			batchTimeout: 1000,
			memoryOptimization: true,
			preferGPUForBatches: true,
		},
	}),
	autoScaling: z.object({
		enabled: z.boolean().default(false),
		metrics: z.object({
			cpuThreshold: z.number().min(50).max(95).default(80),
			memoryThreshold: z.number().min(50).max(95).default(85),
			latencyThreshold: z.number().int().min(1000).default(5000),
			errorRateThreshold: z.number().min(0.01).max(0.5).default(0.1),
			queueLengthThreshold: z.number().int().min(10).default(50),
		}),
		scaling: z.object({
			minInstances: z.number().int().min(1).default(1),
			maxInstances: z.number().int().min(2).default(10),
			scaleUpCooldown: z.number().int().min(30000).default(120000), // 2 minutes
			scaleDownCooldown: z.number().int().min(60000).default(300000), // 5 minutes
			scaleUpFactor: z.number().min(1.1).max(3).default(2),
			scaleDownFactor: z.number().min(0.5).max(0.9).default(0.75),
		}),
		prediction: z.object({
			enabled: z.boolean().default(true),
			algorithm: z.enum(['linear', 'exponential', 'seasonal']).default('linear'),
			predictionWindow: z.number().int().min(300000).default(900000), // 15 minutes
			accuracyThreshold: z.number().min(0.5).max(1).default(0.8),
		}),
		emergency: z.object({
			enabled: z.boolean().default(true),
			cpuThreshold: z.number().min(85).max(99).default(95),
			memoryThreshold: z.number().min(85).max(99).default(95),
			latencyThreshold: z.number().int().min(5000).default(15000),
			autoScale: z.boolean().default(true),
			maxEmergencyInstances: z.number().int().min(2).default(20),
		}),
		monitoring: z.object({
			enabled: z.boolean().default(true),
			metricsInterval: z.number().int().min(5000).default(30000), // 30 seconds
			alertingEnabled: z.boolean().default(true),
			logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
		}),
	}).default({
		enabled: false,
		metrics: {
			cpuThreshold: 80,
			memoryThreshold: 85,
			latencyThreshold: 5000,
			errorRateThreshold: 0.1,
			queueLengthThreshold: 50,
		},
		scaling: {
			minInstances: 1,
			maxInstances: 10,
			scaleUpCooldown: 120000,
			scaleDownCooldown: 300000,
			scaleUpFactor: 2,
			scaleDownFactor: 0.75,
		},
		prediction: {
			enabled: true,
			algorithm: 'linear',
			predictionWindow: 900000,
			accuracyThreshold: 0.8,
		},
		emergency: {
			enabled: true,
			cpuThreshold: 95,
			memoryThreshold: 95,
			latencyThreshold: 15000,
			autoScale: true,
			maxEmergencyInstances: 20,
		},
		monitoring: {
			enabled: true,
			metricsInterval: 30000,
			alertingEnabled: true,
			logLevel: 'info',
		},
	}),
	mlOptimization: z.object({
		enabled: z.boolean().default(false),
		patternAnalysis: z.object({
			enabled: z.boolean().default(true),
			minSamples: z.number().int().min(10).default(50),
			clusterThreshold: z.number().min(0.1).max(1).default(0.7),
			maxPatterns: z.number().int().min(10).max(1000).default(100),
			updateInterval: z.number().int().min(60000).default(300000), // 5 minutes
		}),
		mlModels: z.object({
			latencyPrediction: z.object({
				enabled: z.boolean().default(true),
				modelType: z.enum(['linear', 'tree', 'neural']).default('linear'),
				trainInterval: z.number().int().min(300000).default(1800000), // 30 minutes
				minTrainingSamples: z.number().int().min(100).default(500),
				maxTrainingSamples: z.number().int().min(1000).default(10000),
			}),
			cacheOptimization: z.object({
				enabled: z.boolean().default(true),
				predictionHorizon: z.number().int().min(300000).default(1800000), // 30 minutes
				optimizationThreshold: z.number().min(0.1).max(1).default(0.6),
			}),
		}),
		optimization: z.object({
			autoApply: z.boolean().default(false),
			manualReviewRequired: z.boolean().default(true),
			maxConcurrentOptimizations: z.number().int().min(1).default(3),
			optimizationCooldown: z.number().int().min(60000).default(300000), // 5 minutes
		}),
		monitoring: z.object({
			anomalyDetection: z.boolean().default(true),
			performanceDegradationThreshold: z.number().min(0.1).max(1).default(0.3),
			alertThreshold: z.number().min(0.1).max(1).default(0.2),
		}),
	}).default({
		enabled: false,
		patternAnalysis: {
			enabled: true,
			minSamples: 50,
			clusterThreshold: 0.7,
			maxPatterns: 100,
			updateInterval: 300000,
		},
		mlModels: {
			latencyPrediction: {
				enabled: true,
				modelType: 'linear',
				trainInterval: 1800000,
				minTrainingSamples: 500,
				maxTrainingSamples: 10000,
			},
			cacheOptimization: {
				enabled: true,
				predictionHorizon: 1800000,
				optimizationThreshold: 0.6,
			},
		},
		optimization: {
			autoApply: false,
			manualReviewRequired: true,
			maxConcurrentOptimizations: 3,
			optimizationCooldown: 300000,
		},
		monitoring: {
			anomalyDetection: true,
			performanceDegradationThreshold: 0.3,
			alertThreshold: 0.2,
		},
	}),
	cdnCaching: z.object({
		enabled: z.boolean().default(false),
		provider: z.enum(['cloudflare', 'aws-cloudfront', 'fastly', 'akamai', 'custom']).default('cloudflare'),
		zoneId: z.string().optional(),
		apiToken: z.string().optional(),
		distributionId: z.string().optional(),
		customEndpoint: z.string().optional(),
		cacheKeyPrefix: z.string().default('brainwav_graphrag'),
		defaultTTL: z.number().int().min(60).max(86400).default(3600), // 1 hour
		maxTTL: z.number().int().min(300).max(604800).default(86400), // 24 hours
		staleWhileRevalidate: z.number().int().min(0).max(3600).default(300), // 5 minutes
		staleIfError: z.number().int().min(0).max(3600).default(600), // 10 minutes
		compression: z.object({
			enabled: z.boolean().default(true),
			level: z.number().int().min(1).max(9).default(6),
			types: z.array(z.string()).default([
				'text/',
				'application/json',
				'application/javascript',
				'application/xml',
			]),
		}),
		optimization: z.object({
			autoMinify: z.boolean().default(true),
			imageOptimization: z.boolean().default(true),
			brotliCompression: z.boolean().default(true),
			http2Push: z.boolean().default(true),
		}),
		monitoring: z.object({
			enabled: z.boolean().default(true),
			realTimeMetrics: z.boolean().default(true),
			alertingEnabled: z.boolean().default(true),
			logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
		}),
		geographic: z.object({
			enabled: z.boolean().default(true),
			regions: z.array(z.string()).default([
				'us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'
			]),
			defaultRegion: z.string().default('us-east-1'),
			fallbackRegion: z.string().default('us-east-1'),
		}),
	}).default({
		enabled: false,
		provider: 'cloudflare',
		cacheKeyPrefix: 'brainwav_graphrag',
		defaultTTL: 3600,
		maxTTL: 86400,
		staleWhileRevalidate: 300,
		staleIfError: 600,
		compression: {
			enabled: true,
			level: 6,
			types: ['text/', 'application/json', 'application/javascript', 'application/xml'],
		},
		optimization: {
			autoMinify: true,
			imageOptimization: true,
			brotliCompression: true,
			http2Push: true,
		},
		monitoring: {
			enabled: true,
			realTimeMetrics: true,
			alertingEnabled: true,
			logLevel: 'info',
		},
		geographic: {
			enabled: true,
			regions: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'],
			defaultRegion: 'us-east-1',
			fallbackRegion: 'us-east-1',
		},
	}),
});

export type GraphRAGServiceConfig = z.infer<typeof GraphRAGServiceConfigSchema>;

export const GraphRAGQueryRequestSchema = z.object({
	question: z.string().min(1),
	k: z.number().int().min(1).max(50).default(8),
	maxHops: z.number().int().min(1).max(3).default(1),
	maxChunks: z.number().int().min(1).max(100).default(24),
	threshold: z.number().min(0).max(1).optional(),
	includeVectors: z.boolean().default(false),
	includeCitations: z.boolean().default(true),
	namespace: z.string().optional(),
	filters: z.record(z.any()).optional(),
});

export type GraphRAGQueryRequest = z.infer<typeof GraphRAGQueryRequestSchema>;

export interface GraphRAGContext {
	chunks: Array<{
		id: string;
		nodeId: string;
		path: string;
		content: string;
		lineStart?: number;
		lineEnd?: number;
		score: number;
		nodeType: GraphNodeType;
		nodeKey: string;
	}>;
	nodes: Array<{
		id: string;
		type: GraphNodeType;
		key: string;
		label: string;
		meta: unknown;
	}>;
}

export interface GraphRAGResult {
	answer?: string;
	sources: GraphRAGContext['chunks'];
	graphContext: {
		focusNodes: number;
		expandedNodes: number;
		totalChunks: number;
		edgesTraversed: number;
	};
	metadata: {
		brainwavPowered: boolean;
		retrievalDurationMs: number;
		queryTimestamp: string;
		brainwavSource: string;
		externalKgEnriched?: boolean;
	};
	citations?: Array<{
		path: string;
		lines?: string;
		nodeType: GraphNodeType;
		relevanceScore: number;
		brainwavIndexed: boolean;
	}>;
}

interface QueryReservation {
	queryId: string;
	startTime: number;
	release: () => void;
}

const MAX_EXTERNAL_CITATIONS = 16;

export class GraphRAGService {
	private readonly qdrant: QdrantHybridSearch;
	private readonly config: GraphRAGServiceConfig;
	private readonly activeQueries = new Set<string>();
	private readonly externalKg?: {
		driver: SecureNeo4j;
		maxDepth: number;
		prefix: string;
	};
	private readonly externalProvider?: ExternalCitationProvider;
	private readonly queryPrecomputer = getQueryPrecomputer({
		enabled: this.config.precomputation.enabled,
		maxPrecomputedQueries: this.config.precomputation.maxPrecomputedQueries,
		patternAnalysis: this.config.precomputation.patternAnalysis,
		scheduling: this.config.precomputation.scheduling,
		freshness: this.config.precomputation.freshness,
		cache: {
			distributedCacheNamespace: 'precompute',
			compressionEnabled: true,
		},
	});
	private readonly streamingResponse = getStreamingResponse({
		defaultOptions: this.config.streaming.defaultOptions,
		config: this.config.streaming.config,
	});
	private readonly gpuAccelerationManager = getGPUAccelerationManager({
		enabled: this.config.gpuAcceleration.enabled,
		cuda: this.config.gpuAcceleration.cuda,
		fallback: this.config.gpuAcceleration.fallback,
		monitoring: this.config.gpuAcceleration.monitoring,
		optimization: this.config.gpuAcceleration.optimization,
	});
	private readonly autoScalingManager = getAutoScalingManager({
		enabled: this.config.autoScaling.enabled,
		metrics: this.config.autoScaling.metrics,
		scaling: this.config.autoScaling.scaling,
		prediction: this.config.autoScaling.prediction,
		emergency: this.config.autoScaling.emergency,
		monitoring: this.config.autoScaling.monitoring,
	});
	private readonly mlOptimizationManager = getMLOptimizationManager({
		enabled: this.config.mlOptimization.enabled,
		patternAnalysis: this.config.mlOptimization.patternAnalysis,
		mlModels: this.config.mlOptimization.mlModels,
		optimization: this.config.mlOptimization.optimization,
		monitoring: this.config.mlOptimization.monitoring,
	});
	private readonly cdnCacheManager = getCDNCacheManager({
		enabled: this.config.cdnCaching.enabled,
		provider: this.config.cdnCaching.provider,
		zoneId: this.config.cdnCaching.zoneId,
		apiToken: this.config.cdnCaching.apiToken,
		distributionId: this.config.cdnCaching.distributionId,
		customEndpoint: this.config.cdnCaching.customEndpoint,
		cacheKeyPrefix: this.config.cdnCaching.cacheKeyPrefix,
		defaultTTL: this.config.cdnCaching.defaultTTL,
		maxTTL: this.config.cdnCaching.maxTTL,
		staleWhileRevalidate: this.config.cdnCaching.staleWhileRevalidate,
		staleIfError: this.config.cdnCaching.staleIfError,
		compression: this.config.cdnCaching.compression,
		optimization: this.config.cdnCaching.optimization,
		monitoring: this.config.cdnCaching.monitoring,
		geographic: this.config.cdnCaching.geographic,
	});

	constructor(config: GraphRAGServiceConfig) {
		this.config = GraphRAGServiceConfigSchema.parse(config);
		this.qdrant = new QdrantHybridSearch(this.config.qdrant);

		if (this.config.externalKg.enabled) {
			const { provider } = this.config.externalKg;

			if (provider === 'neo4j') {
				const { uri, user, password, maxDepth, citationPrefix } = this.config.externalKg;
				if (uri && user && password) {
					this.externalKg = {
						driver: new SecureNeo4j(uri, user, password),
						maxDepth,
						prefix: citationPrefix,
					};
				} else {
					console.warn('brAInwav GraphRAG external KG credentials incomplete', {
						component: 'memory-core',
						brand: 'brAInwav',
						provider: 'neo4j',
						severity: 'warning',
						action: 'skipping_external_enrichment',
					});
				}
			} else if (provider === 'mcp') {
				this.externalProvider = new MCPKnowledgeProvider();
			} else {
				console.warn('brAInwav GraphRAG external KG provider not supported', {
					component: 'memory-core',
					brand: 'brAInwav',
					provider,
					severity: 'warning',
					action: 'skipping_external_enrichment',
				});
			}
		}
	}

	async initialize(
		embedDenseFunc: (text: string) => Promise<number[]>,
		embedSparseFunc: (text: string) => Promise<{ indices: number[]; values: number[] }>,
	): Promise<void> {
		// Initialize GPU acceleration manager if enabled
		if (this.config.gpuAcceleration.enabled) {
			try {
				await this.gpuAccelerationManager.initialize(
					async (texts: string[]) => {
						// Use the provided dense embedder for batch processing
						return Promise.all(texts.map(embedDenseFunc));
					},
					async (texts: string[]) => {
						// Use the provided sparse embedder for batch processing
						return Promise.all(texts.map(embedSparseFunc));
					}
				);

				console.info('brAInwav GraphRAG GPU acceleration initialized', {
					component: 'memory-core',
					brand: 'brAInwav',
					enabled: true,
				});
			} catch (error) {
				console.warn('brAInwav GraphRAG failed to initialize GPU acceleration', {
					component: 'memory-core',
					brand: 'brAInwav',
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		// Create GPU-accelerated embedding functions if GPU is enabled
		const gpuEnhancedEmbedDense = this.config.gpuAcceleration.enabled
			? async (text: string) => {
				const results = await this.gpuAccelerationManager.generateEmbeddings([text], {
					priority: 'normal',
					preferGPU: true,
				});
				return results[0]?.embedding || embedDenseFunc(text);
			}
			: embedDenseFunc;

		const gpuEnhancedEmbedSparse = this.config.gpuAcceleration.enabled
			? async (text: string) => {
				const results = await this.gpuAccelerationManager.generateSparseEmbeddings([text]);
				return results[0] || embedSparseFunc(text);
			}
			: embedSparseFunc;

		await this.qdrant.initialize(gpuEnhancedEmbedDense, gpuEnhancedEmbedSparse);

		// Initialize query precomputer
		if (this.config.precomputation.enabled) {
			try {
				// Try to get distributed cache if available
				let distributedCache;
				try {
					const { getDistributedCache } = await import('../caching/DistributedCache.js');
					distributedCache = getDistributedCache();
				} catch {
					// Distributed cache not available, continue without it
				}

				await this.queryPrecomputer.initialize(distributedCache);

				console.info('brAInwav GraphRAG query precomputer initialized', {
					component: 'memory-core',
					brand: 'brAInwav',
					enabled: true,
				});
			} catch (error) {
				console.warn('brAInwav GraphRAG failed to initialize query precomputer', {
					component: 'memory-core',
					brand: 'brAInwav',
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		// Initialize auto-scaling manager
		if (this.config.autoScaling.enabled) {
			try {
				await this.autoScalingManager.initialize(performanceMonitor);

				console.info('brAInwav GraphRAG auto-scaling manager initialized', {
					component: 'memory-core',
					brand: 'brAInwav',
					enabled: true,
				});
			} catch (error) {
				console.warn('brAInwav GraphRAG failed to initialize auto-scaling manager', {
					component: 'memory-core',
					brand: 'brAInwav',
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		// Initialize ML optimization manager
		if (this.config.mlOptimization.enabled) {
			try {
				await this.mlOptimizationManager.initialize();

				console.info('brAInwav GraphRAG ML optimization manager initialized', {
					component: 'memory-core',
					brand: 'brAInwav',
					enabled: true,
				});
			} catch (error) {
				console.warn('brAInwav GraphRAG failed to initialize ML optimization manager', {
					component: 'memory-core',
					brand: 'brAInwav',
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		// Initialize CDN cache manager
		if (this.config.cdnCaching.enabled) {
			try {
				await this.cdnCacheManager.initialize();

				console.info('brAInwav GraphRAG CDN cache manager initialized', {
					component: 'memory-core',
					brand: 'brAInwav',
					enabled: true,
					provider: this.config.cdnCaching.provider,
				});
			} catch (error) {
				console.warn('brAInwav GraphRAG failed to initialize CDN cache manager', {
					component: 'memory-core',
					brand: 'brAInwav',
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		// Initialize external provider if configured
		if (this.externalProvider && this.config.externalKg.provider === 'mcp') {
			try {
				const providerConfig: ExternalProviderConfig = {
					provider: 'mcp',
					settings: {
						slug: this.config.externalKg.slug || 'arxiv-1',
						tool: this.config.externalKg.tool || 'search_papers',
						maxResults: this.config.externalKg.maxResults,
						requestTimeoutMs: this.config.externalKg.requestTimeoutMs,
					},
				};

				await this.externalProvider.initialize(providerConfig);

				if (this.config.branding.enabled) {
					console.info('brAInwav GraphRAG MCP external provider initialized', {
						component: 'memory-core',
						brand: 'brAInwav',
						provider: this.config.externalKg.provider,
						status: 'success',
					});
				}
			} catch (error) {
				console.warn('brAInwav GraphRAG failed to initialize MCP external provider', {
					component: 'memory-core',
					brand: 'brAInwav',
					provider: this.config.externalKg.provider,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		if (this.config.branding.enabled) {
			console.info('brAInwav GraphRAG service initialized', {
				component: 'memory-core',
				brand: 'brAInwav',
				status: 'ready',
				externalKg: this.config.externalKg.enabled,
				provider: this.config.externalKg.provider,
				precomputation: this.config.precomputation.enabled,
				gpuAcceleration: this.config.gpuAcceleration.enabled,
			});
		}
	}

	async query(params: GraphRAGQueryRequest): Promise<GraphRAGResult> {
		const reservation = this.reserveQuerySlot();
		const overallStartTime = Date.now();

		try {
			const validated = GraphRAGQueryRequestSchema.parse(params);

			// Analyze query with ML optimization if enabled
			let queryFeatures;
			let mlPrediction;
			if (this.config.mlOptimization.enabled) {
				try {
					queryFeatures = await this.mlOptimizationManager.analyzeQuery(validated);
					mlPrediction = await this.mlOptimizationManager.predictPerformance(validated, queryFeatures);

					// Log ML insights
					if (mlPrediction.confidence > 0.7) {
						console.debug('brAInwav GraphRAG ML prediction', {
							component: 'memory-core',
							brand: 'brAInwav',
							queryId: reservation.queryId,
							predictedLatency: mlPrediction.predictedLatency,
							confidence: mlPrediction.confidence,
							bottlenecks: mlPrediction.bottlenecks,
						});
					}
				} catch (error) {
					console.warn('brAInwav GraphRAG ML analysis failed', {
						component: 'memory-core',
						brand: 'brAInwav',
						queryId: reservation.queryId,
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}

			// Check precomputed results first
			if (this.config.precomputation.enabled) {
				const precomputedStart = Date.now();
				const precomputedResults = await this.queryPrecomputer.getPrecomputedResult(validated);

				if (precomputedResults) {
					// Build result from precomputed data
					const precomputedDuration = Date.now() - precomputedStart;

					performanceMonitor.recordQuery({
						queryId: `${reservation.queryId}_precomputed`,
						startTime: precomputedStart,
						operation: 'hybrid_search',
						cacheHit: true,
						resultCount: precomputedResults.length,
					});

					// Lift precomputed results to graph nodes
					const focusNodeIds = await this.liftToGraphNodes(precomputedResults);

					// Minimal context assembly for precomputed results
					const context = await assembleContext(
						focusNodeIds,
						Math.min(validated.maxChunks, this.config.limits.maxContextChunks),
						precomputedResults,
					);

					const result = this.buildResult(context, { neighborIds: [], edges: [] }, reservation.startTime, precomputedResults);

					if (validated.includeCitations) {
						result.citations = this.formatCitations(context.chunks);
					}

					console.info('brAInwav GraphRAG precomputed result used', {
						component: 'memory-core',
						brand: 'brAInwav',
						queryId: reservation.queryId,
						resultCount: precomputedResults.length,
						duration: precomputedDuration,
					});

					return result;
				}
			}

			// Track hybrid search performance
			const searchStartTime = Date.now();
			let seeds = await this.hybridSeedSearch(validated);
			performanceMonitor.recordQuery({
				queryId: `${reservation.queryId}_search`,
				startTime: searchStartTime,
				operation: 'hybrid_search',
				cacheHit: false, // Would need to be determined from cache implementation
				resultCount: seeds.length,
			});

			// Record query for precomputation analysis
			if (this.config.precomputation.enabled) {
				this.queryPrecomputer.recordQuery(validated, Date.now() - searchStartTime);
			}

			const focusNodeIds = await this.liftToGraphNodes(seeds);

			// Track graph expansion performance
			const expansionStartTime = Date.now();
			const expansion = await expandNeighbors(focusNodeIds, {
				allowedEdges: this.config.expansion.allowedEdges as GraphEdgeType[],
				maxNeighborsPerNode: this.config.expansion.maxNeighborsPerNode,
			});
			performanceMonitor.recordQuery({
				queryId: `${reservation.queryId}_expansion`,
				startTime: expansionStartTime,
				operation: 'graph_expansion',
				cacheHit: false,
				resultCount: expansion.neighborIds.length,
			});

			// Track context assembly performance
			const contextStartTime = Date.now();
			const allNodeIds = [...focusNodeIds, ...expansion.neighborIds];
			const context = await assembleContext(
				allNodeIds,
				Math.min(validated.maxChunks, this.config.limits.maxContextChunks),
				seeds,
			);
			performanceMonitor.recordQuery({
				queryId: `${reservation.queryId}_context`,
				startTime: contextStartTime,
				operation: 'context_assembly',
				cacheHit: false,
				resultCount: context.chunks.length,
			});

			const result = this.buildResult(context, expansion, reservation.startTime, seeds);

			if (validated.includeCitations) {
				result.citations = this.formatCitations(context.chunks);
			}

			// Fetch external citations from Neo4j if configured
			if (this.externalKg && focusNodeIds.length > 0) {
				const kgCitations = await this.fetchExternalCitations(focusNodeIds);
				if (kgCitations.length > 0) {
					const existing = result.citations ?? [];
					const combined = [...existing];
					for (const citation of kgCitations) {
						if (
							!combined.some((c) => c.path === citation.path && c.nodeType === citation.nodeType)
						) {
							combined.push(citation);
						}
					}
					result.citations = combined;
					result.metadata.externalKgEnriched = true;
				}
			}

			// Fetch external citations from MCP provider if configured
			if (this.externalProvider && this.config.externalKg.provider === 'mcp') {
				try {
					const mcpStartTime = Date.now();
					const mcpCitations = await this.fetchMcpCitations(validated.question, seeds);

					// Record MCP provider performance
					performanceMonitor.recordExternalProviderCall(
						'mcp',
						Date.now() - mcpStartTime,
						mcpCitations.length > 0,
					);

					if (mcpCitations.length > 0) {
						const existing = result.citations ?? [];
						const combined = [...existing];

						// Merge citations without duplicating paths
						const seenPaths = new Set(combined.map((c) => c.path));
						for (const citation of mcpCitations) {
							if (!seenPaths.has(citation.path)) {
								combined.push({
									path: citation.path,
									nodeType: GraphNodeType.DOC,
									relevanceScore: 0,
									brainwavIndexed: false,
								});
								seenPaths.add(citation.path);
							}
						}

						result.citations = combined;
						result.metadata.externalKgEnriched = true;
					}
				} catch (error) {
					performanceMonitor.recordExternalProviderCall('mcp', 0, false);

					console.warn('brAInwav GraphRAG failed to fetch MCP citations', {
						component: 'memory-core',
						brand: 'brAInwav',
						question: validated.question,
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}

			// Record overall query performance
			const queryLatency = Date.now() - overallStartTime;
			performanceMonitor.recordQuery({
				queryId: reservation.queryId,
				startTime: overallStartTime,
				operation: 'hybrid_search', // Use overall operation type
				cacheHit: false,
				resultCount: context.chunks.length,
			});

			// Record query result for ML learning if enabled
			if (this.config.mlOptimization.enabled && queryFeatures) {
				try {
					await this.mlOptimizationManager.recordQueryResult(
						validated,
						queryFeatures,
						result,
						queryLatency
					);
				} catch (error) {
					console.warn('brAInwav GraphRAG ML result recording failed', {
						component: 'memory-core',
						brand: 'brAInwav',
						queryId: reservation.queryId,
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}

			if (this.config.branding.emitBrandedEvents) {
				await this.emitQueryEvent('completed', {
					queryId: reservation.queryId,
					question: validated.question,
					focusNodes: focusNodeIds.length,
					expandedNodes: expansion.neighborIds.length,
					totalChunks: context.chunks.length,
					durationMs: Date.now() - reservation.startTime,
				});
			}

			return result;
		} catch (error) {
			// Record error in performance monitor
			performanceMonitor.recordQuery({
				queryId: reservation.queryId,
				startTime: overallStartTime,
				operation: 'hybrid_search',
				cacheHit: false,
				resultCount: 0,
				error: error instanceof Error ? error.message : String(error),
			});

			if (this.config.branding.emitBrandedEvents) {
				await this.emitQueryEvent('failed', {
					queryId: reservation.queryId,
					question: params.question,
					error: error instanceof Error ? error.message : String(error),
					durationMs: Date.now() - reservation.startTime,
				});
			}
			throw error;
		} finally {
			reservation.release();
		}
	}

	async healthCheck(): Promise<{
		status: 'healthy' | 'unhealthy' | 'degraded';
		components: { qdrant: boolean; prisma: boolean; gpu?: boolean; autoScaling?: boolean; mlOptimization?: boolean };
		brainwavSource: string;
		performance?: {
			averageLatency: number;
			cacheHitRatio: number;
			memoryUsageMB: number;
			issues: string[];
		};
		gpu?: {
			enabled: boolean;
			healthy: boolean;
			deviceCount: number;
			metrics: any;
		};
		autoScaling?: {
			enabled: boolean;
			healthy: boolean;
			currentInstances: number;
			recommendations: number;
		};
		mlOptimization?: {
			enabled: boolean;
			healthy: boolean;
			patterns: number;
			models: number;
			anomalies: number;
		};
	}> {
		try {
			// Performance: Execute health checks in parallel
			const [qdrantHealthy, prismaHealthy] = await Promise.all([
				this.qdrant.healthCheck(),
				prisma.$queryRaw`SELECT 1`.then(
					() => true,
					() => false,
				),
			]);

			// Check GPU health if enabled
			let gpuHealth;
			if (this.config.gpuAcceleration.enabled) {
				try {
					gpuHealth = await this.gpuAccelerationManager.healthCheck();
				} catch (error) {
					gpuHealth = {
						healthy: false,
						gpuAvailable: false,
						deviceCount: 0,
						lastMetrics: {},
					};
				}
			}

			// Check auto-scaling health if enabled
			let autoScalingHealth;
			if (this.config.autoScaling.enabled) {
				try {
					autoScalingHealth = await this.autoScalingManager.healthCheck();
				} catch (error) {
					autoScalingHealth = {
						healthy: false,
						currentInstances: 1,
						recommendations: 0,
					};
				}
			}

			// Check ML optimization health if enabled
			let mlOptimizationHealth;
			if (this.config.mlOptimization.enabled) {
				try {
					mlOptimizationHealth = await this.mlOptimizationManager.healthCheck();
				} catch (error) {
					mlOptimizationHealth = {
						healthy: false,
						modelsAvailable: false,
						lastAnalysis: 0,
						anomalies: 0,
						recommendations: 0,
					};
				}
			}

			// Check CDN cache health if enabled
			let cdnCacheHealth;
			if (this.config.cdnCaching.enabled) {
				try {
					cdnCacheHealth = await this.cdnCacheManager.healthCheck();
				} catch (error) {
					cdnCacheHealth = {
						healthy: false,
						provider: this.config.cdnCaching.provider,
						cacheEntries: 0,
						hitRatio: 0,
						lastMetricsUpdate: 0,
						errors: 1,
					};
				}
			}

			const metrics = performanceMonitor.getMetrics();
			const perfSummary = performanceMonitor.getPerformanceSummary();

			let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
			if (!qdrantHealthy || !prismaHealthy) {
				status = 'unhealthy';
			} else if (
				perfSummary.status !== 'healthy' ||
				(gpuHealth && !gpuHealth.healthy) ||
				(autoScalingHealth && !autoScalingHealth.healthy) ||
				(mlOptimizationHealth && !mlOptimizationHealth.healthy) ||
				(cdnCacheHealth && !cdnCacheHealth.healthy)
			) {
				status = 'degraded';
			}

			const result: any = {
				status,
				components: {
					qdrant: qdrantHealthy,
					prisma: prismaHealthy,
					...(this.config.gpuAcceleration.enabled && { gpu: gpuHealth?.healthy || false }),
					...(this.config.autoScaling.enabled && { autoScaling: autoScalingHealth?.healthy || false }),
					...(this.config.mlOptimization.enabled && { mlOptimization: mlOptimizationHealth?.healthy || false }),
					...(this.config.cdnCaching.enabled && { cdnCaching: cdnCacheHealth?.healthy || false }),
				},
				brainwavSource: this.config.branding.sourceAttribution,
				performance: {
					averageLatency: metrics.averageQueryTime,
					cacheHitRatio: metrics.cacheHitRatio,
					memoryUsageMB: metrics.memoryUsageMB,
					issues: perfSummary.issues,
				},
			};

			if (this.config.gpuAcceleration.enabled && gpuHealth) {
				result.gpu = {
					enabled: true,
					healthy: gpuHealth.healthy,
					deviceCount: gpuHealth.deviceCount,
					metrics: gpuHealth.lastMetrics,
				};
			}

			if (this.config.autoScaling.enabled && autoScalingHealth) {
				result.autoScaling = {
					enabled: true,
					healthy: autoScalingHealth.healthy,
					currentInstances: autoScalingHealth.currentInstances,
					recommendations: autoScalingHealth.recommendations,
				};
			}

			if (this.config.mlOptimization.enabled && mlOptimizationHealth) {
				const mlMetrics = this.mlOptimizationManager.getMetrics();
				result.mlOptimization = {
					enabled: true,
					healthy: mlOptimizationHealth.healthy,
					patterns: mlMetrics.patterns.length,
					models: mlMetrics.models.length,
					anomalies: mlOptimizationHealth.anomalies,
				};
			}

			if (this.config.cdnCaching.enabled && cdnCacheHealth) {
				const cdnMetrics = this.cdnCacheManager.getMetrics();
				result.cdnCaching = {
					enabled: true,
					healthy: cdnCacheHealth.healthy,
					provider: cdnCacheHealth.provider,
					cacheEntries: cdnMetrics.cacheEntries,
					hitRatio: cdnMetrics.metrics.hitRatio,
					bandwidthSaved: cdnMetrics.metrics.totalBandwidthSaved,
				};
			}

			return result;
		} catch {
			return {
				status: 'unhealthy',
				components: { qdrant: false, prisma: false },
				brainwavSource: this.config.branding.sourceAttribution,
			};
		}
	}

	async getStats(): Promise<{
		totalNodes: number;
		totalEdges: number;
		totalChunks: number;
		nodeTypeDistribution: Record<string, number>;
		edgeTypeDistribution: Record<string, number>;
		brainwavSource: string;
	}> {
		// Performance: Execute all database queries in parallel
		const [nodeStats, edgeStats, chunkCount] = await Promise.all([
			prisma.graphNode.groupBy({ by: ['type'], _count: { type: true } }),
			prisma.graphEdge.groupBy({ by: ['type'], _count: { type: true } }),
			prisma.chunkRef.count(),
		]);

		// Performance: Use more efficient object construction
		const nodeTypeDistribution = nodeStats.reduce((acc, stat) => {
			acc[stat.type] = stat._count.type;
			return acc;
		}, {} as Record<string, number>);

		const edgeTypeDistribution = edgeStats.reduce((acc, stat) => {
			acc[stat.type] = stat._count.type;
			return acc;
		}, {} as Record<string, number>);

		const totalNodes = nodeStats.reduce((sum, stat) => sum + stat._count.type, 0);
		const totalEdges = edgeStats.reduce((sum, stat) => sum + stat._count.type, 0);

		return {
			totalNodes,
			totalEdges,
			totalChunks: chunkCount,
			nodeTypeDistribution,
			edgeTypeDistribution,
			brainwavSource: this.config.branding.sourceAttribution,
		};
	}

	async close(): Promise<void> {
		// Stop GPU acceleration manager if enabled
		if (this.config.gpuAcceleration.enabled) {
			try {
				await this.gpuAccelerationManager.stop();
			} catch (error) {
				console.warn('brAInwav GraphRAG failed to stop GPU acceleration', {
					component: 'memory-core',
					brand: 'brAInwav',
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		// Stop auto-scaling manager if enabled
		if (this.config.autoScaling.enabled) {
			try {
				await this.autoScalingManager.stop();
			} catch (error) {
				console.warn('brAInwav GraphRAG failed to stop auto-scaling manager', {
					component: 'memory-core',
					brand: 'brAInwav',
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		// Stop ML optimization manager if enabled
		if (this.config.mlOptimization.enabled) {
			try {
				await this.mlOptimizationManager.stop();
			} catch (error) {
				console.warn('brAInwav GraphRAG failed to stop ML optimization manager', {
					component: 'memory-core',
					brand: 'brAInwav',
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		// Stop CDN cache manager if enabled
		if (this.config.cdnCaching.enabled) {
			try {
				await this.cdnCacheManager.stop();
			} catch (error) {
				console.warn('brAInwav GraphRAG failed to stop CDN cache manager', {
					component: 'memory-core',
					brand: 'brAInwav',
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		await this.qdrant.close();
		await this.externalKg?.driver.close();
		await this.externalProvider?.dispose?.();
		await shutdownPrisma();
		if (this.config.branding.enabled) {
			console.info('brAInwav GraphRAG service closed', {
				component: 'memory-core',
				brand: 'brAInwav',
				status: 'shutdown',
				gpuAcceleration: this.config.gpuAcceleration.enabled,
				autoScaling: this.config.autoScaling.enabled,
				mlOptimization: this.config.mlOptimization.enabled,
				cdnCaching: this.config.cdnCaching.enabled,
			});
		}
	}

	private reserveQuerySlot(): QueryReservation {
		if (this.activeQueries.size >= this.config.limits.maxConcurrentQueries) {
			throw new Error('brAInwav GraphRAG: Maximum concurrent queries exceeded');
		}

		const queryId = createPrefixedId(`graphrag_${Date.now()}_`);
		this.activeQueries.add(queryId);

		return {
			queryId,
			startTime: Date.now(),
			release: () => {
				this.activeQueries.delete(queryId);
			},
		};
	}

	private async hybridSeedSearch(params: GraphRAGQueryRequest): Promise<GraphRAGSearchResult[]> {
		return this.qdrant.hybridSearch({
			question: params.question,
			k: params.k,
			threshold: params.threshold,
			includeVectors: params.includeVectors,
			namespace: params.namespace,
			filters: params.filters,
		});
	}

	private async liftToGraphNodes(seedResults: GraphRAGSearchResult[]): Promise<string[]> {
		if (seedResults.length === 0) {
			return [];
		}

		const qdrantIds = seedResults.map((result) => result.id);
		const chunkRefs = await prisma.chunkRef.findMany({
			where: { qdrantId: { in: qdrantIds } },
			select: { nodeId: true },
		});

		return [...new Set(chunkRefs.map((ref) => ref.nodeId))];
	}

	private buildResult(
		context: Awaited<ReturnType<typeof assembleContext>>,
		expansion: Awaited<ReturnType<typeof expandNeighbors>>,
		startTime: number,
		seeds: GraphRAGSearchResult[],
	): GraphRAGResult {
		return {
			answer: seeds[0]?.chunkContent,
			sources: context.chunks,
			graphContext: {
				focusNodes: new Set(context.chunks.map((chunk) => chunk.nodeId)).size,
				expandedNodes: expansion.neighborIds.length,
				totalChunks: context.chunks.length,
				edgesTraversed: expansion.edges.length,
			},
			metadata: {
				brainwavPowered: this.config.branding.enabled,
				retrievalDurationMs: Date.now() - startTime,
				queryTimestamp: new Date().toISOString(),
				brainwavSource: this.config.branding.sourceAttribution,
			},
		};
	}

	private formatCitations(chunks: GraphRAGContext['chunks']): GraphRAGResult['citations'] {
		return chunks.map((chunk) => ({
			path: chunk.path,
			lines:
				chunk.lineStart !== undefined && chunk.lineEnd !== undefined
					? `${chunk.lineStart}-${chunk.lineEnd}`
					: undefined,
			nodeType: chunk.nodeType,
			relevanceScore: chunk.score,
			brainwavIndexed: this.config.branding.enabled,
		}));
	}

	private async fetchExternalCitations(nodeIds: string[]): Promise<GraphRAGResult['citations']> {
		if (!this.externalKg) return [];

		const citations: GraphRAGResult['citations'] = [];
		const seenPaths = new Set<string>();

		for (const nodeId of nodeIds) {
			try {
				const neighborhood = await this.externalKg.driver.neighborhood(
					nodeId,
					this.externalKg.maxDepth,
				);
				const nodes = neighborhood?.nodes ?? [];
				for (const node of nodes) {
					const label =
						typeof node.label === 'string' && node.label.length > 0 ? node.label : node.id;
					const path = `${this.externalKg.prefix}:${label}`;
					if (seenPaths.has(path) || citations.length >= MAX_EXTERNAL_CITATIONS) {
						continue;
					}
					seenPaths.add(path);
					citations.push({
						path,
						lines: undefined,
						nodeType: GraphNodeType.DOC,
						relevanceScore: 0,
						brainwavIndexed: false,
					});
				}
			} catch (error) {
				console.warn('brAInwav GraphRAG external KG enrichment failed', {
					component: 'memory-core',
					brand: 'brAInwav',
					nodeId,
					error: error instanceof Error ? error.message : String(error),
					severity: 'warning',
				});
			}

			if (citations.length >= MAX_EXTERNAL_CITATIONS) {
				break;
			}
		}

		return citations;
	}

	private async fetchMcpCitations(
		question: string,
		seeds: GraphRAGSearchResult[],
	): Promise<{ path: string }[]> {
		if (!this.externalProvider) {
			return [];
		}

		try {
			const citations = await this.externalProvider.fetchCitations(question, {
				maxResults: this.config.externalKg.maxResults,
				timeoutMs: this.config.externalKg.requestTimeoutMs,
			});

			return citations.map((citation) => ({
				path: citation.path,
			}));
		} catch (error) {
			console.warn('brAInwav GraphRAG MCP citation fetch failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				provider: this.config.externalKg.provider,
				question,
				error: error instanceof Error ? error.message : String(error),
			});
			return [];
		}
	}

	private async emitQueryEvent(
		type: 'completed' | 'failed',
		data: Record<string, unknown>,
	): Promise<void> {
		try {
			const event = {
				type: `graphrag.query.${type}`,
				source: 'brAInwav.memory-core.graphrag',
				data: {
					...data,
					brainwavSource: this.config.branding.sourceAttribution,
				},
				timestamp: new Date().toISOString(),
			};

			console.info('brAInwav A2A Event emitted', {
				component: 'memory-core',
				brand: 'brAInwav',
				eventType: event.type,
				source: event.source,
				timestamp: event.timestamp,
			});
		} catch (error) {
			console.error('brAInwav GraphRAG event emission failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				error: error instanceof Error ? error.message : String(error),
				severity: 'error',
			});
		}
	}
}

export function createGraphRAGService(config?: Partial<GraphRAGServiceConfig>): GraphRAGService {
	const baseConfig: GraphRAGServiceConfig = {
		qdrant: DEFAULT_QDRANT_CONFIG,
		expansion: {
			allowedEdges: [
				GraphEdgeType.IMPORTS,
				GraphEdgeType.DEPENDS_ON,
				GraphEdgeType.IMPLEMENTS_CONTRACT,
				GraphEdgeType.CALLS_TOOL,
				GraphEdgeType.EMITS_EVENT,
				GraphEdgeType.EXPOSES_PORT,
				GraphEdgeType.REFERENCES_DOC,
				GraphEdgeType.DECIDES_WITH,
			],
			maxHops: 1,
			maxNeighborsPerNode: 20,
		},
		limits: {
			maxContextChunks: 24,
			queryTimeoutMs: 30000,
			maxConcurrentQueries: 5,
		},
		branding: {
			enabled: process.env.BRAINWAV_BRANDING !== 'false',
			sourceAttribution: 'brAInwav Cortex-OS GraphRAG',
			emitBrandedEvents: true,
		},
		externalKg: {
			enabled: false,
			maxDepth: 1,
			citationPrefix: 'neo4j',
		},
		gpuAcceleration: {
			enabled: process.env.GPU_ACCELERATION_ENABLED === 'true',
			cuda: {
				enabled: true,
				deviceIds: process.env.GPU_DEVICE_IDS
					? process.env.GPU_DEVICE_IDS.split(',').map(id => parseInt(id.trim(), 10))
					: [0],
				maxMemoryUsage: parseInt(process.env.GPU_MAX_MEMORY_MB || '8192', 10),
				batchSize: parseInt(process.env.GPU_BATCH_SIZE || '32', 10),
				maxConcurrentBatches: parseInt(process.env.GPU_MAX_CONCURRENT_BATCHES || '3', 10),
				timeout: parseInt(process.env.GPU_TIMEOUT_MS || '30000', 10),
			},
			fallback: {
				toCPU: true,
				cpuBatchSize: parseInt(process.env.GPU_CPU_BATCH_SIZE || '16', 10),
				maxQueueSize: parseInt(process.env.GPU_MAX_QUEUE_SIZE || '100', 10),
			},
			monitoring: {
				enabled: true,
				metricsInterval: parseInt(process.env.GPU_METRICS_INTERVAL || '30000', 10),
				performanceThreshold: parseInt(process.env.GPU_PERFORMANCE_THRESHOLD || '5000', 10),
				memoryThreshold: parseInt(process.env.GPU_MEMORY_THRESHOLD || '80', 10),
			},
			optimization: {
				autoBatching: true,
				batchTimeout: parseInt(process.env.GPU_BATCH_TIMEOUT || '1000', 10),
				memoryOptimization: true,
				preferGPUForBatches: true,
			},
		},
		autoScaling: {
			enabled: process.env.AUTO_SCALING_ENABLED === 'true',
			metrics: {
				cpuThreshold: parseInt(process.env.AUTO_SCALING_CPU_THRESHOLD || '80', 10),
				memoryThreshold: parseInt(process.env.AUTO_SCALING_MEMORY_THRESHOLD || '85', 10),
				latencyThreshold: parseInt(process.env.AUTO_SCALING_LATENCY_THRESHOLD || '5000', 10),
				errorRateThreshold: parseFloat(process.env.AUTO_SCALING_ERROR_RATE_THRESHOLD || '0.1'),
				queueLengthThreshold: parseInt(process.env.AUTO_SCALING_QUEUE_THRESHOLD || '50', 10),
			},
			scaling: {
				minInstances: parseInt(process.env.AUTO_SCALING_MIN_INSTANCES || '1', 10),
				maxInstances: parseInt(process.env.AUTO_SCALING_MAX_INSTANCES || '10', 10),
				scaleUpCooldown: parseInt(process.env.AUTO_SCALING_SCALE_UP_COOLDOWN || '120000', 10),
				scaleDownCooldown: parseInt(process.env.AUTO_SCALING_SCALE_DOWN_COOLDOWN || '300000', 10),
				scaleUpFactor: parseFloat(process.env.AUTO_SCALING_SCALE_UP_FACTOR || '2'),
				scaleDownFactor: parseFloat(process.env.AUTO_SCALING_SCALE_DOWN_FACTOR || '0.75'),
			},
			prediction: {
				enabled: process.env.AUTO_SCALING_PREDICTION !== 'false',
				algorithm: (process.env.AUTO_SCALING_PREDICTION_ALGORITHM as 'linear' | 'exponential' | 'seasonal') || 'linear',
				predictionWindow: parseInt(process.env.AUTO_SCALING_PREDICTION_WINDOW || '900000', 10),
				accuracyThreshold: parseFloat(process.env.AUTO_SCALING_PREDICTION_ACCURACY || '0.8'),
			},
			emergency: {
				enabled: process.env.AUTO_SCALING_EMERGENCY !== 'false',
				cpuThreshold: parseInt(process.env.AUTO_SCALING_EMERGENCY_CPU_THRESHOLD || '95', 10),
				memoryThreshold: parseInt(process.env.AUTO_SCALING_EMERGENCY_MEMORY_THRESHOLD || '95', 10),
				latencyThreshold: parseInt(process.env.AUTO_SCALING_EMERGENCY_LATENCY_THRESHOLD || '15000', 10),
				autoScale: process.env.AUTO_SCALING_EMERGENCY_AUTO_SCALE !== 'false',
				maxEmergencyInstances: parseInt(process.env.AUTO_SCALING_MAX_EMERGENCY_INSTANCES || '20', 10),
			},
			monitoring: {
				enabled: true,
				metricsInterval: parseInt(process.env.AUTO_SCALING_METRICS_INTERVAL || '30000', 10),
				alertingEnabled: process.env.AUTO_SCALING_ALERTING !== 'false',
				logLevel: (process.env.AUTO_SCALING_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
			},
		},
		mlOptimization: {
			enabled: process.env.ML_OPTIMIZATION_ENABLED === 'true',
			patternAnalysis: {
				enabled: process.env.ML_PATTERN_ANALYSIS !== 'false',
				minSamples: parseInt(process.env.ML_PATTERN_MIN_SAMPLES || '50', 10),
				clusterThreshold: parseFloat(process.env.ML_PATTERN_CLUSTER_THRESHOLD || '0.7'),
				maxPatterns: parseInt(process.env.ML_PATTERN_MAX_PATTERNS || '100', 10),
				updateInterval: parseInt(process.env.ML_PATTERN_UPDATE_INTERVAL || '300000', 10),
			},
			mlModels: {
				latencyPrediction: {
					enabled: process.env.ML_LATENCY_PREDICTION !== 'false',
					modelType: (process.env.ML_LATENCY_MODEL_TYPE as 'linear' | 'tree' | 'neural') || 'linear',
					trainInterval: parseInt(process.env.ML_LATENCY_TRAIN_INTERVAL || '1800000', 10),
					minTrainingSamples: parseInt(process.env.ML_LATENCY_MIN_TRAINING_SAMPLES || '500', 10),
					maxTrainingSamples: parseInt(process.env.ML_LATENCY_MAX_TRAINING_SAMPLES || '10000', 10),
				},
				cacheOptimization: {
					enabled: process.env.ML_CACHE_OPTIMIZATION !== 'false',
					predictionHorizon: parseInt(process.env.ML_CACHE_PREDICTION_HORIZON || '1800000', 10),
					optimizationThreshold: parseFloat(process.env.ML_CACHE_OPTIMIZATION_THRESHOLD || '0.6'),
				},
			},
			optimization: {
				autoApply: process.env.ML_AUTO_APPLY_OPTIMIZATIONS === 'true',
				manualReviewRequired: process.env.ML_MANUAL_review_REQUIRED !== 'false',
				maxConcurrentOptimizations: parseInt(process.env.ML_MAX_CONCURRENT_OPTIMIZATIONS || '3', 10),
				optimizationCooldown: parseInt(process.env.ML_OPTIMIZATION_COOLDOWN || '300000', 10),
			},
			monitoring: {
				anomalyDetection: process.env.ML_ANOMALY_DETECTION !== 'false',
				performanceDegradationThreshold: parseFloat(process.env.ML_PERFORMANCE_DEGRADATION_THRESHOLD || '0.3'),
				alertThreshold: parseFloat(process.env.ML_ALERT_THRESHOLD || '0.2'),
			},
		},
	};

	const externalKgBase = {
		enabled: process.env.EXTERNAL_KG_ENABLED === 'true',
		provider: (process.env.EXTERNAL_KG_PROVIDER as 'none' | 'neo4j' | 'mcp') || 'none',
		// Neo4j settings
		uri: process.env.NEO4J_URI,
		user: process.env.NEO4J_USER,
		password: process.env.NEO4J_PASSWORD,
		// MCP settings
		slug: process.env.ARXIV_MCP_SLUG || 'arxiv-1',
		tool: process.env.ARXIV_MCP_SEARCH_TOOL || 'search_papers',
		maxResults: parseInt(process.env.ARXIV_MCP_MAX_RESULTS || '5', 10),
		requestTimeoutMs: parseInt(process.env.ARXIV_MCP_REQUEST_TIMEOUT || '10000', 10),
		// Common settings
		maxDepth: 1,
		citationPrefix: 'neo4j',
	};

	const mergedConfig: GraphRAGServiceConfig = {
		qdrant: { ...baseConfig.qdrant, ...config?.qdrant },
		expansion: { ...baseConfig.expansion, ...config?.expansion },
		limits: { ...baseConfig.limits, ...config?.limits },
		branding: { ...baseConfig.branding, ...config?.branding },
		externalKg: { ...externalKgBase, ...config?.externalKg },
		gpuAcceleration: { ...baseConfig.gpuAcceleration, ...config?.gpuAcceleration },
		autoScaling: { ...baseConfig.autoScaling, ...config?.autoScaling },
		mlOptimization: { ...baseConfig.mlOptimization, ...config?.mlOptimization },
		cdnCaching: {
			enabled: process.env.CDN_CACHING_ENABLED === 'true',
			provider: (process.env.CDN_PROVIDER as 'cloudflare' | 'aws-cloudfront' | 'fastly' | 'akamai' | 'custom') || 'cloudflare',
			zoneId: process.env.CDN_ZONE_ID,
			apiToken: process.env.CDN_API_TOKEN,
			distributionId: process.env.CDN_DISTRIBUTION_ID,
			customEndpoint: process.env.CDN_CUSTOM_ENDPOINT,
			cacheKeyPrefix: process.env.CDN_CACHE_KEY_PREFIX || 'brainwav_graphrag',
			defaultTTL: parseInt(process.env.CDN_DEFAULT_TTL || '3600', 10),
			maxTTL: parseInt(process.env.CDN_MAX_TTL || '86400', 10),
			staleWhileRevalidate: parseInt(process.env.CDN_STALE_WHILE_REVALIDATE || '300', 10),
			staleIfError: parseInt(process.env.CDN_STALE_IF_ERROR || '600', 10),
			compression: {
				enabled: process.env.CDN_COMPRESSION !== 'false',
				level: parseInt(process.env.CDN_COMPRESSION_LEVEL || '6', 10),
				types: (process.env.CDN_COMPRESSION_TYPES || 'text/,application/json,application/javascript,application/xml').split(','),
			},
			optimization: {
				autoMinify: process.env.CDN_AUTO_MINIFY !== 'false',
				imageOptimization: process.env.CDN_IMAGE_OPTIMIZATION !== 'false',
				brotliCompression: process.env.CDN_BROTLI_COMPRESSION !== 'false',
				http2Push: process.env.CDN_HTTP2_PUSH !== 'false',
			},
			monitoring: {
				enabled: process.env.CDN_MONITORING !== 'false',
				realTimeMetrics: process.env.CDN_REAL_TIME_METRICS !== 'false',
				alertingEnabled: process.env.CDN_ALERTING !== 'false',
				logLevel: (process.env.CDN_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
			},
			geographic: {
				enabled: process.env.CDN_GEOGRAPHIC !== 'false',
				regions: (process.env.CDN_REGIONS || 'us-east-1,us-west-2,eu-west-1,ap-southeast-1').split(','),
				defaultRegion: process.env.CDN_DEFAULT_REGION || 'us-east-1',
				fallbackRegion: process.env.CDN_FALLBACK_REGION || 'us-east-1',
			},
		},
	};

	return new GraphRAGService(mergedConfig);
}
