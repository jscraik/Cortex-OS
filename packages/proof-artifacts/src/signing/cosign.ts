import { Buffer } from 'node:buffer';
import { sign } from '@sigstore/sign';
import { verify } from '@sigstore/verify';
import type { ProofAttestation, ProofEnvelope } from '../types.js';

const encodeBundle = (bundle: unknown) =>
  Buffer.from(JSON.stringify(bundle)).toString('base64');

const decodeBundle = (statement: string) =>
  JSON.parse(Buffer.from(statement, 'base64').toString('utf-8')) as unknown;

export interface CosignSignOptions {
  identityToken?: string;
  issuer: string;
}

export const signEnvelopeWithCosign = async (
  envelope: ProofEnvelope,
  options: CosignSignOptions
): Promise<ProofEnvelope> => {
  const payload = Buffer.from(JSON.stringify(envelope));
  const bundle = await sign(payload, {
    identityToken: options.identityToken,
    payloadType: 'application/json'
  });
  const attestation: ProofAttestation = {
    type: 'in-toto',
    predicateType: 'https://slsa.dev/provenance/v1',
    statement: encodeBundle(bundle),
    signing: { method: 'sigstore-cosign', issuer: options.issuer }
  };
  const existing = envelope.attestations ?? [];
  return { ...envelope, attestations: [...existing, attestation] };
};

export const verifyCosignAttestations = async (envelope: ProofEnvelope) => {
  const attestations = envelope.attestations ?? [];
  await Promise.all(
    attestations.map(async (attestation) => {
      const bundle = decodeBundle(attestation.statement);
      await verify(bundle as never, {});
    })
  );
  return attestations;
};
