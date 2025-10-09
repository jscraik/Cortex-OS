import { Semaphore } from 'semaphore-promise';

export interface ExecuteOptions {
	timeout?: number;
	retries?: number;
	priority?: number;
}

export interface ExecutionResult<T = unknown> {
	success: boolean;
	result?: T;
	error?: Error;
	neuronId: string;
	executionTime: number;
}

/**
 * Concurrent executor with proper synchronization and error handling
 */
export class ConcurrentExecutor {
	private semaphore: Semaphore;
	private results = new Map<string, ExecutionResult>();
	private executing = new Set<string>();

	constructor(maxConcurrency: number = 4) {
		this.semaphore = new Semaphore(maxConcurrency);
	}

	/**
	 * Execute multiple neurons concurrently with proper synchronization
	 */
	async executeConcurrently<T = unknown>(
		neurons: Array<{
			id: string;
			execute: () => Promise<T>;
		}>,
		options: ExecuteOptions = {},
	): Promise<Map<string, ExecutionResult<T>>> {
		const promises = neurons.map(async (neuron) => {
			const { id, execute } = neuron;

			// Acquire semaphore
			const release = await this.semaphore.acquire();
			let startTime = Date.now(); // Declare startTime in the proper scope

			try {
				// Mark as executing
				this.executing.add(id);
				startTime = Date.now();

				// Execute with timeout
				const result = await this.executeWithTimeout(execute(), options.timeout || 30000);

				const executionTime = Date.now() - startTime;

				// Store successful result
				const executionResult: ExecutionResult<T> = {
					success: true,
					result,
					neuronId: id,
					executionTime,
				};

				this.results.set(id, executionResult);
				return executionResult;
			} catch (error) {
				// Handle execution errors
				const executionResult: ExecutionResult<T> = {
					success: false,
					error: error instanceof Error ? error : new Error(String(error)),
					neuronId: id,
					executionTime: Date.now() - startTime,
				};

				this.results.set(id, executionResult);
				return executionResult;
			} finally {
				// Release semaphore and cleanup
				this.executing.delete(id);
				release();
			}
		});

		// Wait for all executions to complete
		const allResults = await Promise.all(promises);

		// Convert to Map for easier access
		const resultMap = new Map<string, ExecutionResult<T>>();
		allResults.forEach((result) => {
			resultMap.set(result.neuronId, result);
		});

		return resultMap;
	}

	/**
	 * Execute with timeout and retry logic
	 */
	private async executeWithTimeout<T>(
		promise: Promise<T>,
		timeoutMs: number,
		retries: number = 2,
	): Promise<T> {
		let lastError: Error;

		for (let attempt = 1; attempt <= retries; attempt++) {
			try {
				// Create timeout promise
				const timeoutPromise = new Promise<never>((_, reject) => {
					setTimeout(() => reject(new Error(`Execution timeout after ${timeoutMs}ms`)), timeoutMs);
				});

				// Race between execution and timeout
				return await Promise.race([promise, timeoutPromise]);
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));

				// If not the last attempt, wait before retrying
				if (attempt < retries) {
					await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
				}
			}
		}

		throw lastError!;
	}

	/**
	 * Get execution results
	 */
	getResults(): Map<string, ExecutionResult> {
		return new Map(this.results);
	}

	/**
	 * Clear results
	 */
	clearResults(): void {
		this.results.clear();
	}

	/**
	 * Get currently executing neuron IDs
	 */
	getExecutingNeurons(): Set<string> {
		return new Set(this.executing);
	}

	/**
	 * Check if a neuron is currently executing
	 */
	isExecuting(neuronId: string): boolean {
		return this.executing.has(neuronId);
	}
}
