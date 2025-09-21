import { CortexHooks } from './manager.js';
import type { HookResult } from './types.js';

const GLOBAL_SYMBOL = Symbol.for('cortex-os.hooks.singleton');
type GlobalHooksSlot = {
	hooks?: CortexHooks;
	// simple rate limiter state per key
	limiter?: Map<string, { windowStart: number; count: number }>;
};

function getGlobalSlot(): GlobalHooksSlot {
	const g = globalThis as unknown as { [k: symbol]: GlobalHooksSlot };
	if (!g[GLOBAL_SYMBOL]) g[GLOBAL_SYMBOL] = { limiter: new Map() } as GlobalHooksSlot;
	const slot = g[GLOBAL_SYMBOL];
	slot.limiter ??= new Map();
	return slot;
}

/**
 * Initialize a process-wide CortexHooks singleton, start watcher once, and
 * attach structured telemetry forwarding with rate limiting.
 */
export async function initHooksSingleton(opts?: {
	projectDir?: string;
	userDir?: string;
}): Promise<CortexHooks> {
	const slot = getGlobalSlot();
	let instance = slot.hooks;
	if (!instance) {
		instance = new CortexHooks();
		await instance.init();
		instance.watch(opts);

		// Attach observability forwarding with rate limiting (optional dependency)
		let logger: { info: (obj: unknown, msg?: string) => void } | null = null;
		// Optional Observability helpers
		type Labels = Record<string, string>;
		let recordLatency: ((op: string, ms: number, labels?: Labels) => void) | null = null;
		let recordOperation:
			| ((op: string, success: boolean, runId: string, labels?: Labels) => void)
			| null = null;
		let withSpan:
			| (<T>(
					name: string,
					fn: (
						runId: string,
						ctx: { runId: string; traceId: string; spanId: string },
					) => Promise<T>,
					options?: { attributes?: Record<string, string | number | boolean> },
			  ) => Promise<T>)
			| null = null;
		try {
			const dynamicImport = new Function('m', 'return import(m)') as (
				m: string,
			) => Promise<unknown>;
			const obsMod = (await dynamicImport('@cortex-os/observability')) as Record<string, unknown>;
			const level = (process.env.CORTEX_HOOKS_LOG_LEVEL ?? 'info') as
				| 'debug'
				| 'info'
				| 'warn'
				| 'error';
			const maybeCreate = obsMod?.createLogger;
			if (typeof maybeCreate === 'function') {
				logger = (
					maybeCreate as (
						c: string,
						l: 'debug' | 'info' | 'warn' | 'error',
					) => { info: (obj: unknown, msg?: string) => void }
				)('@cortex-os/hooks', level);
			}
			// Metrics and tracing
			if (typeof obsMod.recordLatency === 'function')
				recordLatency = obsMod.recordLatency as unknown as (
					op: string,
					ms: number,
					labels?: Labels,
				) => void;
			if (typeof obsMod.recordOperation === 'function')
				recordOperation = obsMod.recordOperation as unknown as (
					op: string,
					success: boolean,
					runId: string,
					labels?: Labels,
				) => void;
			if (typeof obsMod.withSpan === 'function')
				withSpan = obsMod.withSpan as unknown as <T>(
					name: string,
					fn: (
						runId: string,
						ctx: { runId: string; traceId: string; spanId: string },
					) => Promise<T>,
					options?: { attributes?: Record<string, string | number | boolean> },
				) => Promise<T>;
		} catch {
			// observability not available; proceed without logger
		}
		slot.limiter = slot.limiter ?? new Map();
		const WINDOW_MS = Number(process.env.CORTEX_HOOKS_TELEMETRY_WINDOW_MS ?? 10_000);
		const MAX_PER_WINDOW = Number(process.env.CORTEX_HOOKS_TELEMETRY_MAX ?? 100);

		instance.on(
			'hook:result',
			(payload: {
				event: string;
				matcher: string;
				hook: { type: string } & Record<string, unknown>;
				result: HookResult;
				ctx: Record<string, unknown>;
			}) => {
				try {
					const key = `${payload.event}:${payload.matcher}:${payload.hook.type}:${payload.result.action}`;
					const now = Date.now();
					const state = slot.limiter?.get(key) ?? { windowStart: now, count: 0 };
					if (now - state.windowStart > WINDOW_MS) {
						state.windowStart = now;
						state.count = 0;
					}
					state.count += 1;
					slot.limiter?.set(key, state);
					if (state.count > MAX_PER_WINDOW) return; // drop

					const extra = {
						event: payload.event,
						matcher: payload.matcher,
						hookType: payload.hook.type,
						action: payload.result.action,
						denied: payload.result.action === 'deny',
						mutated:
							payload.result.action === 'allow' &&
							'input' in payload.result &&
							(payload.result as { input?: unknown }).input !== undefined,
					};
					const emit = () => {
						logger?.info({ hooks: extra }, 'hook result');
					};
					if (withSpan) {
						// Wrap emission in a span and record basic metrics
						withSpan(
							'hooks.hook_result',
							async (runId: string) => {
								const start = Date.now();
								emit();
								const elapsed = Date.now() - start;
								recordLatency?.('hooks.hook_result', elapsed, {
									event: payload.event,
									action: payload.result.action,
								});
								const success = payload.result.action !== 'deny';
								let decision: string = String(payload.result.action);
								if (payload.result.action === 'deny') decision = 'deny';
								else if (payload.result.action === 'allow') decision = 'allow';
								recordOperation?.('hooks.hook_result', success, runId, {
									event: payload.event,
									action: payload.result.action,
									decision,
								});
							},
							{ attributes: { event: payload.event, action: payload.result.action } },
						);
					} else {
						emit();
						// Without tracing, still emit counters if available
						if (recordOperation) {
							const runId = 'hooks';
							const isDeny = payload.result.action === 'deny';
							let decision: string = String(payload.result.action);
							if (isDeny) decision = 'deny';
							else if (payload.result.action === 'allow') decision = 'allow';
							recordOperation('hooks.hook_result', !isDeny, runId, {
								event: payload.event,
								action: payload.result.action,
								decision,
							});
						}
					}
				} catch {
					// best-effort, never throw
				}
			},
		);

		slot.hooks = instance;
	}
	return instance;
}

export function getHooksSingleton(): CortexHooks | undefined {
	return getGlobalSlot().hooks;
}
