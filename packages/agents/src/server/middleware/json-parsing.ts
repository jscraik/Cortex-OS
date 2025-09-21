import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';

export const jsonParsingMiddleware = async (c: Context, next: Next) => {
	// Only process JSON content
	const contentType = c.req.header('Content-Type');
	if (contentType?.includes('application/json')) {
		try {
			await next();
		} catch (error) {
			// Handle JSON parsing errors specifically
			if (error instanceof SyntaxError && error.message.includes('JSON')) {
				throw new HTTPException(400, {
					message: 'Invalid JSON in request body',
				});
			}
			throw error;
		}
	} else if (contentType && !contentType.includes('application/json')) {
		// Require JSON content type for POST requests
		if (c.req.method === 'POST') {
			throw new HTTPException(400, {
				message: 'Content-Type must be application/json',
			});
		}
		await next();
	} else {
		await next();
	}
};
