export { createProofEnvelope } from './createProof.js';
export type {
	CosignSignOptions,
	VerifyCosignOptions,
} from './signing/cosign.js';
export { signEnvelopeWithCosign, verifyCosignAttestations } from './signing/cosign.js';
export type {
	TrustRootCache,
	TrustRootManagerOptions,
} from './trust/trust-root-manager.js';
export {
	defaultTrustRootManager,
	getDefaultTrustMaterial,
	TrustRootManager,
} from './trust/trust-root-manager.js';
export type {
	ProofArtifactDescriptor,
	ProofAttestation,
	ProofEnvelope,
	ProofEvidence,
	ProofPolicyReceipt,
	ProofRuntime,
	ProofTrace,
} from './types.js';
export { verifyProofEnvelope } from './verifyProof.js';
