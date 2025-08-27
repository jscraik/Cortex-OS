import { Envelope } from '@cortex-os/a2a-contracts/envelope';

export interface Transport {
  publish: (msg: Envelope) => Promise<void>;
  subscribe: (
    types: string[],
    onMsg: (msg: Envelope) => Promise<void>,
  ) => Promise<() => Promise<void>>;
}
