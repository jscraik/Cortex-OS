import { createModelRouter } from "@cortex-os/model-gateway";
import type { SuiteOutcome } from "../types";

interface Router {
	initialize(): Promise<void>;
	generateEmbedding(request: {
		text: string;
	}): Promise<{ embedding: number[] }>;
	generateChat(request: {
		messages: { role: string; content: string }[];
	}): Promise<{ content: string }>;
	rerank(request: {
		query: string;
		documents: string[];
	}): Promise<{ scores: number[] }>;
	hasAvailableModels(capability: "embedding" | "chat" | "reranking"): boolean;
}

export async function runRouterSuite(
	name: string,
	router?: Router,
): Promise<SuiteOutcome> {
	const r = router ?? createModelRouter();
	await r.initialize();

	const emb = await r.generateEmbedding({ text: "hi" });
	const chat = await r.generateChat({
		messages: [{ role: "user", content: "ping" }],
	});
	const rerank = await r.rerank({ query: "q", documents: ["a", "b", "c"] });

	const metrics = {
		hasEmbedding: r.hasAvailableModels("embedding") ? 1 : 0,
		hasChat: r.hasAvailableModels("chat") ? 1 : 0,
		hasRerank: r.hasAvailableModels("reranking") ? 1 : 0,
		embedDim: emb.embedding.length,
		chatNonEmpty: chat.content.length > 0 ? 1 : 0,
		rerankScores: rerank.scores.length,
	} as Record<string, number>;

	const pass = !!(
		metrics.hasEmbedding &&
		metrics.hasChat &&
		metrics.hasRerank &&
		metrics.chatNonEmpty
	);

	return { name, pass, metrics, notes: ["router operational"] };
}
