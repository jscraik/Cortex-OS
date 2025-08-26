import type { Envelope } from '@cortex-os/a2a-contracts/envelope';

export interface OutboxStore {
  enqueue(e: Envelope): Promise<void>;
  dequeueBatch(n: number): Promise<Envelope[]>;
  ack(ids: string[]): Promise<void>;
}

export class Outbox {
  constructor(private store: OutboxStore, private send: (e: Envelope) => Promise<void>) {}
  async flush(batch = 100) {
    const items = await this.store.dequeueBatch(batch);
    for (const e of items) await this.send(e);
    await this.store.ack(items.map((i) => i.id));
  }
}

