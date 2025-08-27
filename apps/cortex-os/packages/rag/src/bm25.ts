import prisma from "../../db/src/prisma";

// Enable text search with pg_trgm/tsvector in SQL; see db/textsearch.sql
export async function bm25Search(q: string, k = 5) {
  // Use to_tsvector + ts_rank_cd for a BM25-like ranking
  const rows = (await prisma.$queryRawUnsafe<any[]>(
    `select c.id as "chunkId",
            ts_rank_cd(to_tsvector('simple', c.text), plainto_tsquery('simple', $1)) as score
     from "Chunk" c
     where to_tsvector('simple', c.text) @@ plainto_tsquery('simple', $1)
     order by score desc
     limit ${Number(k)}`,
    q,
  )) as { chunkId: string; score: number }[];
  return rows;
}
