import path from 'node:path';
import { z } from 'zod';

export const Grant = z.object({
	tool: z.string(),
	actions: z.array(z.string()),
	args: z.record(z.any()).default({}),
	dataClass: z.enum(['public', 'internal', 'sensitive']).default('internal'),
	rate: z.object({ perMinute: z.number().int().min(1) }),
	fsScope: z.array(z.string()).default([]),
});
export type Grant = z.infer<typeof Grant>;

export async function loadGrant(id: string): Promise<Grant> {
	// read from .cortex/policy/tools/*.json, validate by schema
	const fs = await import('node:fs');
	const pathMod = await import('node:path');
	const filePath = pathMod.join(process.cwd(), '.cortex/policy/tools', `${id}.json`);
	const content = fs.readFileSync(filePath, 'utf-8');
	return Grant.parse(JSON.parse(content));
}

// naive in-memory rate limiter per process
const rateMap = new Map<string, number[]>();

export function enforce(grant: Grant, action: string, args: Record<string, unknown>) {
	if (!grant.actions.includes(action)) throw new Error('action not allowed');

	// fsScope check for path args
	const p = ((): string | undefined => {
		const maybePath = (args as { path?: unknown }).path;
		if (typeof maybePath === 'string') return maybePath;
		const maybeTarget = (args as { targetPath?: unknown }).targetPath;
		if (typeof maybeTarget === 'string') return maybeTarget;
		return undefined;
	})();
	if (p && grant.fsScope.length > 0) {
		const rel = path.relative(process.cwd(), p);
		const allowed = grant.fsScope.some((scope) => {
			const norm = scope.endsWith('/') ? scope : `${scope}/`;
			return rel === scope || rel.startsWith(norm);
		});
		if (!allowed) throw new Error('path not within fsScope');
	}

	// simple rate limiting using sliding window of 60s
	const key = `${grant.tool}:${action}`;
	const now = Date.now();
	const windowMs = 60_000;
	const arr = (rateMap.get(key) ?? []).filter((t) => now - t < windowMs);
	if (arr.length >= grant.rate.perMinute) throw new Error('rate limit exceeded');
	arr.push(now);
	rateMap.set(key, arr);
	return true;
}
