import type { Embedder, Store } from '../index';
import { query as doQuery } from '../pipeline/query';
import { ndcgAtK, precisionAtK, recallAtK, type EvalSummary, type QueryEval } from './metrics';

export interface GoldenItem {
  id: string;
  text: string;
}

export interface GoldenQuery {
  q: string;
  relevantDocIds: string[]; // set of relevant doc ids
}

export interface GoldenDataset {
  name?: string;
  docs: GoldenItem[];
  queries: GoldenQuery[];
}

export interface RunEvalOptions {
  k: number;
}

export async function prepareStore(dataset: GoldenDataset, E: Embedder, S: Store) {
  // Reuse ingestText lightly to avoid bringing extra deps here. We inline minimal ingestion.
  // But since packages/rag/src/pipeline/ingest exports ingestText, prefer it if available.
  const { ingestText } = await import('../pipeline/ingest');
  for (const d of dataset.docs) {
    // Use stable mem:// URI so doc.id is traceable for matching.
    await ingestText(`mem://${d.id}`, d.text, E as any, S as any);
  }
}

export async function runRetrievalEval(
  dataset: GoldenDataset,
  E: Embedder,
  S: Store,
  { k }: RunEvalOptions,
): Promise<EvalSummary> {
  const perQuery: QueryEval[] = [];
  for (const gq of dataset.queries) {
    const hits = await doQuery({ q: gq.q, topK: k } as any, E as any, S as any);
    const binary = hits.map((h: any) =>
      gq.relevantDocIds.some((id) => (h.id ?? h.uri ?? '').includes(id)) ? 1 : 0,
    );
    const totalRelevant = gq.relevantDocIds.length;
    const ndcg = ndcgAtK(binary, k, totalRelevant);
    const recall = recallAtK(binary, k, totalRelevant);
    const precision = precisionAtK(binary, k);
    perQuery.push({ q: gq.q, ndcg, recall, precision });
  }

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const ndcgAvg = avg(perQuery.map((p) => p.ndcg));
  const precAvg = avg(perQuery.map((p) => p.precision));
  // Recall average only across queries with >0 relevant to avoid divide-by-zero bias
  const recallCandidates = dataset.queries
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => q.relevantDocIds.length > 0)
    .map(({ i }) => perQuery[i].recall);
  const recallAvg = avg(recallCandidates);

  return {
    k,
    ndcg: ndcgAvg,
    recall: recallAvg,
    precision: precAvg,
    totalQueries: dataset.queries.length,
    dataset: dataset.name,
    perQuery,
  };
}
