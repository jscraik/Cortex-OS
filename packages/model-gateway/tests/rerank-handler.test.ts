import { describe, expect, test, vi } from "vitest";
import { rerankHandler } from "../src/handlers";
import type { ModelRouter } from "../src/model-router";

describe("rerankHandler", () => {
	test("returns ranked items", async () => {
		const router: Partial<ModelRouter> = {
			rerank: vi.fn().mockResolvedValue({
				documents: ["b", "a"],
				scores: [0.2, 0.8],
				model: "m",
			}),
		};
		const result = await rerankHandler(router as ModelRouter, {
			query: "q",
			docs: ["a", "b"],
			topK: 1,
		});
		expect(result).toEqual({
			rankedItems: [{ index: 1, score: 0.8, content: "a" }],
			modelUsed: "m",
		});
	});
});
