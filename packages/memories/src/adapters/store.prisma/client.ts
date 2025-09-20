// Prisma-backed MemoryStore with full vector search and TTL support

import { decayEnabled, decayFactor, getHalfLifeMs } from '../../core/decay.js';
import { isExpired } from '../../core/ttl.js';
import type { Memory } from '../../domain/types.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../../ports/MemoryStore.js';

// Helper function to calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length !== b.length) {
		throw new Error('Vectors must have the same length');
	}

	const dotProduct = a.reduce((sum, _, i) => sum + a[i] * (b[i] || 0), 0);
	const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
	const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

	if (magnitudeA === 0 || magnitudeB === 0) {
		return 0;
	}

	return dotProduct / (magnitudeA * magnitudeB);
}

export type PrismaMemoryModel = {
	upsert(args: { where: { id: string }; create: Memory; update: Memory }): Promise<PrismaRow>;
	findUnique(args: { where: { id: string } }): Promise<PrismaRow | null>;
	delete(args: { where: { id: string } }): Promise<unknown>;
	findMany(args: unknown): Promise<PrismaRow[]>;
	deleteMany(args: { where: { id: { in: string[] } } }): Promise<{ count: number }>;
};

export type PrismaLike = {
	memory: PrismaMemoryModel;
};

// Local helper to mark variables as used
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _use = (..._args: unknown[]): void => { };

export class PrismaStore implements MemoryStore {
	constructor(private readonly prisma: PrismaLike) { }

	async upsert(m: Memory, _namespace = 'default'): Promise<Memory> {
		_use(_namespace);
		const saved = await this.prisma.memory.upsert({
			where: { id: m.id },
			create: m,
			update: m,
		});
		return prismaToDomain(saved);
	}

	async get(id: string, _namespace = 'default'): Promise<Memory | null> {
		_use(_namespace);
		const row = await this.prisma.memory.findUnique({ where: { id } });
		return row ? prismaToDomain(row) : null;
	}

	async delete(id: string, _namespace = 'default'): Promise<void> {
		_use(_namespace);
		await this.prisma.memory.delete({ where: { id } });
	}

	async searchByText(q: TextQuery, _namespace = 'default'): Promise<Memory[]> {
		_use(_namespace);
		const rows = await this.prisma.memory.findMany({
			where: {
				AND: [
					q.text ? { text: { contains: q.text, mode: 'insensitive' } } : {},
					q.filterTags && q.filterTags.length > 0 ? { tags: { hasEvery: q.filterTags } } : {},
				],
			},
			take: (q.topK ?? 10) * 10,
			orderBy: { updatedAt: 'desc' },
		});
		let items = rows.map(prismaToDomain);
		if (decayEnabled()) {
			const half = getHalfLifeMs();
			const now = new Date().toISOString();
			items = items
				.map((m) => ({ m, s: decayFactor(m.createdAt, now, half) }))
				.sort((a, b) => b.s - a.s)
				.map((x) => x.m);
		}
		return items.slice(0, q.topK ?? 10);
	}

	async searchByVector(q: VectorQuery, _namespace = 'default'): Promise<(Memory & { score: number })[]> {
		_use(_namespace);
		// Fetch candidates with vectors and matching tags
		const candidateRows = await this.prisma.memory.findMany({
			where: {
				vector: { not: undefined },
				...(q.filterTags && q.filterTags.length > 0 ? { tags: { hasEvery: q.filterTags } } : {}),
			},
			orderBy: { updatedAt: 'desc' },
			take: (q.topK ?? 10) * 10, // Fetch more candidates for similarity matching
		});

		// Convert to domain objects and filter out those without vectors
		const candidates = candidateRows
			.map(prismaToDomain)
			.filter((memory): memory is Memory & { vector: number[] } => Array.isArray(memory.vector));

		// Perform similarity matching in memory
		const queryVec = q.vector ?? q.embedding ?? [];
		let scoredCandidates = candidates.map((memory) => ({
			memory,
			score: cosineSimilarity(queryVec, memory.vector as number[]),
		}));
		if (decayEnabled()) {
			const half = getHalfLifeMs();
			const now = new Date().toISOString();
			scoredCandidates = scoredCandidates.map((it) => ({
				...it,
				score: it.score * decayFactor(it.memory.createdAt, now, half),
			}));
		}
		const topK = q.topK ?? q.limit ?? 10;
		scoredCandidates.sort((a, b) => b.score - a.score);
		return scoredCandidates.slice(0, topK).map((item) => ({ ...item.memory, score: item.score }));
	}

	async purgeExpired(nowISO: string, _namespace?: string): Promise<number> {
		_use(_namespace);
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

type PrismaRow = {
	id: string;
	kind: string;
	text?: string | null;
	vector?: number[] | null;
	tags?: string[] | null;
	ttl?: string | null;
	createdAt: string | Date;
	updatedAt: string | Date;
	provenance?: {
		source?: 'user' | 'agent' | 'system';
		actor?: string;
		evidence?: { uri: string; range?: [number, number] }[];
		hash?: string;
	} | null;
	policy?: Record<string, unknown> | null;
	embeddingModel?: string | null;
};

const ALLOWED_KINDS = ['note', 'event', 'artifact', 'embedding'] as const;
type AllowedKind = (typeof ALLOWED_KINDS)[number];
function isAllowedKind(v: unknown): v is AllowedKind {
	return typeof v === 'string' && (ALLOWED_KINDS as readonly string[]).includes(v);
}

function prismaToDomain(row: PrismaRow): Memory {
	const provenance = row.provenance
		? {
			source: row.provenance.source ?? 'system',
			actor: row.provenance.actor,
			evidence: row.provenance.evidence,
			hash: row.provenance.hash,
		}
		: { source: 'system' as const };

	return {
		id: row.id,
		kind: isAllowedKind(row.kind) ? row.kind : 'note',
		text: row.text ?? undefined,
		vector: row.vector ?? undefined,
		tags: row.tags ?? [],
		ttl: row.ttl ?? undefined,
		createdAt: new Date(row.createdAt).toISOString(),
		updatedAt: new Date(row.updatedAt).toISOString(),
		provenance,
		policy: (row.policy ?? undefined) as Memory['policy'] | undefined,
		embeddingModel: row.embeddingModel ?? undefined,
	};
}
