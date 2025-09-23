export interface MetricsReport {
	counters: Record<string, number>;
	histograms: Record<string, { min: number; max: number; avg: number; count: number }>;
	gauges: Record<string, number>;
	timestamp: string;
}

export class MetricsCollector {
	private readonly counters = new Map<string, number>();
	private readonly histograms = new Map<string, number[]>();
	private readonly gauges = new Map<string, number>();

	increment(metric: string, value = 1): void {
		const current = this.counters.get(metric) || 0;
		this.counters.set(metric, current + value);
	}

	decrement(metric: string, value = 1): void {
		const current = this.counters.get(metric) || 0;
		this.counters.set(metric, current - value);
	}

	recordDuration(metric: string, duration: number): void {
		if (!this.histograms.has(metric)) {
			this.histograms.set(metric, []);
		}
		this.histograms.get(metric)?.push(duration);
	}

	setGauge(metric: string, value: number): void {
		this.gauges.set(metric, value);
	}

	getCounter(metric: string): number {
		return this.counters.get(metric) || 0;
	}

	getHistogramStats(
		metric: string,
	): { min: number; max: number; avg: number; count: number } | null {
		const values = this.histograms.get(metric);
		if (!values || values.length === 0) {
			return null;
		}

		const sum = values.reduce((a, b) => a + b, 0);
		return {
			min: Math.min(...values),
			max: Math.max(...values),
			avg: sum / values.length,
			count: values.length,
		};
	}

	async report(): Promise<MetricsReport> {
		const histograms: Record<string, { min: number; max: number; avg: number; count: number }> = {};

		for (const [key, values] of this.histograms.entries()) {
			if (values.length > 0) {
				const sum = values.reduce((a, b) => a + b, 0);
				histograms[key] = {
					min: Math.min(...values),
					max: Math.max(...values),
					avg: sum / values.length,
					count: values.length,
				};
			}
		}

		return {
			counters: Object.fromEntries(this.counters),
			histograms,
			gauges: Object.fromEntries(this.gauges),
			timestamp: new Date().toISOString(),
		};
	}

	reset(): void {
		this.counters.clear();
		this.histograms.clear();
		this.gauges.clear();
	}
}

export const metrics = new MetricsCollector();

// Helper function to measure execution time
export async function measure<T>(metric: string, fn: () => Promise<T>): Promise<T> {
	const start = Date.now();
	try {
		const result = await fn();
		const duration = Date.now() - start;
		metrics.recordDuration(metric, duration);
		return result;
	} catch (error) {
		const duration = Date.now() - start;
		metrics.recordDuration(`${metric}.error`, duration);
		metrics.increment(`${metric}.errors`);
		throw error;
	}
}
