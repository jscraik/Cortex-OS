import type { Express } from 'express';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { pino } from 'pino';
import { createMemoryProviderFromEnv } from '@cortex-os/memory-core';
import {
  MemoryStoreInputSchema,
  MemorySearchInputSchema,
  MemoryAnalysisInputSchema,
  MemoryRelationshipsInputSchema,
  MemoryStatsInputSchema,
} from '@cortex-os/tool-spec';

const logger = pino({ level: process.env.MEMORY_LOG_LEVEL || 'info' });

export interface LocalMemoryServerOptions {
  port?: number;
  host?: string;
}

export async function createLocalMemoryApp(): Promise<Express> {
  const provider = createMemoryProviderFromEnv();

  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '16mb' }));

  app.get('/healthz', async (_req, res) => {
    try {
      const health = await provider.healthCheck();
      res.status(health.healthy ? 200 : 503).json({
        success: health.healthy,
        data: health,
      });
    } catch (error) {
      const message = (error as Error).message;
      res.status(503).json({
        success: false,
        error: {
          code: 'UNHEALTHY',
          message,
        },
      });
    }
  });

  app.get('/readyz', async (_req, res) => {
    try {
      const health = await provider.healthCheck();
      const ready = health.healthy === true;
      res.status(ready ? 200 : 503).json({
        success: ready,
        data: { ready },
      });
    } catch (error) {
      const message = (error as Error).message;
      res.status(503).json({
        success: false,
        error: {
          code: 'NOT_READY',
          message,
        },
      });
    }
  });

  app.post('/memory/store', async (req, res, next) => {
    try {
      const input = MemoryStoreInputSchema.parse(req.body);
      const data = await provider.store(input);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  app.post('/memory/search', async (req, res, next) => {
    try {
      const input = MemorySearchInputSchema.parse(req.body);
      const data = await provider.search(input);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  app.post('/memory/analysis', async (req, res, next) => {
    try {
      const input = MemoryAnalysisInputSchema.parse(req.body);
      const data = await provider.analysis(input);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  app.post('/memory/relationships', async (req, res, next) => {
    try {
      const input = MemoryRelationshipsInputSchema.parse(req.body);
      const data = await provider.relationships(input);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  app.post('/memory/stats', async (req, res, next) => {
    try {
      const input = MemoryStatsInputSchema.parse(req.body ?? {});
      const data = await provider.stats(input);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  app.post('/maintenance/optimize', async (_req, res, next) => {
    try {
      await provider.optimize?.();
      res.json({ success: true, data: { optimized: true } });
    } catch (error) {
      next(error);
    }
  });

  app.post('/maintenance/cleanup', async (_req, res, next) => {
    try {
      await provider.cleanup?.();
      res.json({ success: true, data: { cleaned: true } });
    } catch (error) {
      next(error);
    }
  });

  // Error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ err: error }, 'Local-Memory request failed');
    res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message,
      },
    });
  });

  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully');
    await provider.cleanup?.();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    await provider.cleanup?.();
    process.exit(0);
  });

  return app;
}

export async function startLocalMemoryServer(options: LocalMemoryServerOptions = {}) {
  const port = options.port ?? parseInt(process.env.LOCAL_MEMORY_PORT || '9400', 10);
  const host = (options.host ?? process.env.LOCAL_MEMORY_HOST) || '0.0.0.0';

  const app = await createLocalMemoryApp();

  return new Promise<void>((resolve) => {
    app.listen(port, host, () => {
      logger.info({ host, port }, 'Local-Memory service started');
      resolve();
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startLocalMemoryServer().catch((error) => {
    logger.error({ err: error }, 'Failed to start Local-Memory service');
    process.exit(1);
  });
}
