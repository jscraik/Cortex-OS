import { Scenario } from './scenario';
import { mulberry32 } from './lib/random';

export type ScheduledStep = { index: number; step: Scenario['steps'][number] };

export function deterministicScheduler(s: Scenario): ScheduledStep[] {
  return s.steps.map((step, index) => ({ index, step }));
}

export function randomizedScheduler(s: Scenario): ScheduledStep[] {
  const rng = mulberry32(s.seed);
  const arr = deterministicScheduler(s);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
