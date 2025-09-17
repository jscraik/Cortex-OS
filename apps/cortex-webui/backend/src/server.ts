// Composable server factory for Cortex WebUI backend
// Refactored from monolithic bootstrap to testable factory pattern.

import http, { type Server as HttpServer } from 'node:http';
import path from 'node:path';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { type Express } from 'express';
import { WebSocketServer } from 'ws';

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

import { getCorsOptions, getServerConfig } from './config/config';
// Import constants from backend config (domain separation)
import { API_BASE_PATH, WS_BASE_PATH } from './config/constants';
import { getApprovals, postApproval } from './controllers/approvalsController';

// Import controllers
import { AuthController } from './controllers/authController';
import {
	getChatSession,
	postChatMessage,
	streamChatSSE,
} from './controllers/chatController';
import { getContextMap } from './controllers/contextMapController';
import { ConversationController } from './controllers/conversationController';
import { postCrawl } from './controllers/crawlController';
import {
	documentUploadMiddleware,
	getSupportedTypes,
	parseDocument,
} from './controllers/documentController';
import {
	deleteFileHandler,
	uploadFileHandler,
	uploadMiddleware,
} from './controllers/fileController';
import { MessageController } from './controllers/messageController';
import { getModelById, getModels } from './controllers/modelController';
import { getChatTools } from './controllers/toolController';
import { getUiModels } from './controllers/uiModelsController';
// MCP tool execution handlers
import { listWebuiMcpTools, mcpExecuteHandler } from './mcp/tools';
// Import middleware
import { authenticateToken } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
// Import services
import { FileService } from './services/fileService';
import { ModelService } from './services/modelService';
import { initializeDatabase } from './utils/database-temp';
import logger, { logWithContext } from './utils/logger';

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

	app.use(cors(corsOptions));
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));
	app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

	// Health (lightweight contract endpoint)
	app.get('/health', (_req, res) => {
		res.json({ status: 'OK', timestamp: new Date().toISOString() });
	});

	// API Routes
	app.post(`${API_BASE_PATH}/auth/login`, AuthController.login);
	app.post(`${API_BASE_PATH}/auth/register`, AuthController.register);
	app.post(`${API_BASE_PATH}/auth/logout`, AuthController.logout);

	app.get(
		`${API_BASE_PATH}/conversations`,
		authenticateToken,
		ConversationController.getConversations,
	);
	app.post(
		`${API_BASE_PATH}/conversations`,
		authenticateToken,
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
		ConversationController.updateConversation,
	);
	app.delete(
		`${API_BASE_PATH}/conversations/:id`,
		authenticateToken,
		ConversationController.deleteConversation,
	);

	app.get(
		`${API_BASE_PATH}/conversations/:conversationId/messages`,
		authenticateToken,
		MessageController.getMessagesByConversationId,
	);
	app.post(
		`${API_BASE_PATH}/conversations/:conversationId/messages`,
		authenticateToken,
		MessageController.createMessage,
	);

	app.get(`${API_BASE_PATH}/models`, getModels);
	app.get(`${API_BASE_PATH}/models/:id`, getModelById);
	app.get(`${API_BASE_PATH}/models/ui`, getUiModels);
	app.post(`${API_BASE_PATH}/crawl`, postCrawl);

	app.get(`${API_BASE_PATH}/chat/:sessionId`, getChatSession);
	app.post(`${API_BASE_PATH}/chat/:sessionId/messages`, postChatMessage);
	app.get(`${API_BASE_PATH}/chat/:sessionId/stream`, streamChatSSE);
	app.get(`${API_BASE_PATH}/chat/:sessionId/tools`, getChatTools);

	app.get(`${API_BASE_PATH}/context-map`, getContextMap);
	app.get(`${API_BASE_PATH}/approvals`, getApprovals);
	app.post(`${API_BASE_PATH}/approvals`, postApproval);

	app.post(
		`${API_BASE_PATH}/files/upload`,
		authenticateToken,
		uploadMiddleware,
		uploadFileHandler,
	);
	app.delete(
		`${API_BASE_PATH}/files/:id`,
		authenticateToken,
		deleteFileHandler,
	);

	app.post(
		`${API_BASE_PATH}/documents/parse`,
		authenticateToken,
		documentUploadMiddleware.single('document'),
		parseDocument,
	);
	app.get(`${API_BASE_PATH}/documents/supported-types`, getSupportedTypes);

	// MCP tool execution (initial HTTP binding)
	app.post(`${API_BASE_PATH}/mcp/execute`, mcpExecuteHandler);
	app.get(`${API_BASE_PATH}/mcp/tools`, (_req, res) => {
		res.json({
			tools: listWebuiMcpTools(),
			timestamp: new Date().toISOString(),
		});
	});

	// Error handling last
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
			initializeDatabase();
			logger.info('init:database');
			ModelService.initializeDefaultModels();
			logger.info('init:default_models');
			FileService.initializeUploadDirectory();
			logger.info('init:upload_dir');
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
					});
					resolve();
				});
			});
			logger.info('server:started:successfully');
		} catch (error) {
			logger.error('server:start_failed', { error });
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
