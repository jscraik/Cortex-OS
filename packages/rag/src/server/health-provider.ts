import type { HealthCheckDetail, HealthSummary } from '../lib/health.js';
import { getDefaultRAGHealth } from '../lib/health.js';

export interface HealthProviderOptions {
  // Supply additional component checks if available
  extraChecks?: () => Promise<Partial<HealthSummary['checks']>>;
}

export class HealthProvider {
  constructor(private readonly opts: HealthProviderOptions = {}) { }

  async liveness(): Promise<HealthSummary> {
    // Minimal: process and chunkers from default health
    return await getDefaultRAGHealth();
  }

  async readiness(): Promise<HealthSummary> {
    const base = await getDefaultRAGHealth();
    const extras = this.opts.extraChecks ? await this.opts.extraChecks() : {};
    const all = { ...base.checks, ...(extras ?? {}) } as Record<
      string,
      HealthCheckDetail | undefined
    >;
    const checks: Record<string, HealthCheckDetail> = {};
    for (const [key, value] of Object.entries(all)) {
      if (value !== undefined) {
        checks[key] = value;
      }
    }
    const ok = Object.values(checks).every((c) => c.ok);
    return { ...base, ok, checks };
  }

  async health(): Promise<HealthSummary> {
    return this.readiness();
  }
}
