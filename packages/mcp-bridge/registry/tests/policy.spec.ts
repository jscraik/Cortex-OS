import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const ROOT = path.join(process.cwd(), "apps/cortex-os/packages/mcp/registry");
const MAX_TOOLS = 20;

describe("MCP Registry Policy Gates", () => {
	test("bundles have ≤20 tools and health checks for http", () => {
		if (!fs.existsSync(ROOT)) {
			console.warn(`Registry path does not exist: ${ROOT}`);
			return;
		}

		const registryFiles = fs
			.readdirSync(ROOT)
			.filter((x) => x.endsWith(".json"));
		expect(registryFiles.length).toBeGreaterThan(0);

		for (const file of registryFiles) {
			const filePath = path.join(ROOT, file);
			const content = fs.readFileSync(filePath, "utf8");
			const registry = JSON.parse(content);

			// Test bundle tool limits
			for (const bundle of registry.bundles ?? []) {
				expect((bundle.tool_ids ?? []).length).toBeLessThanOrEqual(MAX_TOOLS);
				expect(bundle.tool_ids).toBeDefined();
				expect(Array.isArray(bundle.tool_ids)).toBe(true);
			}

			// Test health checks for HTTP allocators
			if ((registry.allocator_profile ?? "").startsWith("http")) {
				expect(registry.health_check).toBeTruthy();
				expect(registry.health_check.endpoint).toBeDefined();
				expect(registry.health_check.timeout_ms).toBeLessThanOrEqual(1500);
				expect(registry.health_check.retries).toBe(3);
			}

			// Test tool schemas
			for (const tool of registry.tools ?? []) {
				expect(tool.schema).toBeTruthy();
				expect(tool.output_schema).toBeTruthy();
				expect(tool.schema.additionalProperties).toBe(false);
				expect(tool.tool_id).toBeDefined();
				expect(typeof tool.tool_id).toBe("string");
				expect(tool.tool_id.length).toBeGreaterThan(0);
			}

			// Test network policies
			if (registry.policies?.network) {
				expect(Array.isArray(registry.policies.network.allow)).toBe(true);
				expect(Array.isArray(registry.policies.network.deny)).toBe(true);
				expect(registry.policies.network.deny.length).toBeGreaterThan(0);
			}

			// Test no duplicate tool IDs
			const toolIds = (registry.tools ?? []).map((t: any) => t.tool_id);
			const uniqueToolIds = new Set(toolIds);
			expect(uniqueToolIds.size).toBe(toolIds.length);
		}
	});

	test("registry follows strict schema validation", () => {
		if (!fs.existsSync(ROOT)) return;

		const registryFiles = fs
			.readdirSync(ROOT)
			.filter((x) => x.endsWith(".json"));

		for (const file of registryFiles) {
			const filePath = path.join(ROOT, file);
			const content = fs.readFileSync(filePath, "utf8");
			const registry = JSON.parse(content);

			// Required top-level fields
			expect(registry.name).toBeDefined();
			expect(registry.version).toBeDefined();
			expect(registry.allocator_profile).toBeDefined();

			// Version follows semver
			expect(registry.version).toMatch(/^\d+\.\d+\.\d+/);

			// Tools array structure
			if (registry.tools) {
				expect(Array.isArray(registry.tools)).toBe(true);
				for (const tool of registry.tools) {
					expect(tool.tool_id).toMatch(/^[a-z0-9_-]+$/);
					expect(tool.description).toBeDefined();
					expect(typeof tool.description).toBe("string");
				}
			}
		}
	});

	test("security policies are present for remote servers", () => {
		if (!fs.existsSync(ROOT)) return;

		const registryFiles = fs
			.readdirSync(ROOT)
			.filter((x) => x.endsWith(".json"));

		for (const file of registryFiles) {
			const filePath = path.join(ROOT, file);
			const content = fs.readFileSync(filePath, "utf8");
			const registry = JSON.parse(content);

			if (
				registry.allocator_profile?.includes("remote") ||
				registry.allocator_profile?.includes("http")
			) {
				expect(registry.policies?.security).toBeDefined();
				expect(registry.policies.security.require_tls).toBe(true);
				expect(registry.policies.security.require_token).toBe(true);
			}
		}
	});
});
