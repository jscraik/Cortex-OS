import { describe, expect, test } from "vitest";
import { generateCommands, generateInstructions } from "./install.js";
import { MCP_VERSION, type ServerManifest } from "./types.js";

describe("install command utilities", () => {
	const server: ServerManifest = {
		id: "test-server",
		name: "Test Server",
		version: "1.0.0",
		description: "A server used for testing",
		mcpVersion: MCP_VERSION,
		capabilities: {
			tools: true,
			resources: false,
			prompts: false,
			logging: false,
			roots: false,
		},
		publisher: { name: "Tester", verified: true },
		repository: "https://example.com",
		homepage: "https://example.com",
                license: "Apache-2.0",
		category: "development",
		tags: ["test"],
		transport: { streamableHttp: { url: "https://example.com", headers: {} } },
		install: { claude: "", json: {} },
		permissions: [],
		security: { riskLevel: "low" },
		featured: false,
		downloads: 0,
		updatedAt: new Date().toISOString(),
	};

	test("generates Claude and JSON commands", () => {
		const commands = generateCommands(server);
		expect(commands.map((c) => c.client)).toEqual(["claude", "json"]);
	});

	test("includes command in instructions", () => {
		const instructions = generateInstructions(server, "claude");
		expect(instructions).toContain("claude mcp add");
	});
});
