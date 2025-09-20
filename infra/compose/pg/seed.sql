CREATE EXTENSION IF NOT EXISTS vector;

-- Base table for RAG chunks (matches PgVectorStore expectations)
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
-- NOTE: The IVFFLAT index should match the dimension used in tests; default to 768
DO $$ BEGIN
  EXECUTE 'CREATE INDEX IF NOT EXISTS rag_chunks_emb_768_idx ON rag_chunks USING ivfflat (embedding_768)';
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors if extension not ready, tests can create on demand
  RAISE NOTICE 'Index creation skipped: %', SQLERRM;
END $$;
