import type { SuiteOutcome } from '../types';
import { z } from 'zod';

// Local import from the RAG library (pure, dependency-free eval utilities)
import { prepareStore, runRetrievalEval } from '@cortex-os/rag/eval/harness';
import { memoryStore } from '@cortex-os/rag/store/memory';

const RagOptions = z.object({
  dataset: z.any(), // JSON parsed dataset; validated by harness at usage time
  k: z.number().int().positive().default(2),
  thresholds: z
    .object({ ndcg: z.number().min(0).max(1), recall: z.number().min(0).max(1), precision: z.number().min(0).max(1) })
    .partial()
    .default({}),
});

export async function runRagSuite(name: string, opts: unknown): Promise<SuiteOutcome> {
  const parsed = RagOptions.parse(opts ?? {});
  const E = { embed: async (texts: string[]) => texts.map((t) => [t.length, 0, 0]) } as any;
  const S = memoryStore();

  await prepareStore(parsed.dataset, E, S as any);
  const summary = await runRetrievalEval(parsed.dataset, E, S as any, { k: parsed.k });

  const thresholds = {
    ndcg: parsed.thresholds.ndcg ?? 0.8,
    recall: parsed.thresholds.recall ?? 0.8,
    precision: parsed.thresholds.precision ?? 0.5,
  };

  const pass =
    summary.ndcg >= thresholds.ndcg &&
    summary.recall >= thresholds.recall &&
    summary.precision >= thresholds.precision;

  return {
    name,
    pass,
    metrics: { ndcg: summary.ndcg, recall: summary.recall, precision: summary.precision },
    notes: [
      `k=${summary.k} queries=${summary.totalQueries}`,
      `thresholds ndcg=${thresholds.ndcg} recall=${thresholds.recall} precision=${thresholds.precision}`,
    ],
  };
}

