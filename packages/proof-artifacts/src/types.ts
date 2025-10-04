import type { JsonObject } from 'type-fest';

export interface ProofArtifactDescriptor {
  uri: string;
  mime: string;
  contentHash: { alg: 'sha256'; hex: string };
}

export interface ProofBundleFile {
  uri: string;
  sha256: string;
}

export interface ProofBundle {
  files: ProofBundleFile[];
  merkleRoot?: string;
}

export interface ProofEvidenceFile {
  type: 'file';
  path: string;
  blobSha256: string;
  commit?: string;
  lines?: { start: number; end: number };
  quote?: string;
  quoteSha256?: string;
}

export interface ProofEvidenceUrl {
  type: 'url';
  href: string;
  selector?: string;
  snapshot?: { bodySha256: string; retrievedAt: string };
  quote?: string;
  quoteSha256?: string;
}

export type ProofEvidence = ProofEvidenceFile | ProofEvidenceUrl;

export interface ProofPolicyReceipt {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  checks?: string[];
  sbom?: string;
}

export interface ProofAttestation {
  type: 'in-toto';
  predicateType: string;
  statement: string;
  signing: { method: 'sigstore-cosign'; issuer: string };
}

export interface ProofTrace {
  otel: { traceId: string; rootSpanId?: string };
}

export interface ProofRuntime {
  model: string;
  parameters?: JsonObject;
  tooling?: Record<string, string>;
}

export interface ProofEnvelope {
  proofSpec: 'cortex-os/proof-artifact';
  specVersion: '0.2.0';
  id: string;
  issuedAt: string;
  actor: { agent: string; role: string; runId?: string };
  artifact: ProofArtifactDescriptor;
  bundle?: ProofBundle;
  context: {
    public: JsonObject;
    sealedRef?: { uri: string; sha256: string };
  };
  evidence: ProofEvidence[];
  runtime: ProofRuntime;
  trace?: ProofTrace;
  policyReceipts?: ProofPolicyReceipt[];
  attestations?: ProofAttestation[];
}
