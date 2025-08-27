// FIXME: Migration needed - these imports reference removed micro-packages
// import { counterEnv } from '@cortex-os/simlab-env/local-counter';
// import { greedyToTarget } from '@cortex-os/simlab-agents/rule-agent';
// import { runScenario } from '@cortex-os/simlab-core/runner';
import { SimRunner } from '@cortex-os/simlab-mono';

export function wireSimlab() {
  // return { env: counterEnv, agent: greedyToTarget, runScenario };
  return { runner: new SimRunner({}) };
}
