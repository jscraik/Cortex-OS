import { normalize } from '@cortex-os/rag-ingest/clean';
import { byChars } from '@cortex-os/rag-ingest/chunk';
import type { Embeddings } from '@cortex-os/rag-embed/provider';
import type { Store } from '@cortex-os/rag-store/types';
import { randomUUID } from 'node:crypto';

export async function ingestText(uri: string, text: string, embedder: Embeddings, store: Store) {
  const chunks = byChars(normalize(text)).map((t, i) => ({ id: randomUUID(), docId: uri, ord: i, text: t, tokens: 0, meta: { uri } }));
  const vectors = await embedder.embed(chunks.map((c) => c.text));
  const embs = chunks.map((c, i) => ({ chunkId: c.id, dim: embedder.dim, vec: vectors[i] }));
  await store.upsertDocs([{ doc: { id: uri, uri }, chunks, embs }]);
}
