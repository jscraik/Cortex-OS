import express, { type Express } from 'express';
import type { ASBRAIMcpServer } from '../../asbr-ai-mcp-server';
import { applyMetrics } from '../../monitoring/metrics';
import { applyLogging } from '../../observability/logging';
import { createAdminRouter } from './admin-router';
import { errorHandler } from './error-handler';
import { applyServerHardening } from './hardening';
import { createHealthRouter } from './health-router';
import { createToolsRouter } from './tools-router';

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
