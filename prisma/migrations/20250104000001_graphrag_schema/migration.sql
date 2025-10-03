-- CreateEnum
CREATE TYPE "GraphNodeType" AS ENUM ('PACKAGE', 'SERVICE', 'AGENT', 'TOOL', 'CONTRACT', 'EVENT', 'DOC', 'ADR', 'FILE', 'API', 'PORT');

-- CreateEnum  
CREATE TYPE "GraphEdgeType" AS ENUM ('IMPORTS', 'IMPLEMENTS_CONTRACT', 'CALLS_TOOL', 'EMITS_EVENT', 'EXPOSES_PORT', 'REFERENCES_DOC', 'DEPENDS_ON', 'DECIDES_WITH');

-- CreateTable
CREATE TABLE "GraphNode" (
    "id" TEXT NOT NULL,
    "type" "GraphNodeType" NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GraphNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GraphEdge" (
    "id" TEXT NOT NULL,
    "type" "GraphEdgeType" NOT NULL,
    "srcId" TEXT NOT NULL,
    "dstId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION DEFAULT 1.0,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GraphEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChunkRef" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "qdrantId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "lineStart" INTEGER,
    "lineEnd" INTEGER,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChunkRef_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GraphNode_type_key_key" ON "GraphNode"("type", "key");

-- CreateIndex
CREATE INDEX "GraphNode_type_idx" ON "GraphNode"("type");

-- CreateIndex
CREATE INDEX "GraphNode_createdAt_idx" ON "GraphNode"("createdAt");

-- CreateIndex
CREATE INDEX "GraphEdge_srcId_type_dstId_idx" ON "GraphEdge"("srcId", "type", "dstId");

-- CreateIndex
CREATE INDEX "GraphEdge_type_idx" ON "GraphEdge"("type");

-- CreateIndex
CREATE INDEX "GraphEdge_srcId_idx" ON "GraphEdge"("srcId");

-- CreateIndex
CREATE INDEX "GraphEdge_dstId_idx" ON "GraphEdge"("dstId");

-- CreateIndex
CREATE INDEX "GraphEdge_createdAt_idx" ON "GraphEdge"("createdAt");

-- CreateIndex
CREATE INDEX "ChunkRef_nodeId_idx" ON "ChunkRef"("nodeId");

-- CreateIndex
CREATE INDEX "ChunkRef_lancedbId_idx" ON "ChunkRef"("lancedbId");

-- CreateIndex
CREATE INDEX "ChunkRef_path_idx" ON "ChunkRef"("path");

-- CreateIndex
CREATE INDEX "ChunkRef_createdAt_idx" ON "ChunkRef"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChunkRef_nodeId_lancedbId_key" ON "ChunkRef"("nodeId", "lancedbId");

-- AddForeignKey
ALTER TABLE "GraphEdge" ADD CONSTRAINT "GraphEdge_srcId_fkey" FOREIGN KEY ("srcId") REFERENCES "GraphNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphEdge" ADD CONSTRAINT "GraphEdge_dstId_fkey" FOREIGN KEY ("dstId") REFERENCES "GraphNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChunkRef" ADD CONSTRAINT "ChunkRef_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "GraphNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- brAInwav GraphRAG Schema Comments
COMMENT ON TABLE "GraphNode" IS 'brAInwav GraphRAG nodes representing code entities (packages, services, contracts, etc.)';
COMMENT ON TABLE "GraphEdge" IS 'brAInwav GraphRAG edges representing relationships between code entities';
COMMENT ON TABLE "ChunkRef" IS 'brAInwav GraphRAG chunk references linking graph nodes to Qdrant vector chunks in existing local_memory_v1 collection';

COMMENT ON COLUMN "GraphNode"."type" IS 'Type of code entity (PACKAGE, SERVICE, CONTRACT, etc.)';
COMMENT ON COLUMN "GraphNode"."key" IS 'Stable unique key for the entity (e.g., packages/agent-toolkit)';
COMMENT ON COLUMN "GraphNode"."label" IS 'Human-readable name for the entity';
COMMENT ON COLUMN "GraphNode"."meta" IS 'Flexible JSON metadata for entity-specific attributes';

COMMENT ON COLUMN "GraphEdge"."type" IS 'Type of relationship (IMPORTS, DEPENDS_ON, IMPLEMENTS_CONTRACT, etc.)';
COMMENT ON COLUMN "GraphEdge"."weight" IS 'Edge strength/confidence score for graph traversal';
COMMENT ON COLUMN "GraphEdge"."meta" IS 'Flexible JSON metadata for relationship-specific attributes';

COMMENT ON COLUMN "ChunkRef"."qdrantId" IS 'Qdrant point ID for the associated vector chunk in existing local_memory_v1 collection';
COMMENT ON COLUMN "ChunkRef"."path" IS 'Source file path for the chunk';
COMMENT ON COLUMN "ChunkRef"."lineStart" IS 'Starting line number of the chunk in source file';
COMMENT ON COLUMN "ChunkRef"."lineEnd" IS 'Ending line number of the chunk in source file';
COMMENT ON COLUMN "ChunkRef"."meta" IS 'Flexible JSON metadata for chunk-specific attributes';
