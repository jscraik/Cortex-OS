import { createId } from '@paralleldrive/cuid2';
import type { Context, Next } from 'hono';

export const requestId = async (c: Context, next: Next) => {
	const requestId =
		(c.req.raw.headers instanceof Headers ? c.req.raw.headers.get('X-Request-ID') : null) ||
		createId();
	c.set('requestId', requestId);
	c.header('X-Request-ID', requestId);

	await next();
};
