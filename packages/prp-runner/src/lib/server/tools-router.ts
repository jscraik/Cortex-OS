/**
 * Tools router for MCP endpoints.
 */

import type { Request } from 'express';
import { Router } from 'express';
import type { ASBRAIMcpServer } from '../../asbr-ai-mcp-server.js';
import type { AiMetrics } from '../../monitoring/metrics.js';
import { authMiddleware, rbacToolsCall } from '../../security/auth-middleware.js';
import { conditionalRateLimiter, createRateLimiter } from '../../security/rate-limiter.js';

export function createToolsRouter(mcpServer: ASBRAIMcpServer, aiMetrics?: AiMetrics): Router {
  const router = Router();

  const listLimiter = createRateLimiter({ windowMs: 60_000, max: 60, scope: 'tools-list', adminBypass: true });
  router.get('/list', authMiddleware, listLimiter, async (_req, res) => {
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

  const isAiOp = (req: Request) => {
    const body = (req.body || {}) as { method?: string; params?: { name?: string } };
    const name = String(body.params?.name || '');
    return body.method === 'tools/call' && name.startsWith('ai_');
  };
  const aiLimiter = conditionalRateLimiter(isAiOp, {
    windowMs: 60_000,
    max: 10,
    keyGenerator: (req) => {
      const apiKey = req.header('X-API-Key') || req.header('x-api-key') || req.ip || 'anon';
      return `${apiKey}:ai-ops`;
    },
    scope: 'tools-call-ai',
    adminBypass: true,
  });

  const callLimiter = createRateLimiter({ windowMs: 60_000, max: 30, scope: 'tools-call', adminBypass: true });

  router.post('/call', authMiddleware, aiLimiter, callLimiter, rbacToolsCall, async (req, res) => {
    try {
      const body = req.body as {
        method: 'tools/call';
        params: { name: string; arguments?: Record<string, unknown> };
      };
      const call = () =>
        mcpServer.callTool({
          method: 'tools/call',
          params: { name: body.params.name, arguments: body.params.arguments || {} },
        });
      let response: Awaited<ReturnType<ASBRAIMcpServer['callTool']>>;
      if (aiMetrics) {
        // Instrument AI ops for ai_* tools, otherwise just call
        response = isAiOp(req) ? await aiMetrics.instrument(body.params.name, call) : await call();
      } else {
        response = await call();
      }
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
