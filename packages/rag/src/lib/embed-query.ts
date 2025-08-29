import { Qwen3Embedder } from '../embed/qwen3';

export async function embedQuery(embedder: Qwen3Embedder, query: string) {
  const [embedding] = await embedder.embed([query]);
  return embedding;
}
