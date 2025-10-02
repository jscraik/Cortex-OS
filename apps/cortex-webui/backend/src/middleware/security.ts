// Security middleware for Cortex WebUI backend
// Phase 1.2 security hardening with brAInwav standards

import DOMPurify from 'dompurify';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { JSDOM } from 'jsdom';
import {
	generateCsrfToken,
	getSecurityConfig,
	validateApiKeyFormat,
	validateCsrfToken,
} from '../config/security.js';

// Initialize DOMPurify with JSDOM
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Augment Express Request interface for security context
declare module 'express' {
	interface Request {
		securityContext?: {
			csrfToken?: string;
			apiKeyValid?: boolean;
			inputSanitized?: boolean;
		};
	}
}

// Security Headers Middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
	const config = getSecurityConfig();

	if (!config.headers.enabled) {
		next();
		return;
	}

	// Apply helmet with custom configuration
	helmet({
		contentSecurityPolicy: config.headers.enableCSP
			? {
				directives: {
					defaultSrc: ["'self'"],
					scriptSrc: config.csp.scriptSrc.split(' '),
					styleSrc: config.csp.styleSrc.split(' '),
					imgSrc: config.csp.imgSrc.split(' '),
					connectSrc: config.csp.connectSrc.split(' '),
					fontSrc: config.csp.fontSrc.split(' '),
					objectSrc: config.csp.objectSrc.split(' '),
					mediaSrc: config.csp.mediaSrc.split(' '),
					frameSrc: config.csp.frameSrc.split(' '),
					frameAncestors: config.csp.frameAncestors.split(' '),
					baseUri: config.csp.baseUri.split(' '),
					formAction: config.csp.formAction.split(' '),
					blockAllMixedContent: [],
					upgradeInsecureRequests: [],
				},
			}
			: false,
		hsts: {
			maxAge: config.headers.hstsMaxAge,
			includeSubDomains: true,
			preload: true,
		},
		frameguard: {
			action: config.headers.xFrameOptions as any,
		},
		noSniff: true,
		xssFilter: true,
		referrerPolicy: {
			policy: config.headers.referrerPolicy as any,
		},
	})(req, res, () => {
		// Add brAInwav branding headers
		res.setHeader(
			config.brand.securityPolicyHeader,
			`${config.brand.name}-secured-v${config.brand.version}`,
		);
		res.setHeader('X-BrAInwav-Security-Enabled', 'true');
		res.setHeader('X-BrAInwav-Security-Timestamp', new Date().toISOString());

		next();
	});
};

// Custom CSRF Protection Middleware
export const customCsrfProtection = (req: Request, res: Response, next: NextFunction): void => {
	const config = getSecurityConfig();

	if (!config.csrf.enabled) {
		next();
		return;
	}

	// Skip CSRF for safe HTTP methods
	const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
	if (safeMethods.includes(req.method?.toUpperCase() || '')) {
		next();
		return;
	}

	// For state-changing methods, require CSRF token
	const csrfToken = req.headers[
		config.csrf.tokenHeader.toLowerCase() as keyof typeof req.headers
	] as string;
	const sessionToken = req.session?.csrfToken;

	if (!csrfToken) {
		res.status(403).json({
			error: `${config.brand.errorPrefix}: CSRF token required`,
			brand: config.brand.name,
		});
		return;
	}

	if (!validateCsrfToken(csrfToken, sessionToken || '')) {
		res.status(403).json({
			error: `${config.brand.errorPrefix}: Invalid CSRF token`,
			brand: config.brand.name,
		});
		return;
	}

	next();
};

// CSRF Token Generation Middleware
export const generateCsrfTokenMiddleware = (
	req: Request,
	res: Response,
	next: NextFunction,
): void => {
	const config = getSecurityConfig();

	if (!config.csrf.enabled) {
		next();
		return;
	}

	// Generate CSRF token if not present in session
	if (!req.session?.csrfToken) {
		const token = generateCsrfToken();
		req.session.csrfToken = token;
		req.securityContext = req.securityContext || {};
		req.securityContext.csrfToken = token;

		// Set CSRF token in secure cookie
		res.cookie(config.csrf.cookieName, token, {
			httpOnly: true,
			secure: config.session.secureCookie,
			sameSite: 'strict',
			maxAge: 60 * 60 * 1000, // 1 hour
			brand: config.brand.name,
		});
	}

	next();
};

// Input Sanitization Middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
	const config = getSecurityConfig();

	if (!config.validation.enabled) {
		next();
		return;
	}

	const sanitizeObject = (obj: any): any => {
		if (!obj || typeof obj !== 'object') {
			return obj;
		}

		const sanitized: any = Array.isArray(obj) ? [] : {};

		for (const [key, value] of Object.entries(obj)) {
			if (typeof value === 'string') {
				// Check if string exceeds maximum length
				if (value.length > config.validation.maxFieldLength) {
					sanitized[key] = value.substring(0, config.validation.maxFieldLength);
				} else {
					// Sanitize against XSS attacks
					sanitized[key] = purify.sanitize(value, {
						ALLOWED_TAGS: [],
						ALLOWED_ATTR: [],
					});
				}
			} else if (typeof value === 'object' && value !== null) {
				sanitized[key] = sanitizeObject(value);
			} else {
				sanitized[key] = value;
			}
		}

		return sanitized;
	};

	try {
		// Sanitize request body
		if (req.body) {
			req.body = sanitizeObject(req.body);
		}

		// Sanitize query parameters
		if (req.query) {
			req.query = sanitizeObject(req.query);
		}

		// Sanitize URL parameters
		if (req.params) {
			req.params = sanitizeObject(req.params);
		}

		// Mark request as sanitized
		req.securityContext = req.securityContext || {};
		req.securityContext.inputSanitized = true;

		next();
	} catch (error) {
		console.error('brAInwav Input Sanitization Error:', error);
		res.status(400).json({
			error: `${config.brand.errorPrefix}: Input sanitization failed`,
			brand: config.brand.name,
		});
		return;
	}
};

// API Key Authentication Middleware
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction): void => {
	const config = getSecurityConfig();

	if (!config.apiKey.enabled) {
		next();
		return;
	}

	const apiKey = req.headers[
		config.apiKey.headerName.toLowerCase() as keyof typeof req.headers
	] as string;

	if (!apiKey) {
		res.status(401).json({
			error: `${config.brand.errorPrefix}: API key required`,
			brand: config.brand.name,
		});
		return;
	}

	if (!validateApiKeyFormat(apiKey)) {
		res.status(401).json({
			error: `${config.brand.errorPrefix}: Invalid API key format`,
			brand: config.brand.name,
		});
		return;
	}

	// Mark request as API authenticated
	req.securityContext = req.securityContext || {};
	req.securityContext.apiKeyValid = true;

	next();
};

// Session Security Enhancement Middleware
export const enhanceSessionSecurity = (req: Request, res: Response, next: NextFunction): void => {
	const config = getSecurityConfig();

	if (!config.session.enabled) {
		next();
		return;
	}

	try {
		// Regenerate session ID to prevent fixation
		if (req.session && !req.session.regenerated) {
			req.session.regenerate((err: any) => {
				if (err) {
					console.error('brAInwav Session Regeneration Error:', err);
					return next();
				}

				req.session.regenerated = true;
				req.session.cookie.maxAge = config.session.timeoutMinutes * 60 * 1000;

				// Set secure session cookie with brAInwav branding
				res.cookie(config.session.cookieName, req.sessionID, {
					httpOnly: true,
					secure: config.session.secureCookie,
					sameSite: 'strict',
					maxAge: config.session.timeoutMinutes * 60 * 1000,
					brand: config.brand.name,
				});

				next();
			});
		} else {
			// Touch session to extend timeout
			if (req.session) {
				req.session.touch();
				req.session.cookie.maxAge = config.session.timeoutMinutes * 60 * 1000;
			}
			next();
		}
	} catch (error) {
		console.error('brAInwav Session Security Error:', error);
		next(); // Don't block request on session errors
	}
};

// Request Size Validation Middleware
export const validateRequestSize = (req: Request, res: Response, next: NextFunction): void => {
	const config = getSecurityConfig();

	// Check content-length header if available
	const contentLength = parseInt(req.headers['content-length'] || '0', 10);
	if (contentLength > config.validation.maxRequestSize) {
		res.status(413).json({
			error: `${config.brand.errorPrefix}: Request size exceeds limit`,
			brand: config.brand.name,
			maxSize: config.validation.maxRequestSize,
		});
		return;
	}

	next();
};

// Security Logging Middleware
export const securityLogger = (req: Request, res: Response, next: NextFunction): void => {
	const config = getSecurityConfig();

	if (!config.monitoring.enabled) {
		next();
		return;
	}

	const startTimestamp = Date.now();

	// Log request details for security monitoring
	if (config.monitoring.logLevel === 'debug') {
		console.log(`brAInwav Security Log - Request: ${req.method} ${req.path}`, {
			ip: req.ip,
			userAgent: req.headers['user-agent'],
			apiKeyValid: req.securityContext?.apiKeyValid,
			inputSanitized: req.securityContext?.inputSanitized,
			timestamp: new Date().toISOString(),
		});
	}

	// Override end to log response
	const originalEnd = res.end;
	res.end = function (...args: any[]) {
		const duration = Date.now() - startTimestamp;

		if (res.statusCode >= 400) {
			console.warn(
				`brAInwav Security Warning - Response: ${res.statusCode} ${req.method} ${req.path}`,
				{
					duration,
					ip: req.ip,
					timestamp: new Date().toISOString(),
				},
			);
		}

		return originalEnd.apply(this, args);
	};

	next();
};

// Error Handler for Security Violations
export const securityErrorHandler = (
	error: Error,
	req: Request,
	res: Response,
	_next: NextFunction,
): void => {
	const config = getSecurityConfig();

	// Log security error
	console.error('brAInwav Security Error:', {
		error: error.message,
		stack: error.stack,
		path: req.path,
		method: req.method,
		ip: req.ip,
		timestamp: new Date().toISOString(),
	});

	// Don't expose internal errors to client
	const isSecurityError =
		error.message.includes(config.brand.name) ||
		error.message.includes('CSRF') ||
		error.message.includes('API key') ||
		error.message.includes('sanitization');

	if (isSecurityError) {
		res.status(403).json({
			error: error.message,
			brand: config.brand.name,
		});
		return;
	}

	// For other errors, don't expose details
	res.status(500).json({
		error: `${config.brand.errorPrefix}: Internal security error`,
		brand: config.brand.name,
	});
};

// Comprehensive Security Middleware Chain
export const applySecurityMiddleware = (app: any): void => {
	const _config = getSecurityConfig();

	// Apply security headers first
	app.use(securityHeaders);

	// Request size validation
	app.use(validateRequestSize);

	// Security logging
	app.use(securityLogger);

	// CSRF token generation (before CSRF protection)
	app.use(generateCsrfTokenMiddleware);

	// Input sanitization
	app.use(sanitizeInput);

	// Session security enhancement
	app.use(enhanceSessionSecurity);

	// Note: CSRF protection and API key auth should be applied selectively
	// to routes that need them, not globally to avoid breaking health checks, etc.
};

// Re-export commonly used functions with convenient aliases
export { customCsrfProtection as csrfProtection, sanitizeInput as xssProtection };

