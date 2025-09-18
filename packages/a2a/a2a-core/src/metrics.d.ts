export interface BusMetricsSnapshot {
    eventsPublished: number;
    duplicatesDropped: number;
}
declare class BusMetricsCollector {
    eventsPublished: number;
    duplicatesDropped: number;
    incEvents(count?: number): void;
    incDuplicates(count?: number): void;
    snapshot(): BusMetricsSnapshot;
}
export declare function busMetrics(): BusMetricsCollector;
export {};
//# sourceMappingURL=metrics.d.ts.map