import { describe, expect, it, vi } from 'vitest';

const signMock = vi.fn(async () => ({ signature: 'sig', bundle: { messageSignature: 'sig' } }));
const verifyMock = vi.fn(async () => undefined);

vi.mock('@sigstore/sign', () => ({ sign: signMock }));
vi.mock('@sigstore/verify', () => ({ verify: verifyMock }));

const sampleEnvelope = {
  proofSpec: 'cortex-os/proof-artifact',
  specVersion: '0.2.0',
  id: '01J8Z0VJ5W1QNA0R1QK2J4ZK7D',
  issuedAt: '2025-01-01T00:00:00.000Z',
  actor: { agent: 'cortex-agent', role: 'worker' },
  artifact: {
    uri: 'file:///tmp/report.md',
    mime: 'text/markdown',
    contentHash: { alg: 'sha256', hex: 'a'.repeat(64) }
  },
  context: { public: {} },
  evidence: [],
  runtime: { model: 'gpt-5-codex' }
};

describe('cosign helpers', () => {
  it('attaches a sigstore attestation and verifies it', async () => {
    const { signEnvelopeWithCosign, verifyCosignAttestations } = await import('../src/signing/cosign.js');

    const signed = await signEnvelopeWithCosign(sampleEnvelope, { issuer: 'OIDC@GitHub', identityToken: 'token' });
    expect(signMock).toHaveBeenCalledTimes(1);
    expect(signed.attestations).toHaveLength(1);
    await verifyCosignAttestations(signed);
    expect(verifyMock).toHaveBeenCalledTimes(1);
  });
});
