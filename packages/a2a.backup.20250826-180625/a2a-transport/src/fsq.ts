import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import type { Envelope } from '@cortex-os/a2a-contracts/envelope';
import type { Transport } from '@cortex-os/a2a-core/bus';

export function fsQueue(queueName = 'default'): Transport {
  const dir = join(os.homedir(), '.cortex', 'a2a', queueName);
  let listeners: ((m: Envelope) => Promise<void>)[] = [];
  (async () => fs.mkdir(dir, { recursive: true }))();

  return {
    async publish(m) {
      await fs.appendFile(join(dir, 'queue.jsonl'), JSON.stringify(m) + '\n');
      for (const h of listeners) await h(m);
    },
    async subscribe(types, onMsg) {
      listeners.push(async (m) => {
        if (types.includes(m.type)) await onMsg(m);
      });
      return async () => {
        listeners = listeners.filter((l) => l !== onMsg);
      };
    },
  };
}
