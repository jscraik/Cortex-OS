import type { Request, Response, NextFunction } from 'express';

interface RequestRecord {
  count: number;
  startTime: number;
}

export interface RateLimiterOptions {
  limit?: number;
  windowMs?: number;
}

export function createRateLimiter({ limit = 5, windowMs = 60_000 }: RateLimiterOptions = {}) {
  const requestMap = new Map<string, RequestRecord>();

  return function rateLimiter(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip;
    const currentTime = Date.now();

    // cleanup stale entries
    for (const [key, record] of requestMap) {
      if (currentTime - record.startTime >= windowMs) {
        requestMap.delete(key);
      }
    }

    const record = requestMap.get(ip);

    if (!record || currentTime - record.startTime >= windowMs) {
      requestMap.set(ip, { count: 1, startTime: currentTime });
      return next();
    }

    record.count += 1;
    if (record.count > limit) {
      res.status(429).send('Too Many Requests');
    } else {
      next();
    }
  };
}

export const rateLimiter = createRateLimiter();
