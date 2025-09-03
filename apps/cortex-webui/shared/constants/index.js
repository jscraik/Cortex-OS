"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_STATUS = exports.MESSAGE_ROLES = exports.RATE_LIMIT_MAX = exports.RATE_LIMIT_WINDOW = exports.CORS_OPTIONS = exports.MAX_PAGE_SIZE = exports.DEFAULT_PAGE_SIZE = exports.LOG_DIR = exports.UPLOAD_DIR = exports.DATABASE_PATH = exports.JWT_EXPIRES_IN = exports.JWT_SECRET = exports.WS_BASE_PATH = exports.API_BASE_PATH = exports.APP_VERSION = exports.APP_NAME = void 0;
exports.APP_NAME = 'Cortex WebUI';
exports.APP_VERSION = '1.0.0';
exports.API_BASE_PATH = '/api';
exports.WS_BASE_PATH = '/ws';
exports.JWT_SECRET = process.env.JWT_SECRET || 'cortex-webui-secret';
exports.JWT_EXPIRES_IN = '24h';
exports.DATABASE_PATH = './data/cortex.db';
exports.UPLOAD_DIR = './uploads';
exports.LOG_DIR = './logs';
exports.DEFAULT_PAGE_SIZE = 20;
exports.MAX_PAGE_SIZE = 100;
exports.CORS_OPTIONS = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
};
exports.RATE_LIMIT_WINDOW = 15 * 60 * 1000;
exports.RATE_LIMIT_MAX = 100;
exports.MESSAGE_ROLES = {
    USER: 'user',
    ASSISTANT: 'assistant',
    SYSTEM: 'system',
};
exports.TOOL_STATUS = {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
};
//# sourceMappingURL=index.js.map
