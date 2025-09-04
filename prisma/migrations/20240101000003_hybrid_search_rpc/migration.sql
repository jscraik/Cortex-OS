-- Create hybrid_search function
create or replace function hybrid_search (
  query_text text,
  query_embedding vector(1536),
  match_limit int
)
returns table (
  chunk_id uuid,
  document_id uuid,
  document_title text,
  chunk_text text,
  similarity float,
  bm25_score float,
  hybrid_score float
)
language sql
as $$
  with vector_matches as (
    select
      c.id as chunk_id,
      c."documentId" as document_id,
      d.title as document_title,
      c.text as chunk_text,
      (c.embedding <=> query_embedding) as similarity
    from "Chunk" c
    join "Document" d on c."documentId" = d.id
    where c.embedding is not null
    order by c.embedding <=> query_embedding
    limit match_limit * 2
  ),
  text_matches as (
    select
      c.id as chunk_id,
      ts_rank_cd(to_tsvector('english', c.text), plainto_tsquery('english', query_text)) as bm25_score
    from "Chunk" c
    where to_tsvector('english', c.text) @@ plainto_tsquery('english', query_text)
    order by bm25_score desc
    limit match_limit * 2
  )
  select
    vm.chunk_id,
    vm.document_id,
    vm.document_title,
    vm.chunk_text,
    vm.similarity,
    coalesce(tm.bm25_score, 0) as bm25_score,
    (0.5 * (1 - vm.similarity) + 0.5 * coalesce(tm.bm25_score, 0)) as hybrid_score
  from vector_matches vm
  left join text_matches tm on vm.chunk_id = tm.chunk_id
  order by hybrid_score desc
  limit match_limit;
$$;
