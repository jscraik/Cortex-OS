// Mock Prometheus client interfaces since we can't install the actual package
interface Counter {
	inc(value?: number): void;
	inc(labels: Record<string, string>, value?: number): void;
}

interface Histogram {
	observe(value: number): void;
	observe(labels: Record<string, string>, value: number): void;
	startTimer(): () => void;
	startTimer(labels: Record<string, string>): () => void;
}

interface Gauge {
	set(value: number): void;
	set(labels: Record<string, string>, value: number): void;
	inc(value?: number): void;
	inc(labels: Record<string, string>, value?: number): void;
	dec(value?: number): void;
	dec(labels: Record<string, string>, value?: number): void;
}

interface Registry {
	metrics(): string;
}

// Mock implementations
const createCounter = (): Counter => ({
	inc: () => {},
});

const createHistogram = (): Histogram => ({
	observe: () => {},
	startTimer: () => () => {},
});

const createGauge = (): Gauge => ({
	set: () => {},
	inc: () => {},
	dec: () => {},
});

const mockRegistry: Registry = {
	metrics: () => '# Mock metrics\n',
};

export class A2AMetrics {
	private readonly registry = mockRegistry;

	// Message metrics
	readonly messagesPublished = createCounter();
	readonly messagesProcessed = createCounter();
	readonly messageProcessingDuration = createHistogram();
	readonly queueDepth = createGauge();
	readonly authenticatedRequests = createCounter();

	// Error metrics
	readonly errors = createCounter();
	readonly authenticationFailures = createCounter();
	readonly validationFailures = createCounter();

	// Circuit breaker metrics
	readonly circuitBreakerState = createGauge();
	readonly backpressureEvents = createCounter();

	// RPC metrics
	readonly rpcRequests = createCounter();
	readonly rpcDuration = createHistogram();

	getMetrics(): string {
		return this.registry.metrics();
	}

	// Helper methods for common metric patterns
	recordMessagePublished(type: string, source: string): void {
		this.messagesPublished.inc({ type, source });
	}

	recordMessageProcessed(type: string, success: boolean): void {
		const status = success ? 'success' : 'failure';
		this.messagesProcessed.inc({ type, status });
	}

	recordProcessingTime(type: string, handler: string, durationMs: number): void {
		this.messageProcessingDuration.observe({ type, handler }, durationMs / 1000);
	}

	recordQueueDepth(queueName: string, depth: number): void {
		this.queueDepth.set({ queue: queueName }, depth);
	}

	recordError(type: string, code: string): void {
		this.errors.inc({ type, code });
	}

	recordAuthenticationResult(subject: string, success: boolean): void {
		const status = success ? 'success' : 'failure';
		this.authenticatedRequests.inc({ subject, status });

		if (!success) {
			this.authenticationFailures.inc({ reason: 'invalid_token' });
		}
	}

	recordValidationFailure(type: string, field: string): void {
		this.validationFailures.inc({ type, field });
	}

	recordBackpressureEvent(strategy: string, reason: string): void {
		this.backpressureEvents.inc({ strategy, reason });
	}

	recordRpcRequest(method: string, success: boolean, durationMs: number): void {
		const status = success ? 'success' : 'error';
		this.rpcRequests.inc({ method, status });
		this.rpcDuration.observe({ method }, durationMs / 1000);
	}

	updateCircuitBreakerState(service: string, state: 'closed' | 'open' | 'half-open'): void {
		let stateValue: number;
		if (state === 'closed') {
			stateValue = 0;
		} else if (state === 'open') {
			stateValue = 1;
		} else {
			stateValue = 2;
		}

		this.circuitBreakerState.set({ service }, stateValue);
	}
}

export const createA2AMetrics = (): A2AMetrics => {
	return new A2AMetrics();
};
