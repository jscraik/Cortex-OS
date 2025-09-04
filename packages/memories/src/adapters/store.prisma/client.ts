// Prisma-backed MemoryStore with full vector search and TTL support
import { isExpired } from "../../core/ttl.js";
import type { Memory } from "../../domain/types.js";
import type {
	MemoryStore,
	TextQuery,
	VectorQuery,
} from "../../ports/MemoryStore.js";

// Helper function to calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length !== b.length) {
		throw new Error("Vectors must have the same length");
	}

	const dotProduct = a.reduce((sum, _, i) => sum + a[i] * (b[i] || 0), 0);
	const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
	const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

	if (magnitudeA === 0 || magnitudeB === 0) {
		return 0;
	}

	return dotProduct / (magnitudeA * magnitudeB);
}

type PrismaLike = {
	memory: {
		upsert(args: any): Promise<any>;
		findUnique(args: any): Promise<any>;
		delete(args: any): Promise<any>;
		findMany(args: any): Promise<any[]>;
		deleteMany(args: any): Promise<any>;
	};
};

export class PrismaStore implements MemoryStore {
	constructor(private prisma: PrismaLike) {}

	async upsert(m: Memory): Promise<Memory> {
		const saved = await this.prisma.memory.upsert({
			where: { id: m.id },
			create: m,
			update: m,
		});
		return prismaToDomain(saved);
	}

	async get(id: string): Promise<Memory | null> {
		const row = await this.prisma.memory.findUnique({ where: { id } });
		return row ? prismaToDomain(row) : null;
	}

	async delete(id: string): Promise<void> {
		await this.prisma.memory.delete({ where: { id } });
	}

	async searchByText(q: TextQuery): Promise<Memory[]> {
		const rows = await this.prisma.memory.findMany({
			where: {
				AND: [
					q.text ? { text: { contains: q.text, mode: "insensitive" } } : {},
					q.filterTags && q.filterTags.length > 0
						? { tags: { hasEvery: q.filterTags } }
						: {},
				],
			},
			take: q.topK,
			orderBy: { updatedAt: "desc" },
		});
		return rows.map(prismaToDomain);
	}

	async searchByVector(q: VectorQuery): Promise<Memory[]> {
		// Fetch candidates with vectors and matching tags
		const candidateRows = await this.prisma.memory.findMany({
			where: {
				vector: { not: undefined },
				...(q.filterTags && q.filterTags.length > 0
					? { tags: { hasEvery: q.filterTags } }
					: {}),
			},
			orderBy: { updatedAt: "desc" },
			take: q.topK * 10, // Fetch more candidates for similarity matching
		});

		// Convert to domain objects and filter out those without vectors
		const candidates = candidateRows
			.map(prismaToDomain)
			.filter((memory) => memory.vector) as Memory[];

		// Perform similarity matching in memory
		const scoredCandidates = candidates
			.map((memory) => ({
				memory,
				score: cosineSimilarity(q.vector, memory.vector!),
			}))
			.sort((a, b) => b.score - a.score)
			.slice(0, q.topK)
			.map((item) => item.memory);

		return scoredCandidates;
	}

        async purgeExpired(nowISO: string): Promise<number> {
                const allRows = await this.prisma.memory.findMany({
                        where: { ttl: { not: null } },
                });

                const expiredIds: string[] = [];
                for (const row of allRows) {
                        const memory = prismaToDomain(row);
                        if (memory.ttl && isExpired(memory.createdAt, memory.ttl, nowISO)) {
                                expiredIds.push(memory.id);
                        }
                }

                if (expiredIds.length > 0) {
                        const result = await this.prisma.memory.deleteMany({
                                where: { id: { in: expiredIds } },
                        });
                        return result.count;
                }

                return 0;
        }
}

function prismaToDomain(row: any): Memory {
        return {
                id: row.id,
                kind: row.kind,
                text: row.text ?? undefined,
                vector: row.vector ?? undefined,
                tags: row.tags ?? [],
                ttl: row.ttl ?? undefined,
                createdAt: new Date(row.createdAt).toISOString(),
                updatedAt: new Date(row.updatedAt).toISOString(),
                provenance: row.provenance,
                policy: row.policy ?? undefined,
                embeddingModel: row.embeddingModel ?? undefined,
        };
}
