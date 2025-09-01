export type Metrics = {
  latency: number[];
  counts: Record<string, number>;
  startTime: number;
  endTime: number;
};

export function createMetrics(): Metrics {
  return { latency: [], counts: {}, startTime: Date.now(), endTime: 0 };
}

export function record(metrics: Metrics, agent: string, ms: number): void {
  metrics.latency.push(ms);
  metrics.counts[agent] = (metrics.counts[agent] ?? 0) + 1;
}

export function finish(metrics: Metrics): void {
  metrics.endTime = Date.now();
}

export function summary(metrics: Metrics) {
  const total = metrics.latency.reduce((a, b) => a + b, 0);
  const throughput = metrics.latency.length / ((metrics.endTime - metrics.startTime) / 1000 || 1);
  const agents = Object.values(metrics.counts);
  const fairness = agents.length ? Math.min(...agents) / Math.max(...agents) : 1;
  return { latencyAvg: total / (metrics.latency.length || 1), throughput, fairness };
}
