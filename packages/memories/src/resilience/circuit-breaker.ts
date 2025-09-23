import CircuitBreaker from 'circuit-breaker-js';
import { ConfigurationError } from '../errors.js';

export interface CircuitBreakerOptions {
	threshold?: number;
	timeout?: number;
	resetTimeout?: number;
}

export class CircuitBreakerManager {
	private readonly breakers: Map<string, CircuitBreaker> = new Map();

	getBreaker(name: string, options: CircuitBreakerOptions = {}): CircuitBreaker {
		if (!this.breakers.has(name)) {
			const breaker = new CircuitBreaker({
				timeoutDuration: options.timeout ?? 30000,
				errorThreshold: options.threshold ?? 50,
				windowDuration: options.resetTimeout ?? 30000,
			});

			this.breakers.set(name, breaker);
		}

		return this.breakers.get(name)!;
	}

	async execute<T>(
		name: string,
		fn: () => Promise<T>,
		options: CircuitBreakerOptions = {},
	): Promise<T> {
		const breaker = this.getBreaker(name, options);

		return new Promise((resolve, reject) => {
			breaker.run(
				(success: () => void, failure: () => void) => {
					fn()
						.then(result => {
							success();
							resolve(result);
						})
						.catch(error => {
							failure();
							reject(error);
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
