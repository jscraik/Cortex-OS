import { Hono } from 'hono';
import { z } from 'zod';
import { errorHandler } from './middleware/error-handler';
import { requestId } from './middleware/request-id';
import { requestLimit } from './middleware/request-limit';
import { routes } from './routes';

// Request schema for agent execution
const executeAgentSchema = z.object({
	agentId: z.string(),
	input: z.string(),
	context: z.record(z.any()).optional(),
	options: z.record(z.any()).optional(),
});

// Create Hono app
const app = new Hono();

// Middleware
app.use('*', requestId);
app.use('/agents/execute', requestLimit);

// Error handler
app.onError(errorHandler);

// Routes
app.route('/', routes);

// Health check endpoint
app.get('/health', (c) => {
	return c.json({
		status: 'healthy',
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
		version: '0.1.0',
	});
});

// Export app for testing
export { app, executeAgentSchema };

// Create app function for testing
export function createApp() {
	return app.fetch;
}
