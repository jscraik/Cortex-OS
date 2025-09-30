declare module 'circuit-breaker-js' {
	export default class CircuitBreaker {
		constructor(options?: any);
		execute<T>(fn: () => Promise<T>): Promise<T>;
		isOpen(): boolean;
		close(): void;
		open(): void;
		on(event: string, handler: Function): void;
		off(event: string, handler: Function): void;
	}
}
