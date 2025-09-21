/**
 * Capabilities router.
 */
import { Router } from 'express';
import type { ASBRAIMcpServer } from '../../asbr-ai-mcp-server.js';
import { authMiddleware } from '../../security/auth-middleware.js';

// Extracted constants for tool name and method
const TOOL_METHOD = 'tools/call';
const TOOL_NAME = 'ai_get_capabilities';

export function createCapabilitiesRouter(mcpServer: ASBRAIMcpServer): Router {
	const router = Router();

	router.get('/', authMiddleware, async (_req, res) => {
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
