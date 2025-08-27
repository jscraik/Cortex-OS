import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  auditEvent,
  enableMemoryAuditBuffer,
  getMemoryAuditBuffer,
  record,
} from '../src/lib/audit';

describe('audit sinks', () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = path.join(os.tmpdir(), `audit-${Math.random().toString(36).slice(2)}.log`);
    process.env.CORTEX_AUDIT_LOG = tmp;
    enableMemoryAuditBuffer(10);
    try {
      await fs.rm(tmp, { force: true });
    } catch {}
  });

  it('writes to memory and file JSONL', async () => {
    const evt = auditEvent('fs', 'write', { runId: 'r1' }, { path: '/x' });
    await Promise.resolve(record(evt));
    const mem = getMemoryAuditBuffer();
    expect(mem?.length ?? 0).toBeGreaterThan(0);
    const txt = await fs.readFile(tmp, 'utf8');
    expect(txt.trim().length).toBeGreaterThan(0);
    const parsed = JSON.parse(txt.split(/\n+/).filter(Boolean)[0]);
    expect(parsed.subject.runId).toBe('r1');
  });
});
