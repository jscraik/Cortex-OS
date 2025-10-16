import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphRAGSearchResult } from '../retrieval/QdrantHybrid.js';
import { performanceMonitor } from '../monitoring/PerformanceMonitor.js';
import { GraphRAGService, GraphRAGQueryRequestSchema } from '../services/GraphRAGService.js';

type PrismaMock = {
	chunkRef: {
		findMany: ReturnType<typeof vi.fn>;
		count: ReturnType<typeof vi.fn>;
	};
	graphNode: {
		groupBy: ReturnType<typeof vi.fn>;
	};
	graphEdge: {
		groupBy: ReturnType<typeof vi.fn>;
	};
	$queryRaw: ReturnType<typeof vi.fn>;
};

const qdrantMock = {
	initialize: vi.fn(),
	hybridSearch: vi.fn(),
	healthCheck: vi.fn(),
	close: vi.fn(),
};

const expandMock = vi.hoisted(() => vi.fn());
const assembleMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted<PrismaMock>(() => ({
        chunkRef: {
                findMany: vi.fn(),
                count: vi.fn().mockResolvedValue(0),
        },
        graphNode: {
                groupBy: vi.fn().mockResolvedValue([]),
        },
        graphEdge: {
                groupBy: vi.fn().mockResolvedValue([]),
        },
        $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
}));

vi.mock('../retrieval/QdrantHybrid.js', async () => {
        const actual = await vi.importActual<typeof import('../retrieval/QdrantHybrid.js')>(
                '../retrieval/QdrantHybrid.js',
        );
        return {
                ...actual,
                QdrantHybridSearch: vi.fn(() => qdrantMock),
        };
});

vi.mock('@cortex-os/utils', () => ({
        SecureNeo4j: vi.fn(() => ({
                close: vi.fn(),
        })),
}));

vi.mock('../retrieval/expandGraph.js', () => ({
        expandNeighbors: expandMock,
}));

vi.mock('../retrieval/contextAssembler.js', () => ({
        assembleContext: assembleMock,
}));

vi.mock('../services/external/MCPKnowledgeProvider.js', () => ({
        MCPKnowledgeProvider: vi.fn().mockImplementation(() => ({
                initialize: vi.fn(),
                fetchCitations: vi.fn().mockResolvedValue([]),
        })),
}));

vi.mock('../db/prismaClient.js', () => ({
        prisma: prismaMock,
        shutdownPrisma: vi.fn().mockResolvedValue(undefined),
}));

const DEFAULT_CONFIG = {
        qdrant: {
                url: 'http://localhost:6333',
                apiKey: undefined,
                collection: 'local_memory_v1',
                timeout: 30000,
                maxRetries: 3,
                brAInwavBranding: true,
        },
        expansion: {
                allowedEdges: [
                        'IMPORTS',
                        'DEPENDS_ON',
                        'IMPLEMENTS_CONTRACT',
                        'CALLS_TOOL',
                        'EMITS_EVENT',
                        'EXPOSES_PORT',
                        'REFERENCES_DOC',
                        'DECIDES_WITH',
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
                enabled: true,
                sourceAttribution: 'brAInwav Cortex-OS GraphRAG',
                emitBrandedEvents: true,
        },
        streaming: {
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
        },
        externalKg: {
                enabled: false,
                provider: 'none',
                slug: undefined,
                tool: undefined,
                maxResults: 5,
                requestTimeoutMs: 10000,
                maxDepth: 1,
                citationPrefix: 'neo4j',
        },
        precomputation: {
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
        },
        gpuAcceleration: {
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
        },
        autoScaling: {
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
        },
        mlOptimization: {
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
        },
        cdnCaching: {
                enabled: false,
                provider: 'cloudflare',
                zoneId: undefined,
                apiToken: undefined,
                distributionId: undefined,
                customEndpoint: undefined,
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
        },
};

function mergeConfig(base: any, overrides?: Record<string, unknown>): any {
        if (!overrides) {
                return JSON.parse(JSON.stringify(base));
        }

        const result = JSON.parse(JSON.stringify(base));

        for (const [key, value] of Object.entries(overrides)) {
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                        result[key] = mergeConfig(result[key] ?? {}, value as Record<string, unknown>);
                } else {
                        result[key] = value;
                }
        }

        return result;
}

function createService(overrides?: Record<string, unknown>): GraphRAGService {
        const config = mergeConfig(DEFAULT_CONFIG, overrides);
        return new GraphRAGService(config);
}

describe('GraphRAGService', () => {
        let service: GraphRAGService;
	const dense = vi.fn().mockResolvedValue(new Array(3).fill(0.1));
	const sparse = vi.fn().mockResolvedValue({ indices: [0, 1], values: [0.4, 0.2] });
	let seeds: GraphRAGSearchResult[];

	beforeEach(async () => {
		vi.clearAllMocks();
		prismaMock.chunkRef.findMany.mockReset();
		prismaMock.chunkRef.findMany.mockResolvedValue([{ nodeId: 'node-a' }, { nodeId: 'node-b' }]);

		qdrantMock.initialize.mockResolvedValue(undefined);
		seeds = [
			{
				id: 'seed-1',
				score: 0.9,
				nodeId: 'node-a',
				chunkContent: 'Seed answer',
				metadata: {
					path: 'packages/example.ts',
					nodeType: 'PACKAGE',
					nodeKey: 'packages/example',
					brainwavSource: 'test',
					relevanceScore: 0.9,
				},
			},
		];
		qdrantMock.hybridSearch.mockResolvedValue(seeds);
		qdrantMock.healthCheck.mockResolvedValue(true);
		qdrantMock.close.mockResolvedValue(undefined);

		expandMock.mockResolvedValue({ neighborIds: ['node-c'], edges: [{ id: 'edge-1' }] });
		assembleMock.mockResolvedValue({
			nodes: [
				{ id: 'node-a', type: 'PACKAGE', key: 'packages/example', label: 'Example', meta: null },
				{ id: 'node-c', type: 'SERVICE', key: 'services/api', label: 'API', meta: null },
			],
			chunks: [
				{
					id: 'chunk-1',
					nodeId: 'node-a',
					path: 'packages/example.ts',
					content: 'Seed answer',
					lineStart: 1,
					lineEnd: 5,
					score: 0.9,
					nodeType: 'PACKAGE',
					nodeKey: 'packages/example',
				},
			],
		});

                service = createService({
                        limits: { maxConcurrentQueries: 1, maxContextChunks: 10, queryTimeoutMs: 1000 },
                        branding: { emitBrandedEvents: false },
                });
                await service.initialize(dense, sparse);
        });

        afterEach(async () => {
                if (service) {
                        await service.close();
                }
        });

	it('initializes Qdrant with embedding functions', () => {
		expect(qdrantMock.initialize).toHaveBeenCalledWith(dense, sparse);
	});

	it('executes query pipeline and returns citations when requested', async () => {
		const result = await service.query({
			question: 'How does GraphRAG work?',
			k: 3,
			includeCitations: true,
		});

		expect(qdrantMock.hybridSearch).toHaveBeenCalledWith({
			question: 'How does GraphRAG work?',
			k: 3,
			threshold: undefined,
			includeVectors: false,
			namespace: undefined,
			filters: undefined,
		});
		expect(expandMock).toHaveBeenCalled();
		expect(assembleMock).toHaveBeenCalled();
		expect(result.sources).toHaveLength(1);
		expect(result.citations?.[0].path).toBe('packages/example.ts');
		expect(result.metadata.brainwavPowered).toBe(true);
	});

        it('enforces concurrent query limit', async () => {
                const blockingSearch = vi
                        .fn()
                        .mockImplementationOnce(async () => {
                                await new Promise((resolve) => setTimeout(resolve, 20));
                                return seeds;
                        })
                        .mockResolvedValue(seeds);

                qdrantMock.hybridSearch.mockImplementation(blockingSearch);

                const first = service.query({ question: 'first', k: 2 });
                const second = service.query({ question: 'second', k: 2 });

                const [, secondResult] = await Promise.allSettled([first, second]);
                expect(secondResult.status).toBe('rejected');
                if (secondResult.status === 'rejected') {
                        expect(secondResult.reason.message).toContain('Maximum concurrent queries');
                }
        });

        it('short-circuits to precomputed results when available', async () => {
                (service as any).config.precomputation.enabled = true;

                const precomputedSeeds: GraphRAGSearchResult[] = [
                        {
                                id: 'precomputed-1',
                                score: 0.99,
                                nodeId: 'node-a',
                                chunkContent: 'Precomputed answer',
                                metadata: {
                                        path: 'packages/precomputed.ts',
                                        nodeType: 'PACKAGE',
                                        nodeKey: 'packages/precomputed',
                                        brainwavSource: 'test',
                                        relevanceScore: 0.99,
                                },
                        },
                ];

                (service as any).queryPrecomputer = {
                        ...(service as any).queryPrecomputer,
                        getPrecomputedResult: vi.fn().mockResolvedValue(precomputedSeeds),
                        recordQuery: vi.fn(),
                        initialize: vi.fn(),
                };

                assembleMock.mockResolvedValueOnce({
                        nodes: [],
                        chunks: [
                                {
                                        id: 'chunk-pre',
                                        nodeId: 'node-a',
                                        path: 'packages/precomputed.ts',
                                        content: 'Precomputed answer',
                                        lineStart: 1,
                                        lineEnd: 5,
                                        score: 0.99,
                                        nodeType: 'PACKAGE',
                                        nodeKey: 'packages/precomputed',
                                },
                        ],
                });

                const hybridSpy = vi.spyOn(service as any, 'hybridSeedSearch');

                const result = await service.query({
                        question: 'Use cached result',
                        k: 2,
                        includeCitations: true,
                });

                expect(hybridSpy).not.toHaveBeenCalled();
                expect(result.answer).toBe('Precomputed answer');
                expect(result.citations?.[0].path).toBe('packages/precomputed.ts');
                hybridSpy.mockRestore();
        });

        it('merges external MCP citations without duplicating existing sources', async () => {
                (service as any).config.externalKg.enabled = true;
                (service as any).config.externalKg.provider = 'mcp';
                (service as any).externalProvider = {
                        fetchCitations: vi.fn().mockResolvedValue([
                                { path: 'packages/example.ts' },
                                { path: 'https://example.com/new' },
                        ]),
                };

                const providerSpy = vi.spyOn(performanceMonitor, 'recordExternalProviderCall');

                const result = await service.query({
                        question: 'Need more citations',
                        k: 3,
                        includeCitations: true,
                });

                const citationPaths = result.citations?.map((citation) => citation.path) ?? [];
                expect(citationPaths).toContain('packages/example.ts');
                expect(citationPaths).toContain('https://example.com/new');
                expect(citationPaths.filter((path) => path === 'packages/example.ts')).toHaveLength(1);

                expect(providerSpy).toHaveBeenCalledWith('mcp', expect.any(Number), expect.any(Boolean));
                providerSpy.mockRestore();
        });

        it('validates query payloads using schema', () => {
                expect(() => GraphRAGQueryRequestSchema.parse({ question: '' })).toThrow();
        });
});
