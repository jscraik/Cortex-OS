// Backend-specific constants for Cortex WebUI
// Migrated from shared/constants to establish proper domain boundaries.

export const API_BASE_PATH = '/api';
export const WS_BASE_PATH = '/ws';

// Database and filesystem paths (backend-only)
export const DATABASE_PATH = './data/cortex.db';
export const UPLOAD_DIR = './uploads';
export const LOG_DIR = './logs';

// Auth configuration (backend-only)
export const JWT_EXPIRES_IN = '24h';

// Pagination defaults (used primarily by backend)
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// NOTE: Legacy CORS, rate limit, and server config constants removed.
// Use validated helpers in config.ts instead: getCorsOptions(), getServerConfig(), getRateLimitConfig().
