import { Buffer } from 'node:buffer';
import { DSSEBundleBuilder, FulcioSigner } from '@sigstore/sign';
import type { IdentityProvider } from '@sigstore/sign/dist/identity/index.js';
import { type TrustMaterial, toSignedEntity, toTrustMaterial, Verifier } from '@sigstore/verify';
import { getDefaultTrustMaterial } from '../trust/trust-root-manager.js';
import type { ProofAttestation, ProofEnvelope } from '../types.js';

export interface CosignSignOptions {
	identityToken?: string;
	issuer: string;
}

class StaticIdentityProvider implements IdentityProvider {
	constructor(private readonly token: string) {}

	async getToken(): Promise<string> {
		return this.token;
	}
}

const encodeBundle = (bundle: Record<string, unknown>) =>
	Buffer.from(JSON.stringify(bundle)).toString('base64');

const decodeBundle = (statement: string): Record<string, unknown> => {
	const json = Buffer.from(statement, 'base64').toString('utf8');
	return JSON.parse(json) as Record<string, unknown>;
};

const assertBundleShape = (bundle: Record<string, unknown>) => {
	if (!bundle || typeof bundle !== 'object') {
		throw new Error('invalid sigstore bundle structure');
	}
	if (!('content' in bundle) || !('verificationMaterial' in bundle)) {
		throw new Error('invalid sigstore bundle structure');
	}
};

export const signEnvelopeWithCosign = async (
	envelope: ProofEnvelope,
	options: CosignSignOptions,
): Promise<ProofEnvelope> => {
	if (!options.identityToken) {
		throw new Error('identityToken is required for sigstore signing');
	}
	if (!options.issuer || options.issuer.trim().length === 0) {
		throw new Error('issuer is required for sigstore signing');
	}

	const identityProvider = new StaticIdentityProvider(options.identityToken);
	const signer = new FulcioSigner({ identityProvider });
	const builder = new DSSEBundleBuilder({ signer, witnesses: [] });

	const payload = Buffer.from(JSON.stringify(envelope));
	const bundle = await builder.create({ data: payload, type: 'application/json' });
	const encodedBundle = encodeBundle(bundle as unknown as Record<string, unknown>);

	const attestation: ProofAttestation = {
		type: 'in-toto',
		predicateType: 'https://slsa.dev/provenance/v1',
		statement: encodedBundle,
		signing: { method: 'sigstore-cosign', issuer: options.issuer },
	};

	const existing = envelope.attestations ?? [];
	return { ...envelope, attestations: [...existing, attestation] };
};

export interface VerifyCosignOptions {
	verifier?: Verifier;
	trustMaterial?: TrustMaterial;
	trustRootJSON?: Record<string, unknown>;
}

export const verifyCosignAttestations = async (
	envelope: ProofEnvelope,
	options: VerifyCosignOptions = {},
): Promise<ProofAttestation[]> => {
	const attestations = envelope.attestations ?? [];
	const activeVerifier = await resolveVerifier(options);
	const artifactBytes = Buffer.from(JSON.stringify(envelope));

	for (const attestation of attestations) {
		const bundle = decodeBundle(attestation.statement);
		assertBundleShape(bundle);
		if (activeVerifier) {
			const entity = toSignedEntity(bundle as never, artifactBytes);
			activeVerifier.verify(entity);
		}
	}

	return attestations;
};

const resolveVerifier = async (options: VerifyCosignOptions): Promise<Verifier | undefined> => {
	if (options.verifier) {
		return options.verifier;
	}
	if (options.trustMaterial) {
		return new Verifier(options.trustMaterial);
	}
	if (options.trustRootJSON) {
		const material = toTrustMaterial(options.trustRootJSON as never);
		return new Verifier(material);
	}

	const trustMaterial = await getDefaultTrustMaterial();
	return new Verifier(trustMaterial);
};
