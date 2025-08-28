import prisma from '../../db/src/prisma';
import fs from 'node:fs';
import yaml from 'js-yaml';

export function getSingleDim(): number {
  try {
    const cfg = yaml.load(fs.readFileSync('configs/rag.config.yaml', 'utf8')) as any;
    return Number(cfg?.default_embedding_dim ?? 2560);
  } catch {
    return 2560;
  }
}

export function validateEmbedding(embedding: unknown, dim: number = getSingleDim()): number[] {
  if (!Array.isArray(embedding)) throw new Error('embedding_must_be_array');
  if (embedding.length !== dim)
    throw new Error(`embedding_length_mismatch_${embedding.length}_expected_${dim}`);
  const arr = embedding.map((v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) throw new Error('embedding_non_finite');
    return n;
  });
  return arr as number[];
}

export async function setChunkEmbedding(chunkId: string, embedding: number[]) {
  embedding = validateEmbedding(embedding);
  // Ensure chunk exists
  await prisma.chunk.update({ where: { id: chunkId }, data: {} }).catch(async () => {
    throw new Error(`Chunk not found: ${chunkId}`);
  });
  // Write vector using raw SQL (pgvector); embedding is stored as vector(1536)
  // Example: update "Chunk" set embedding = '[0.1,0.2,...]'::vector where id = $1
  const vec = '[' + embedding.join(',') + ']';
  await prisma.$executeRawUnsafe(
    `update "Chunk" set embedding = ${vec}::vector where id = $1`,
    chunkId,
  );
}

export async function searchByEmbedding(queryEmbedding: number[], k = 5) {
  queryEmbedding = validateEmbedding(queryEmbedding);
  const vec = '[' + queryEmbedding.join(',') + ']';
  // Cosine distance (<=>); lower is better. Return chunkId and score (similarity as 1 - distance)
  const rows = (await prisma.$queryRawUnsafe<any[]>(
    `select id as "chunkId", 1 - (embedding <=> ${vec}::vector) as score
     from "Chunk"
     where embedding is not null
     order by embedding <=> ${vec}::vector asc
     limit ${Number(k)}`,
  )) as { chunkId: string; score: number }[];
  return rows;
}

function spaceTable(dim: number) {
  if (dim === 1024) return 'chunk_embedding_1024';
  if (dim === 2560) return 'chunk_embedding_2560';
  if (dim === 4096) return 'chunk_embedding_4096';
  throw new Error(`Unsupported embedding dimension: ${dim}`);
}

export async function setEmbeddingInSpace(chunkId: string, embedding: number[], dim: number) {
  if (!Array.isArray(embedding) || embedding.length !== dim)
    throw new Error('embedding_length_mismatch');
  const table = spaceTable(dim);
  const vec = '[' + embedding.join(',') + ']';
  await prisma.$executeRawUnsafe(
    `insert into ${table} (chunk_id, embedding) values ($1, ${vec}::vector)
     on conflict (chunk_id) do update set embedding = excluded.embedding`,
    chunkId,
  );
}

export async function searchInSpace(queryEmbedding: number[], dim: number, k = 5) {
  const table = spaceTable(dim);
  const vec = '[' + queryEmbedding.join(',') + ']';
  const rows = (await prisma.$queryRawUnsafe<any[]>(
    `select chunk_id as "chunkId", 1 - (embedding <=> ${vec}::vector) as score
     from ${table}
     order by embedding <=> ${vec}::vector asc
     limit ${Number(k)}`,
  )) as { chunkId: string; score: number }[];
  return rows;
}
