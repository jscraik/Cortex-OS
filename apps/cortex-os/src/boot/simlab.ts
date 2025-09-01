import { SimRunner } from '@cortex-os/simlab-mono';

export const wireSimlab = () => {
  return { runner: new SimRunner({}) };
};
