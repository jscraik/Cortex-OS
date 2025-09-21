import { setTimeout as delay } from 'node:timers/promises';
import vm from 'node:vm';
import type { HookContext, HookResult } from '../types.js';

export async function runJS(
	code: string,
	ctx: HookContext,
	timeoutMs: number,
): Promise<HookResult> {
	if (!code) return { action: 'emit', note: 'empty js code' };
	const sandbox: { ctx: HookContext; result: unknown; console: Console } = {
		ctx,
		result: undefined,
		console: minimalConsole() as unknown as Console,
	};
	const context = vm.createContext(sandbox, { name: 'cortex-hooks' });
	const script = new vm.Script(`result = (async () => { ${code}\n})();`);
	const run = async (): Promise<HookResult> => {
		await script.runInContext(context, { timeout: Math.min(timeoutMs, 5000) });
		const r = sandbox.result;
		const val = r instanceof Promise ? await r : r;
		return normalize(val);
	};
	return raceWithTimeout(run(), timeoutMs);
}

function minimalConsole() {
	const noop = () => undefined;
	return { log: noop, warn: noop, error: noop };
}

async function raceWithTimeout<T>(p: Promise<T>, ms: number): Promise<HookResult> {
	let done = false;
	const timer = (async () => {
		await delay(ms);
		if (!done) throw new Error('timeout');
	})();
	try {
		const v = (await Promise.race([p, timer])) as unknown;
		done = true;
		return normalize(v);
	} catch (e: unknown) {
		const reason = e instanceof Error ? e.message : String(e);
		return { action: 'deny', reason };
	}
}

function normalize(v: unknown): HookResult {
	if (typeof v === 'object' && v !== null && 'action' in (v as Record<string, unknown>))
		return v as HookResult;
	return { action: 'emit', note: 'js hook returned non-result' };
}
