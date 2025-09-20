import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';
import type { HealthSummary } from '../lib/health.js';
import type { HealthProvider } from './health-provider.js';

export interface HealthServerOptions {
  host?: string; // default 127.0.0.1
  port?: number; // default 0 (ephemeral for tests)
  pathBase?: string; // default '' (no prefix)
}

function sendJson(res: ServerResponse, code: number, payload: unknown) {
  const body = JSON.stringify(payload);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body).toString(),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

export function createHealthServer(provider: HealthProvider, opts: HealthServerOptions = {}) {
  const host = opts.host ?? '127.0.0.1';
  const port = opts.port ?? 0; // 0 = ephemeral (handy for tests)
  const base = (opts.pathBase ?? '').replace(/\/$/, '');

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      if (!req.url) {
        res.writeHead(400).end();
        return;
      }
      const url = new URL(req.url, `http://${req.headers.host ?? host}`);
      const path = url.pathname;

      // Only simple GET supported
      if ((req.method ?? 'GET') !== 'GET') {
        res.writeHead(405).end();
        return;
      }

      if (path === `${base}/live`) {
        const summary: HealthSummary = await provider.liveness();
        return sendJson(res, 200, summary);
      }
      if (path === `${base}/ready`) {
        const summary: HealthSummary = await provider.readiness();
        return sendJson(res, summary.ok ? 200 : 503, summary);
      }
      if (path === `${base}/health`) {
        const summary: HealthSummary = await provider.health();
        return sendJson(res, summary.ok ? 200 : 503, summary);
      }

      res.writeHead(404).end();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'internal error';
      sendJson(res, 500, { ok: false, error: message });
    }
  });

  return {
    server,
    listen: () =>
      new Promise<{ host: string; port: number }>((resolve) => {
        server.listen(port, host, () => {
          const addr = server.address();
          if (addr && typeof addr === 'object') {
            resolve({ host: addr.address, port: addr.port });
          } else {
            resolve({ host, port });
          }
        });
      }),
    close: () => new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve()))),
  };
}

/**
 * Example Kubernetes probes (drop into your Deployment):
 *
 * livenessProbe:
 *   httpGet:
 *     path: /live
 *     port: 8080
 *   initialDelaySeconds: 5
 *   periodSeconds: 10
 * readinessProbe:
 *   httpGet:
 *     path: /ready
 *     port: 8080
 *   initialDelaySeconds: 5
 *   periodSeconds: 10
 */
