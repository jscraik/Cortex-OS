create extension if not exists vector;
alter table "Chunk" add column if not exists embedding vector(1536);
create index if not exists chunk_embed_ivfflat on "Chunk" using ivfflat (embedding vector_cosine_ops) with (lists = 100);