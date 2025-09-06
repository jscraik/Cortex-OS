import { describe, expect, it } from "vitest";
import { Qwen3Reranker } from "../src/pipeline/qwen3-reranker";

describe("Qwen3Reranker external script", () => {
        it("reranks documents via python script", async () => {
                const reranker = new Qwen3Reranker({ pythonPath: "python3" });
                const docs = [
                        { id: "1", text: "apple pie" },
                        { id: "2", text: "banana split" },
                        { id: "3", text: "apple tart" },
                ];

                const results = await reranker.rerank("apple dessert", docs, 2);

                expect(results).toHaveLength(2);
                expect(results[0].id).toBe("1");
                expect(results[1].id).toBe("3");
        });
});
