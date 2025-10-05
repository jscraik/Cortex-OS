-- Align GraphRAG chunk references with Qdrant naming
-- Ensures unique indexes and columns match prisma schema

ALTER TABLE "ChunkRef"
        RENAME COLUMN "lancedbId" TO "qdrantId";

ALTER INDEX IF EXISTS "ChunkRef_nodeId_lancedbId_key"
        RENAME TO "ChunkRef_nodeId_qdrantId_key";

ALTER INDEX IF EXISTS "ChunkRef_lancedbId_idx"
        RENAME TO "ChunkRef_qdrantId_idx";

COMMENT ON COLUMN "ChunkRef"."qdrantId" IS 'Qdrant point ID for the associated vector chunk in existing local_memory_v1 collection';
