import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import type { Envelope } from '@cortex-os/a2a-contracts/envelope';
import type { Transport } from '@cortex-os/a2a-core/bus';

export async function fsQueue(queueName = 'default'): Promise<Transport> {
  const dir = join(os.homedir(), '.cortex', 'a2a', queueName);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    console.error(`Failed to create transport directory ${dir}`, err);
    throw err;
  }
  let listeners: ((m: Envelope) => Promise<void>)[] = [];

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
