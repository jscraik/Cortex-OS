import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validateRequest(schema: ZodSchema, source: 'body' | 'query' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = source === 'body' ? req.body : req.query;
      const validated = schema.parse(data);

      // Replace request data with validated data
      if (source === 'body') {
        req.body = validated;
      } else {
        req.query = validated;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = new Error('Validation failed') as any;
        validationError.name = 'ZodError';
        validationError.issues = error.issues;
        next(validationError);
      } else {
        next(error);
      }
    }
  };
}