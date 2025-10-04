import http from 'node:http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import logger from './utils/logger.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
	logger.info('http:request', {
		method: req.method,
		url: req.url,
		userAgent: req.get('User-Agent'),
		ip: req.ip,
		brand: 'brAInwav',
	});
	next();
});

// Health check endpoint
app.get('/health', (req, res) => {
	res.json({
		status: 'ok',
		timestamp: new Date().toISOString(),
		brand: 'brAInwav',
		service: 'cortex-webui-backend',
		version: '1.0.0-full-simple',
		uptime: process.uptime(),
		memory: process.memoryUsage(),
	});
});

// API status endpoint
app.get('/api/status', (req, res) => {
	res.json({
		status: 'operational',
		services: {
			auth: 'active',
			models: 'active',
			conversations: 'active',
			messages: 'active',
			rag: 'active',
			multimodal: 'active',
			oauth: 'active',
			monitoring: 'active',
		},
		brand: 'brAInwav',
		timestamp: new Date().toISOString(),
	});
});

// Auth endpoints (placeholder)
app.post('/api/auth/login', (req, res) => {
	res.json({
		message: 'Login endpoint - placeholder implementation',
		brand: 'brAInwav',
	});
});

app.post('/api/auth/register', (req, res) => {
	res.json({
		message: 'Register endpoint - placeholder implementation',
		brand: 'brAInwav',
	});
});

app.post('/api/auth/logout', (req, res) => {
	res.json({
		message: 'Logout endpoint - placeholder implementation',
		brand: 'brAInwav',
	});
});

// Models endpoints
app.get('/api/models', (req, res) => {
	res.json({
		models: [
			{ id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
			{ id: 'claude-3', name: 'Claude 3', provider: 'Anthropic' },
			{ id: 'llama-3', name: 'Llama 3', provider: 'Meta' },
		],
		brand: 'brAInwav',
	});
});

// Conversations endpoints
app.get('/api/conversations', (req, res) => {
	res.json({
		conversations: [],
		brand: 'brAInwav',
	});
});

app.post('/api/conversations', (req, res) => {
	res.json({
		id: 'conv_' + Math.random().toString(36).substr(2, 9),
		title: req.body.title || 'New Conversation',
		brand: 'brAInwav',
	});
});

// Messages endpoints
app.get('/api/conversations/:id/messages', (req, res) => {
	res.json({
		messages: [],
		brand: 'brAInwav',
	});
});

app.post('/api/conversations/:id/messages', (req, res) => {
	res.json({
		id: 'msg_' + Math.random().toString(36).substr(2, 9),
		role: 'user',
		content: req.body.content,
		brand: 'brAInwav',
	});
});

// RAG endpoints
app.post('/api/rag/documents', (req, res) => {
	res.json({
		message: 'Document upload placeholder - RAG functionality',
		documentId: 'doc_' + Math.random().toString(36).substr(2, 9),
		brand: 'brAInwav',
	});
});

app.get('/api/rag/search', (req, res) => {
	res.json({
		results: [],
		brand: 'brAInwav',
	});
});

// Multimodal endpoints
app.post('/api/multimodal/upload', (req, res) => {
	res.json({
		message: 'Multimodal upload placeholder',
		documentId: 'mm_' + Math.random().toString(36).substr(2, 9),
		brand: 'brAInwav',
	});
});

app.get('/api/multimodal/documents', (req, res) => {
	res.json({
		documents: [],
		brand: 'brAInwav',
	});
});

// OAuth endpoints
app.get('/api/oauth/accounts', (req, res) => {
	res.json({
		accounts: [],
		brand: 'brAInwav',
	});
});

// Monitoring endpoints
app.get('/api/auth/monitoring/metrics', (req, res) => {
	res.json({
		metrics: {
			totalUsers: 0,
			activeSessions: 0,
			loginAttempts: 0,
		},
		brand: 'brAInwav',
	});
});

// Root endpoint
app.get('/', (req, res) => {
	res.json({
		message: 'brAInwav Cortex WebUI Backend API',
		version: '1.0.0-full-simple',
		status: 'running',
		endpoints: {
			health: '/health',
			status: '/api/status',
			auth: '/api/auth',
			models: '/api/models',
			conversations: '/api/conversations',
			messages: '/api/messages',
			rag: '/api/rag',
			multimodal: '/api/multimodal',
			oauth: '/api/oauth',
			monitoring: '/api/auth/monitoring',
		},
		brand: 'brAInwav',
	});
});

// 404 handler
app.use((req, res) => {
	res.status(404).json({
		error: 'Not Found',
		message: `Route ${req.originalUrl} not found`,
		brand: 'brAInwav',
		timestamp: new Date().toISOString(),
	});
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
	logger.error('http:error', {
		error: err.message,
		stack: err.stack,
		method: req.method,
		url: req.url,
		brand: 'brAInwav',
	});

	res.status(err.status || 500).json({
		error: 'Internal Server Error',
		message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
		brand: 'brAInwav',
		timestamp: new Date().toISOString(),
	});
});

// Start server
const server = http.createServer(app);

server.listen(PORT, () => {
	logger.info('server:started', {
		port: PORT,
		nodeVersion: process.version,
		environment: process.env.NODE_ENV || 'development',
		brand: 'brAInwav',
	});

	console.log(`🚀 brAInwav Cortex WebUI Backend running on port ${PORT}`);
	console.log(`Health check: http://localhost:${PORT}/health`);
	console.log(`API status: http://localhost:${PORT}/api/status`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
	logger.info('server:shutdown', { signal: 'SIGTERM', brand: 'brAInwav' });
	server.close(() => {
		logger.info('server:stopped', { brand: 'brAInwav' });
		process.exit(0);
	});
});

process.on('SIGINT', () => {
	logger.info('server:shutdown', { signal: 'SIGINT', brand: 'brAInwav' });
	server.close(() => {
		logger.info('server:stopped', { brand: 'brAInwav' });
		process.exit(0);
	});
});

export default app;