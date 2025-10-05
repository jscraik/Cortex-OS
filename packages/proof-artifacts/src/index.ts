export { createProofEnvelope } from './createProof.js';
export { verifyProofEnvelope } from './verifyProof.js';
export { signEnvelopeWithCosign, verifyCosignAttestations } from './signing/cosign.js';
export type {
  ProofEnvelope,
  ProofArtifactDescriptor,
  ProofEvidence,
  ProofPolicyReceipt,
  ProofAttestation,
  ProofRuntime,
  ProofTrace
} from './types.js';
