import { query as doQuery } from '../pipeline/query';
import { ingestText } from '../pipeline/ingest';
import { ndcgAtK, precisionAtK, recallAtK } from './metrics';
export async function prepareStore(dataset, E, S) {
    for (const d of dataset.docs) {
        // Use stable mem:// URI so doc.id is traceable for matching.
        await ingestText(`mem://${d.id}`, d.text, E, S);
    }
}
export async function runRetrievalEval(dataset, E, S, { k }) {
    const perQuery = [];
    for (const gq of dataset.queries) {
        const hits = await doQuery({ q: gq.q, topK: k }, E, S);
        const binary = hits.map((h) => gq.relevantDocIds.some((id) => (h.id ?? h.uri ?? '').includes(id)) ? 1 : 0);
        const totalRelevant = gq.relevantDocIds.length;
        const ndcg = ndcgAtK(binary, k, totalRelevant);
        const recall = recallAtK(binary, k, totalRelevant);
        const precision = precisionAtK(binary, k);
        perQuery.push({ q: gq.q, ndcg, recall, precision });
    }
    const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
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
