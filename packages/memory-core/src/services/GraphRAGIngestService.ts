import { randomUUID } from 'node:crypto';
import { SecureNeo4j } from '@cortex-os/utils';
import type { Prisma } from '@prisma/client';
import { GraphNodeType } from '../db/prismaEnums.js';
import { z } from 'zod';
import { prisma } from '../db/prismaClient.js';
import {
	type QdrantConfig,
	QdrantHybridSearch,
	type SparseVector,
} from '../retrieval/QdrantHybrid.js';

const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_QDRANT_CONFIG: QdrantConfig = {
	url: process.env.QDRANT_URL || 'http://127.0.0.1:6333',
	apiKey: process.env.QDRANT_API_KEY,
	collection: process.env.QDRANT_COLLECTION || 'local_memory_v1',
	timeout: 30000,
	maxRetries: 3,
	brainwavBranding: true,
};

const ingestRequestSchema = z.object({
	documentId: z.string().min(1),
	source: z.string().min(1),
	text: z.string().min(1),
	metadata: z.record(z.unknown()).optional(),
	hierarchical: z.boolean().default(true),
	multimodal: z.array(z.any()).optional(),
});

export type GraphRAGIngestRequest = z.input<typeof ingestRequestSchema>;

export interface GraphRAGIngestResult {
	documentId: string;
	chunks: number;
	metadata?: Record<string, unknown>;
}

interface ChunkDraft {
	id: string;
	content: string;
	path: string;
	metadata: Record<string, unknown>;
}

interface QdrantChunkPayload {
	id: string;
	nodeId: string;
	content: string;
	vector: number[];
	sparseVector: SparseVector;
	metadata: Record<string, unknown>;
}

interface GraphChunkRefInput {
	nodeId: string;
	qdrantId: string;
	path: string;
	meta: Prisma.JsonObject;
}

interface GraphDocumentRecord {
	nodeId: string;
	nodeKey: string;
	previousChunkIds: string[];
}

interface GraphPersistence {
	ensureDocument(input: GraphRAGIngestRequest): Promise<GraphDocumentRecord>;
	replaceChunkRefs(nodeId: string, refs: GraphChunkRefInput[]): Promise<void>;
}

interface VectorStore {
	init(
		embedDense: (text: string) => Promise<number[]>,
		embedSparse: (text: string) => Promise<SparseVector>,
	): Promise<void>;
	add(chunks: QdrantChunkPayload[]): Promise<void>;
	remove(ids: string[]): Promise<void>;
	close(): Promise<void>;
}

interface KnowledgeGraphAdapter {
	upsertDocument(payload: {
		nodeId: string;
		documentId: string;
		label: string;
		metadata?: Record<string, unknown>;
	}): Promise<void>;
	close(): Promise<void>;
}

interface GraphRAGIngestServiceOptions {
	chunkSize?: number;
	qdrant?: Partial<QdrantConfig>;
	neo4j?: {
		enabled: boolean;
		uri?: string;
		user?: string;
		password?: string;
	};
	idFactory?: () => string;
	clock?: () => number;
}

const DEFAULT_ID_FACTORY = () => randomUUID();
const DEFAULT_CLOCK = () => Date.now();

class PrismaGraphPersistence implements GraphPersistence {
	async ensureDocument(input: GraphRAGIngestRequest): Promise<GraphDocumentRecord> {
		const key = this.resolveKey(input);
		const label = this.resolveLabel(input, key);
		const meta = this.buildMeta(input);
		const node = await prisma.graphNode.upsert({
			where: { type_key: { type: GraphNodeType.DOC, key } },
			create: {
				type: GraphNodeType.DOC,
				key,
				label,
				meta,
			},
			update: {
				label,
				meta,
			},
		});
		const refs = await prisma.chunkRef.findMany({
			where: { nodeId: node.id },
			select: { qdrantId: true },
		});
		return {
			nodeId: node.id,
			nodeKey: node.key,
			previousChunkIds: refs.map((ref) => ref.qdrantId),
		};
	}

	async replaceChunkRefs(nodeId: string, refs: GraphChunkRefInput[]): Promise<void> {
		await prisma.$transaction([
			prisma.chunkRef.deleteMany({ where: { nodeId } }),
			...(refs.length
				? [
						prisma.chunkRef.createMany({
							data: refs.map((ref) => ({
								nodeId,
								qdrantId: ref.qdrantId,
								path: ref.path,
								meta: ref.meta,
							})),
						}),
					]
				: []),
		]);
	}

	private resolveKey(input: GraphRAGIngestRequest): string {
		const explicit = typeof input.metadata?.key === 'string' ? input.metadata.key : undefined;
		if (explicit && explicit.trim().length > 0) return explicit.trim();
		return input.source || input.documentId;
	}

	private resolveLabel(input: GraphRAGIngestRequest, fallback: string): string {
		const title = typeof input.metadata?.title === 'string' ? input.metadata.title : undefined;
		if (title && title.trim().length > 0) return title.trim();
		return fallback;
	}

	private buildMeta(input: GraphRAGIngestRequest): Prisma.JsonObject {
		const meta: Record<string, unknown> = {
			source: input.source,
			updatedAt: new Date().toISOString(),
		};
		if (input.metadata) {
			meta.custom = input.metadata;
		}
		return meta as Prisma.JsonObject;
	}
}

class QdrantVectorStore implements VectorStore {
	private readonly driver: QdrantHybridSearch;

	constructor(config?: Partial<QdrantConfig>) {
		this.driver = new QdrantHybridSearch({ ...DEFAULT_QDRANT_CONFIG, ...config });
	}

	async init(
		embedDense: (text: string) => Promise<number[]>,
		embedSparse: (text: string) => Promise<SparseVector>,
	): Promise<void> {
		await this.driver.initialize(embedDense, embedSparse);
	}

	async add(chunks: QdrantChunkPayload[]): Promise<void> {
		if (chunks.length === 0) return;
		await this.driver.addChunks(
			chunks.map((chunk) => ({
				id: chunk.id,
				nodeId: chunk.nodeId,
				content: chunk.content,
				vector: chunk.vector,
				sparseVector: chunk.sparseVector,
				metadata: chunk.metadata,
			})),
		);
	}

	async remove(ids: string[]): Promise<void> {
		if (ids.length === 0) return;
		await this.driver.removeChunks(ids);
	}

	async close(): Promise<void> {
		await this.driver.close();
	}
}

class Neo4jKnowledgeGraphAdapter implements KnowledgeGraphAdapter {
	constructor(private readonly driver: SecureNeo4j) {}

	async upsertDocument(payload: {
		nodeId: string;
		documentId: string;
		label: string;
		metadata?: Record<string, unknown>;
	}): Promise<void> {
		await this.driver.upsertNode({
			id: payload.nodeId,
			label: 'Document',
			props: {
				documentId: payload.documentId,
				label: payload.label,
				...payload.metadata,
			},
		});
	}

	async close(): Promise<void> {
		await this.driver.close();
	}
}

function buildNeo4jAdapter(
	options?: GraphRAGIngestServiceOptions['neo4j'],
): KnowledgeGraphAdapter | undefined {
	if (!options?.enabled) return undefined;
	const uri = options.uri ?? process.env.NEO4J_URI;
	const user = options.user ?? process.env.NEO4J_USER;
	const password = options.password ?? process.env.NEO4J_PASSWORD;
	if (!uri || !user || !password) {
		console.warn(
			'EXTERNAL_KG_ENABLED=true but Neo4j credentials are incomplete; disabling adapter',
		);
		return undefined;
	}
	const driver = new SecureNeo4j(uri, user, password);
	return new Neo4jKnowledgeGraphAdapter(driver);
}

interface GraphRAGIngestDependencies {
	persistence: GraphPersistence;
	store: VectorStore;
	neo4j?: KnowledgeGraphAdapter;
	chunkSize: number;
	idFactory: () => string;
	clock: () => number;
}

export class GraphRAGIngestService {
	private readonly deps: GraphRAGIngestDependencies;
	private embedDense?: (text: string) => Promise<number[]>;
	private embedSparse?: (text: string) => Promise<SparseVector>;

	constructor(deps: GraphRAGIngestDependencies) {
		this.deps = deps;
	}

	async initialize(
		embedDense: (text: string) => Promise<number[]>,
		embedSparse: (text: string) => Promise<SparseVector>,
	): Promise<void> {
		this.embedDense = embedDense;
		this.embedSparse = embedSparse;
		await this.deps.store.init(embedDense, embedSparse);
	}

	async ingest(request: GraphRAGIngestRequest): Promise<GraphRAGIngestResult> {
		const parsed = ingestRequestSchema.parse(request);
		this.assertInitialized();
		const document = await this.deps.persistence.ensureDocument(parsed);
		if (document.previousChunkIds.length > 0) {
			await this.deps.store.remove(document.previousChunkIds);
		}
		const drafts = createChunkDrafts(parsed, this.deps.chunkSize, this.deps.clock);
		if (drafts.length === 0) {
			return {
				documentId: parsed.documentId,
				chunks: 0,
				metadata: parsed.metadata,
			};
		}
		const vectorized = await this.buildVectorPayloads(document.nodeId, document.nodeKey, drafts);
		await this.deps.store.add(vectorized.qdrantPayloads);
		await this.deps.persistence.replaceChunkRefs(document.nodeId, vectorized.chunkRefs);
		await this.deps.neo4j?.upsertDocument({
			nodeId: document.nodeId,
			documentId: parsed.documentId,
			label: vectorized.label,
			metadata: parsed.metadata,
		});
		return {
			documentId: parsed.documentId,
			chunks: drafts.length,
			metadata: parsed.metadata,
		};
	}

	async close(): Promise<void> {
		await this.deps.store.close();
		if (this.deps.neo4j) {
			await this.deps.neo4j.close();
		}
	}

	private assertInitialized(): void {
		if (!this.embedDense || !this.embedSparse) {
			throw new Error('GraphRAGIngestService not initialized');
		}
	}

	private async buildVectorPayloads(
		nodeId: string,
		nodeKey: string,
		drafts: ChunkDraft[],
        ): Promise<{
                qdrantPayloads: QdrantChunkPayload[];
                chunkRefs: GraphChunkRefInput[];
                label: string;
        }> {
                this.assertInitialized();
                const embedDense = this.embedDense!;
                const embedSparse = this.embedSparse!;
                const qdrantPayloads: QdrantChunkPayload[] = [];
                const chunkRefs: GraphChunkRefInput[] = [];
                let label = nodeKey;
                for (const draft of drafts) {
                        const id = this.deps.idFactory();
                        const [vector, sparse] = await Promise.all([
                                embedDense(draft.content),
                                embedSparse(draft.content),
                        ]);
			const metadata = {
				path: draft.path,
				nodeType: GraphNodeType.DOC,
				nodeKey,
				...draft.metadata,
			};
			qdrantPayloads.push({
				id,
				nodeId,
				content: draft.content,
				vector,
				sparseVector: sparse,
				metadata,
			});
			if (typeof draft.metadata.title === 'string') {
				label = draft.metadata.title;
			}
			chunkRefs.push({
				nodeId,
				qdrantId: id,
				path: draft.path,
				meta: {
					...draft.metadata,
					snippet: draft.content.slice(0, 240),
				} as Prisma.JsonObject,
			});
		}
		return { qdrantPayloads, chunkRefs, label };
	}
}

function createChunkDrafts(
	request: GraphRAGIngestRequest,
	chunkSize: number,
	clock: () => number,
): ChunkDraft[] {
	const paragraphs = splitIntoParagraphs(request.text);
	const drafts: ChunkDraft[] = [];
	let index = 0;
	for (const paragraph of paragraphs) {
		const slices = sliceText(paragraph, chunkSize);
		for (const slice of slices) {
			const metadata = buildChunkMetadata(request, index, clock());
			drafts.push({
				id: `${request.documentId}#${index}`,
				content: slice,
				path: request.source,
				metadata,
			});
			index += 1;
		}
	}
	if (drafts.length === 0) {
		drafts.push({
			id: `${request.documentId}#0`,
			content: request.text,
			path: request.source,
			metadata: buildChunkMetadata(request, 0, clock()),
		});
	}
	return drafts;
}

function splitIntoParagraphs(text: string): string[] {
	return text
		.split(/\n{2,}/)
		.map((paragraph) => paragraph.trim())
		.filter((paragraph) => paragraph.length > 0);
}

function sliceText(input: string, chunkSize: number): string[] {
	if (input.length <= chunkSize) return [input];
	const slices: string[] = [];
	let start = 0;
	while (start < input.length) {
		const end = Math.min(input.length, start + chunkSize);
		slices.push(input.slice(start, end));
		start = end;
	}
	return slices;
}

function buildChunkMetadata(
	request: GraphRAGIngestRequest,
	order: number,
	timestamp: number,
): Record<string, unknown> {
	const base: Record<string, unknown> = {
		order,
		indexedAt: new Date(timestamp).toISOString(),
	};
	if (request.hierarchical) {
		base.level = order === 0 ? 'document' : 'paragraph';
	}
	if (request.metadata?.title) {
		base.title = request.metadata.title;
	}
	if (request.metadata) {
		base.attributes = request.metadata;
		if (typeof request.metadata.namespace === 'string') {
			base.namespace = request.metadata.namespace;
		}
	}
	return base;
}

export function createGraphRAGIngestService(
	options: GraphRAGIngestServiceOptions = {},
): GraphRAGIngestService {
	const persistence = new PrismaGraphPersistence();
	const store = new QdrantVectorStore(options.qdrant);
	const neo4j = buildNeo4jAdapter(options.neo4j);
	const deps: GraphRAGIngestDependencies = {
		persistence,
		store,
		neo4j,
		chunkSize: Math.max(200, options.chunkSize ?? DEFAULT_CHUNK_SIZE),
		idFactory: options.idFactory ?? DEFAULT_ID_FACTORY,
		clock: options.clock ?? DEFAULT_CLOCK,
	};
	return new GraphRAGIngestService(deps);
}
