// @vitest-environment node

import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EvidenceStorage } from '../../src/evidence/storage.js';
import type { Evidence } from '../../src/types/index.js';

let tmpDir: string;

describe('EvidenceStorage', () => {
  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'asbr-storage-'));
    process.env.XDG_DATA_HOME = tmpDir;
    // Use a proper 32-byte key for AES-256 (here, a hardcoded hex string for testing)
    process.env.ASBR_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef';
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
    delete process.env.XDG_DATA_HOME;
    delete process.env.ASBR_ENCRYPTION_KEY;
  });

  it('stores and retrieves evidence with compression and encryption', async () => {
    const storage = new EvidenceStorage({ compression: true, encryption: true });
    const evidence: Evidence = {
      id: '00000000-0000-0000-0000-000000000001',
      source: 'file',
      pointers: [],
      claim: 'test evidence',
      confidence: 0.9,
      risk: 'low',
      createdAt: new Date().toISOString(),
      schema: 'cortex.evidence@1',
    };

    await storage.storeEvidence(evidence);
    const loaded = await storage.getEvidence(evidence.id);

    expect(loaded).toEqual(evidence);
  });
});
