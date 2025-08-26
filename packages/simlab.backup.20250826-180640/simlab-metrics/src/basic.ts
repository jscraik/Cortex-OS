import type { RunResult } from "@cortex-os/simlab-core/runner";
export type Summary = { steps: number; totalReward: number; success: boolean };
export function summarize(r: RunResult): Summary {
  const last = r.transitions.at(-1); return { steps: r.transitions.length, totalReward: r.totalReward, success: Boolean(last?.done) };
}

