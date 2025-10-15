import { readFile } from 'node:fs/promises';
import { resolve as resolvePath } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  RunManifestSchema,
  StageKeyEnum,
  type StageKey,
  type RunManifest,
  type ProofEnvelope,
  sha256Hex,
} from './prp-schema.js';

const BRAND = '[brAInwav]';

interface VerificationIssue {
  proof: string;
  stageKey: string;
  issues: string[];
}

export interface SignatureVerificationResult {
  ok: boolean;
  issues: VerificationIssue[];
}

async function loadRunManifest(manifestPath: string): Promise<RunManifest> {
  const raw = await readFile(manifestPath, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${BRAND} prp: invalid manifest JSON at ${manifestPath} (${(error as Error).message})`);
  }
  return RunManifestSchema.parse(parsed);
}

async function loadProofEnvelope(filePath: string): Promise<ProofEnvelope> {
  const raw = await readFile(filePath, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`prp: invalid proof JSON at ${filePath} (${(error as Error).message})`);
  }

  // Basic validation of required ProofEnvelope fields
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`${BRAND} prp: proof envelope must be an object at ${filePath}`);
  }

  const envelope = parsed as Record<string, unknown>;
  const requiredFields = ['proofSpec', 'specVersion', 'id', 'issuedAt', 'actor', 'artifact', 'context', 'evidence', 'runtime'];
  const missingFields = requiredFields.filter(field => !(field in envelope));

  if (missingFields.length > 0) {
    throw new Error(`${BRAND} prp: proof envelope missing required fields [${missingFields.join(', ')}] at ${filePath}`);
  }

  if (envelope.proofSpec !== 'cortex-os/proof-artifact') {
    throw new Error(
      `${BRAND} prp: invalid proofSpec "${envelope.proofSpec}" at ${filePath} (expected "cortex-os/proof-artifact")`,
    );
  }

  return parsed as ProofEnvelope;
}

function extractStageKey(envelope: ProofEnvelope): string | undefined {
  const stage = envelope.context?.public?.stage;
  if (stage && typeof stage.key === 'string') {
    return stage.key;
  }
  const manifestStage = (envelope.context as any)?.stage;
  if (manifestStage && typeof manifestStage.key === 'string') {
    return manifestStage.key;
  }
  return undefined;
}

export interface StageProofVerificationResult {
  valid: boolean;
  issues: string[];
}

function findStage(manifest: RunManifest, stageKey: StageKey) {
  const stage = manifest.stages.find((entry) => entry.key === stageKey);
  if (!stage) {
    throw new Error(`${BRAND} prp: stage ${stageKey} not found in manifest ${manifest.manifestId}`);
  }
  return stage;
}

function verifyStageProofEnvelope(params: {
  manifest: RunManifest;
  manifestPath: string;
  stageKey: StageKey;
  envelope: ProofEnvelope;
}): StageProofVerificationResult {
  const { manifest, manifestPath, stageKey, envelope } = params;
  const stage = findStage(manifest, stageKey);
  const expectedUri = `${pathToFileURL(manifestPath).toString()}#stage=${stage.key}`;
  const stagePayload = JSON.stringify({ manifestId: manifest.manifestId, stage }, null, 2);
  const expectedHash = sha256Hex(stagePayload);
  const issues: string[] = [];

  if (envelope.proofSpec !== 'cortex-os/proof-artifact') {
    issues.push(`${BRAND} unexpected proofSpec (expected cortex-os/proof-artifact)`);
  }
  if (envelope.artifact.uri !== expectedUri) {
    issues.push(`${BRAND} artifact uri mismatch (expected ${expectedUri})`);
  }
  if (envelope.artifact.contentHash?.hex !== expectedHash) {
    issues.push(`${BRAND} artifact hash mismatch`);
  }
  const envelopeStageKey = extractStageKey(envelope);
  if (envelopeStageKey && envelopeStageKey !== stage.key) {
    issues.push(`${BRAND} stage key mismatch (envelope ${envelopeStageKey}, manifest ${stage.key})`);
  }
  return { valid: issues.length === 0, issues };
}

export async function verifyStageProofs(manifestPath: string, proofPaths: string[]): Promise<SignatureVerificationResult> {
  const resolvedManifest = resolvePath(manifestPath);
  const manifest = await loadRunManifest(resolvedManifest);
  const issues: VerificationIssue[] = [];

  for (const proofPath of proofPaths) {
    const resolvedProof = resolvePath(proofPath);
    const envelope = await loadProofEnvelope(resolvedProof);
    const stageKey = extractStageKey(envelope);
    if (!stageKey) {
      issues.push({
        proof: resolvedProof,
        stageKey: 'unknown',
        issues: [`${BRAND} missing stage key in proof context`],
      });
      continue;
    }
    const parsedStageKey = StageKeyEnum.parse(stageKey);
    const result = verifyStageProofEnvelope({
      manifest,
      manifestPath: resolvedManifest,
      stageKey: parsedStageKey,
      envelope,
    });
    if (!result.valid) {
      issues.push({ proof: resolvedProof, stageKey: parsedStageKey, issues: result.issues });
    }
  }

  return { ok: issues.length === 0, issues };
}

export function summarizeVerification(result: SignatureVerificationResult): string {
  if (result.ok) {
    return `${BRAND} All stage proofs verified successfully`;
  }
  return result.issues
    .map(
      (issue) =>
        `${BRAND} Proof ${issue.proof} (stage ${issue.stageKey}) failed:\n  - ${issue.issues.join('\n  - ')}`,
    )
    .join('\n');
}
