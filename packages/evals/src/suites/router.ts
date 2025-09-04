import { createModelRouter } from "@cortex-os/model-gateway";
import { z } from "zod";
import type { SuiteOutcome } from "../types";

interface Router {
        initialize(): Promise<void>;
        generateEmbedding(request: { text: string }): Promise<{ embedding: number[] }>;
        generateChat(request: {
                messages: { role: string; content: string }[];
        }): Promise<{ content: string }>;
        rerank(request: { query: string; documents: string[] }): Promise<{ scores: number[] }>;
        hasAvailableModels(capability: "embedding" | "chat" | "reranking"): boolean;
}

export const RouterOptions = z.object({
        thresholds: z
                .object({
                        embedLatencyMs: z.number().positive().default(2000),
                        chatLatencyMs: z.number().positive().default(2000),
                        rerankLatencyMs: z.number().positive().default(2000),
                })
                .partial()
                .default({}),
});

export type RouterOptions = z.infer<typeof RouterOptions>;

export async function runRouterSuite(
        name: string,
        opts: RouterOptions,
        router?: Router,
): Promise<SuiteOutcome> {
        const thresholds = {
                embedLatencyMs: opts.thresholds.embedLatencyMs ?? 2000,
                chatLatencyMs: opts.thresholds.chatLatencyMs ?? 2000,
                rerankLatencyMs: opts.thresholds.rerankLatencyMs ?? 2000,
        };

        const r = router ?? createModelRouter();
        await r.initialize();

        const t0 = Date.now();
        const emb = await r.generateEmbedding({ text: "hi" });
        const embedLatencyMs = Date.now() - t0;

        const t1 = Date.now();
        const chat = await r.generateChat({
                messages: [{ role: "user", content: "ping" }],
        });
        const chatLatencyMs = Date.now() - t1;

        const t2 = Date.now();
        const rerank = await r.rerank({ query: "q", documents: ["a", "b", "c"] });
        const rerankLatencyMs = Date.now() - t2;

        const metrics = {
                hasEmbedding: r.hasAvailableModels("embedding") ? 1 : 0,
                hasChat: r.hasAvailableModels("chat") ? 1 : 0,
                hasRerank: r.hasAvailableModels("reranking") ? 1 : 0,
                embedDim: emb.embedding.length,
                chatTokens: chat.content.trim().split(/\s+/).filter(Boolean).length,
                rerankScores: rerank.scores.length,
                embedLatencyMs,
                chatLatencyMs,
                rerankLatencyMs,
        };

        const pass = Boolean(
                metrics.hasEmbedding &&
                metrics.hasChat &&
                metrics.hasRerank &&
                metrics.chatTokens > 0 &&
                metrics.embedLatencyMs <= thresholds.embedLatencyMs &&
                metrics.chatLatencyMs <= thresholds.chatLatencyMs &&
                metrics.rerankLatencyMs <= thresholds.rerankLatencyMs,
        );

        return {
                name,
                pass,
                metrics,
                notes: [
                        `latency embed=${embedLatencyMs}ms chat=${chatLatencyMs}ms rerank=${rerankLatencyMs}ms`,
                        `thresholds embed=${thresholds.embedLatencyMs} chat=${thresholds.chatLatencyMs} rerank=${thresholds.rerankLatencyMs}`,
                ],
        };
}

export const routerSuite = {
        name: "router",
        optionsSchema: RouterOptions,
        run: (name: string, opts: RouterOptions) => runRouterSuite(name, opts),
};

