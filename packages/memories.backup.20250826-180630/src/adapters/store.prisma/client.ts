// Prisma-backed MemoryStore. Accepts a Prisma client-like instance to avoid
// hard dependency on @prisma/client at build time.
import type { Memory } from "../../domain/types.js";
import type { MemoryStore, TextQuery, VectorQuery } from "../../ports/MemoryStore.js";

type PrismaLike = {
  memory: {
    upsert(args: any): Promise<any>;
    findUnique(args: any): Promise<any>;
    delete(args: any): Promise<any>;
    findMany(args: any): Promise<any[]>;
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
          q.filterTags && q.filterTags.length > 0 ? { tags: { hasEvery: q.filterTags } } : {},
        ],
      },
      take: q.topK,
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(prismaToDomain);
  }

  async searchByVector(q: VectorQuery): Promise<Memory[]> {
    const rows = await this.prisma.memory.findMany({ take: q.topK, orderBy: { updatedAt: "desc" } });
    return rows.map(prismaToDomain);
  }

  async purgeExpired(_nowISO: string): Promise<number> { return 0; }
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

