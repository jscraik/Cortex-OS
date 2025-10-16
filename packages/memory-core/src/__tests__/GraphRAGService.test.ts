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

const qdrantMock = vi.hoisted(() => ({
        initialize: vi.fn(),
        hybridSearch: vi.fn(),
        healthCheck: vi.fn(),
        close: vi.fn(),
}));

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
const shutdownPrismaMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

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
        shutdownPrisma: shutdownPrismaMock,
}));

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

                service = createGraphRAGService({
                        limits: { maxConcurrentQueries: 1, maxContextChunks: 10, queryTimeoutMs: 1000 },
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

	it('validates query payloads using schema', () => {
		expect(() => GraphRAGQueryRequestSchema.parse({ question: '' })).toThrow();
	});
});
