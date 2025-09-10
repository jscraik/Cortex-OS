type Fn<TArgs extends any[], TReturn> = (...args: TArgs) => Promise<TReturn>;

export interface CircuitBreakerOptions {
	timeout?: number; // ms
	errorThresholdPercentage?: number; // 0-100
	resetTimeout?: number; // ms
}

export class SimpleCircuitBreaker<TArgs extends any[], TReturn> {
	private readonly fn: Fn<TArgs, TReturn>;
	private readonly timeout: number;
	private readonly errorThresholdPercentage: number;
	private readonly resetTimeout: number;
	private failures = 0;
	private successes = 0;
	private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
	private nextAttempt = 0;

	constructor(fn: Fn<TArgs, TReturn>, options: CircuitBreakerOptions = {}) {
		this.fn = fn;
		this.timeout = options.timeout ?? 3000;
		this.errorThresholdPercentage = options.errorThresholdPercentage ?? 50;
		this.resetTimeout = options.resetTimeout ?? 30000;
	}

	private get errorRate(): number {
		const total = this.failures + this.successes;
		return total === 0 ? 0 : (this.failures / total) * 100;
	}

	async fire(...args: TArgs): Promise<TReturn> {
		const now = Date.now();
		if (this.state === 'OPEN') {
			if (now >= this.nextAttempt) {
				this.state = 'HALF_OPEN';
			} else {
				throw new Error('Circuit is open');
			}
		}

		const exec = new Promise<TReturn>((resolve, reject) => {
			this.fn(...args).then(resolve, reject);
		});

		const timeout = new Promise<TReturn>((_, reject) => {
			setTimeout(() => reject(new Error('Circuit timeout')), this.timeout);
		});

		try {
			const result = await Promise.race([exec, timeout]);
			this.successes++;
			if (this.state === 'HALF_OPEN') this.state = 'CLOSED';
			return result as TReturn;
		} catch (err) {
			this.failures++;
			if (this.errorRate >= this.errorThresholdPercentage) {
				this.state = 'OPEN';
				this.nextAttempt = now + this.resetTimeout;
			}
			throw err;
		}
	}
}
