import cors from 'cors';
import express from 'express';
import { securityMiddleware } from './auth/config.js';
import { createApiBusIntegration } from './core/a2a-integration.js';
import { setupMcpTools } from './mcp/tools.js';
import authRoutes from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

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
app.get('/health', (req, res) => {
	res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
app.use(authRoutes);

// API routes (protected)
// app.use("/api", apiRoutes); // TODO: Create API routes

// A2A Integration
const apiBus = createApiBusIntegration({
	serviceName: 'api-gateway',
	version: '1.0.0',
});

// MCP Tools integration
setupMcpTools(app, apiBus);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
	console.error(err.stack);

	// Don't leak error details in production
	const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;

	res.status(err.status || 500).json({
		error: message,
		...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
	});
});

// 404 handler
app.use((req, res) => {
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
