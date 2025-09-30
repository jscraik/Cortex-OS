import { Request, Response, NextFunction } from 'express';
import { pino } from 'pino';

const logger = pino({ level: 'info' });

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random()}`;

  // Add request ID to headers
  res.setHeader('X-Request-ID', requestId);

  // Log request
  logger.info('API request', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('API response', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
    });
  });

  next();
}