class BusMetricsCollector {
    eventsPublished = 0;
    duplicatesDropped = 0;
    incEvents(count = 1) {
        this.eventsPublished += count;
    }
    incDuplicates(count = 1) {
        this.duplicatesDropped += count;
    }
    snapshot() {
        return {
            eventsPublished: this.eventsPublished,
            duplicatesDropped: this.duplicatesDropped,
        };
    }
}
let instance;
export function busMetrics() {
    if (!instance)
        instance = new BusMetricsCollector();
    return instance;
}
//# sourceMappingURL=metrics.js.map