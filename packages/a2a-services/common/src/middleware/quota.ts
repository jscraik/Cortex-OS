import type { NextFunction, Request, Response } from "express";
import { serviceMetrics } from '../metrics/serviceMetrics';
import { createQuotaStore, type QuotaStore } from '../quota/QuotaStore';

export interface QuotaOptions {
  /** Maximum total requests allowed */
  globalLimit: number;
  /** Time window in milliseconds for quota reset (default: 1 hour) */
  windowMs?: number;
}

export function createQuota({ globalLimit, windowMs = 60 * 60 * 1000 }: QuotaOptions) {
  let storePromise: Promise<QuotaStore> | undefined;
  function getStore() {
    storePromise ??= createQuotaStore();
    return storePromise;
  }
  return async function quota(req: Request, res: Response, next: NextFunction) {
    const store = await getStore();
    const result = await store.incrGlobal(windowMs, globalLimit);
    if (result === 'limit') {
      serviceMetrics().incQuotaGlobal();
      res.status(429).send("Quota exceeded");
      return;
    }
    next();
  };
}
