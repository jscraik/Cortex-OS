import {
  createEnvelope,
  type Envelope,
} from '@cortex-os/a2a-contracts/envelope';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { stdio } from '../src/stdio.js';

describe('stdio transport', () => {
  it('terminates child and cleans subscriptions on unsubscribe', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'stdio-test-'));
    const scriptPath = join(dir, 'child.js');
    writeFileSync(
      scriptPath,
      `process.stdin.on('data', d => {\n` +
      `  const m = JSON.parse(d.toString());\n` +
      `  process.stdout.write(JSON.stringify(m)+'\\n');\n` +
      `});\n` +
      `setInterval(() => {}, 1000);\n`,
    );
    const transport = stdio('node', [scriptPath]);
    const pid = transport.pid;
    const messages: Envelope[] = [];
    const unsubscribe = await transport.subscribe(['test'], async (m) => {
      messages.push(m);
    });

    const env = createEnvelope({
      type: 'test',
      source: 'urn:test',
      data: { id: '1' },
    });
    await transport.publish(env);
    await new Promise((r) => setTimeout(r, 200));
    expect(messages).toHaveLength(1);

    await unsubscribe();
    await new Promise((r) => setTimeout(r, 200));

    if (pid !== undefined) {
      expect(() => process.kill(pid, 0)).toThrow();
    }
    await transport.terminate();
  });
});
