import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/cloudflare-tunnel", () => ({
	startCloudflareTunnel: vi
		.fn()
		.mockRejectedValue(new Error("cloudflared not found")),
}));

import { McpDemoServer } from "../mcp-demo-server.js";

describe("Cloudflare tunnel failure emits A2A event", () => {
	const publishSpy = vi.fn();
	let originalPublisher: typeof globalThis.__CORTEX_A2A_PUBLISH__;

	beforeEach(() => {
		originalPublisher = globalThis.__CORTEX_A2A_PUBLISH__;
		// Install a spy publisher
		globalThis.__CORTEX_A2A_PUBLISH__ = (type, data, source) => {
			publishSpy({ type, data, source });
		};
		process.env.CORTEX_MCP_TUNNEL_STRICT = undefined as unknown as string; // ensure non-strict fallback path
	});

	afterEach(() => {
		globalThis.__CORTEX_A2A_PUBLISH__ = originalPublisher;
		publishSpy.mockReset();
	});

	it("emits mcp.tunnel.failed when tunnel startup rejects", async () => {
		const server = new McpDemoServer(0);
		await server.start();
		expect(publishSpy).toHaveBeenCalled();
		const calls = publishSpy.mock.calls.map((c) => c[0]);
		const evt = calls.find((c) => c.type === "mcp.tunnel.failed");
		expect(evt).toBeTruthy();
		expect(evt.data).toHaveProperty("reason");
		expect(String(evt.data.reason)).toContain("cloudflared");
		server.stop();
	});
});
