import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { EvidenceStorage } from '../../src/evidence/storage.js';
import { getDataPath } from '../../src/xdg/index.js';
import type { Evidence } from '../../src/types/index.js';

// Node environment for filesystem operations
// @vitest-environment node

describe('EvidenceStorage', () => {
  let originalDataHome: string | undefined;
  let originalKey: string | undefined;
  let tempDir: string;

  beforeEach(async () => {
    originalDataHome = process.env.XDG_DATA_HOME;
    originalKey = process.env.EVIDENCE_ENCRYPTION_KEY;
    tempDir = await mkdtemp(join(tmpdir(), 'asbr-storage-'));
    process.env.XDG_DATA_HOME = tempDir;
    process.env.EVIDENCE_ENCRYPTION_KEY =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  afterEach(async () => {
    if (originalDataHome === undefined) {
      delete process.env.XDG_DATA_HOME;
    } else {
      process.env.XDG_DATA_HOME = originalDataHome;
    }
    if (originalKey === undefined) {
      delete process.env.EVIDENCE_ENCRYPTION_KEY;
    } else {
      process.env.EVIDENCE_ENCRYPTION_KEY = originalKey;
    }
    await rm(tempDir, { recursive: true, force: true });
  });

  it('stores and retrieves evidence with compression and encryption', async () => {
    const storage = new EvidenceStorage({ compression: true, encryption: true });
    const evidence: Evidence = {
      id: '11111111-1111-1111-1111-111111111111',
      source: 'file',
      pointers: [],
      claim: 'secret',
      confidence: 0.9,
      risk: 'low',
      createdAt: new Date().toISOString(),
      schema: 'cortex.evidence@1',
    };

    await storage.storeEvidence(evidence);
    const loaded = await storage.getEvidence(evidence.id);
    expect(loaded).toEqual(evidence);

    const dateStr = evidence.createdAt.split('T')[0];
    const filePath = join(getDataPath('evidence', dateStr), `${evidence.id}.json`);
    const raw = await readFile(filePath, 'utf-8');
    expect(() => JSON.parse(raw)).toThrow();
  });
});
