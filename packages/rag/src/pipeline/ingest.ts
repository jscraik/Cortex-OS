import { type Chunk, type Embedder, type Store } from '../index';

export async function ingestText(
  source: string,
  text: string,
  E: Embedder,
  S: Store,
): Promise<void> {
  const chunk: Chunk = { id: `${source}#0`, text, source };
  const [emb] = await E.embed([chunk.text]);
  await S.upsert([{ ...chunk, embedding: emb }]);
}
