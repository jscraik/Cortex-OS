import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("OpenAPI generation", () => {
	it("includes agent paths", () => {
		const spec = JSON.parse(
			readFileSync(join(__dirname, "..", "openapi.json"), "utf8"),
		);
		expect(spec.paths["/mcp"]).toBeDefined();
		expect(spec.paths["/a2a"]).toBeDefined();
		expect(spec.paths["/rag"]).toBeDefined();
		expect(spec.paths["/simlab"]).toBeDefined();
	});
});
