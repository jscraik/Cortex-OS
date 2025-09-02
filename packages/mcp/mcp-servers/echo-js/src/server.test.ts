import { describe, expect, it } from "vitest";
import { handleRequest } from "./server.js";

describe("echo-js server", () => {
	it("echoes valid message", async () => {
		const req = {
			jsonrpc: "2.0",
			id: 1,
			method: "tools/call",
			params: { name: "echo", arguments: { message: "hi" } },
		};
		const res = JSON.parse(await handleRequest(JSON.stringify(req)));
		expect(res.result.result.echo).toBe("hi");
	});

	it("returns JSON-RPC error on invalid payload", async () => {
		const res = await handleRequest(JSON.stringify({ id: 1 }));
		const obj = JSON.parse(res);
		expect(obj.error).toBeDefined();
		expect(obj.error.code).toBe(-32600);
	});
});
