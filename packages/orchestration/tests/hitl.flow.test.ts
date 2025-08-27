import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { waitForApproval } from '../src/lib/hitl';

describe('HITL approvals', () => {
  let store: string;
  beforeEach(async () => {
    store = path.join(os.tmpdir(), `hitl-${Math.random().toString(36).slice(2)}.jsonl`);
    process.env.CORTEX_HITL_STORE = store;
    process.env.CORTEX_HITL_TIMEOUT_MS = '2000';
    try {
      await fs.rm(store, { force: true });
    } catch {}
  });

  it('waits for external decision', async () => {
    const p = waitForApproval('r1', 'synthesize', { path: '/tmp/x' });
    // simulate external decision shortly after
    setTimeout(async () => {
      const rows = [
        {
          type: 'decision',
          requestId: (await fs.readFile(store, 'utf8'))
            .split('\n')
            .filter(Boolean)
            .map((l) => JSON.parse(l))[0].id,
          approved: true,
          ts: new Date().toISOString(),
        },
      ];
      await fs.appendFile(store, rows.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
    }, 200);
    await expect(p).resolves.toBe(true);
  });
});
