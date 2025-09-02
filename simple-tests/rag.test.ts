import { embedQuery } from "@cortex-os/rag/lib/embed-query";
import { retrieveDocs } from "@cortex-os/rag/lib/retrieve-docs";
import { describe, expect, it, vi } from "vitest";

describe("rag helpers", () => {
	it("embedQuery delegates to embedder", async () => {
		const embedder = { embed: vi.fn().mockResolvedValue([[1]]) };
		const emb = await embedQuery(embedder, "hello");
		expect(embedder.embed).toHaveBeenCalledWith(["hello"]);
		expect(emb).toEqual([1]);
	});

	it("retrieveDocs ranks documents", async () => {
		const embedder: any = { embed: vi.fn().mockResolvedValue([[0, 1]]) };
		const docs = [{ id: "a", content: "foo", embedding: [0, 1] }];
		const result = await retrieveDocs(embedder, [0, 1], docs, 1);
		expect(result[0].id).toBe("a");
	});
});
