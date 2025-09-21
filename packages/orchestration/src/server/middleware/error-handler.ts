import { HTTPException } from 'hono/http-exception';
import type { Context, ErrorHandler } from 'hono';

export const errorHandler: ErrorHandler = (err: Error, c: Context) => {
  console.error(`[${c.get('requestId')}] Error:`, err);

  if (err instanceof HTTPException) {
    return c.json(
      {
        error: {
          code: err.status,
          message: err.message,
        },
      },
      err.status
    );
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    return c.json(
      {
        error: {
          code: 400,
          message: 'Validation Error',
          details: err.message,
        },
      },
      400
    );
  }

  // Handle other errors
  return c.json(
    {
      error: {
        code: 500,
        message: 'Internal Server Error',
      },
    },
    500
  );
};