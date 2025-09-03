/**
 * Runtime entrypoint for cortex-ai-github
 * Reads env vars, initializes the AI app, and starts the webhook server.
 */

import dotenv from "dotenv";
import { CortexAiGitHubApp } from "../core/ai-github-app.js";
import type { GitHubModel } from "../types/github-models.js";
import { CortexWebhookServer } from "./webhook-server.js";

// Load environment variables from .env file
dotenv.config();

const required = (name: string, value: string | undefined) => {
	if (!value || value.trim() === "") {
		console.error(`[startup] Missing required environment variable: ${name}`);
		process.exit(1);
	}
	return value;
};

async function main() {
	const token = required("GITHUB_TOKEN", process.env.GITHUB_TOKEN);
	const webhookSecret = required("WEBHOOK_SECRET", process.env.WEBHOOK_SECRET);

	const port = Number(process.env.PORT ?? "3001");
	const baseUrl =
		process.env.GITHUB_MODELS_BASE_URL ||
		"https://models.inference.ai.azure.com";
	const defaultModel = (process.env.GITHUB_DEFAULT_MODEL ||
		"claude-3-5-sonnet") as GitHubModel;
	const maxTokens = Number(process.env.GITHUB_MAX_TOKENS ?? "4096");
	const temperature = Number(process.env.GITHUB_TEMPERATURE ?? "0.3");

	const aiApp = new CortexAiGitHubApp({
		token,
		baseUrl,
		defaultModel,
		maxTokens,
		temperature,
	});

	const server = new CortexWebhookServer(aiApp, webhookSecret);

	await server.start(port);
	console.log(
		`[startup] cortex-ai-github listening on :${port} (hosted via Cloudflare Tunnel if configured)`,
	);

	const shutdown = async (signal: string) => {
		console.log(`[shutdown] ${signal} received, stopping server...`);
		try {
			await server.stop();
		} finally {
			process.exit(0);
		}
	};

	process.on("SIGINT", () => shutdown("SIGINT"));
	process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
	console.error("[startup] Failed to start server:", err);
	process.exit(1);
});
