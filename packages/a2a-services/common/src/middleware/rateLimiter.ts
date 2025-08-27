import { Request, Response, NextFunction } from 'express';

interface RequestRecord {
  count: number;
  startTime: number;
}

const requestMap = new Map<string, RequestRecord>();
const LIMIT = 5; // Max 5 requests
const WINDOW_SIZE = 60 * 1000; // 1 minute

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip; // In a real application, use a more robust identifier
  const currentTime = Date.now();

  let record = requestMap.get(ip);

  if (!record || currentTime - record.startTime > WINDOW_SIZE) {
    // New window or window reset
    record = { count: 1, startTime: currentTime };
    requestMap.set(ip, record);
    next();
  } else {
    // Within the current window
    record.count++;
    requestMap.set(ip, record);

    if (record.count > LIMIT) {
      res.status(429).send('Too Many Requests');
    } else {
      next();
    }
  }
}