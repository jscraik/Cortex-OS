import { it, expect, vi, afterEach } from 'vitest';
import { fsQueue } from '@cortex-os/a2a-transport/fsq';
import { uuid } from '@cortex-os/utils';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';

const cleanups: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    cleanups.map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
  cleanups.length = 0;
});

/**
 * Publishes an event to an `fsQueue` transport and verifies that it is
 * delivered to subscribers and persisted to the queue file on disk.
 *
 * @param queueName - Name of the queue; may include nested path segments.
 */
async function sendAndVerify(queueName: string) {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'fsq-'));
  vi.spyOn(os, 'homedir').mockReturnValue(home);
  const t = fsQueue(queueName);
  let seen = false;
  await t.subscribe(['event.x'], async () => {
    seen = true;
  });
  const msg = {
    id: uuid(),
    type: 'event.x',
    occurredAt: new Date().toISOString(),
    headers: {},
    payload: {},
  } as any;
  await t.publish(msg);
  expect(seen).toBe(true);
  const filePath = path.join(home, '.cortex', 'a2a', queueName, 'queue.jsonl');
  const contents = await fs.readFile(filePath, 'utf8');
  expect(contents).toContain(msg.id);
  cleanups.push(home);
}

it('fsq publishes and notifies subscribers', async () => {
  await sendAndVerify(`test-${Date.now()}`);
});

it('handles Unix-style paths', async () => {
  await sendAndVerify(`unix-${Date.now()}/nested`);
});

it('handles Windows-style paths', async () => {
  await sendAndVerify(`win-${Date.now()}\\nested`);
});

