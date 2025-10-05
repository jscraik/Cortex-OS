import { describe, expect, it, vi } from 'vitest';

const mockBundle = {
	content: { $case: 'messageSignature', messageSignature: {} },
	verificationMaterial: { content: { $case: 'publicKey', publicKey: { hint: 'test' } } },
};

const createMock = vi.fn(async () => mockBundle);
const DSSEBundleBuilderMock = vi.fn(() => ({ create: createMock }));
const FulcioSignerMock = vi.fn();

vi.mock('@sigstore/sign', () => ({
	DSSEBundleBuilder: DSSEBundleBuilderMock,
	FulcioSigner: FulcioSignerMock,
}));

const sampleEnvelope = {
	proofSpec: 'cortex-os/proof-artifact',
	specVersion: '0.2.0',
	id: '01J8Z0VJ5W1QNA0R1QK2J4ZK7D',
	issuedAt: '2025-01-01T00:00:00.000Z',
	actor: { agent: 'cortex-agent', role: 'worker' },
	artifact: {
		uri: 'file:///tmp/report.md',
		mime: 'text/markdown',
		contentHash: { alg: 'sha256', hex: 'a'.repeat(64) },
	},
	context: { public: {} },
	evidence: [],
	runtime: { model: 'gpt-5-codex' },
};

describe('cosign helpers', () => {
	it('attaches a sigstore attestation and validates bundle structure', async () => {
		const { signEnvelopeWithCosign, verifyCosignAttestations } = await import(
			'../src/signing/cosign.js'
		);

		const signed = await signEnvelopeWithCosign(sampleEnvelope, {
			issuer: 'OIDC@GitHub',
			identityToken: 'token',
		});

		expect(FulcioSignerMock).toHaveBeenCalledTimes(1);
		expect(DSSEBundleBuilderMock).toHaveBeenCalledTimes(1);
		expect(createMock).toHaveBeenCalledWith({
			data: expect.any(Buffer),
			type: 'application/json',
		});

		expect(signed.attestations).toHaveLength(1);
		await expect(verifyCosignAttestations(signed)).resolves.toHaveLength(1);
	});
});
