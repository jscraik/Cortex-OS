import { RAGPipeline } from '../src/rag-pipeline.js';
import { memoryStore } from '../src/store/memory.js';

class StubEmbedder {
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => [t.length % 7, 1, 2]);
  }
}

async function main() {
  const pipeline = new RAGPipeline({ embedder: new StubEmbedder() as any, store: memoryStore() });
  await pipeline.ingest([
    { id: 'x', text: 'Example document for minimal usage', source: 'example.txt', updatedAt: Date.now() },
  ]);
  const res = await pipeline.retrieve('minimal usage');
  console.log(JSON.stringify(res, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

