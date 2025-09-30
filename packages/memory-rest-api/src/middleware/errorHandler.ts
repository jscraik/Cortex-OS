import { MemoryProviderError } from '@cortex-os/memory-core';
import type { NextFunction, Request, Response } from 'express';
import { pino } from 'pino';

const logger = pino({ level: 'error' });

export interface ApiError extends Error {
	statusCode?: number;
	code?: string;
	details?: any;
}

export function errorHandler(
	error: ApiError,
	req: Request,
	res: Response,
	_next: NextFunction,
): void {
	// Log error
	logger.error('API error', {
		error: error.message,
		stack: error.stack,
		url: req.url,
		method: req.method,
		ip: req.ip,
		userAgent: req.get('User-Agent'),
	});

	// Handle specific error types
	if (error instanceof MemoryProviderError) {
		const statusCode = getStatusCodeFromErrorCode(error.code);
		res.status(statusCode).json({
			success: false,
			error: {
				code: error.code,
				message: error.message,
				details: error.details,
			},
			timestamp: new Date().toISOString(),
			path: req.path,
		});
		return;
	}

	// Handle validation errors
	if (error.name === 'ZodError') {
		res.status(400).json({
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Invalid request data',
				details: error.issues || error.errors,
			},
			timestamp: new Date().toISOString(),
			path: req.path,
		});
		return;
	}

	// Handle JWT/auth errors
	if (error.name === 'UnauthorizedError' || error.message === 'Unauthorized') {
		res.status(401).json({
			success: false,
			error: {
				code: 'UNAUTHORIZED',
				message: 'Authentication required',
			},
			timestamp: new Date().toISOString(),
			path: req.path,
		});
		return;
	}

	// Default error
	const statusCode = error.statusCode || 500;
	const message =
		process.env.NODE_ENV === 'production' && statusCode === 500
			? 'Internal server error'
			: error.message || 'Internal server error';

	res.status(statusCode).json({
		success: false,
		error: {
			code: error.code || 'INTERNAL_ERROR',
			message,
			...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
		},
		timestamp: new Date().toISOString(),
		path: req.path,
	});
}

function getStatusCodeFromErrorCode(code: string): number {
	switch (code) {
		case 'NOT_FOUND':
			return 404;
		case 'VALIDATION':
			return 400;
		case 'STORAGE':
			return 503;
		case 'NETWORK':
			return 503;
		case 'INDEX':
			return 503;
		default:
			return 500;
	}
}
