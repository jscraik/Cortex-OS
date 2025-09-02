import { describe, expect, it } from "vitest";
import { handleMCP } from "./index";

describe("MCP handler", () => {
	it("validates and returns std output", async () => {
		const out = await handleMCP({
			config: {
				seed: 1,
				maxTokens: 256,
				timeoutMs: 1000,
				memory: { maxItems: 10, maxBytes: 1024 },
			},
			request: { tool: "echo", args: { x: 1 } },
		});
		expect(out).toContain("MCP handled tool=");
	});
	it("emits json error on invalid input", async () => {
		const out = await handleMCP({});
		const obj = JSON.parse(out);
		expect(obj.data.error.code).toBeDefined();
	});
});
