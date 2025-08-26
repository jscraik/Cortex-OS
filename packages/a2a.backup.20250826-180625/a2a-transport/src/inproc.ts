import type { Envelope } from '@cortex-os/a2a-contracts/envelope';
import type { Transport } from '@cortex-os/a2a-core/bus';

export function inproc(): Transport {
  const subs = new Map<string, Set<(m: Envelope) => Promise<void>>>();
  return {
    async publish(m) {
      subs.get(m.type)?.forEach((h) => h(m));
    },
    async subscribe(types, onMsg) {
      for (const t of types) subs.set(t, (subs.get(t) ?? new Set()).add(onMsg));
      return async () => {
        for (const t of types) subs.get(t)?.delete(onMsg);
      };
    },
  };
}
