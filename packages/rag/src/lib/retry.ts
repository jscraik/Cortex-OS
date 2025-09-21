export interface RetryOptions {
	maxAttempts: number; // total attempts, including the first
	baseDelayMs?: number; // default 100ms
	jitter?: (attempt: number, delayMs: number) => number | undefined; // return override delay
	sleep?: (ms: number) => Promise<void>; // inject for tests
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function withRetry<T>(op: () => Promise<T>, opts: RetryOptions): Promise<T> {
	const maxAttempts = Math.max(1, opts.maxAttempts);
	const base = Math.max(0, opts.baseDelayMs ?? 100);
	const sleep = opts.sleep ?? defaultSleep;

	let lastErr: unknown;
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await op();
		} catch (err) {
			lastErr = err;
			if (attempt === maxAttempts) break;
			// exponential backoff: base * 2^(attempt-1)
			let delay = base * 2 ** (attempt - 1);
			if (opts.jitter) {
				const maybe = opts.jitter(attempt, delay);
				if (typeof maybe === 'number' && Number.isFinite(maybe) && maybe >= 0) delay = maybe;
			}
			await sleep(delay);
		}
	}
	if (lastErr instanceof Error) throw lastErr;
	throw new Error(String(lastErr ?? 'Unknown error'));
}
