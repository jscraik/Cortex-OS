import type { Subgraph, TenantCtx, VectorHit } from '@cortex-os/memory';
import { MemoryService } from '@cortex-os/memory';

export type BuildContextInput = {
  ctx: TenantCtx;
  query: string;
  topK?: number;
  kgDepth?: number;
  tokenBudget?: number; // naive char budget
};

export class RagPipeline {
  constructor(private memory: MemoryService) {}

  static from(memory: MemoryService) {
    return new RagPipeline(memory);
  }

  async buildPromptContext(input: BuildContextInput) {
    const { ctx, query } = input;
    const qvec = await this.memory.embedOne(query);
    const hits = await this.memory.search(ctx, { queryEmbedding: qvec, topK: input.topK ?? 6 });
    const augmented = await Promise.all(hits.map((h) => this.augmentWithKG(h, input.kgDepth ?? 2)));
    return this.fuse(augmented, input.tokenBudget ?? 6000);
  }

  private async augmentWithKG(
    hit: VectorHit,
    depth: number,
  ): Promise<{ hit: VectorHit; kg?: Subgraph }> {
    const nodeMeta = hit.metadata as Record<string, unknown> | undefined;
    const nodeId = (nodeMeta?.nodeId as string | undefined) ?? undefined;
    if (!nodeId) return { hit };
    const kg = await this.memory.getNeighborhood(nodeId, depth);
    return { hit, kg };
  }

  private fuse(items: { hit: VectorHit; kg?: Subgraph }[], budget: number) {
    const parts: string[] = [];
    const cites: { id: string; uri?: string; score: number }[] = [];
    for (const it of items) {
      parts.push(`# Chunk:${it.hit.id} score=${it.hit.score.toFixed(3)}`, it.hit.text);
      if (it.kg) {
        parts.push(`## KG neighbors (${it.kg.nodes.length} nodes, ${it.kg.rels.length} rels)`);
        parts.push(JSON.stringify(it.kg));
      }
      cites.push({ id: it.hit.id, uri: it.hit.sourceURI, score: it.hit.score });
    }
    let acc = '';
    for (const p of parts) {
      if (acc.length + p.length + 2 > budget) break;
      acc += p + '\n\n';
    }
    return { context: acc.trim(), citations: cites };
  }
}
