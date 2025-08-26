import { Envelope as EnvSchema, type Envelope } from '@cortex-os/a2a-contracts/envelope';

export interface Transport {
  publish: (msg: Envelope) => Promise<void>;
  subscribe: (types: string[], onMsg: (msg: Envelope) => Promise<void>) => Promise<() => Promise<void>>;
}

export type Handler = { type: string; handle: (msg: Envelope) => Promise<void> };

export class Bus {
  constructor(private transport: Transport, private validate: (e: Envelope) => Envelope = EnvSchema.parse) {}
  async publish(msg: Envelope) { this.validate(msg); await this.transport.publish(msg); }
  async bind(handlers: Handler[]) {
    const map = new Map(handlers.map((h) => [h.type, h.handle] as const));
    return this.transport.subscribe([...map.keys()], async (m) => {
      this.validate(m);
      const h = map.get(m.type);
      if (h) await h(m);
    });
  }
}

