// Shared constants for the Cortex WebUI

export const APP_NAME = 'Cortex WebUI';
export const APP_VERSION = '1.0.0';

// ===== DEPRECATED: Backend-only constants (migrate to backend/src/config/constants.ts) =====
// @deprecated Use backend/src/config/constants.ts instead
export const API_BASE_PATH = '/api';
// @deprecated Use backend/src/config/constants.ts instead
export const WS_BASE_PATH = '/ws';
// @deprecated Use backend/src/config/constants.ts instead
export const JWT_EXPIRES_IN = '24h';
// @deprecated Use backend/src/config/constants.ts instead
export const DATABASE_PATH = './data/cortex.db';
// @deprecated Use backend/src/config/constants.ts instead
export const UPLOAD_DIR = './uploads';
// @deprecated Use backend/src/config/constants.ts instead
export const LOG_DIR = './logs';
// @deprecated Use backend/src/config/constants.ts instead
export const DEFAULT_PAGE_SIZE = 20;
// @deprecated Use backend/src/config/constants.ts instead
export const MAX_PAGE_SIZE = 100;

// JWT secret intentionally NOT given a fallback; validated via backend config loader.
// Kept only for backward compatibility of import paths; will throw if accessed without env.
// @deprecated Remove entirely; use validated config in backend
export const JWT_SECRET = (() => {
	if (!process.env.JWT_SECRET) {
		throw new Error('JWT_SECRET not set. Provide via environment.');
	}
	return process.env.JWT_SECRET;
})();

// Deprecated: use backend getCorsOptions() instead.
// export const CORS_OPTIONS ... (removed)

// Deprecated: rate limiting derived from validated config (getRateLimitConfig()).

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
