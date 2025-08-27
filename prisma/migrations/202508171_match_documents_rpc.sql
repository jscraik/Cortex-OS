-- Create vector extension
create extension if not exists vector;

-- Create match_documents function
create or replace function match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  chunk_id uuid,
  document_id uuid,
  document_title text,
  chunk_text text,
  similarity float
)
language sql
as $$
  select
    c.id as chunk_id,
    c."documentId" as document_id,
    d.title as document_title,
    c.text as chunk_text,
    (c.embedding <=> query_embedding) as similarity
  from "Chunk" c
  join "Document" d on c."documentId" = d.id
  where c.embedding is not null 
    and (c.embedding <=> query_embedding) < match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;