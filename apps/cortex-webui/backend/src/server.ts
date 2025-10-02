// Composable server factory for Cortex WebUI backend
// Refactored from monolithic bootstrap to testable factory pattern.

import http, { type Server as HttpServer } from 'node:http';
import path from 'node:path';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { type Express } from 'express';
import { WebSocketServer } from 'ws';
import { cacheLongTerm, cacheMediumTerm } from './middleware/cacheMiddleware.js';
import {
	createCompressionMiddleware,
	createPerformanceHealthMiddleware,
	createRequestLoggingMiddleware,
	createResponseSizeMiddleware,
	createSlowDownMiddleware,
	createSmartRateLimitMiddleware,
	createTimeoutMiddleware,
	rateLimitConfigs,
} from './middleware/performanceMiddleware.js';
import { createStaticCacheMiddleware } from './middleware/staticCacheMiddleware.js';
import {
	createHealthCheckRoutes,
	createMetricsRoutes,
	metricsMiddleware,
} from './monitoring/index.js';
import { advancedMetricsService } from './monitoring/services/advancedMetricsService.js';
import { cacheService } from './services/cacheService.js';
import { databaseService } from './services/databaseService.js';
import { createMemoryMonitoringMiddleware } from './services/memoryService.js';

dotenv.config();

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
	console.error('Unhandled Rejection at:', promise, 'reason:', reason);
	// Don't exit in development, just log
	if (process.env.NODE_ENV === 'production') {
		process.exit(1);
	}
});

process.on('uncaughtException', (error) => {
	console.error('Uncaught Exception:', error);
	if (process.env.NODE_ENV === 'production') {
		process.exit(1);
	}
});

import { safeErrorMessage, safeErrorStack } from '@cortex-os/utils';
import { initializeAuthTables } from './auth';
import { getCorsOptions, getServerConfig } from './config/config.js';
// Import constants from backend config (domain separation)
import { API_BASE_PATH, WS_BASE_PATH } from './config/constants.js';
import { getApprovals, postApproval } from './controllers/approvalsController.js';
import { getChatSession, postChatMessage, streamChatSSE } from './controllers/chatController.js';
import { getContextMap } from './controllers/contextMapController.js';
import { ConversationController } from './controllers/conversationController.js';
import { postCrawl } from './controllers/crawlController.js';
import {
	documentUploadMiddleware,
	getSupportedTypes,
	parseDocument,
} from './controllers/documentController.js';
import {
	deleteFileHandler,
	uploadFileHandler,
	uploadMiddleware,
} from './controllers/fileController.js';
import { createMessage, getMessagesByConversationId } from './controllers/messageController.js';
import { getModelById, getModels } from './controllers/modelController.js';
// Import multimodal controllers
import {
	deleteMultimodalDocument,
	getMultimodalDocument,
	getMultimodalStats,
	listMultimodalDocuments,
	multimodalUploadMiddleware,
	searchMultimodal,
	uploadMultimodalDocument,
} from './controllers/multimodalController.js';
// Import controllers
import { OAuthController } from './controllers/oauthController.js';
import { getChatTools } from './controllers/toolController.js';
import { getUiModels } from './controllers/uiModelsController.js';
import { initializeDatabaseAsync } from './db';
// MCP tool execution handlers
import { listWebuiMcpTools, mcpExecuteHandler } from './mcp/tools.js';
// Import middleware
import { authenticateToken } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
// Security middleware for Phase 1.2 hardening
import {
	apiKeyAuth,
	applySecurityMiddleware,
	customCsrfProtection,
	securityErrorHandler,
} from './middleware/security';
// Better Auth routes
import { setupBetterAuthRoutes } from './routes/better-auth-routes.js';
// Import MCP routes
import mcpRoutes from './routes/mcpRoutes.js';
// Import services
import { initializeUploadDirectory } from './services/fileService.js';
import { initializeDefaultModels } from './services/modelService.js';
import logger, { logWithContext } from './utils/logger.js';

export interface ServerComponents {
	app: Express;
	server: HttpServer;
	wss: WebSocketServer;
	start: () => Promise<void>;
	stop: () => Promise<void>;
}

// Build and configure the Express app (pure aside from DI of env/config)
export const createApp = (): Express => {
	const app = express();
	const corsOptions = getCorsOptions();

	// Apply core middleware first
	app.use(cors(corsOptions));
	app.use(express.json({ limit: '10mb' }));
	app.use(express.urlencoded({ extended: true, limit: '10mb' }));

	// Performance monitoring and optimization middleware
	app.use(createMemoryMonitoringMiddleware());
	app.use(createRequestLoggingMiddleware());
	app.use(createResponseSizeMiddleware());
	app.use(metricsMiddleware());

	// Advanced compression with Brotli support
	app.use(
		createCompressionMiddleware({
			threshold: 1024,
			level: 6,
		}),
	);

	// Rate limiting (configurable per endpoint)
	app.use('/api', createSmartRateLimitMiddleware(rateLimitConfigs.api));
	app.use('/api/auth', rateLimitConfigs.auth);
	app.use('/api/upload', rateLimitConfigs.upload);
	app.use('/api/search', ...rateLimitConfigs.search);

	// Progressive slowdown for approaching limits
	app.use(
		'/api',
		createSlowDownMiddleware({
			delayAfter: 80,
			delayMs: 200,
			maxDelayMs: 3000,
		}),
	);

	// Request timeout
	app.use('/api', createTimeoutMiddleware(30000)); // 30 seconds

	// Static asset serving with CDN headers
	app.use(
		'/uploads',
		createStaticCacheMiddleware({
			rootDir: path.join(__dirname, '../uploads'),
			maxAge: 86400, // 24 hours
			immutableMaxAge: 31536000, // 1 year for versioned assets
			cdnHeaders: true,
			brotli: true,
			gzip: true,
		}),
	);

	// Apply brAInwav security middleware (Phase 1.2 hardening)
	applySecurityMiddleware(app);

	// Enhanced health check routes
	app.use('/health', createHealthCheckRoutes());
	app.use('/health/performance', createPerformanceHealthMiddleware());

	// Metrics Routes (with API key authentication)
	app.use('/metrics', createMetricsRoutes());

	// API Routes
	// Better Auth routes
	setupBetterAuthRoutes(app);

	// OAuth routes
	app.get(`${API_BASE_PATH}/oauth/providers`, OAuthController.getProviders);
	app.get(`${API_BASE_PATH}/oauth/:providerId/url`, OAuthController.getOAuthURL);
	app.get(`${API_BASE_PATH}/oauth/:providerId/callback`, OAuthController.handleCallback);
	app.get(`${API_BASE_PATH}/oauth/accounts`, OAuthController.getUserAccounts);
	app.post(`${API_BASE_PATH}/oauth/link`, OAuthController.linkAccount);
	app.post(`${API_BASE_PATH}/oauth/unlink`, OAuthController.unlinkAccount);
	app.post(`${API_BASE_PATH}/oauth/refresh`, OAuthController.refreshToken);
	app.post(`${API_BASE_PATH}/oauth/revoke`, OAuthController.revokeAccess);
	app.get(`${API_BASE_PATH}/oauth/validate`, OAuthController.validateConfiguration);

	app.get(
		`${API_BASE_PATH}/conversations`,
		authenticateToken,
		ConversationController.getConversations,
	);
	app.post(
		`${API_BASE_PATH}/conversations`,
		authenticateToken,
		customCsrfProtection,
		ConversationController.createConversation,
	);
	app.get(
		`${API_BASE_PATH}/conversations/:id`,
		authenticateToken,
		ConversationController.getConversationById,
	);
	app.put(
		`${API_BASE_PATH}/conversations/:id`,
		authenticateToken,
		customCsrfProtection,
		ConversationController.updateConversation,
	);
	app.delete(
		`${API_BASE_PATH}/conversations/:id`,
		authenticateToken,
		customCsrfProtection,
		ConversationController.deleteConversation,
	);

	app.get(
		`${API_BASE_PATH}/conversations/:conversationId/messages`,
		authenticateToken,
		getMessagesByConversationId,
	);
	app.post(
		`${API_BASE_PATH}/conversations/:conversationId/messages`,
		authenticateToken,
		customCsrfProtection,
		createMessage,
	);

	app.get(`${API_BASE_PATH}/models`, cacheMediumTerm(), getModels);
	app.get(`${API_BASE_PATH}/models/:id`, cacheMediumTerm(), getModelById);
	app.get(`${API_BASE_PATH}/models/ui`, cacheLongTerm(), getUiModels);
	app.post(`${API_BASE_PATH}/crawl`, customCsrfProtection, postCrawl);

	app.get(`${API_BASE_PATH}/chat/:sessionId`, getChatSession);
	app.post(`${API_BASE_PATH}/chat/:sessionId/messages`, customCsrfProtection, postChatMessage);
	app.get(`${API_BASE_PATH}/chat/:sessionId/stream`, streamChatSSE);
	app.get(`${API_BASE_PATH}/chat/:sessionId/tools`, getChatTools);

	app.get(`${API_BASE_PATH}/context-map`, getContextMap);
	app.get(`${API_BASE_PATH}/approvals`, getApprovals);
	app.post(`${API_BASE_PATH}/approvals`, customCsrfProtection, postApproval);

	app.post(
		`${API_BASE_PATH}/files/upload`,
		authenticateToken,
		customCsrfProtection,
		uploadMiddleware,
		uploadFileHandler,
	);
	app.delete(
		`${API_BASE_PATH}/files/:id`,
		authenticateToken,
		customCsrfProtection,
		deleteFileHandler,
	);

	app.post(
		`${API_BASE_PATH}/documents/parse`,
		authenticateToken,
		customCsrfProtection,
		documentUploadMiddleware.single('document'),
		parseDocument,
	);
	app.get(`${API_BASE_PATH}/documents/supported-types`, getSupportedTypes);

	// Multimodal document processing endpoints
	app.post(
		`${API_BASE_PATH}/multimodal/upload`,
		authenticateToken,
		customCsrfProtection,
		multimodalUploadMiddleware.single('file'),
		uploadMultimodalDocument,
	);
	app.get(`${API_BASE_PATH}/multimodal/documents`, authenticateToken, listMultimodalDocuments);
	app.get(`${API_BASE_PATH}/multimodal/documents/:id`, authenticateToken, getMultimodalDocument);
	app.delete(
		`${API_BASE_PATH}/multimodal/documents/:id`,
		authenticateToken,
		customCsrfProtection,
		deleteMultimodalDocument,
	);
	app.post(
		`${API_BASE_PATH}/multimodal/search`,
		authenticateToken,
		customCsrfProtection,
		searchMultimodal,
	);
	app.get(`${API_BASE_PATH}/multimodal/stats`, authenticateToken, getMultimodalStats);

	// MCP tool execution (initial HTTP binding) - with API key authentication
	app.post(`${API_BASE_PATH}/mcp/execute`, apiKeyAuth, mcpExecuteHandler);
	app.get(`${API_BASE_PATH}/mcp/tools`, apiKeyAuth, (_req, res) => {
		res.json({
			tools: listWebuiMcpTools(),
			timestamp: new Date().toISOString(),
			brand: 'brAInwav',
		});
	});

	// Comprehensive MCP tool management API routes
	app.use(`${API_BASE_PATH}/mcp`, mcpRoutes);

	// Error handling last - with brAInwav security error handler
	app.use(securityErrorHandler);
	app.use(errorHandler);
	return app;
};

// Create full server (app + HTTP + WebSocket lifecycle)
export const createServer = (): ServerComponents => {
	const app = createApp();
	const server = http.createServer(app);
	const wss = new WebSocketServer({ server, path: WS_BASE_PATH });

	// WebSocket handling
	wss.on('connection', (ws) => {
		logger.info('ws:client_connected');

		ws.on('message', (message) => {
			logger.debug('ws:message_received', { size: message.toString().length });
			ws.send(JSON.stringify({ type: 'echo', payload: message.toString() }));
		});

		ws.on('close', () => {
			logger.info('ws:client_disconnected');
		});

		ws.send(
			JSON.stringify({
				type: 'welcome',
				payload: 'Connected to Cortex WebUI WebSocket',
			}),
		);
	});

	const start = async () => {
		const { port, nodeEnv } = getServerConfig();
		try {
			// Validate environment first
			const { validateEnvironment } = await import('./lib/env');
			validateEnvironment();
			logger.info('init:env_validation');

			// Initialize performance services
			await cacheService.connect();
			logger.info('init:cache_service');

			await databaseService.initialize();
			logger.info('init:database_service');

			await initializeDatabaseAsync();
			logger.info('init:database');

			await initializeAuthTables();
			logger.info('init:auth_tables');

			initializeDefaultModels();
			logger.info('init:default_models');
			initializeUploadDirectory();
			logger.info('init:upload_dir');

			// Initialize advanced metrics service
			advancedMetricsService.registerSLO({
				name: 'api-response-time',
				target: { p95Latency: 500 },
				window: 300,
				alertThreshold: 20,
			});

			advancedMetricsService.registerSLO({
				name: 'api-error-rate',
				target: { errorRate: 0.5 },
				window: 300,
				alertThreshold: 50,
			});

			logger.info('init:metrics_service');

			await new Promise<void>((resolve, reject) => {
				server.on('error', (err: Error) => {
					logger.error('server:listen:error', {
						message: err.message,
						stack: err.stack,
					});
					reject(err);
				});
				server.listen(port, () => {
					logWithContext('info', 'server:listening', {
						port,
						env: nodeEnv,
						apiBase: API_BASE_PATH,
						wsPath: WS_BASE_PATH,
						performanceOptimizations: true,
						cachingEnabled: true,
						monitoringEnabled: true,
					});
					resolve();
				});
			});
			logger.info('server:started:successfully');
		} catch (error) {
			logger.error('server:start_failed', {
				brand: 'brAInwav',
				message: safeErrorMessage(error),
				stack: safeErrorStack(error),
			});
			process.exit(1);
		}
	};

	const stop = async () => {
		await new Promise<void>((resolve, reject) => {
			server.close((err) => (err ? reject(err) : resolve()));
		});
		wss.clients.forEach((client) => {
			client.terminate();
		});
		logger.info('server:stopped');
	};

	return { app, server, wss, start, stop };
};

// Backward-compatible auto-start when invoked directly (node src/server.ts)
if (require.main === module) {
	const { start } = createServer();
	void start();
}
// Export for tests & programmatic usage
export default createServer;
