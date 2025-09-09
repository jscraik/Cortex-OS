import { DynamicSpeculativePlanner, type DSPConfig } from "../../../agents/src/lib/dsp.js";

/**
 * Simulates dynamic speculative planning over a series of outcomes.
 * Returns the step used before each outcome update.
 */
export function simulateDSP(outcomes: boolean[], config?: DSPConfig): number[] {
  const planner = new DynamicSpeculativePlanner(config);
  return outcomes.map((result) => {
    const step = planner.currentStep;
    planner.update(result);
    return step;
  });
}
