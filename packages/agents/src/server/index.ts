import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { authMiddleware, requirePermission, securityHeaders } from '../auth/middleware';
import { HealthHandler } from './handlers/health.handler';
import { commonMiddleware, errorHandler, routeMiddleware } from './middleware';
import { agentRoutes } from './routes/agent.routes';
import { healthRoutes } from './routes/health.routes';
import { metricsRoutes } from './routes/metrics.routes';

// Get JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Create Hono app with typed variables
const app = new Hono<{
	Variables: {
		metricsCollector?: any;
		user?: any;
	};
}>();

// Create health handler for metrics collection
const healthHandler = new HealthHandler();

// Security headers (applies to all responses)
app.use('*', securityHeaders());

// Global middleware
app.use('*', ...commonMiddleware);

// Inject metrics collector into context
app.use('*', async (c, next) => {
	c.set('metricsCollector', healthHandler.getMetricsCollector());
	await next();
});

// Health check endpoint (no authentication required)
app.route('/health', healthRoutes);

// Auth endpoint for getting JWT tokens
app.post('/auth/token', async (c) => {
	const { apiKey } = await c.req.json();

	if (!apiKey) {
		throw new HTTPException(400, { message: 'API key required' });
	}

	const { validateAPIKey, getAPIKey } = await import('../auth/api-key');
	const { createUserContextFromAPIKey } = await import('../auth/permissions');

	const isValid = await validateAPIKey(apiKey);
	if (!isValid) {
		throw new HTTPException(401, { message: 'Invalid API key' });
	}

	const keyInfo = await getAPIKey(apiKey);
	if (!keyInfo) {
		throw new HTTPException(401, { message: 'Invalid API key' });
	}

	const { createAccessToken } = await import('../auth/jwt');
	const userContext = createUserContextFromAPIKey(keyInfo);

	const accessToken = await createAccessToken(
		userContext.id,
		userContext.roles,
		userContext.permissions,
		JWT_SECRET,
	);

	return c.json({
		accessToken,
		user: {
			id: userContext.id,
			roles: userContext.roles,
			permissions: userContext.permissions,
		},
	});
});

// Metrics endpoint with authentication  
app.use('/metrics/*', authMiddleware({ secret: JWT_SECRET }));
app.route('/metrics', metricsRoutes);

// Agent-specific middleware (BEFORE routes)
app.use('/agents', ...routeMiddleware['/agents/execute']);

// Apply auth and permissions to specific POST /agents/execute BEFORE routes
app.use('/agents/execute', async (c, next) => {
	// Only apply auth and permissions to POST method
	if (c.req.method === 'POST') {
		const authMw = authMiddleware({ secret: JWT_SECRET });
		await authMw(c, next);
	} else {
		// For non-POST methods, skip auth and go straight to route handler
		// This allows method validation (405) to happen before auth (401)
		await next();
	}
});

app.use('/agents/execute', async (c, next) => {
	if (c.req.method === 'POST') {
		const permissionMw = requirePermission('execute:agents');
		await permissionMw(c, next);
	} else {
		await next();
	}
});

// Agent routes (after middleware)
app.route('/agents', agentRoutes);

// Error handler
app.onError(errorHandler);

// 404 handler
app.all('*', (c) => {
	return c.json(
		{
			error: {
				code: 404,
				message: 'Not Found',
			},
		},
		404,
	);
});

// Export app for testing
export { app };

// Create app function for testing
export function createApp() {
	return app.fetch;
}
