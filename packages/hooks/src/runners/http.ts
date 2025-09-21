import type { HookContext, HookResult } from '../types.js';

export async function runHTTP(
	url: string,
	ctx: HookContext,
	timeoutMs: number,
): Promise<HookResult> {
	if (!url) return { action: 'emit', note: 'empty http url' };
	try {
		const controller = new AbortController();
		const t = setTimeout(() => controller.abort('timeout'), timeoutMs);
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(ctx),
			signal: controller.signal,
		});
		clearTimeout(t);
		if (!res.ok) return { action: 'deny', reason: `http ${res.status}` };
		const data = await res.json().catch(() => ({}));
		if (data?.action) return data as HookResult;
		return { action: 'emit', note: 'http ok' };
	} catch (e) {
		return { action: 'deny', reason: String((e as Error).message ?? e) };
	}
}
