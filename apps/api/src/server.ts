import cors from 'cors';
import express from 'express';
import { securityMiddleware } from './auth/config.js';
import { createApiBusIntegration } from './core/a2a-integration.js';
import { StructuredLogger } from './core/observability.js';
import { setupMcpTools } from './mcp/tools.js';
import { apiV1Router } from './routes/api-v1.js';
import { authRouter } from './routes/auth.js';

type ExpressError = Error & {
	status?: number;
};

const app: express.Express = express();
const PORT = process.env.PORT || 3001;

const logger = new StructuredLogger();
app.locals.logger = logger;

// Security middleware
app.use(securityMiddleware);

// CORS configuration
app.use(
	cors({
		origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
		credentials: true,
	}),
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
	res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
app.use(authRouter);

// API routes (protected)
app.use('/api/v1', apiV1Router);

// A2A Integration
const apiBus = createApiBusIntegration(logger);
app.locals.apiBus = apiBus;

apiBus.start().catch((error) => {
	logger.error('brAInwav API bus startup failure', {
		error: error instanceof Error ? error.message : error,
	});
});

// MCP Tools integration
setupMcpTools(app, apiBus);

// Error handling middleware
app.use(
	(err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
		const error = err instanceof Error ? err : new Error('Unknown error');
		console.error(error.stack ?? error);

		const status = (error as ExpressError).status ?? 500;
		const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message;

		res.status(status).json({
			error: message,
			...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
		});
	},
);

// 404 handler
app.use((_req, res) => {
	res.status(404).json({ error: 'Not found' });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
	app.listen(PORT, () => {
		console.log(`🚀 API Gateway server running on port ${PORT}`);
		console.log(`🔗 Health check: http://localhost:${PORT}/health`);
	});
}

export { app };
