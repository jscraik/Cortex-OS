import { z } from 'zod';
import {
	type GoldenDataset,
	GoldenDatasetSchema,
	type SuiteOutcome,
} from '../types';

export interface Embedder {
	embed(texts: string[]): Promise<number[][]>;
}

export interface RagDeps {
	createEmbedder(): Promise<Embedder>;
	createMemoryStore(): unknown;
	prepareStore(
		dataset: GoldenDataset,
		embedder: Embedder,
		store: unknown,
	): Promise<void>;
	runRetrievalEval(
		dataset: GoldenDataset,
		embedder: Embedder,
		store: unknown,
		opts: { k: number },
	): Promise<{
		k: number;
		ndcg: number;
		recall: number;
		precision: number;
		totalQueries: number;
	}>;
}

export const RagOptions = z.object({
	dataset: GoldenDatasetSchema,
	k: z.number().int().positive().default(2),
	thresholds: z
		.object({
			ndcg: z.number().min(0).max(1),
			recall: z.number().min(0).max(1),
			precision: z.number().min(0).max(1),
		})
		.partial()
		.default({}),
});

export type RagOptions = z.infer<typeof RagOptions>;

export async function runRagSuite(
	name: string,
	opts: RagOptions,
	deps: RagDeps,
): Promise<SuiteOutcome> {
	const { dataset, k, thresholds } = opts;
	const E = await deps.createEmbedder();
	const S = deps.createMemoryStore();

	await deps.prepareStore(dataset, E, S);
	const summary = await deps.runRetrievalEval(dataset, E, S, { k });

	const th = {
		ndcg: thresholds.ndcg ?? 0.8,
		recall: thresholds.recall ?? 0.8,
		precision: thresholds.precision ?? 0.5,
	};

	const pass =
		summary.ndcg >= th.ndcg &&
		summary.recall >= th.recall &&
		summary.precision >= th.precision;

	return {
		name,
		pass,
		metrics: {
			ndcg: summary.ndcg,
			recall: summary.recall,
			precision: summary.precision,
		},
		notes: [
			`k=${summary.k} queries=${summary.totalQueries}`,
			`thresholds ndcg=${th.ndcg} recall=${th.recall} precision=${th.precision}`,
		],
	};
}

export const ragSuite = {
	name: 'rag',
	optionsSchema: RagOptions,
	run: (name: string, opts: RagOptions, deps: RagDeps) =>
		runRagSuite(name, opts, deps),
};
