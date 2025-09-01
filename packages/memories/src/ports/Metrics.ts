export interface Metrics {
  record(event: string, data: Record<string, unknown>): Promise<void>;
}
