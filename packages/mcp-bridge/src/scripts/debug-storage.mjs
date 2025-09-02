#!/usr/bin/env tsx
/**
 * Debug script to check MCP storage contents
 */

import { mcpConfigStorage } from "../mcp-config-storage.js";

async function debugStorage() {
	console.log("🔍 Debugging MCP Storage Contents");
	console.log("=".repeat(40));

	try {
		const result = await mcpConfigStorage.listServers();
		console.log("\n📊 Raw storage data:");
		console.log(JSON.stringify(result, null, 2));

		console.log("\n📋 Server details:");
		for (const server of result.servers) {
			console.log(`\nServer: ${server.name || "UNDEFINED NAME"}`);
			console.log(`  Transport: ${server.transport}`);
			console.log(`  Type: ${server.type}`);
			console.log(`  URL: ${server.url || "N/A"}`);
			console.log(`  Command: ${server.command || "N/A"}`);
			console.log(`  Installed: ${server.installedAt || "N/A"}`);
		}

		console.log("\n📁 Config paths:");
		const paths = mcpConfigStorage.getConfigPaths();
		console.log(JSON.stringify(paths, null, 2));
	} catch (error) {
		console.error("❌ Debug failed:", error);
	}
}

// Run the debug
debugStorage().catch(console.error);
