import { readFile } from 'node:fs/promises';
import { resolve as resolvePath } from 'node:path';
import { loadRunManifest, verifyStageProofEnvelope } from '@cortex-os/proof-artifacts';
import type { ProofEnvelope } from '@cortex-os/proof-artifacts';

interface VerificationIssue {
  proof: string;
  stageKey: string;
  issues: string[];
}

export interface SignatureVerificationResult {
  ok: boolean;
  issues: VerificationIssue[];
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
    throw new Error(`prp: proof envelope must be an object at ${filePath}`);
  }

  const envelope = parsed as Record<string, unknown>;
  const requiredFields = ['proofSpec', 'specVersion', 'id', 'issuedAt', 'actor', 'artifact', 'context', 'evidence', 'runtime'];
  const missingFields = requiredFields.filter(field => !(field in envelope));

  if (missingFields.length > 0) {
    throw new Error(`prp: proof envelope missing required fields [${missingFields.join(', ')}] at ${filePath}`);
  }

  if (envelope.proofSpec !== 'cortex-os/proof-artifact') {
    throw new Error(`prp: invalid proofSpec "${envelope.proofSpec}" at ${filePath} (expected "cortex-os/proof-artifact")`);
  }

  return parsed as ProofEnvelope;
}

function extractStageKey(envelope: ProofEnvelope): string | undefined {
  const stage = (envelope.context as any)?.public?.stage;
  if (stage && typeof stage.key === 'string') {
    return stage.key;
  }
  const manifestStage = (envelope.context as any)?.stage;
  if (manifestStage && typeof manifestStage.key === 'string') {
    return manifestStage.key;
  }
  return undefined;
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
      issues.push({ proof: resolvedProof, stageKey: 'unknown', issues: ['missing stage key in proof context'] });
      continue;
    }
    const result = verifyStageProofEnvelope({
      manifest,
      manifestPath: resolvedManifest,
      stageKey,
      envelope,
    });
    if (!result.valid) {
      issues.push({ proof: resolvedProof, stageKey, issues: result.issues });
    }
  }

  return { ok: issues.length === 0, issues };
}

export function summarizeVerification(result: SignatureVerificationResult): string {
  if (result.ok) {
    return 'All stage proofs verified successfully';
  }
  return result.issues
    .map((issue) => `Proof ${issue.proof} (stage ${issue.stageKey}) failed:\n  - ${issue.issues.join('\n  - ')}`)
    .join('\n');
}
