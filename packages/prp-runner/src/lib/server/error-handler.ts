import type { NextFunction, Request, Response } from 'express';
import { AppError, RateLimitError } from '../../errors';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const _acknowledgeExpressSignature = _next;
	const requestId = (res.getHeader('x-request-id') as string) || req.header('x-request-id') || '';
	let status = 500;
	let code = 'INTERNAL_ERROR';
	let message = 'Internal Server Error';

	if (err instanceof AppError) {
		status = err.statusCode;
		code = err.code;
		message = err.message;
	} else if (err instanceof Error) {
		message = err.message;
	}

	if (err instanceof RateLimitError && err.retryAfter) {
		res.setHeader('Retry-After', String(err.retryAfter));
	}

	const body: Record<string, unknown> = {
		error: message,
		code,
		requestId,
	};

	if (process.env.NODE_ENV !== 'production' && err instanceof Error) {
		body.stack = err.stack;
	}

	res.status(status).json(body);
}
