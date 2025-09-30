declare module 'circuit-breaker-js' {
    export interface CircuitBreakerInstance {
        run(fn: (success: () => void, failure: () => void) => void, cb: () => void): void;
        isOpen(): boolean;
        _state?: unknown;
    }

    const CircuitBreaker: {
        new(opts: {
            timeoutDuration?: number;
            errorThreshold?: number;
            windowDuration?: number;
        }): CircuitBreakerInstance;
    };

    export default CircuitBreaker;
}
