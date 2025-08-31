import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
    const messages: any[] = [];
    const unsubscribe = await transport.subscribe(['test'], async (m) => {
      messages.push(m);
    });

    const env = {
      id: '1',
      type: 'test',
      source: 'urn:test',
      specversion: '1.0',
    } as any;
    await transport.publish(env);
    await new Promise((r) => setTimeout(r, 200));
    expect(messages).toHaveLength(1);

    await unsubscribe();
    await new Promise((r) => setTimeout(r, 200));

    expect(() => process.kill(pid, 0)).toThrow();
    await transport.terminate();
  });

  it('keeps child alive until all subscriptions are removed', async () => {
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
    const messages1: any[] = [];
    const messages2: any[] = [];
    const unsubscribe1 = await transport.subscribe(['test'], async (m) => {
      messages1.push(m);
    });
    const unsubscribe2 = await transport.subscribe(['test'], async (m) => {
      messages2.push(m);
    });

    const env = {
      id: '1',
      type: 'test',
      source: 'urn:test',
      specversion: '1.0',
    } as any;
    await transport.publish(env);
    await new Promise((r) => setTimeout(r, 200));
    expect(messages1).toHaveLength(1);
    expect(messages2).toHaveLength(1);
    await unsubscribe1();
    await new Promise((r) => setTimeout(r, 200));
    expect(() => process.kill(pid, 0)).not.toThrow();
    await unsubscribe2();
    await new Promise((r) => setTimeout(r, 200));
    expect(() => process.kill(pid, 0)).toThrow();
    await transport.terminate();
  });
});
