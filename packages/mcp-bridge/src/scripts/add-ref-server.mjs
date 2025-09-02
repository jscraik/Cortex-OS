#!/usr/bin/env tsx
/**
 * Add Ref MCP server using the universal CLI handler
 */

// Use local handler to respect domain boundaries
import { universalCliHandler } from "../universal-cli-handler.js";

async function addRefServer() {
	console.log("🔗 Adding Ref MCP Server");
	console.log("=".repeat(30));

	try {
		// Process the MCP command
		const command =
			'cortex mcp add --transport http Ref "https://api.ref.tools/mcp?apiKey=ref-e672788111c76ba32bc1"';

		console.log(`📝 Command: ${command}`);
		console.log("\n🔄 Processing...");

		const result = await universalCliHandler.processMcpCommand(command, {
			frontend: "cortex-cli",
			autoApprove: true, // Auto-approve for this trusted API
			interactive: false,
		});

		console.log("\n📊 Result:");
		console.log(`Status: ${result.success ? "✅ SUCCESS" : "❌ FAILED"}`);
		console.log(`Message: ${result.message}`);

		if (result.data) {
			console.log("\n📋 Configuration:");
			console.log(JSON.stringify(result.data, null, 2));
		}

		if (result.securityLevel) {
			console.log(`\n🔒 Security Level: ${result.securityLevel.toUpperCase()}`);
		}

		// List all servers to confirm
		console.log("\n📋 All MCP Servers:");
		const listResult = await universalCliHandler.listServers();
		console.log(listResult.message);
	} catch (error) {
		console.error("❌ Error adding Ref server:", error);
	}
}

// Run the addition
addRefServer().catch(console.error);
