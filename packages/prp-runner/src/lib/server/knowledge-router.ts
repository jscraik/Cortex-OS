/**
 * Knowledge stats router.
 */
import { Router } from 'express';
import type { ASBRAIMcpServer } from '../../asbr-ai-mcp-server.js';

// Constants for tool name and method
const KNOWLEDGE_STATS_TOOL_NAME = 'ai_get_knowledge_stats';
const KNOWLEDGE_STATS_TOOL_METHOD = 'tools/call';

export function createKnowledgeRouter(mcpServer: ASBRAIMcpServer) {
	const router = Router();

	router.get('/stats', async (_req, res) => {
		try {
			const stats = await mcpServer.callTool({
				method: KNOWLEDGE_STATS_TOOL_METHOD,
				params: {
					name: KNOWLEDGE_STATS_TOOL_NAME,
					arguments: {},
				},
			});
			res.json(stats);
		} catch (error) {
			res.status(500).json({ error: `Knowledge stats failed: ${error}` });
		}
	});

	return router;
}
