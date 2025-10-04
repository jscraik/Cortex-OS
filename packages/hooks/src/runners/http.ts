import { safeFetch } from '@cortex-os/utils';
import type { HookContext, HookResult } from '../types.js';

export async function runHTTP(
	url: string,
	ctx: HookContext,
	timeoutMs: number,
): Promise<HookResult> {
	if (!url) return { action: 'emit', note: 'empty http url' };
	try {
		const endpoint = new URL(url);
		const controller = new AbortController();
		const response = await safeFetch(endpoint.toString(), {
			allowedHosts: [endpoint.hostname.toLowerCase()],
			allowedProtocols: [endpoint.protocol],
			allowLocalhost: true,
			timeout: timeoutMs,
			controller,
			fetchOptions: {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(ctx),
			},
		});
		if (!response.ok) return { action: 'deny', reason: `http ${response.status}` };
		const data = await response.json().catch(() => ({}));
		if (data?.action) return data as HookResult;
		return { action: 'emit', note: 'http ok' };
	} catch (e) {
		return { action: 'deny', reason: String((e as Error).message ?? e) };
	}
}
