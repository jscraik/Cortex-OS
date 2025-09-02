/**
 * @file MCP Marketplace Commands Tests (Deprecated)
 * @description Ensures legacy marketplace command throws deprecation errors.
 */

import { describe, expect, it } from "vitest";
import { McpMarketplaceCommand } from "./marketplace.js";

describe("McpMarketplaceCommand (deprecated)", () => {
	const command = new McpMarketplaceCommand();

	it("search throws deprecation error", async () => {
		await expect(command.search("anything")).rejects.toThrow(
			'Deprecated command: use "cortex mcp search"',
		);
	});

	it("show throws deprecation error", async () => {
		await expect(command.show("id")).rejects.toThrow(
			'Deprecated command: use "cortex mcp show"',
		);
	});

	it("add throws deprecation error", async () => {
		await expect(command.add("id")).rejects.toThrow(
			'Deprecated command: use "cortex mcp add"',
		);
	});

	it("remove throws deprecation error", async () => {
		await expect(command.remove("id")).rejects.toThrow(
			'Deprecated command: use "cortex mcp remove"',
		);
	});

	it("list throws deprecation error", async () => {
		await expect(command.list()).rejects.toThrow(
			'Deprecated command: use "cortex mcp list"',
		);
	});

	it("bridge throws deprecation error", async () => {
		await expect(command.bridge("https://example.com")).rejects.toThrow(
			'Deprecated command: use "cortex mcp bridge"',
		);
	});
});
