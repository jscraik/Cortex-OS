import type { Metrics } from '../ports/Metrics.js';

export class ConsoleMetrics implements Metrics {
  async record(event: string, data: Record<string, unknown>): Promise<void> {
    console.log(JSON.stringify({ event, ...data }));
  }
}
