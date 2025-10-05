import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockBundle = {
	content: { $case: 'messageSignature', messageSignature: {} },
	verificationMaterial: { content: { $case: 'publicKey', publicKey: { hint: 'test' } } },
};

const createMock = vi.fn(async () => mockBundle);
const DSSEBundleBuilderMock = vi.fn(() => ({ create: createMock }));
const FulcioSignerMock = vi.fn();
const toSignedEntityMock = vi.fn(() => ({ entity: true }));
const verifyMock = vi.fn();
const getDefaultTrustMaterialMock = vi.fn(async () => ({}) as never);

vi.mock('@sigstore/sign', () => ({
	DSSEBundleBuilder: DSSEBundleBuilderMock,
	FulcioSigner: FulcioSignerMock,
}));

vi.mock('@sigstore/verify', () => ({
	Verifier: vi.fn().mockImplementation(() => ({ verify: verifyMock })),
	toSignedEntity: toSignedEntityMock,
	toTrustMaterial: vi.fn().mockReturnValue({ material: true }),
}));

vi.mock('../src/trust/trust-root-manager.js', () => ({
	getDefaultTrustMaterial: getDefaultTrustMaterialMock,
}));

const sampleEnvelope: import('../src/types.js').ProofEnvelope = {
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
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('attaches a sigstore attestation and validates bundle structure using real trust roots', async () => {
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

		expect(getDefaultTrustMaterialMock).toHaveBeenCalledTimes(1);
		expect(verifyMock).toHaveBeenCalledTimes(1);
	});

	it('throws when the attestation payload is malformed', async () => {
		const { verifyCosignAttestations } = await import('../src/signing/cosign.js');

		await expect(
			verifyCosignAttestations({
				...sampleEnvelope,
				attestations: [
					{
						type: 'in-toto',
						predicateType: 'https://slsa.dev/provenance/v1',
						statement: Buffer.from(JSON.stringify({ foo: 'bar' })).toString('base64'),
						signing: { method: 'sigstore-cosign', issuer: 'invalid' },
					},
				],
			}),
		).rejects.toThrow(/invalid sigstore bundle structure/i);
	});
});
