import { spawn } from 'node:child_process';
import type { ServerInfo } from '@cortex-os/mcp-core/contracts';

export function createStdIo(si: ServerInfo) {
  if (!si.command) throw new Error('stdio requires command');
  const child = spawn(si.command, si.args ?? ['stdio'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ...(si.env ?? {}) },
  });
  // Simple JSONL framing
  return {
    send: (msg: unknown) => child.stdin.write(JSON.stringify(msg) + '\n'),
    onMessage: (fn: (m: any) => void) => {
      child.stdout.on('data', (buf) => {
        const lines = buf.toString('utf8').split(/\r?\n/).filter(Boolean);
        for (const line of lines) {
          try { fn(JSON.parse(line)); } catch {}
        }
      });
    },
    dispose: () => child.kill(),
  };
}
