import { counterEnv } from '@cortex-os/simlab-env/local-counter';
import { greedyToTarget } from '@cortex-os/simlab-agents/rule-agent';
import { runScenario } from '@cortex-os/simlab-core/runner';

export function wireSimlab() {
  return { env: counterEnv, agent: greedyToTarget, runScenario };
}

