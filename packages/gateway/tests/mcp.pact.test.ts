import { MatchersV3, PactV3 } from "@pact-foundation/pact";
import { describe, it, expect } from "vitest";

const provider = new PactV3({
        consumer: "cortex-consumer",
        provider: "cortex-gateway",
        dir: new URL("../pacts", import.meta.url).pathname,
});

describe.skipIf(!process.env.MCP_TRANSPORT)("Gateway Pact - MCP", () => {
        it("responds with text or json payload", async () => {
		provider
			.given("Gateway up")
			.uponReceiving("MCP request")
			.withRequest({
				method: "POST",
				path: "/mcp",
				body: MatchersV3.like({
					config: {
						seed: 1,
						maxTokens: 128,
						timeoutMs: 1000,
						memory: { maxItems: 10, maxBytes: 2048 },
					},
					request: { tool: "echo", args: { x: 1 } },
					json: true,
				}),
				headers: { "content-type": "application/json" },
			})
			.willRespondWith({
				status: 200,
				headers: {
					"content-type": MatchersV3.regex("application/json", /json/),
				},
				body: MatchersV3.like({
					meta: { timestamp: MatchersV3.regex(/\d{4}-\d{2}-\d{2}T/) },
					data: MatchersV3.like({}),
				}),
			});

		await provider.executeTest(async (mock) => {
			const res = await fetch(`${mock.url}/mcp`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					config: {
						seed: 1,
						maxTokens: 128,
						timeoutMs: 1000,
						memory: { maxItems: 10, maxBytes: 2048 },
					},
					request: { tool: "echo", args: { x: 1 } },
					json: true,
				}),
			});
			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.meta.timestamp).toBeTruthy();
		});
	});
});
