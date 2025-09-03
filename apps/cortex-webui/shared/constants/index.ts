// Shared constants for the Cortex WebUI

export const APP_NAME = 'Cortex WebUI';
export const APP_VERSION = '1.0.0';

export const API_BASE_PATH = '/api';
export const WS_BASE_PATH = '/ws';

export const JWT_SECRET = process.env.JWT_SECRET || 'cortex-webui-secret';
export const JWT_EXPIRES_IN = '24h';

export const DATABASE_PATH = './data/cortex.db';

export const UPLOAD_DIR = './uploads';
export const LOG_DIR = './logs';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const CORS_OPTIONS = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
};

export const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
export const RATE_LIMIT_MAX = 100; // requests per window

export const MESSAGE_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
} as const;

export const TOOL_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;
