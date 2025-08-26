import type { Request, Response } from "express-serve-static-core";
import type { IncomingMessage } from "http";
import { createRequire } from "node:module";
import express from 'express';

/**
 * Installs the GitMCP HTTP and WS bridge at /mcp/gitmcp.
 * - HTTP: POST /mcp/gitmcp { action: 'search'|'fetch', repo, query?, limit? }
 * - WS:   ws://<host>/mcp/gitmcp (send same JSON; replies { ok, result|error })
 *
 * MCP SDK usage and WS module loading are contained here to keep the server
 * decoupled from SDK specifics and optional deps.
 */
export function installGitMcpBridge(
  app: express.Application,
  server: { on: (event: string, handler: (...args: any[]) => void) => void },
  opts: {
    baseUrl?: string;
    sseClient?: {
      connect?: () => Promise<any>;
      callTool: (t: string, a: any) => Promise<any>;
    };
    wsModule?: { WebSocketServer: any };
  } = {},
) {
  const BASE =
    opts.baseUrl ||
    process.env.CORTEX_GITMCP_URL ||
    "https://gitmcp.io/idosal/git-mcp";

  let _sseSingleton: any | undefined = opts.sseClient;

  function toolName(repo: string, action: "search" | "fetch") {
    const safe = String(repo).replace(/\//g, "_");
    return `${action}_${safe}_documentation`;
  }

  function getSse() {
    if (_sseSingleton) return _sseSingleton;
    const injected = (globalThis as any).__sseClient as
      | {
          connect?: () => Promise<any>;
          callTool: (t: string, a: any) => Promise<any>;
        }
      | undefined;
    if (injected) {
      _sseSingleton = injected;
      return _sseSingleton;
    }
    try {
      const req = createRequire(import.meta.url);
      const mod = req("@modelcontextprotocol/sdk/client/sse.js");
      const Ctor = mod?.RemoteSSEClient || mod?.default?.RemoteSSEClient || mod;
      if (typeof Ctor === "function") {
        _sseSingleton = new Ctor({ url: BASE });
        _sseSingleton.connect?.().catch?.(() => {});
        return _sseSingleton;
      }
    } catch {
      // fall through
    }
    _sseSingleton = {
      async connect() {},
      async callTool(tool: string, args: any) {
        return { ok: true, mocked: true, tool, args };
      },
    };
    return _sseSingleton;
  }

  // HTTP bridge
  app.post("/mcp/gitmcp", async (req: Request, res: Response) => {
    try {
      const {
        action,
        repo,
        query,
        limit = 8,
      } = (req.body || {}) as {
        action?: "search" | "fetch";
        repo?: string;
        query?: string;
        limit?: number;
      };
      if (!action || !repo)
        return res.status(400).json({ error: "invalid_args" });
      const args = action === "search" ? { query, limit } : {};
      const out = await getSse().callTool(toolName(repo, action), args);
      return res.json(out);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: msg ?? "bridge_error" });
    }
  });

  // WS bridge
  const wsModule = opts.wsModule || safeRequireWs();
  if (wsModule?.WebSocketServer) {
    const wss = new wsModule.WebSocketServer({ noServer: true });
    server.on(
      "upgrade",
      (req: IncomingMessage & { url?: string }, socket: any, head: any) => {
        try {
          const u = new URL(req.url || "", "http://localhost");
          if (u.pathname !== "/mcp/gitmcp") return (socket as any)?.destroy?.();
          wss.handleUpgrade(req, socket, head, (ws: any) => {
            try {
              ws.send(
                JSON.stringify({ hello: "gitmcp", t: Date.now(), via: "ws" }),
              );
            } catch {}
            const keep = setInterval(() => {
              try {
                if (ws.readyState === ws.OPEN)
                  ws.send(JSON.stringify({ type: "keepalive", t: Date.now() }));
              } catch {}
            }, 15000);
            ws.on("close", () => clearInterval(keep));
            ws.on("message", async (buf: Buffer) => {
              try {
                const {
                  action,
                  repo,
                  query,
                  limit = 8,
                } = JSON.parse(String(buf));
                if (!action || !repo)
                  return ws.send(
                    JSON.stringify({ ok: false, error: "invalid_args" }),
                  );
                const args = action === "search" ? { query, limit } : {};
                const out = await getSse().callTool(
                  toolName(repo, action),
                  args,
                );
                ws.send(JSON.stringify({ ok: true, result: out }));
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                ws.send(
                  JSON.stringify({ ok: false, error: msg ?? "ws_error" }),
                );
              }
            });
          });
        } catch {
          (socket as any)?.destroy?.();
        }
      },
    );
  }
}

function safeRequireWs(): { WebSocketServer: any } | undefined {
  try {
    const req = createRequire(import.meta.url);
    return req("ws");
  } catch {
    return undefined;
  }
}
