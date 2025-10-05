import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createProofEnvelope } from '../src/createProof.js';
import { verifyProofEnvelope } from '../src/verifyProof.js';

describe('createProofEnvelope', () => {
  it('produces a valid proof envelope for the artifact', () => {
    const dir = mkdtempSync(join(tmpdir(), 'proof-create-'));
    const artifactPath = join(dir, 'report.md');
    writeFileSync(artifactPath, '# Cortex Proof Test');

    const artifactBytes = readFileSync(artifactPath);
    const artifactHash = createHash('sha256').update(artifactBytes).digest('hex');
    const envelope = createProofEnvelope({
      artifactPath,
      artifactMime: 'text/markdown',
      publicContext: { instruction: 'demo', inputs: ['report.md'] },
      sealedContextRef: { uri: 's3://sealed/context.json', sha256: 'a'.repeat(64) },
      evidence: [
        {
          type: 'file',
          path: artifactPath,
          blobSha256: artifactHash
        }
      ],
      runtime: { model: 'gpt-5-codex', parameters: { temperature: 0 }, tooling: { node: '20.x' } },
      trace: { otel: { traceId: '0'.repeat(32), rootSpanId: '0'.repeat(16) } },
      policyReceipts: [{ name: 'WCAG-2.2-AA', status: 'pass', checks: ['2.4.13'] }],
      bundlePaths: [artifactPath]
    });

    expect(envelope.proofSpec).toBe('cortex-os/proof-artifact');
    expect(envelope.specVersion).toBe('0.2.0');
    expect(envelope.artifact.uri).toContain('file://');
    expect(envelope.context.public.instruction).toBe('demo');
    expect(envelope.bundle?.files).toHaveLength(1);
    expect(verifyProofEnvelope(envelope).valid).toBe(true);

    expect(envelope.artifact.contentHash.hex).toHaveLength(64);
    expect(envelope.artifact.contentHash.hex).toMatch(/^[0-9a-f]+$/);
    writeFileSync(`${artifactPath}.proof.json`, JSON.stringify(envelope));
    expect(() => JSON.parse(readFileSync(`${artifactPath}.proof.json`, 'utf-8'))).not.toThrow();
  });
});
