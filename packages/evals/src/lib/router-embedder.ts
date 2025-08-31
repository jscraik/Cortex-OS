import { createModelRouter } from '@cortex-os/model-gateway';

// Minimal Router interface to avoid cross-domain type imports
interface Router {
  initialize(): Promise<void>;
  generateEmbeddings(request: { texts: string[] }): Promise<{ embeddings: number[][] }>;
}

export interface Embedder {
  embed(texts: string[]): Promise<number[][]>;
}

export async function createRouterEmbedder(router?: Router): Promise<Embedder> {
  const r = router ?? createModelRouter();
  await r.initialize();
  return {
    async embed(texts: string[]): Promise<number[][]> {
      const { embeddings } = await r.generateEmbeddings({ texts });
      return embeddings;
    },
  };
}
