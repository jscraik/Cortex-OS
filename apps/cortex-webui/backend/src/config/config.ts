import { z } from 'zod';

const envSchema = z.object({
	PORT: z.coerce.number().default(3001),
	NODE_ENV: z.string().default('development'),
	FRONTEND_URL: z.string().default('http://localhost:3000'),
	ALLOWED_ORIGINS: z
		.string()
		.default('http://localhost:3000,http://localhost:3001'),

	JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
	DATABASE_PATH: z.string().min(1, 'DATABASE_PATH is required'),
	UPLOAD_DIR: z.string().default('./uploads'),
	LOG_LEVEL: z.string().default('info'),
	RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
	RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
});

export type Env = z.infer<typeof envSchema>;

export const loadConfig = (): Env => envSchema.parse(process.env);

export const getServerConfig = () => {
	const env = loadConfig();
	return {
		port: env.PORT,
		nodeEnv: env.NODE_ENV,
		jwtSecret: env.JWT_SECRET,
		frontendUrl: env.FRONTEND_URL,
		databasePath: env.DATABASE_PATH,
		uploadDir: env.UPLOAD_DIR,
		logLevel: env.LOG_LEVEL,
	} as const;
};

export const getCorsOptions = () => {
	const env = loadConfig();
	return {
		origin: (
			origin: string | undefined,
			callback: (err: Error | null, allow?: boolean) => void,
		) => {
			const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) =>
				o.trim(),
			);
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
		allowedHeaders: [
			'Content-Type',
			'Authorization',
			'X-API-Key',
			'X-Requested-With',
		],
	};
};

export const getRateLimitConfig = () => {
	const env = loadConfig();
	return {
		windowMs: env.RATE_LIMIT_WINDOW_MS,
		maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
		authMaxRequests: 5,
		chatMaxRequests: 30,
		uploadMaxRequests: 20,
	} as const;
};
