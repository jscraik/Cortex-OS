import type { RunResult } from "@cortex-os/simlab-core/runner";
import { summarize } from "@cortex-os/simlab-metrics/basic";
export function toMarkdown(r: RunResult): string {
  const s = summarize(r);
  return `# Simlab Report\n\n- Scenario: ${r.scenarioId}\n- Seed: ${r.seed}\n- Steps: ${s.steps}\n- Total Reward: ${s.totalReward}\n- Success: ${s.success}`;
}

