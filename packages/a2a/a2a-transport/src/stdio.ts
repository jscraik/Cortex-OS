import { spawn } from 'node:child_process';
import type { Envelope } from '@cortex-os/a2a-contracts/envelope';
import type { Transport } from '@cortex-os/a2a-core/bus';

export function stdio(command: string, args: string[] = ['stdio'], env: Record<string, string> = {}): Transport {
  const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, ...env } });
  const subs = new Map<string, Set<(m: Envelope) => Promise<void>>>();
  child.stdout.on('data', (buf) => {
    const lines = buf.toString('utf8').split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      try {
        const msg = JSON.parse(line);
        subs.get(msg.type)?.forEach((fn) => fn(msg));
      } catch {}
    }
  });
  return {
    async publish(m) {
      child.stdin.write(JSON.stringify(m) + '\n');
    },
    async subscribe(types, onMsg) {
      for (const t of types) subs.set(t, (subs.get(t) ?? new Set()).add(onMsg));
      return async () => { for (const t of types) subs.get(t)?.delete(onMsg); };
    },
  };
}
