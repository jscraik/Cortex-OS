/**
 * @file qwen-embedding-real.test.ts
 * @description Test real Qwen embedding functionality (skipped by default)
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
	createEmbeddingState,
	generateEmbeddings,
	getStats,
} from "../lib/embedding/index.js";

describe.skip("🔥 Real Qwen Embedding Tests", () => {
	let embeddingState: ReturnType<typeof createEmbeddingState>;

	beforeEach(() => {
		embeddingState = createEmbeddingState("sentence-transformers");
	});

	it("creates state with Qwen configuration", () => {
		const stats = getStats(embeddingState);
		expect(stats.provider).toBe("sentence-transformers");
		expect(stats.dimensions).toBe(1024);
	});

	it("generates real Qwen embeddings", async () => {
		const text = "Machine learning is transforming artificial intelligence.";
		const embeddings = await generateEmbeddings(embeddingState, text);
		expect(embeddings[0]).toHaveLength(1024);
	});
});
