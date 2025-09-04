import { prepareStore, runRetrievalEval } from "@cortex-os/rag/eval/harness";
import { memoryStore } from "@cortex-os/rag/store/memory";
import { z } from "zod";
import { createRouterEmbedder } from "../lib/router-embedder";
import { GoldenDatasetSchema, type GoldenDataset, type SuiteOutcome } from "../types";
import type { Embedder } from "@cortex-os/rag/lib";

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
        embedder?: Embedder,
): Promise<SuiteOutcome> {
        const { dataset, k, thresholds } = opts;
        const E = embedder ?? (await createRouterEmbedder());
        const S = memoryStore();

        await prepareStore(dataset, E, S);
        const summary = await runRetrievalEval(dataset, E, S, { k });

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
        name: "rag",
        optionsSchema: RagOptions,
        run: (name: string, opts: RagOptions) => runRagSuite(name, opts),
};

