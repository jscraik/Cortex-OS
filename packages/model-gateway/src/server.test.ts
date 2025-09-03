import { describe, expect, it, vi } from "vitest";
import type { IModelRouter } from "./model-router.js";
import { createServer } from "./server.js";

vi.mock("./audit", () => ({
	auditEvent: vi.fn(() => ({})),
	record: vi.fn(async () => {}),
}));

vi.mock("./policy", () => ({
	loadGrant: vi.fn(async () => ({})),
	enforce: vi.fn(),
}));

class MockModelRouter {
	// Single-text path used by server when texts.length === 1
	async generateEmbedding({ text: _text, model }: { text: string; model?: string }) {
		return {
			embedding: [0.1, 0.2],
			model: model || "mock-model",
		};
	}
	// Batch path when multiple texts are provided
	async generateEmbeddings({
		texts,
		model,
	}: {
		texts: string[];
		model?: string;
	}) {
		return {
			embeddings: texts.map(() => [0.1, 0.2]),
			model: model || "mock-model",
		};
	}
}

describe("embeddings endpoint", () => {
	it("returns embeddings array", async () => {
		const server = createServer(
			new MockModelRouter() as unknown as IModelRouter,
		);
		const res = await server.inject({
			method: "POST",
			url: "/embeddings",
			payload: { texts: ["hello"] },
		});
		expect(res.statusCode).toBe(200);
		const body = res.json();
		// Server returns { vectors, dimensions, modelUsed }
		expect(body.vectors).toHaveLength(1);
		expect(body.dimensions).toBe(2);
		expect(body.modelUsed).toBe("mock-model");
		await server.close();
	});
});
