import { describe, expect, it, vi } from "vitest";

vi.mock("@cortex-os/model-gateway", () => ({ createModelRouter: vi.fn() }));

import { runRouterSuite } from "./suites/router";

describe("runRouterSuite", () => {
	const baseRouter = {
		initialize: async () => {},
		generateEmbedding: async () => ({ embedding: [1] }),
		generateChat: async () => ({ content: "ok" }),
		rerank: async () => ({ scores: [1, 0.5] }),
	};

	it("passes when router exposes all capabilities", async () => {
		const router = { ...baseRouter, hasAvailableModels: () => true };
		const res = await runRouterSuite("router", router as any);
		expect(res.pass).toBe(true);
		expect(res.metrics.embedDim).toBe(1);
	});

	it("fails when a capability is missing", async () => {
		const router = { ...baseRouter, hasAvailableModels: () => false };
		const res = await runRouterSuite("router", router as any);
		expect(res.pass).toBe(false);
	});

	it("fails when chat output empty", async () => {
		const router = {
			...baseRouter,
			hasAvailableModels: () => true,
			generateChat: async () => ({ content: "" }),
		};
		const res = await runRouterSuite("router", router as any);
		expect(res.pass).toBe(false);
	});

	it("fails when chat capability missing", async () => {
		const router = {
			...baseRouter,
			hasAvailableModels: (cap: string) => cap !== "chat",
		} as any;
		const res = await runRouterSuite("router", router);
		expect(res.pass).toBe(false);
	});
});
