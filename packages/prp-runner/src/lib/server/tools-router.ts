/**
 * Tools router for MCP endpoints.
 */
import { Router } from 'express';
import type { ASBRAIMcpServer } from '../../asbr-ai-mcp-server.js';

export function createToolsRouter(mcpServer: ASBRAIMcpServer): Router {
	const router = Router();

	router.get('/list', async (_req, res) => {
		try {
			const tools = await mcpServer.listTools();
			res.json(tools);
		} catch (error) {
			res.status(500).json({
				error: {
					message: `MCP tools list error: ${error}`,
					type: 'mcp_tools_error',
				},
			});
		}
	});

	router.post('/call', async (req, res) => {
		try {
			const response = await mcpServer.callTool(req.body);
			if (response.isError) {
				res.status(400).json(response);
			} else {
				res.json(response);
			}
		} catch (error) {
			res.status(500).json({
				error: {
					message: `MCP tool call error: ${error}`,
					type: 'mcp_call_error',
				},
			});
		}
	});

	return router;
}
