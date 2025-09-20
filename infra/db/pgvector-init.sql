-- Enable pgvector extension (safe if already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table if it doesn't exist (schema matches PgVectorStore)
CREATE TABLE IF NOT EXISTS rag_chunks (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  source TEXT,
  updated_at BIGINT,
  metadata JSONB,
  search_vector tsvector,
  embedding_384 vector(384),
  embedding_768 vector(768),
  embedding_1024 vector(1024),
  embedding_1536 vector(1536),
  embedding_3072 vector(3072)
);

-- Indexes
CREATE INDEX IF NOT EXISTS rag_chunks_sv_idx ON rag_chunks USING GIN (search_vector);
-- ivfflat index requires planner stats on populated table; still safe to create
CREATE INDEX IF NOT EXISTS rag_chunks_emb_768_idx ON rag_chunks USING ivfflat (embedding_768);
