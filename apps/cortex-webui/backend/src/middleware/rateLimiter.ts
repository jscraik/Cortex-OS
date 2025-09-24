// Rate limiting middleware for API endpoints

import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
// Use validated config instead of legacy DEFAULT_RATE_LIMITS fallbacks
import { getRateLimitConfig } from '../config/config.js';

// Augment express Request interface to include rateLimit property
declare module 'express' {
	interface Request {
		rateLimit?: {
			resetTime?: Date;
			limit: number;
			current: number;
			remaining: number;
		};
	}
}

// Enhanced request interface to include user info
interface AuthenticatedRequest extends Request {
	user?: {
		id: string;
		email: string;
		role?: string;
	};
}

// Key generator function for rate limiting
const keyGenerator = (req: AuthenticatedRequest): string => {
	// If user is authenticated, use user ID, otherwise use IP
	if (req.user?.id) {
		return `user:${req.user.id}`;
	}
	return `ip:${req.ip}`;
};

// Skip function to exclude certain conditions from rate limiting
const skipFunction = (req: Request): boolean => {
	// Skip rate limiting for health checks
	if (req.path === '/health') {
		return true;
	}

	// Skip for OPTIONS requests (CORS preflight)
	if (req.method === 'OPTIONS') {
		return true;
	}

	return false;
};

// Custom handler for rate limit exceeded
const rateLimitHandler = (req: Request, res: Response): void => {
	res.status(429).json({
		error: 'Too Many Requests',
		message: 'Rate limit exceeded. Please try again later.',
		retryAfter: Math.round(
			req.rateLimit?.resetTime ? (req.rateLimit.resetTime.getTime() - Date.now()) / 1000 : 60,
		),
	});
};

// Lazy load validated config to avoid forcing all env vars at module import (improves test ergonomics)
let _rateLimitCfg: ReturnType<typeof getRateLimitConfig> | null = null;
const rateLimitCfg = () => {
	if (!_rateLimitCfg) {
		_rateLimitCfg = getRateLimitConfig();
	}
	return _rateLimitCfg;
};

// General API rate limiter
export const generalRateLimit = rateLimit({
	windowMs: rateLimitCfg().windowMs,
	max: rateLimitCfg().maxRequests,
	message: 'Too many requests from this IP, please try again later.',
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
	keyGenerator,
	skip: skipFunction,
	handler: rateLimitHandler,
});

// Strict rate limiter for auth endpoints
export const authRateLimit = rateLimit({
	windowMs: rateLimitCfg().windowMs,
	max: rateLimitCfg().authMaxRequests,
	message: 'Too many authentication attempts, please try again later.',
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator,
	handler: rateLimitHandler,
});

// Chat endpoints rate limiter (more generous for authenticated users)
export const chatRateLimit = rateLimit({
	windowMs: 60 * 1000, // 1 minute
	max: rateLimitCfg().chatMaxRequests,
	message: 'Too many chat messages, please slow down.',
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator,
	skip: skipFunction,
	handler: rateLimitHandler,
});

// File upload rate limiter
export const uploadRateLimit = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: rateLimitCfg().uploadMaxRequests,
	message: 'Upload limit exceeded, please try again later.',
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator,
	handler: rateLimitHandler,
});

// Admin endpoints rate limiter (very strict)
export const adminRateLimit = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 50, // 50 requests per hour
	message: 'Admin action limit exceeded.',
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator,
	handler: rateLimitHandler,
});
