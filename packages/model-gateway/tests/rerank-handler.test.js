import { describe, expect, test, vi } from "vitest";
import { rerankHandler } from "../src/handlers";
describe("rerankHandler", () => {
    test("returns ranked items", async () => {
        const router = {
            rerank: vi.fn().mockResolvedValue({
                documents: ["b", "a"],
                scores: [0.2, 0.8],
                model: "m",
            }),
        };
        const result = await rerankHandler(router, {
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
//# sourceMappingURL=rerank-handler.test.js.map