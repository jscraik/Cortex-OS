import type { NextFunction, Request, Response } from "express";

export interface QuotaOptions {
  /** Maximum total requests allowed */
  globalLimit: number;
  /** Time window in milliseconds for quota reset (default: 1 hour) */
  windowMs?: number;
}

export function createQuota({ globalLimit, windowMs = 60 * 60 * 1000 }: QuotaOptions) {
  let globalCount = 0;
  let windowStart = Date.now();
  return function quota(req: Request, res: Response, next: NextFunction) {
    const now = Date.now();
    if (now - windowStart >= windowMs) {
      globalCount = 0;
      windowStart = now;
    }
    if (globalCount >= globalLimit) {
      res.status(429).send("Quota exceeded");
      return;
    }
    globalCount += 1;
    next();
  };
}
