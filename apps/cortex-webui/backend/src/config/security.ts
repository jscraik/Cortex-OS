// Security configuration for Cortex WebUI backend
// brAInwav security standards and settings

import { z } from 'zod';

const securityEnvSchema = z.object({
	// API Key Configuration
	BRAINWAV_API_KEY: z.string()
		.min(32, 'brAInwav API key must be at least 32 characters')
		.regex(/^brainwav-/, 'brAInwav API key must start with "brainwav-"'),

	// CSRF Protection
	CSRF_SECRET: z.string()
		.min(32, 'CSRF secret must be at least 32 characters')
		.default('brainwav-default-csrf-secret-change-in-production'),

	// Session Security
	SESSION_SECRET: z.string()
		.min(32, 'Session secret must be at least 32 characters')
		.default('brainwav-default-session-secret-change-in-production'),

	// Security Headers
	SECURITY_HEADERS_ENABLED: z.coerce.boolean().default(true),
	HSTS_MAX_AGE: z.coerce.number().default(31536000), // 1 year
	ENABLE_CSP: z.coerce.boolean().default(true),

	// Input Validation
	MAX_REQUEST_SIZE: z.coerce.number().default(10 * 1024 * 1024), // 10MB
	MAX_FIELD_LENGTH: z.coerce.number().default(10000),

	// Rate Limiting for Security Endpoints
	SECURITY_RATE_LIMIT_WINDOW: z.coerce.number().default(15 * 60 * 1000), // 15 minutes
	SECURITY_RATE_LIMIT_MAX: z.coerce.number().default(10), // 10 attempts per window

	// Security Monitoring
	ENABLE_SECURITY_LOGGING: z.coerce.boolean().default(true),
	SECURITY_LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('warn'),

	// API Key Settings
	API_KEY_HEADER_NAME: z.string().default('X-API-Key'),
	API_KEY_EXPIRY_HOURS: z.coerce.number().default(24), // 24 hours

	// Session Settings
	SESSION_TIMEOUT_MINUTES: z.coerce.number().default(30),
	SESSION_SECURE_COOKIE: z.coerce.boolean().default(true),

	// CORS Security
	ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),
	ALLOWED_METHODS: z.string().default('GET,POST,PUT,DELETE,OPTIONS'),
	ALLOWED_HEADERS: z.string().default('Content-Type,Authorization,X-API-Key,X-Requested-With,X-CSRF-Token'),

	// Content Security Policy
	CSP_SCRIPT_SRC: z.string().default("'self' 'unsafe-inline' 'unsafe-eval'"),
	CSP_STYLE_SRC: z.string().default("'self' 'unsafe-inline'"),
	CSP_IMG_SRC: z.string().default("'self' data: https:"),
	CSP_CONNECT_SRC: z.string().default("'self'"),
	CSP_FONT_SRC: z.string().default("'self'"),
	CSP_OBJECT_SRC: z.string().default("'none'"),
	CSP_MEDIA_SRC: z.string().default("'self'"),
	CSP_FRAME_SRC: z.string().default("'none'"),
	CSP_FRAME_ANCESTORS: z.string().default("'none'"),
	CSP_BASE_URI: z.string().default("'self'"),
	CSP_FORM_ACTION: z.string().default("'self'"),

	// Additional Security Headers
	X_FRAME_OPTIONS: z.enum(['DENY', 'SAMEORIGIN', 'ALLOW-FROM']).default('DENY'),
	X_CONTENT_TYPE_OPTIONS: z.string().default('nosniff'),
	X_XSS_PROTECTION: z.string().default('1; mode=block'),
	REFERRER_POLICY: z.enum(['no-referrer', 'no-referrer-when-downgrade', 'origin', 'origin-when-cross-origin', 'same-origin', 'strict-origin', 'strict-origin-when-cross-origin', 'unsafe-url']).default('strict-origin-when-cross-origin'),

	// Feature Flags
	ENABLE_API_KEY_AUTH: z.coerce.boolean().default(true),
	ENABLE_CSRF_PROTECTION: z.coerce.boolean().default(true),
	ENABLE_INPUT_SANITIZATION: z.coerce.boolean().default(true),
	ENABLE_SESSION_HARDENING: z.coerce.boolean().default(true)
});

export type SecurityEnv = z.infer<typeof securityEnvSchema>;

export const loadSecurityConfig = (): SecurityEnv => {
	try {
		return securityEnvSchema.parse(process.env);
	} catch (error) {
		console.error('brAInwav Security Configuration Error:', error);
		throw new Error('brAInwav security configuration validation failed');
	}
};

export const getSecurityConfig = () => {
	const env = loadSecurityConfig();

	return {
		// API Key Configuration
		apiKey: {
			headerName: env.API_KEY_HEADER_NAME,
			secretKey: env.BRAINWAV_API_KEY,
			expiryHours: env.API_KEY_EXPIRY_HOURS,
			enabled: env.ENABLE_API_KEY_AUTH
		},

		// CSRF Protection
		csrf: {
			secret: env.CSRF_SECRET,
			enabled: env.ENABLE_CSRF_PROTECTION,
			tokenHeader: 'X-CSRF-Token',
			cookieName: '__Secure-brAInwav-CSRF'
		},

		// Session Security
		session: {
			secret: env.SESSION_SECRET,
			timeoutMinutes: env.SESSION_TIMEOUT_MINUTES,
			secureCookie: env.SESSION_SECURE_COOKIE,
			cookieName: '__Secure-brAInwav-Session',
			enabled: env.ENABLE_SESSION_HARDENING
		},

		// Security Headers
		headers: {
			enabled: env.SECURITY_HEADERS_ENABLED,
			hstsMaxAge: env.HSTS_MAX_AGE,
			enableCSP: env.ENABLE_CSP,
			xFrameOptions: env.X_FRAME_OPTIONS,
			xContentTypeOptions: env.X_CONTENT_TYPE_OPTIONS,
			xXssProtection: env.X_XSS_PROTECTION,
			referrerPolicy: env.REFERRER_POLICY
		},

		// Content Security Policy
		csp: {
			scriptSrc: env.CSP_SCRIPT_SRC,
			styleSrc: env.CSP_STYLE_SRC,
			imgSrc: env.CSP_IMG_SRC,
			connectSrc: env.CSP_CONNECT_SRC,
			fontSrc: env.CSP_FONT_SRC,
			objectSrc: env.CSP_OBJECT_SRC,
			mediaSrc: env.CSP_MEDIA_SRC,
			frameSrc: env.CSP_FRAME_SRC,
			frameAncestors: env.CSP_FRAME_ANCESTORS,
			baseUri: env.CSP_BASE_URI,
			formAction: env.CSP_FORM_ACTION
		},

		// Input Validation
		validation: {
			maxRequestSize: env.MAX_REQUEST_SIZE,
			maxFieldLength: env.MAX_FIELD_LENGTH,
			enabled: env.ENABLE_INPUT_SANITIZATION
		},

		// CORS Security
		cors: {
			allowedOrigins: env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()),
			allowedMethods: env.ALLOWED_METHODS.split(',').map(method => method.trim()),
			allowedHeaders: env.ALLOWED_HEADERS.split(',').map(header => header.trim())
		},

		// Security Rate Limiting
		rateLimit: {
			windowMs: env.SECURITY_RATE_LIMIT_WINDOW,
			maxAttempts: env.SECURITY_RATE_LIMIT_MAX
		},

		// Security Monitoring
		monitoring: {
			enabled: env.ENABLE_SECURITY_LOGGING,
			logLevel: env.SECURITY_LOG_LEVEL
		},

		// Branding
		brand: {
			name: 'brAInwav',
			version: '1.0',
			securityPolicyHeader: 'X-BrAInwav-Security-Policy',
			errorPrefix: 'brAInwav Security Error'
		}
	} as const;
};

// Helper function to validate API key format
export const validateApiKeyFormat = (apiKey: string): boolean => {
	const config = getSecurityConfig();
	const apiKeyPattern = /^brainwav-[a-zA-Z0-9]{32,}$/;
	return apiKeyPattern.test(apiKey) && apiKey === config.apiKey.secretKey;
};

// Helper function to generate CSRF token
export const generateCsrfToken = (): string => {
	const config = getSecurityConfig();
	const timestamp = Date.now().toString();
	const random = Math.random().toString(36).substring(2);
	return `${timestamp}-${random}`;
};

// Helper function to validate CSRF token
export const validateCsrfToken = (token: string, sessionToken: string): boolean => {
	return token && sessionToken && token === sessionToken;
};

// Helper function to build CSP header
export const buildCspHeader = (): string => {
	const config = getSecurityConfig();
	const csp = config.csp;

	return [
		`default-src 'self'`,
		`script-src ${csp.scriptSrc}`,
		`style-src ${csp.styleSrc}`,
		`img-src ${csp.imgSrc}`,
		`connect-src ${csp.connectSrc}`,
		`font-src ${csp.fontSrc}`,
		`object-src ${csp.objectSrc}`,
		`media-src ${csp.mediaSrc}`,
		`frame-src ${csp.frameSrc}`,
		`frame-ancestors ${csp.frameAncestors}`,
		`base-uri ${csp.baseUri}`,
		`form-action ${csp.formAction}`,
		`block-all-mixed-content`,
		`upgrade-insecure-requests`
	].join('; ');
};

export default getSecurityConfig;