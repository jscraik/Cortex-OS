// Main server file for Cortex WebUI backend

import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer } from 'ws';

// Load environment variables
dotenv.config();

// Import middleware
import { authenticateToken } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';

// Import controllers
import { AuthController } from './controllers/authController';
import { ConversationController } from './controllers/conversationController';
import { FileController, uploadMiddleware } from './controllers/fileController';
import { MessageController } from './controllers/messageController';
import { ModelController } from './controllers/modelController';

// Import services
import { FileService } from './services/fileService';
import { ModelService } from './services/modelService';
import { initializeDatabase } from './utils/database';

// Import constants
import { API_BASE_PATH, CORS_OPTIONS, WS_BASE_PATH } from '../../shared/constants';

// Create Express app
const app = express();
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server, path: WS_BASE_PATH });

// Middleware
app.use(cors(CORS_OPTIONS));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.post(`${API_BASE_PATH}/auth/login`, AuthController.login);
app.post(`${API_BASE_PATH}/auth/register`, AuthController.register);
app.post(`${API_BASE_PATH}/auth/logout`, AuthController.logout);

// Protected routes
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

app.get(`${API_BASE_PATH}/models`, ModelController.getModels);
app.get(`${API_BASE_PATH}/models/:id`, ModelController.getModelById);

app.post(
  `${API_BASE_PATH}/files/upload`,
  authenticateToken,
  uploadMiddleware,
  FileController.uploadFile,
);
app.delete(`${API_BASE_PATH}/files/:id`, authenticateToken, FileController.deleteFile);

// Error handling middleware
app.use(errorHandler);

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  console.log('WebSocket client connected');

  ws.on('message', (message) => {
    console.log('Received message:', message);
    // Echo the message back
    ws.send(JSON.stringify({ type: 'echo', payload: message.toString() }));
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });

  // Send welcome message
  ws.send(JSON.stringify({ type: 'welcome', payload: 'Connected to Cortex WebUI WebSocket' }));
});

// Initialize database and start server
const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    // Initialize database
    await initializeDatabase();
    console.log('Database initialized');

    // Initialize default models
    await ModelService.initializeDefaultModels();
    console.log('Default models initialized');

    // Initialize upload directory
    await FileService.initializeUploadDirectory();
    console.log('Upload directory initialized');

    // Start server
    server.listen(PORT, () => {
      console.log(`Cortex WebUI backend server running on port ${PORT}`);
      console.log(`API endpoints available at http://localhost:${PORT}${API_BASE_PATH}`);
      console.log(`WebSocket server available at ws://localhost:${PORT}${WS_BASE_PATH}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
