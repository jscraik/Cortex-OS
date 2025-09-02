import { universalCliHandler } from "../universal-cli-handler.js";

async function addGpt5Server() {
	try {
		const result = await universalCliHandler.processMcpCommand(
			"cortex mcp add gpt5-server --env OPENAI_API_KEY=your-openai-api-key-here node /path/to/gpt5mcp/servers/gpt5-server/build/index.js",
			{
				frontend: "cortex",
				autoApprove: true,
			},
		);

		console.log("GPT-5 Server Installation Result:");
		console.log(JSON.stringify(result, null, 2));

		if (result.success) {
			console.log("\n✅ GPT-5 Server successfully installed!");
			console.log("\n📝 Next steps:");
			console.log(
				'1. Replace "your-openai-api-key-here" with your actual OpenAI API key',
			);
			console.log(
				'2. Update "/path/to/gpt5mcp/servers/gpt5-server/build/index.js" with the correct path',
			);
			console.log(
				"3. Ensure the GPT-5 server build is available at the specified path",
			);
			console.log(
				"4. Consider using environment variables from .env file for production",
			);
		}
	} catch (error) {
		console.error("Error adding GPT-5 server:", error);
	}
}

addGpt5Server();
