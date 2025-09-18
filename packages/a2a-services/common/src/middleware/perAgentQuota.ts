import type { NextFunction, Request, Response } from 'express';
import { serviceMetrics } from '../metrics/serviceMetrics';
import { createQuotaStore, type QuotaStore } from '../quota/QuotaStore';

export interface PerAgentQuotaOptions {
	globalLimit: number; // overall cap within window
	perAgentLimit: number; // per agent cap within window
	windowMs?: number; // rolling window (default 1h)
	identifyAgent?: (req: Request) => string | undefined; // extracts agent id
}

/**
 * In-memory per-agent quota middleware.
 * NOT production-grade (needs distributed store) but provides deterministic behavior for tests.
 */
export function createPerAgentQuota({
	globalLimit,
	perAgentLimit,
	windowMs = 60 * 60 * 1000,
	identifyAgent = (req) => (req.headers['x-agent-id'] as string) || 'anonymous',
}: PerAgentQuotaOptions) {
	let storePromise: Promise<QuotaStore> | undefined;
	function getStore() {
		storePromise ??= createQuotaStore();
		return storePromise;
	}
	return async function perAgentQuota(req: Request, res: Response, next: NextFunction) {
		const store = await getStore();
		const agentId = identifyAgent(req) || 'anonymous';
		const result = await store.incrPerKey(agentId, windowMs, perAgentLimit, {
			windowMs,
			limit: globalLimit,
		});
		if (result === 'global') {
			res.status(429).json({ error: 'Global quota exceeded' });
			return;
		}
		if (result === 'limit') {
			serviceMetrics().incQuotaAgent();
			res.status(429).json({ error: 'Agent quota exceeded', agentId });
			return;
		}
		next();
	};
}
