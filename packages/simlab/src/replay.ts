import { Scenario } from './scenario';
import { deterministicScheduler, randomizedScheduler } from './scheduler';
import { executeStep } from './failure';
import { createMetrics, record, finish, summary } from './metrics';

export async function runScenario(s: Scenario, mode: 'deterministic' | 'randomized') {
  const schedule = mode === 'deterministic' ? deterministicScheduler(s) : randomizedScheduler(s);
  const metrics = createMetrics();
  const events = [] as { index: number; step: string }[];
  for (const { index, step } of schedule) {
    const start = performance.now();
    const res = await executeStep(step);
    const dur = performance.now() - start;
    if (res) {
      record(metrics, res.agent, dur);
      events.push({ index, step: res.action });
    }
  }
  finish(metrics);
  return { events, metrics: summary(metrics) };
}
