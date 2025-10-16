import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphRAGSearchResult } from '../retrieval/QdrantHybrid.js';
import {
	createGraphRAGService,
	GraphRAGQueryRequestSchema,
	type GraphRAGService,
} from '../services/GraphRAGService.js';

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

const expandMock = vi.fn();
const assembleMock = vi.fn();
const prismaMock: PrismaMock = {
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
};

vi.mock('../retrieval/QdrantHybrid.js', async () => {
	const actual = await vi.importActual<typeof import('../retrieval/QdrantHybrid.js')>(
		'../retrieval/QdrantHybrid.js',
	);
	return {
		...actual,
		QdrantHybridSearch: vi.fn(() => qdrantMock),
	};
});

vi.mock('../retrieval/expandGraph.js', () => ({
	expandNeighbors: expandMock,
}));

vi.mock('../retrieval/contextAssembler.js', () => ({
	assembleContext: assembleMock,
}));

vi.mock('../db/prismaClient.js', () => ({
	prisma: prismaMock,
	shutdownPrisma: vi.fn().mockResolvedValue(undefined),
}));

describe('GraphRAGService', () => {
	let service: GraphRAGService;
	const dense = vi.fn().mockResolvedValue(new Array(3).fill(0.1));
	const sparse = vi.fn().mockResolvedValue({ indices: [0, 1], values: [0.4, 0.2] });
	let seeds: GraphRAGSearchResult[];

        beforeEach(async () => {
                vi.clearAllMocks();
                prismaMock.chunkRef.findMany.mockReset();
                prismaMock.chunkRef.findMany.mockImplementation((args: any = {}) => {
                        const qdrantFilter = args?.where?.qdrantId?.in;
                        if (Array.isArray(qdrantFilter)) {
                                return qdrantFilter.map((id: string, index: number) => ({
                                        id: `chunk-${index}`,
                                        qdrantId: id,
                                        nodeId: index === 0 ? 'node-a' : 'node-b',
                                        path: 'packages/example.ts',
                                        lineStart: 1,
                                        lineEnd: 5,
                                        meta: { snippet: 'Seed answer', score: 0.9 },
                                        node: { type: 'PACKAGE', key: 'packages/example' },
                                }));
                        }

                        return [
                                {
                                        id: 'chunk-ctx',
                                        qdrantId: 'seed-1',
                                        nodeId: 'node-a',
                                        path: 'packages/example.ts',
                                        lineStart: 1,
                                        lineEnd: 5,
                                        meta: { snippet: 'Seed answer', score: 0.9 },
                                        node: { type: 'PACKAGE', key: 'packages/example' },
                                },
                        ];
                });

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

		service = createGraphRAGService({
			limits: { maxConcurrentQueries: 2, maxContextChunks: 10, queryTimeoutMs: 1000 },
		});
		await service.initialize(dense, sparse);
	});

	afterEach(async () => {
		await service.close();
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

        it('hydrates large Qdrant result sets with batched chunk lookups', async () => {
                const largeSeeds: GraphRAGSearchResult[] = Array.from({ length: 1200 }, (_, index) => ({
                        id: `seed-${index}`,
                        score: 0.5,
                        nodeId: '',
                        chunkContent: '',
                        metadata: {
                                path: '',
                                nodeType: 'PACKAGE',
                                nodeKey: `node-${index}`,
                                brainwavSource: 'test',
                                relevanceScore: 0,
                        },
                }));

                const batchCalls: Array<string[]> = [];
                prismaMock.chunkRef.findMany.mockImplementation(({ where }) => {
                        const ids = Array.isArray(where?.qdrantId?.in) ? where.qdrantId.in as string[] : [];
                        batchCalls.push(ids);
                        return ids.map((id) => ({
                                id: `chunk-${id}`,
                                qdrantId: id,
                                nodeId: `node-${id}`,
                                path: `docs/${id}.md`,
                                lineStart: 1,
                                lineEnd: 2,
                                meta: { snippet: `snippet-${id}`, score: 0.4 },
                                node: { type: 'DOC', key: `doc-${id}` },
                        }));
                });

                const { hydratedSeeds, chunkRefs } = await (service as any).hydrateSeedResults(largeSeeds);

                expect(batchCalls.length).toBeGreaterThan(1);
                expect(batchCalls.every((ids) => ids.length <= 500)).toBe(true);
                expect(hydratedSeeds[0].nodeId).toBe('node-seed-0');
                expect(hydratedSeeds[0].metadata.hydrated).toBe(true);
                expect(chunkRefs).toHaveLength(1200);
        });

        it('validates query payloads using schema', () => {
                expect(() => GraphRAGQueryRequestSchema.parse({ question: '' })).toThrow();
        });
});
