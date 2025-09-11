import type { NextFunction, Request, Response } from "express";

export interface QuotaOptions {
  /** Maximum total requests allowed */
  globalLimit: number;
}

export function createQuota({ globalLimit }: QuotaOptions) {
  let globalCount = 0;
  return function quota(req: Request, res: Response, next: NextFunction) {
    if (globalCount >= globalLimit) {
      res.status(429).send("Quota exceeded");
      return;
    }
    globalCount += 1;
    next();
  };
}
