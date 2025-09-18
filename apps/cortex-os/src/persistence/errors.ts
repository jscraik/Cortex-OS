export class OptimisticLockError extends Error {
	readonly expected?: string;
	readonly actual?: string;

	constructor(message: string, options?: { expected?: string; actual?: string }) {
		super(message);
		this.name = 'OptimisticLockError';
		this.expected = options?.expected;
		this.actual = options?.actual;
	}
}
