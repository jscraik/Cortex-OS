// Simple in-memory counters for bus metrics.
// Intentionally minimal; can be swapped with prom-client registry later.
export interface BusMetricsSnapshot {
	eventsPublished: number;
	duplicatesDropped: number;
}

class BusMetricsCollector {
	eventsPublished = 0;
	duplicatesDropped = 0;
	incEvents(count = 1) {
		this.eventsPublished += count;
	}
	incDuplicates(count = 1) {
		this.duplicatesDropped += count;
	}
	snapshot(): BusMetricsSnapshot {
		return {
			eventsPublished: this.eventsPublished,
			duplicatesDropped: this.duplicatesDropped,
		};
	}
}

let instance: BusMetricsCollector | undefined;
export function busMetrics(): BusMetricsCollector {
	if (!instance) instance = new BusMetricsCollector();
	return instance;
}
