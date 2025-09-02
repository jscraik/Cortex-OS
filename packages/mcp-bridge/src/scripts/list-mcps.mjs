import { universalCliHandler } from "../universal-cli-handler.js";

async function listAllMcpServers() {
	try {
		console.log("📋 Listing all installed MCP servers...\n");

		// Use the CLI handler to list servers
		const result = await universalCliHandler.listServers();

		if (result.success && result.data) {
			const servers = Array.isArray(result.data) ? result.data : [];

			if (servers.length === 0) {
				console.log("No MCP servers currently installed.");
			} else {
				console.log(`Found ${servers.length} MCP server(s):\n`);

				servers.forEach((server, index) => {
					console.log(`${index + 1}. ${server.name}`);
					console.log(`   Type: ${server.type || "stdio"}`);
					console.log(`   Command: ${server.command || "N/A"}`);
					if (server.args && server.args.length > 0) {
						console.log(`   Args: ${server.args.join(" ")}`);
					}
					if (server.url) {
						console.log(`   URL: ${server.url}`);
					}
					if (
						server.environment &&
						Object.keys(server.environment).length > 0
					) {
						console.log(
							`   Environment: ${Object.keys(server.environment).join(", ")}`,
						);
					}
					console.log(`   Security Level: ${server.securityLevel || "low"}`);
					console.log(`   Hash: ${server.hash || "N/A"}`);
					console.log("");
				});
			}
		} else {
			console.log(
				"⚠️  Unable to retrieve server list. The storage system may not be fully implemented yet.",
			);
			console.log("\nBased on our recent installations, you should have:");
			console.log("1. semgrep - Code security scanning");
			console.log("2. playwright - Browser automation");
			console.log("3. mcpgateway-wrapper - MCP Gateway integration");
			console.log("4. gemini-cli - Google Gemini AI integration");
			console.log("5. gpt5-server - OpenAI GPT-5 integration");
			console.log("6. RepoPrompt - Repository analysis and prompting");
			console.log("7. mlx-neuron - Local MLX AI models (if auto-registered)");
		}
	} catch (error) {
		console.error("Error listing MCP servers:", error);
	}
}

listAllMcpServers();
