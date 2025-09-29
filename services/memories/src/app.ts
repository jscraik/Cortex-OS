import express, { type Express } from 'express';
import { checkDatabaseHealth } from './health/database.js';
import type { DatabaseHealthConfig, ServiceMetadata } from './types.js';

export type MemoriesServiceConfig = DatabaseHealthConfig;

export function createMemoriesService(config: MemoriesServiceConfig): Express {
        const app = express();
        app.disable('x-powered-by');

        app.get('/health', async (_req, res) => {
                const health = await checkDatabaseHealth(config);
                res.status(health.healthy ? 200 : 503).json({
                        brand: 'brAInwav',
                        service: 'memories',
                        backend: health.backend,
                        healthy: health.healthy,
                        error: health.error,
                        checkedAt: health.checkedAt,
                        latencyMs: health.latencyMs,
                });
        });

        app.get('/memories/stats', async (_req, res) => {
                const health = await checkDatabaseHealth(config);
                const payload: ServiceMetadata = {
                        brand: 'brAInwav',
                        service: 'memories',
                        backend: {
                                kind: config.backend,
                                healthy: health.healthy,
                        },
                        timestamp: health.checkedAt,
                };

                res.status(200).json({
                        ...payload,
                        diagnostics: {
                                latencyMs: health.latencyMs,
                                error: health.error,
                        },
                });
        });

        return app;
}
