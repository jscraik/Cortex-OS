/**
 * nO Master Agent Loop - Secure Operational Endpoints Factory
 * Part of brAInwav's production-ready nO implementation
 *
 * Creates production-ready operational endpoints with comprehensive security
 *
 * Co-authored-by: brAInwav Development Team
 */

import { Router } from 'express';
import {
	createSecurityMiddleware,
	RequestValidationSchemas,
	type SecurityConfig,
	type SecurityMiddleware,
} from '../security/security-middleware.js';
import { type OperationalConfig, OperationalEndpoints } from './operational-endpoints.js';

export interface SecureOperationalConfig extends OperationalConfig {
	security?: Partial<SecurityConfig>;
	enableSecurity?: boolean;
}

/**
 * Factory function to create secure operational endpoints
 */
export function createSecureOperationalEndpoints(config: SecureOperationalConfig): {
	endpoints: OperationalEndpoints;
	router: Router;
	securityMiddleware: SecurityMiddleware | null;
} {
	// Create base operational endpoints
	const endpoints = new OperationalEndpoints(config);
	const router = Router();

	// Create security middleware if enabled
	let securityMiddleware: SecurityMiddleware | null = null;
	if (config.enableSecurity !== false) {
		securityMiddleware = createSecurityMiddleware(
			config.security || {
				cors: {
					enabled: true,
					origins: ['http://localhost:3000', 'https://*.brainwav.ai'],
					credentials: true,
				},
				headers: {
					csp: {
						enabled: true,
						policy: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';",
					},
					hsts: {
						enabled: process.env.NODE_ENV === 'production',
						maxAge: 31536000,
						includeSubDomains: true,
					},
					referrerPolicy: 'strict-origin-when-cross-origin',
				},
				rateLimiting: {
					windowMs: 15 * 60 * 1000, // 15 minutes
					maxRequests: 100,
					skipSuccessfulRequests: false,
					skipFailedRequests: false,
					standardHeaders: true,
					legacyHeaders: false,
				},
				inputValidation: {
					maxBodySize: '10mb',
					sanitizeHtml: true,
					validateJson: true,
					maxDepth: 10,
				},
				audit: {
					enabled: true,
					sensitiveFields: ['password', 'token', 'apiKey', 'secret'],
					maxLogSize: 1000,
				},
			},
		);

		// Apply security middleware to router
		router.use(securityMiddleware.getSecurityHeaders());
		router.use(securityMiddleware.getCORS());
		router.use(securityMiddleware.getRateLimit());
		router.use(securityMiddleware.auditRequest());
	}

	// Health endpoints (with validation)
	router.get(
		'/health',
		securityMiddleware?.validateInput(RequestValidationSchemas.health) ||
		((_req, _res, next) => next()),
		(req, res) => endpoints.getRouter()(req, res, () => { }),
	);

	router.get(
		'/health/live',
		securityMiddleware?.validateInput(RequestValidationSchemas.health) ||
		((_req, _res, next) => next()),
		(req, res) => endpoints.getRouter()(req, res, () => { }),
	);

	router.get(
		'/health/ready',
		securityMiddleware?.validateInput(RequestValidationSchemas.health) ||
		((_req, _res, next) => next()),
		(req, res) => endpoints.getRouter()(req, res, () => { }),
	);

	// Metrics endpoint
	if (config.enableMetrics) {
		router.get('/metrics', (req, res) => endpoints.getRouter()(req, res, () => { }));
	}

	// System info endpoint
	router.get('/info', (req, res) => endpoints.getRouter()(req, res, () => { }));

	// Admin endpoints (with enhanced validation and authentication)
	if (config.enableAdminEndpoints) {
		const adminAuth =
			config.adminAuthMiddleware ||
			((_req, res, _next) => {
				res.status(401).json({
					error: 'Authentication required',
					message: 'Admin endpoints require authentication',
					company: 'brAInwav',
				});
			});

		router.post(
			'/admin/shutdown',
			adminAuth,
			securityMiddleware?.validateInput(RequestValidationSchemas.shutdown) ||
			((_req, _res, next) => next()),
			(req, res) => endpoints.getRouter()(req, res, () => { }),
		);

		router.get(
			'/admin/health/checks',
			adminAuth,
			securityMiddleware?.validateInput(RequestValidationSchemas.admin) ||
			((_req, _res, next) => next()),
			(req, res) => endpoints.getRouter()(req, res, () => { }),
		);

		router.post(
			'/admin/health/check/:name',
			adminAuth,
			securityMiddleware?.validateInput(RequestValidationSchemas.healthCheck) ||
			((_req, _res, next) => next()),
			(req, res) => endpoints.getRouter()(req, res, () => { }),
		);

		router.get(
			'/admin/shutdown/handlers',
			adminAuth,
			securityMiddleware?.validateInput(RequestValidationSchemas.admin) ||
			((_req, _res, next) => next()),
			(req, res) => endpoints.getRouter()(req, res, () => { }),
		);
	}

	return {
		endpoints,
		router,
		securityMiddleware,
	};
}

/**
 * Default production security configuration for brAInwav
 */
export const BRAINWAV_PRODUCTION_SECURITY: SecurityConfig = {
	cors: {
		enabled: true,
		origins: [
			'https://app.brainwav.ai',
			'https://dashboard.brainwav.ai',
			'https://admin.brainwav.ai',
		],
		credentials: true,
		maxAge: 86400,
	},
	headers: {
		csp: {
			enabled: true,
			policy:
				"default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.brainwav.ai; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.brainwav.ai;",
		},
		hsts: {
			enabled: true,
			maxAge: 31536000, // 1 year
			includeSubDomains: true,
		},
		referrerPolicy: 'strict-origin-when-cross-origin',
	},
	rateLimiting: {
		windowMs: 15 * 60 * 1000, // 15 minutes
		maxRequests: 1000, // Higher limit for production
		skipSuccessfulRequests: false,
		skipFailedRequests: false,
		standardHeaders: true,
		legacyHeaders: false,
	},
	inputValidation: {
		maxBodySize: '50mb', // Larger for production file uploads
		sanitizeHtml: true,
		validateJson: true,
		maxDepth: 20,
	},
	audit: {
		enabled: true,
		sensitiveFields: [
			'password',
			'token',
			'apiKey',
			'secret',
			'authorization',
			'creditCard',
			'ssn',
			'socialSecurityNumber',
			'bankAccount',
		],
		maxLogSize: 10000, // Larger audit log for production
	},
};

/**
 * Development security configuration (more permissive)
 */
export const BRAINWAV_DEVELOPMENT_SECURITY: SecurityConfig = {
	cors: {
		enabled: true,
		origins: [
			'http://localhost:3000',
			'http://localhost:3001',
			'http://localhost:8080',
			'https://*.ngrok.io',
		],
		credentials: true,
		maxAge: 300,
	},
	headers: {
		csp: {
			enabled: false, // Disabled for development flexibility
		},
		hsts: {
			enabled: false, // HTTPS not required in development
			maxAge: 0,
			includeSubDomains: false,
		},
		referrerPolicy: 'no-referrer-when-downgrade',
	},
	rateLimiting: {
		windowMs: 1 * 60 * 1000, // 1 minute
		maxRequests: 1000, // Very high limit for development
		skipSuccessfulRequests: true,
		skipFailedRequests: true,
		standardHeaders: true,
		legacyHeaders: false,
	},
	inputValidation: {
		maxBodySize: '100mb', // Large for development/testing
		sanitizeHtml: false, // Disabled for development ease
		validateJson: true,
		maxDepth: 50,
	},
	audit: {
		enabled: true,
		sensitiveFields: ['password', 'token', 'apiKey'],
		maxLogSize: 100, // Smaller for development
	},
};

/**
 * Create endpoints with environment-appropriate security
 */
export function createEnvironmentSecureEndpoints(config: SecureOperationalConfig) {
	const isProduction = process.env.NODE_ENV === 'production';

	return createSecureOperationalEndpoints({
		...config,
		security: isProduction ? BRAINWAV_PRODUCTION_SECURITY : BRAINWAV_DEVELOPMENT_SECURITY,
	});
}
