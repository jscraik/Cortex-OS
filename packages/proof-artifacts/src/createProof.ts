import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ulid } from 'ulidx';
import schema from './schema/proof.schema.json' assert { type: 'json' };
import type {
  ProofEnvelope,
  ProofEvidence,
  ProofPolicyReceipt,
  ProofRuntime,
  ProofTrace
} from './types.js';

const ajv = new Ajv({ strict: true, allErrors: true });
addFormats(ajv);
const validate = ajv.compile<ProofEnvelope>(schema);

const sha256Hex = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const toFileUri = (p: string) => pathToFileURL(p).toString();

export interface CreateProofEnvelopeInput {
  artifactPath: string;
  artifactMime: string;
  publicContext: Record<string, unknown>;
  sealedContextRef?: { uri: string; sha256: string };
  evidence: ProofEvidence[];
  runtime: ProofRuntime;
  trace?: ProofTrace;
  policyReceipts?: ProofPolicyReceipt[];
  bundlePaths?: string[];
}

const buildBundle = (paths?: string[]) => {
  if (!paths || paths.length === 0) return undefined;
  const files = paths.map((candidate) => ({
    uri: toFileUri(candidate),
    sha256: sha256Hex(readFileSync(candidate))
  }));
  return { files };
};

const ensureValidEnvelope = (envelope: ProofEnvelope) => {
  if (validate(envelope)) return;
  const message = ajv.errorsText(validate.errors ?? [], { separator: '\n' });
  throw new Error(`invalid proof envelope: ${message}`);
};

export const createProofEnvelope = (input: CreateProofEnvelopeInput): ProofEnvelope => {
  const artifactBytes = readFileSync(input.artifactPath);
  const envelope: ProofEnvelope = {
    proofSpec: 'cortex-os/proof-artifact',
    specVersion: '0.2.0',
    id: ulid(),
    issuedAt: new Date().toISOString(),
    actor: { agent: 'cortex-agent', role: 'worker' },
    artifact: {
      uri: toFileUri(input.artifactPath),
      mime: input.artifactMime,
      contentHash: { alg: 'sha256', hex: sha256Hex(artifactBytes) }
    },
    bundle: buildBundle(input.bundlePaths),
    context: {
      public: JSON.parse(JSON.stringify(input.publicContext ?? {})),
      sealedRef: input.sealedContextRef
    },
    evidence: input.evidence,
    runtime: input.runtime,
    trace: input.trace,
    policyReceipts: input.policyReceipts,
    attestations: []
  };
  ensureValidEnvelope(envelope);
  return envelope;
};
