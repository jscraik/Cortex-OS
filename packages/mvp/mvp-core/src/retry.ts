export type RetryPolicy = {
	maxRetries: number;
	backoffMs: number;
	jitter?: boolean;
};

export async function retry<T>(
	fn: () => Promise<T>,
	policy: RetryPolicy,
): Promise<T> {
	let attempt = 0;
	let lastErr: any;
	while (attempt <= policy.maxRetries) {
		try {
			return await fn();
		} catch (e) {
			lastErr = e;
			if (attempt++ === policy.maxRetries) break;
			const j = policy.jitter
				? Math.floor(Math.random() * policy.backoffMs)
				: 0;
			await new Promise((r) => setTimeout(r, policy.backoffMs + j));
		}
	}
	throw lastErr;
}
