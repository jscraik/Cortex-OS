import { describe, expect, it, vi } from 'vitest';
import { type RagDeps, RagOptions, ragSuite, runRagSuite } from './suites/rag.js';

const embedder = {
	embed: async (texts: string[]) => texts.map((t) => [t.length]),
};

const dataset = {
	docs: [{ id: '1', text: 'doc' }],
	queries: [{ q: 'doc', relevantDocIds: ['1'] }],
};

function baseDeps(): RagDeps {
	return {
		createEmbedder: vi.fn().mockResolvedValue(embedder),
		createMemoryStore: vi.fn().mockReturnValue({}),
		prepareStore: vi.fn(),
		runRetrievalEval: vi.fn().mockResolvedValue({
			k: 1,
			ndcg: 1,
			recall: 1,
			precision: 1,
			totalQueries: 1,
		}),
	};
}

describe('runRagSuite', () => {
	it('passes when metrics meet thresholds', async () => {
		const deps = baseDeps();
		const res = await runRagSuite(
			'rag',
			RagOptions.parse({
				dataset,
				k: 1,
				thresholds: { ndcg: 0, recall: 0, precision: 0 },
			}),
			deps,
		);
		expect(res.pass).toBe(true);
	});

	it('fails when metrics below thresholds', async () => {
		const deps = baseDeps();
		vi.mocked(deps.runRetrievalEval).mockResolvedValueOnce({
			k: 1,
			ndcg: 0,
			recall: 0,
			precision: 0,
			totalQueries: 1,
		} as any);
		const res = await runRagSuite(
			'rag',
			RagOptions.parse({
				dataset,
				k: 1,
				thresholds: { ndcg: 0.5, recall: 0.5, precision: 0.5 },
			}),
			deps,
		);
		expect(res.pass).toBe(false);
	});

	it('uses deps.createEmbedder when building embedder', async () => {
		const deps = baseDeps();
		await runRagSuite('rag', RagOptions.parse({ dataset, k: 1 }), deps);
		expect(deps.createEmbedder).toHaveBeenCalled();
	});

	it('ragSuite.run delegates to runRagSuite', async () => {
		const deps = baseDeps();
		const res = await ragSuite.run('rag', RagOptions.parse({ dataset, k: 1 }), deps);
		expect(res.pass).toBe(true);
	});
});
