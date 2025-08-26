import type { RunResult } from "@cortex-os/simlab-core/runner";
import { summarize } from "@cortex-os/simlab-metrics/basic";
export function toJSON(r: RunResult) { return { ...summarize(r), seed: r.seed, scenarioId: r.scenarioId }; }

