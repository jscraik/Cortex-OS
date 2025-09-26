import type { A2AEventEnvelope } from '@cortex-os/a2a-events';
import { z } from 'zod';

export const BackpressureStrategy = z.enum(['reject', 'throttle', 'drop', 'circuit_breaker']);

export const LoadMetrics = z.object({
	queueDepth: z.number().min(0),
	processingRate: z.number().min(0),
	errorRate: z.number().min(0).max(1),
	averageLatency: z.number().min(0),
	timestamp: z.string().datetime(),
});

export const BackpressureConfig = z.object({
	maxQueueDepth: z.number().int().positive().default(10000),
	throttleThreshold: z.number().min(0).max(1).default(0.8),
	backpressureStrategy: BackpressureStrategy.default('throttle'),
	loadSheddingEnabled: z.boolean().default(false),
	maxLoad: z.number().min(0).max(1).default(0.9),
	circuitBreakerThreshold: z.number().min(0).max(1).default(0.5),
	cooldownPeriodMs: z.number().int().positive().default(60000),
});

export type BackpressureStrategyType = z.infer<typeof BackpressureStrategy>;
export type LoadMetricsType = z.infer<typeof LoadMetrics>;
export type BackpressureConfigType = z.infer<typeof BackpressureConfig>;

export class BackpressureError extends Error {
	constructor(
		message: string,
		public readonly strategy: BackpressureStrategyType,
	) {
		super(message);
		this.name = 'BackpressureError';
	}
}

export class LoadManager {
	private readonly metrics: LoadMetricsType[] = [];
	private readonly maxMetricsHistory = 100;
	private circuitBreakerOpen = false;
	private lastCircuitBreakerOpenTime = 0;

	constructor(private readonly config: BackpressureConfigType) { }

	async checkBackpressure(currentQueueDepth: number): Promise<void> {
		const load = this.calculateLoad(currentQueueDepth);

		if (this.shouldRejectRequest(load, currentQueueDepth)) {
			throw new BackpressureError(
				`Load too high: ${(load * 100).toFixed(1)}%`,
				this.config.backpressureStrategy,
			);
		}

		if (this.shouldThrottleRequest(load, currentQueueDepth)) {
			await this.applyThrottling(load);
		}
	}

	recordMetrics(metrics: LoadMetricsType): void {
		this.metrics.push(metrics);

		if (this.metrics.length > this.maxMetricsHistory) {
			this.metrics.shift();
		}

		this.updateCircuitBreakerState(metrics);
	}

	shouldDropMessage(envelope: A2AEventEnvelope): boolean {
		if (!this.config.loadSheddingEnabled) return false;

		// OLD (BROKEN): envelope.priority
		// NEW (FIXED): Extract priority from headers
		const priority = envelope.headers?.priority || 'medium';
		const load = this.getCurrentLoad();

		// Drop low priority messages when under high load
		if (load > this.config.maxLoad) {
			return priority === 'low';
		}

		return false;
	}

	isCircuitBreakerOpen(): boolean {
		return this.circuitBreakerOpen;
	}

	private shouldRejectRequest(load: number, queueDepth: number): boolean {
		if (this.config.backpressureStrategy === 'reject') {
			return queueDepth >= this.config.maxQueueDepth || load > this.config.maxLoad;
		}

		if (this.config.backpressureStrategy === 'circuit_breaker') {
			return this.circuitBreakerOpen;
		}

		return false;
	}

	private shouldThrottleRequest(load: number, queueDepth: number): boolean {
		if (this.config.backpressureStrategy !== 'throttle') return false;

		const threshold = this.config.maxQueueDepth * this.config.throttleThreshold;
		return queueDepth >= threshold || load > this.config.throttleThreshold;
	}

	private async applyThrottling(load: number): Promise<void> {
		// Calculate delay based on load (exponential backoff)
		const baseDelay = 100; // 100ms base delay
		const maxDelay = 5000; // 5s max delay

		const delay = Math.min(baseDelay * 2 ** Math.floor(load * 10), maxDelay);

		await this.sleep(delay);
	}

	private calculateLoad(currentQueueDepth: number): number {
		const queueLoad = currentQueueDepth / this.config.maxQueueDepth;
		const errorRate = this.getRecentErrorRate();
		const latencyLoad = this.getLatencyLoad();

		// Weighted combination of different load factors
		return Math.min(1, queueLoad * 0.5 + errorRate * 0.3 + latencyLoad * 0.2);
	}

	private getCurrentLoad(): number {
		if (this.metrics.length === 0) return 0;

		const latestIndex = this.metrics.length - 1;
		const latest = this.metrics[latestIndex];
		if (!latest) {
			return 0;
		}

		return this.calculateLoad(latest.queueDepth);
	}

	private getRecentErrorRate(): number {
		if (this.metrics.length === 0) return 0;

		const recentMetrics = this.metrics.slice(-10); // Last 10 entries
		const totalErrorRate = recentMetrics.reduce((sum, m) => sum + m.errorRate, 0);
		return totalErrorRate / recentMetrics.length;
	}

	private getLatencyLoad(): number {
		if (this.metrics.length === 0) return 0;

		const recentMetrics = this.metrics.slice(-5);
		const avgLatency =
			recentMetrics.reduce((sum, m) => sum + m.averageLatency, 0) / recentMetrics.length;

		// Normalize latency to 0-1 scale (assuming 1000ms is high latency)
		return Math.min(1, avgLatency / 1000);
	}

	private updateCircuitBreakerState(metrics: LoadMetricsType): void {
		const now = Date.now();

		if (this.circuitBreakerOpen) {
			// Check if cooldown period has passed
			if (now - this.lastCircuitBreakerOpenTime >= this.config.cooldownPeriodMs) {
				this.circuitBreakerOpen = false;
			}
			return;
		}

		// Check if we should open the circuit breaker
		if (metrics.errorRate >= this.config.circuitBreakerThreshold) {
			this.circuitBreakerOpen = true;
			this.lastCircuitBreakerOpenTime = now;
		}
	}

	// Note: extractPriority function removed as it's no longer used
	// Priority is now extracted directly in shouldDropMessage

	private async sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

export const createLoadManager = (config: BackpressureConfigType): LoadManager => {
	return new LoadManager(config);
};
