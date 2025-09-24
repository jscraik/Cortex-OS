import express, { type Express } from 'express';
import type { ASBRAIMcpServer } from '../../asbr-ai-mcp-server.js';
import { applyMetrics } from '../../monitoring/metrics.js';
import { applyLogging } from '../../observability/logging.js';
import { createAdminRouter } from './admin-router.js';
import { errorHandler } from './error-handler.js';
import { applyServerHardening } from './hardening.js';
import { createHealthRouter } from './health-router.js';
import { createToolsRouter } from './tools-router.js';

export interface CreateAppOptions {
	jsonLimit?: string;
}

export function createApp(mcpServer: ASBRAIMcpServer, opts: CreateAppOptions = {}): Express {
	const app = express();
	applyServerHardening(app, { jsonLimit: opts.jsonLimit ?? '100kb' });
	applyLogging(app);
	const { ai } = applyMetrics(app, { metricsKeyEnv: 'METRICS_KEY' });
	app.use('/health', createHealthRouter(mcpServer));
	app.use('/mcp/tools', createToolsRouter(mcpServer, ai));
	app.use('/admin', createAdminRouter());
	// Error handler last
	app.use(errorHandler);
	return app;
}
