// Prisma-backed MemoryStore with full vector search and TTL support
import type { Memory } from '../../domain/types.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../../ports/MemoryStore.js';
import { encrypt, decrypt } from '../../lib/crypto.js';

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
    const row = {
      id: m.id,
      kind: m.kind,
      text: m.text ? encrypt(m.text) : null,
      vector: m.vector ? encrypt(JSON.stringify(m.vector)) : null,
      tags: encrypt(JSON.stringify(m.tags)),
      ttl: m.ttl ?? null,
      createdAt: new Date(m.createdAt),
      updatedAt: new Date(m.updatedAt),
      provenance: m.provenance,
      policy: m.policy ?? null,
      embeddingModel: m.embeddingModel ?? null,
      consent: encrypt(JSON.stringify(m.consent)),
      aclAgent: m.acl.agent,
      aclTenant: m.acl.tenant,
      aclPurposes: m.acl.purposes,
    };
    const saved = await this.prisma.memory.upsert({
      where: { id: m.id },
      create: row,
      update: row,
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
      take: q.topK * 5,
      orderBy: { updatedAt: 'desc' },
    });
    return rows
      .map(prismaToDomain)
      .filter((m) => {
        if (!m.text) return false;
        const matchesText = m.text.toLowerCase().includes(q.text.toLowerCase());
        const matchesTags = !q.filterTags || q.filterTags.every((t) => m.tags.includes(t));
        return matchesText && matchesTags;
      })
      .slice(0, q.topK);
  }

  async searchByVector(q: VectorQuery): Promise<Memory[]> {
    // Fetch candidates with vectors and matching tags
    const candidateRows = await this.prisma.memory.findMany({
      where: { vector: { not: null } },
      orderBy: { updatedAt: 'desc' },
      take: q.topK * 10,
    });

    const candidates = candidateRows
      .map(prismaToDomain)
      .filter((memory) => memory.vector) as Memory[];

    // Perform similarity matching in memory
    let scoredCandidates = candidates
      .map((memory) => ({
        memory,
        score: cosineSimilarity(q.vector, memory.vector!),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, q.topK * 2)
      .map((item) => item.memory);

    if (q.filterTags && q.filterTags.length > 0) {
      scoredCandidates = scoredCandidates.filter((m) => q.filterTags!.every((t) => m.tags.includes(t)));
    }

    return scoredCandidates.slice(0, q.topK);
  }

  async purgeExpired(nowISO: string): Promise<number> {
    const now = new Date(nowISO).getTime();

    // Fetch all memories with TTL to check expiration in application code
    const allRows = await this.prisma.memory.findMany({
      where: { ttl: { not: null } },
    });

    const expiredIds: string[] = [];

    for (const row of allRows) {
      try {
        const memory = prismaToDomain(row);
        if (memory.ttl) {
          const created = new Date(memory.createdAt).getTime();
          // Parse ISO duration format
          const match = memory.ttl.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
          if (match) {
            const days = Number(match[1] || 0);
            const hours = Number(match[2] || 0);
            const minutes = Number(match[3] || 0);
            const seconds = Number(match[4] || 0);
            const ttlMs = (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000;

            if (created + ttlMs <= now) {
              expiredIds.push(memory.id);
            }
          }
        }
      } catch (error) {
        // Ignore invalid TTL formats
        console.warn(`Invalid TTL format for memory ${row.id}: ${row.ttl}`);
      }
    }

    // Delete expired memories
    if (expiredIds.length > 0) {
      const result = await this.prisma.memory.deleteMany({
        where: {
          id: { in: expiredIds },
        },
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
    text: row.text ? decrypt(row.text) : undefined,
    vector: row.vector ? JSON.parse(decrypt(row.vector)) : undefined,
    tags: row.tags ? JSON.parse(decrypt(row.tags)) : [],
    ttl: row.ttl ?? undefined,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    provenance: row.provenance,
    policy: row.policy ?? undefined,
    embeddingModel: row.embeddingModel ?? undefined,
    consent: row.consent ? JSON.parse(decrypt(row.consent)) : { granted: false, timestamp: '' },
    acl: {
      agent: row.aclAgent,
      tenant: row.aclTenant,
      purposes: row.aclPurposes || [],
    },
  };
}
