export declare const APP_NAME = 'Cortex WebUI';
export declare const APP_VERSION = '1.0.0';
export declare const API_BASE_PATH = '/api';
export declare const WS_BASE_PATH = '/ws';
export declare const JWT_SECRET: string;
export declare const JWT_EXPIRES_IN = '24h';
export declare const DATABASE_PATH = './data/cortex.db';
export declare const UPLOAD_DIR = './uploads';
export declare const LOG_DIR = './logs';
export declare const DEFAULT_PAGE_SIZE = 20;
export declare const MAX_PAGE_SIZE = 100;
export declare const CORS_OPTIONS: {
	origin: string;
	credentials: boolean;
};
export declare const RATE_LIMIT_WINDOW: number;
export declare const RATE_LIMIT_MAX = 100;
export declare const MESSAGE_ROLES: {
	readonly USER: 'user';
	readonly ASSISTANT: 'assistant';
	readonly SYSTEM: 'system';
};
export declare const TOOL_STATUS: {
	readonly PENDING: 'pending';
	readonly RUNNING: 'running';
	readonly COMPLETED: 'completed';
	readonly FAILED: 'failed';
};
//# sourceMappingURL=index.d.ts.map
