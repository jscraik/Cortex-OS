/**
 * Health check router.
 */
import { Router } from 'express';
import type { ASBRAIMcpServer } from '../../asbr-ai-mcp-server.js';

export function createHealthRouter(mcpServer: ASBRAIMcpServer) {
	const router = Router();

	router.get('/', async (_req, res) => {
		try {
			const health = await mcpServer.getHealth();
			res.json(health);
		} catch (error) {
			res.status(500).json({ error: `Health check failed: ${error}` });
		}
	});

	return router;
}
