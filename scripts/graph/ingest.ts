import { randomUUID, createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { GraphNodeType, Prisma } from '@prisma/client';
import { QdrantClient } from '@qdrant/js-client-rest';
import { prisma } from '../../packages/memory-core/src/db/prismaClient.js';

interface IngestionStats {
  nodesCreated: number;
  nodesUpdated: number;
  chunksUpserted: number;
  qdrantPointsUpserted: number;
}

const DOC_GLOB_ROOT = path.resolve(process.cwd(), 'docs');
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION ?? 'local_memory_v1';

async function walkMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkMarkdownFiles(entryPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(entryPath);
    }
  }

  return files;
}

function chunkText(text: string, maxLength = 1200): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = '';

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      continue;
    }
    if ((current + '\n\n' + trimmed).length > maxLength) {
      if (current) {
        chunks.push(current.trim());
      }
      current = trimmed;
    } else {
      current = current ? `${current}\n\n${trimmed}` : trimmed;
    }
  }

  if (current) {
    chunks.push(current.trim());
  }

  return chunks;
}

function hashToken(token: string): number {
  const hash = createHash('sha256').update(token).digest();
  return hash.readUInt32BE(0);
}

function embedDense(text: string, dimension = 128): number[] {
  const vector = new Array<number>(dimension).fill(0);
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    vector[code % dimension] += 1;
  }
  const norm = Math.hypot(...vector);
  return norm === 0 ? vector : vector.map((value) => value / norm);
}

function embedSparse(text: string, bucketSize = 2048): { indices: number[]; values: number[] } {
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const counts = new Map<number, number>();

  for (const token of tokens) {
    const index = hashToken(token) % bucketSize;
    counts.set(index, (counts.get(index) ?? 0) + 1);
  }

  const total = tokens.length || 1;
  const indices: number[] = [];
  const values: number[] = [];

  for (const [index, count] of counts.entries()) {
    indices.push(index);
    values.push(count / total);
  }

  return { indices, values };
}

async function ensureGraphNode(filePath: string, stats: IngestionStats) {
  const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  const nodeType = relativePath.includes('/adr/') ? GraphNodeType.ADR : GraphNodeType.DOC;
  const label = path.basename(filePath);
  const key = relativePath;
  const existing = await prisma.graphNode.findUnique({ where: { type_key: { type: nodeType, key } } });

  if (existing) {
    await prisma.graphNode.update({
      where: { id: existing.id },
      data: {
        label,
        meta: {
          ...(existing.meta as Prisma.JsonObject | null),
          path: relativePath,
          updatedAt: new Date().toISOString(),
        },
      },
    });
    stats.nodesUpdated += 1;
    return existing.id;
  }

  const created = await prisma.graphNode.create({
    data: {
      type: nodeType,
      key,
      label,
      meta: {
        path: relativePath,
        createdAt: new Date().toISOString(),
      },
    },
  });
  stats.nodesCreated += 1;
  return created.id;
}

async function ingestDocument(
  filePath: string,
  qdrant: QdrantClient | null,
  stats: IngestionStats,
): Promise<void> {
  const nodeId = await ensureGraphNode(filePath, stats);
  const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  const content = await readFile(filePath, 'utf8');
  const chunks = chunkText(content);

  await prisma.chunkRef.deleteMany({ where: { nodeId, path: relativePath } });

  const qdrantPoints: Array<{
    id: string;
    vectors: { dense: number[]; sparse: { indices: number[]; values: number[] } };
    payload: Record<string, unknown>;
  }> = [];

  for (const chunk of chunks) {
    const qdrantId = randomUUID();
    const denseVector = embedDense(chunk);
    const sparseVector = embedSparse(chunk);

    if (qdrant) {
      qdrantPoints.push({
        id: qdrantId,
        vectors: { dense: denseVector, sparse: sparseVector },
        payload: {
          path: relativePath,
          node_id: nodeId,
          node_type: relativePath.includes('/adr/') ? GraphNodeType.ADR : GraphNodeType.DOC,
          node_key: relativePath,
          chunk_content: chunk,
        },
      });
    }

    await prisma.chunkRef.create({
      data: {
        nodeId,
        qdrantId,
        path: relativePath,
        meta: {
          snippet: chunk.slice(0, 2000),
          score: 1,
        },
      },
    });
    stats.chunksUpserted += 1;
  }

  if (qdrant && qdrantPoints.length > 0) {
    await qdrant.upsert(QDRANT_COLLECTION, { points: qdrantPoints, wait: true });
    stats.qdrantPointsUpserted += qdrantPoints.length;
  }
}

async function createQdrantClient(): Promise<QdrantClient | null> {
  if (!process.env.QDRANT_URL) {
    console.warn('brAInwav GraphRAG ingestion: QDRANT_URL not set, skipping vector upsert');
    return null;
  }

  const client = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
  });

  try {
    await client.getCollection(QDRANT_COLLECTION);
  } catch {
    console.warn(
      `brAInwav GraphRAG ingestion: collection ${QDRANT_COLLECTION} not found, attempting to create`,
    );
    await client.createCollection(QDRANT_COLLECTION, {
      vectors: {
        dense: { size: 128, distance: 'Cosine' },
      },
      sparse_vectors: {
        sparse: { index_type: 'plain' },
      },
    });
  }

  return client;
}

async function ingestDocs(): Promise<IngestionStats> {
  const stats: IngestionStats = {
    nodesCreated: 0,
    nodesUpdated: 0,
    chunksUpserted: 0,
    qdrantPointsUpserted: 0,
  };

  const exists = await stat(DOC_GLOB_ROOT).catch(() => null);
  if (!exists) {
    console.error('brAInwav GraphRAG ingestion: docs directory not found');
    return stats;
  }

  const files = await walkMarkdownFiles(DOC_GLOB_ROOT);
  const qdrant = await createQdrantClient();

  for (const file of files) {
    await ingestDocument(file, qdrant, stats);
  }

  return stats;
}

async function main(): Promise<void> {
  try {
    const stats = await ingestDocs();
    console.log(
      `brAInwav GraphRAG ingestion complete: ${stats.nodesCreated} nodes created, ${stats.nodesUpdated} nodes updated, ${stats.chunksUpserted} chunks stored, ${stats.qdrantPointsUpserted} Qdrant points upserted`,
    );
  } catch (error) {
    console.error('brAInwav GraphRAG ingestion failed', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
