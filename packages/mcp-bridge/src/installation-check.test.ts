/**
 * @file_path apps/cortex-os/packages/mcp/src/installation-check.test.ts
 * @description Tests for MCP server installation checking
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-20
 * @version 1.0.0
 * @status active
 */

import { describe, expect, it } from "vitest";
import { universalCliHandler } from "./universal-cli-handler.js";
import { universalMcpManager } from "./universal-mcp-manager.js";

describe("MCP Installation Checking", () => {
	describe("universalMcpManager.isServerInstalled", () => {
		it("should return not installed for new server", async () => {
			const result = await universalMcpManager.isServerInstalled("test-server");

			expect(result.installed).toBe(false);
			expect(result.message).toContain("not currently installed");
		});

		it("should handle URL format input", async () => {
			const result = await universalMcpManager.isServerInstalled(
				"https://api.ref.tools/mcp",
			);

			expect(result.installed).toBe(false);
			expect(result.message).toContain("not currently installed");
		});
	});

	describe("universalCliHandler.checkServerInstallation", () => {
		it("should provide clear installation status", async () => {
			const result =
				await universalCliHandler.checkServerInstallation("test-server");

			expect(result.success).toBe(true);
			expect(result.message).toContain("not currently installed");
		});
	});

	describe("addMcpServer with installation check", () => {
		it("should check for existing installation before adding", async () => {
			const command =
				'cortex mcp add --transport http test-server "https://api.example.com/mcp"';

			const result = await universalMcpManager.addMcpServer(command);

			// Should proceed with validation since server is not installed
			expect(result.success).toBe(false); // Will fail validation due to test URL
			expect(result.alreadyInstalled).toBeUndefined();
		});
	});

	describe("CLI handler with already installed server", () => {
		it("should provide helpful guidance for already installed servers", async () => {
			// Mock a server as installed by temporarily replacing the method
			const originalMethod = universalMcpManager.isServerInstalled;
			universalMcpManager.isServerInstalled = async () => ({
				installed: true,
				config: { name: "test-server", url: "https://api.example.com/mcp" },
				message: "Server is installed",
			});

			const command =
				'cortex mcp add --transport http test-server "https://api.example.com/mcp"';
			const result = await universalCliHandler.processMcpCommand(command);

			expect(result.success).toBe(false);
			expect(result.message).toContain("ALREADY INSTALLED");
			expect(result.message).toContain("cortex mcp update");
			expect(result.message).toContain("cortex mcp remove");

			// Restore original method
			universalMcpManager.isServerInstalled = originalMethod;
		});
	});
});
