// Configuration constants for Cortex WebUI Backend

export const API_BASE_PATH = '/api';
export const WS_BASE_PATH = '/ws';

export const CORS_OPTIONS = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001')
      .split(',')
      .map(o => o.trim());
    
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With'],
};

export const DEFAULT_RATE_LIMITS = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  authMaxRequests: 5, // Strict limit for auth endpoints
  chatMaxRequests: 30, // Per minute for chat
  uploadMaxRequests: 20, // Per hour for uploads
} as const;

export const SERVER_CONFIG = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  databasePath: process.env.DATABASE_PATH || './data/cortex.db',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  logLevel: process.env.LOG_LEVEL || 'info',
} as const;