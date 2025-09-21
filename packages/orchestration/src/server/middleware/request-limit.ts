import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';

const MAX_REQUEST_SIZE = 1024 * 1024; // 1MB

export const requestLimit = async (c: Context, next: Next) => {
  const contentLength = c.req.header('Content-Length');

  if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
    throw new HTTPException(413, {
      message: 'Request entity too large',
    });
  }

  await next();
};