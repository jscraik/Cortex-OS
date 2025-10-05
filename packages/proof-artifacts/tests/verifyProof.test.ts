import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createProofEnvelope } from '../src/createProof.js';
import { verifyProofEnvelope } from '../src/verifyProof.js';

describe('verifyProofEnvelope', () => {
  it('detects tampering with the primary artifact', () => {
    const dir = mkdtempSync(join(tmpdir(), 'proof-verify-'));
    const artifactPath = join(dir, 'report.md');
    writeFileSync(artifactPath, '# Cortex Proof Verification Test');

    const envelope = createProofEnvelope({
      artifactPath,
      artifactMime: 'text/markdown',
      publicContext: { instruction: 'verify' },
      evidence: [],
      runtime: { model: 'gpt-5-codex' }
    });

    expect(verifyProofEnvelope(envelope).valid).toBe(true);

    writeFileSync(artifactPath, '# tampered');
    const result = verifyProofEnvelope(envelope);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('artifact-hash-mismatch');
  });
});
