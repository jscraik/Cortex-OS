import type { Embeddings } from '@cortex-os/rag-embed/provider';
import type { Store } from '@cortex-os/rag-store/types';
import type { QueryReq, QueryHit } from '@cortex-os/rag-contracts/query';

export async function query(req: QueryReq, embedder: Embeddings, store: Store): Promise<QueryHit[]> {
  const [qvec] = await embedder.embed([req.q]);
  const hits = await store.search(qvec, req.topK, req.filters);
  return hits.map((h) => ({ chunkId: h.chunk.id, docId: h.chunk.docId, score: h.score, text: h.chunk.text, uri: (h.chunk as any).meta.uri, meta: (h.chunk as any).meta }));
}
