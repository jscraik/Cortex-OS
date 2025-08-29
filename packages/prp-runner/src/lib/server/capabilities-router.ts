/**
 * Capabilities router.
 */
import { Router } from 'express';
import type { ASBRAIMcpServer } from '../../asbr-ai-mcp-server.js';

export function createCapabilitiesRouter(mcpServer: ASBRAIMcpServer) {
  const router = Router();

  router.get('/', async (_req, res) => {
    try {
      const capabilities = await mcpServer.callTool({
        method: 'tools/call',
        params: {
          name: 'ai_get_capabilities',
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
