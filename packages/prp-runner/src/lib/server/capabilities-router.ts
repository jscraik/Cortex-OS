/**
 * Capabilities router.
 */
import { Router } from "express";
import type { ASBRAIMcpServer } from "../../asbr-ai-mcp-server.js";

// Extracted constants for tool name and method
const TOOL_METHOD = "tools/call";
const TOOL_NAME = "ai_get_capabilities";

export function createCapabilitiesRouter(mcpServer: ASBRAIMcpServer) {
	const router = Router();

	router.get("/", async (_req, res) => {
		try {
			const capabilities = await mcpServer.callTool({
				method: TOOL_METHOD,
				params: {
					name: TOOL_NAME,
					arguments: {},
				},
			});
			res.json(capabilities);
		} catch (error) {
			res.status(500).json({ error: `Capabilities check failed: ${error}` });
		}
	});

	return router;
}
