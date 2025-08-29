/**
 * Knowledge stats router.
 */
import { Router } from 'express';
import type { ASBRAIMcpServer } from '../../asbr-ai-mcp-server.js';

export function createKnowledgeRouter(mcpServer: ASBRAIMcpServer) {
  const router = Router();

  router.get('/stats', async (_req, res) => {
    try {
      const stats = await mcpServer.callTool({
        method: 'tools/call',
        params: {
          name: 'ai_get_knowledge_stats',
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
