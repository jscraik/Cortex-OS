import type { NextFunction, Request, Response } from 'express';
import logger, { logError } from '../utils/logger';
// Error handling middleware for Cortex WebUI backend

export class HttpError extends Error {
	constructor(
		public statusCode: number,
		message: string,
		public details?: unknown,
	) {
		super(message);
	}
}

export const errorHandler = (
	error: Error,
	_req: Request,
	res: Response,
	_next: NextFunction,
): void => {
	// Central error logging
	if (error instanceof Error) {
		logError(error);
	} else {
		logger.error('unknown_error', { value: error });
	}

	if (error instanceof HttpError) {
		res.status(error.statusCode).json({
			error: error.message,
			details: error.details,
		});
		return;
	}

	// Handle Zod validation errors
	if (error.name === 'ZodError') {
		res.status(400).json({
			error: 'Validation failed',
			details: error,
		});
		return;
	}

	// Handle database errors
	if (error.name === 'SqliteError') {
		res.status(500).json({
			error: 'Database error',
			details:
				process.env.NODE_ENV === 'development' ? error.message : undefined,
		});
		return;
	}

	// Default error
	res.status(500).json({
		error: 'Internal server error',
		details: process.env.NODE_ENV === 'development' ? error.message : undefined,
	});
};
