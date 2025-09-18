import { AgentRegistry, EventBus } from '@voltagent/core';
import { createPinoLogger } from '@voltagent/logger';
import { honoServer } from '@voltagent/server-hono';
import { CortexAgent } from './src';
import { createAuthMiddleware } from './src/middleware/auth.js';
import { createInMemoryStore } from './src/store/memory-store.js';
import { wireOutbox, createOutboxMonitor, DEFAULT_OUTBOX_OPTIONS } from './src/events/outbox.js';

const logger = createPinoLogger({ name: 'CortexAgentServer' });

// Create and initialize Agent Registry
const agentRegistry = AgentRegistry.getInstance();

// Create and initialize Event Bus
const eventBus = EventBus.getInstance();
eventBus.initialize();

// Create memory store for event outbox
const memoryStore = createInMemoryStore();

// Create outbox monitor for metrics
const outboxMonitor = createOutboxMonitor(memoryStore);

try {
	agentRegistry.initialize();

	// Create Cortex Agent instance
	const agent = new CortexAgent({
		name: 'CortexAgent',
		cortex: {
			enableMLX: true,
			apiProviders: {
				openai: {
					apiKey: process.env.OPENAI_API_KEY || '',
					baseURL: process.env.OPENAI_BASE_URL,
				},
			},
		},
	});

	// Register the agent with the registry
	agentRegistry.registerAgent(agent);
	logger.info('CortexAgent initialized and registered successfully');

	// Wire up event outbox with enhanced monitoring
	await wireOutbox(
		eventBus,
		memoryStore,
		(eventType, event) => ({
			// Extended TTL for important events
			ttl: eventType.includes('error') || eventType.includes('security') ? 'PT72H' : 'PT24H',
			// Enhanced PII redaction for security events
			redactPII: eventType.includes('security') || eventType.includes('auth'),
			// Namespace by event category
			namespace: `agents:outbox:${eventType.split('.')[0]}`,
			// Smaller size limit for frequent events
			maxItemBytes: eventType.includes('heartbeat') ? 64_000 : 256_000,
		}),
		// Extended event types including workflow events
		[
			...DEFAULT_EVENT_TYPES,
			'workflow.step_started',
			'workflow.step_completed',
			'workflow.step_failed',
			'provider.thermal_warning',
			'provider.thermal_critical',
			'memory.warning',
			'memory.critical',
			'agent.heartbeat',
		],
	);
	logger.info('Event outbox wired successfully');

} catch (error) {
	logger.error('Failed to initialize CortexAgent:', error);
	process.exit(1);
}

// Create server provider
const serverProvider = honoServer({
	port: parseInt(process.env.PORT || '4310', 10),
	enableSwaggerUI: true,
});

// Create auth middleware
const auth = createAuthMiddleware({
	apiKey: process.env.API_KEY,
	rateLimitWindow: 60000,
	rateLimitMax: 100,
});

// Create server with agent registry
const server = serverProvider({
	agentRegistry,
	logger,
});

// Apply auth middleware globally, but exempt public routes
const publicRoutes = ['/health'];

// Use auth middleware for all routes except public ones
server.app.use('*', async (c, next) => {
	const path = c.req.path;
	if (publicRoutes.includes(path)) {
		return next();
	}
	return auth(c, next);
});

// Add health check endpoint (public)
server.app.get('/health', async (c) => {
	try {
		const health = await agent.getHealthStatus();
		return c.json({
			status: 'healthy',
			timestamp: new Date().toISOString(),
			...health,
			outbox: {
				enabled: true,
				stats: outboxMonitor.getStats(),
			},
		});
	} catch (error) {
		return c.json({
			status: 'unhealthy',
			timestamp: new Date().toISOString(),
			error: error instanceof Error ? error.message : 'Unknown error',
		}, 500);
	}
});

// Add metrics endpoint (protected - auth already applied globally)
server.app.get('/metrics', async (c) => {
	try {
		// Get memory store stats
		const storeStats = await memoryStore.getStats();

		// Basic metrics - in production would integrate with Prometheus/Grafana
		const metrics = {
			uptime: process.uptime(),
			memory: process.memoryUsage(),
			cpu: process.cpuUsage(),
			agentHealth: await agent.getHealthStatus(),
			outbox: outboxMonitor.getStats(),
			memoryStore: storeStats,
			version: process.env.npm_package_version || '0.1.0',
			nodeVersion: process.version,
		};
		return c.json(metrics);
	} catch (error) {
		return c.json({
			error: 'Failed to get metrics',
			detail: error instanceof Error ? error.message : 'Unknown error',
		}, 500);
	}
});

// Add outbox monitoring endpoint (protected)
server.app.get('/outbox/stats', async (c) => {
	try {
		const stats = outboxMonitor.getStats();
		const recentEvents = await outboxMonitor.getRecentEvents(10);

		return c.json({
			stats,
			recentEvents: recentEvents.map(e => ({
				id: e.id,
				type: e.metadata?.eventType,
				timestamp: e.createdAt,
				actor: e.provenance?.actor,
				size: Buffer.byteLength(e.text, 'utf8'),
			})),
		});
	} catch (error) {
		return c.json({
			error: 'Failed to get outbox stats',
			detail: error instanceof Error ? error.message : 'Unknown error',
		}, 500);
	}
});

// Add outbox query endpoint (protected)
server.app.get('/outbox/events', async (c) => {
	try {
		const query = {
			topK: parseInt(c.req.query('limit') || '100', 10),
			text: c.req.query('search') || undefined,
		};
		const namespace = c.req.query('namespace') || 'agents:outbox';

		const events = await memoryStore.searchByText(query, namespace);

		return c.json({
			events: events.map(e => ({
				id: e.id,
				type: e.metadata?.eventType,
				timestamp: e.createdAt,
				actor: e.provenance?.actor,
				workflow: e.provenance?.workflow,
				tags: e.tags,
				size: Buffer.byteLength(e.text, 'utf8'),
				metadata: e.metadata,
			})),
			total: events.length,
		});
	} catch (error) {
		return c.json({
			error: 'Failed to query events',
			detail: error instanceof Error ? error.message : 'Unknown error',
		}, 500);
	}
});

// Start server
logger.info(`Starting CortexAgent server on port ${process.env.PORT || 4310}`);
server.start();

// Graceful shutdown handler
const shutdown = async () => {
	logger.info('Shutting down gracefully...');

	try {
		// Shutdown memory store
		await memoryStore.shutdown();
		logger.info('Memory store shutdown complete');
	} catch (error) {
		logger.error('Error shutting down memory store:', error);
	}

	// Close server
	server.close?.();
	logger.info('Server shutdown complete');

	process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
