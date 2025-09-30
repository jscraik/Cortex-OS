import { ConfigurationError } from '../errors.js';

export interface CircuitBreakerOptions {
	threshold?: number;
	timeout?: number;
	resetTimeout?: number;
}

// The circuit-breaker-js package doesn't ship types; create a small local constructor type
type CircuitBreakerInstance = {
	run(fn: (success: () => void, failure: () => void) => void, cb: () => void): void;
	isOpen(): boolean;
	_state?: unknown;
};

type CircuitBreakerConstructor = new (opts: {
	timeoutDuration?: number;
	errorThreshold?: number;
	windowDuration?: number;
}) => CircuitBreakerInstance;

// We will import the constructor dynamically when first needed to avoid static resolution errors
export class CircuitBreakerManager {
	private readonly breakers: Map<string, CircuitBreakerInstance> = new Map();
	private cachedCtor?: CircuitBreakerConstructor;

	private async getCircuitBreakerCtor(): Promise<CircuitBreakerConstructor> {
		if (this.cachedCtor) return this.cachedCtor;
		// @ts-expect-error - external module has no type declarations
		const mod = await import('circuit-breaker-js');
		this.cachedCtor = mod.default as unknown as CircuitBreakerConstructor;
		return this.cachedCtor;
	}

	async getBreaker(
		name: string,
		options: CircuitBreakerOptions = {},
	): Promise<CircuitBreakerInstance> {
		let maybeBreaker = this.breakers.get(name);
		if (!maybeBreaker) {
			const CircuitBreakerImpl = await this.getCircuitBreakerCtor();
			const breaker = new CircuitBreakerImpl({
				timeoutDuration: options.timeout ?? 30000,
				errorThreshold: options.threshold ?? 50,
				windowDuration: options.resetTimeout ?? 30000,
			});
			this.breakers.set(name, breaker);
			maybeBreaker = breaker;
		}

		return maybeBreaker;
	}

	async execute<T>(
		name: string,
		fn: () => Promise<T>,
		options: CircuitBreakerOptions = {},
	): Promise<T> {
		const breaker = await this.getBreaker(name, options);

		return new Promise((resolve, reject) => {
			breaker.run(
				(success: () => void, failure: () => void) => {
					fn()
						.then((result) => {
							success();
							resolve(result);
						})
						.catch((error) => {
							failure();
							reject(error instanceof Error ? error : new Error(String(error)));
						});
				},
				() => {
					reject(new Error('Circuit breaker is open'));
				},
			);
		});
	}

	getStats(name: string) {
		const breaker = this.breakers.get(name);
		if (!breaker) {
			throw new ConfigurationError(`Circuit breaker ${name} not found`);
		}

		return {
			state: breaker._state,
			isOpen: breaker.isOpen(),
		};
	}
}

export const circuitBreaker = new CircuitBreakerManager();
