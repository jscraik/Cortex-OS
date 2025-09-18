import type { Embeddings } from '@cortex-os/rag-embed/provider';
import { ingestText } from '@cortex-os/rag-pipeline/ingest';
import { query } from '@cortex-os/rag-pipeline/query';
import { memoryStore } from '@cortex-os/rag-store/memory';
import { expect, it } from 'vitest';

class StaticEmbedder implements Embeddings {
	model = 'dummy-embedding-1.0';
	dim = 3;
	async embed(texts: string[]) {
		return texts.map((t) => [t.length, 0, 0]);
	}
}

function dcg(rel: number[]) {
	return rel.reduce((s, r, i) => s + (2 ** r - 1) / Math.log2(i + 2), 0);
}
function ndcg(rels: number[], ideal: number[]) {
	return dcg(rels) / dcg(ideal);
}

it('evaluates retrieval on golden set', async () => {
	const E = new StaticEmbedder();
	const S = memoryStore();
	await ingestText('mem://doc1', 'Paris is the capital of France.', E, S);
	await ingestText('mem://doc2', 'Berlin is the capital of Germany.', E, S);
	const hits = await query({ q: 'capital of France', topK: 2 } as any, E, S);
	const relevances = hits.map((h) => (h.text.toLowerCase().includes('paris') ? 1 : 0));
	const ideal = [1, 0];
	const recall = relevances.filter((r) => r > 0).length / 1;
	const score = ndcg(relevances, ideal);
	expect(recall).toBe(1);
	expect(score).toBe(1);
});
