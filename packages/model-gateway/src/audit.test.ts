import { describe, it, expect, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { createHash } from 'crypto';
import { auditEvent, record } from './audit.js';

let logPath: string | undefined;

afterEach(async () => {
  if (logPath) {
    try {
      await fs.unlink(logPath);
    } catch {
      // ignore cleanup errors
    }
    delete process.env.CORTEX_AUDIT_LOG;
    logPath = undefined;
  }
});

describe('audit log hashing', () => {
  it('chains hashes to make logs tamper-evident', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'audit-test-'));
    logPath = path.join(dir, 'audit.log');
    process.env.CORTEX_AUDIT_LOG = logPath;

    const evt1 = auditEvent('svc', 'op1', {}, { a: 1 });
    await record(evt1);
    const evt2 = auditEvent('svc', 'op2', {}, { a: 2 });
    await record(evt2);

    const lines = (await fs.readFile(logPath, 'utf8')).trim().split('\n');
    expect(lines.length).toBe(2);
    const rec1 = JSON.parse(lines[0]);
    const rec2 = JSON.parse(lines[1]);

    expect(rec1.prevHash).toBe('0');
    const hash1 = createHash('sha256')
      .update(JSON.stringify({ ...evt1, prevHash: '0' }))
      .digest('hex');
    expect(rec1.hash).toBe(hash1);
    const hash2 = createHash('sha256')
      .update(JSON.stringify({ ...evt2, prevHash: hash1 }))
      .digest('hex');
    expect(rec2.prevHash).toBe(hash1);
    expect(rec2.hash).toBe(hash2);
  });
});

