/**
 * @file packages/proof-artifacts/src/stageManifest.ts
 * @description Helpers for generating proof envelopes from run manifest stages.
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { ulid } from 'ulidx';
import { RunManifestSchema, StageKeyEnum, type RunManifest, type StageEntry, type StageKey } from '@cortex-os/prp-runner';
import type { ProofEnvelope, ProofEvidence, ProofPolicyReceipt, ProofRuntime, ProofTrace } from './types.js';
import { verifyProofEnvelope } from './verifyProof.js';

const sha256Hex = (payload: string) => createHash('sha256').update(payload).digest('hex');

export interface StageProofInput {
	manifest: RunManifest;
	manifestPath: string;
	stageKey: StageKey;
	runtime: ProofRuntime;
	actor?: { agent: string; role: string; runId?: string };
	trace?: ProofTrace;
	policyReceipts?: ProofPolicyReceipt[];
}

export interface StageProofEnvelopeResult {
	envelope: ProofEnvelope;
	stage: StageEntry;
}

export async function loadRunManifest(manifestPath: string): Promise<RunManifest> {
	const raw = await readFile(manifestPath, 'utf8');
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (error) {
		throw new Error(`brAInwav: invalid manifest JSON at ${manifestPath}: ${(error as Error).message}`);
	}
	return RunManifestSchema.parse(parsed);
}

export function findStage(manifest: RunManifest, stageKey: StageKey): StageEntry {
	const stage = manifest.stages.find((entry) => entry.key === stageKey);
	if (!stage) {
		throw new Error(`brAInwav: stage ${stageKey} not found in manifest ${manifest.manifestId}`);
	}
	return stage;
}

function stageEvidenceToProofEvidence(stage: StageEntry): ProofEvidence[] {
	return stage.evidence.map((entry) => {
		if (entry.type === 'file') {
			return {
				type: 'file' as const,
				path: entry.path,
				blobSha256: entry.sha256,
				lines: entry.lines,
				quote: entry.description,
				// quoteSha256 not in schema - would need to be computed if needed
			};
		}
		if (entry.type === 'url') {
			return {
				type: 'url' as const,
				href: entry.href,
				// selector not in schema - removed
				snapshot: entry.snapshot,
				quote: entry.description,
				// quoteSha256 not in schema - would need to be computed if needed
			};
		}
		// kernel evidence rendered as custom URI
		return {
			type: 'url' as const,
			href: `cortex-kernel://${entry.evidenceId}`,
		};
	});
}

export function createStageProofEnvelope(input: StageProofInput): StageProofEnvelopeResult {
	const { manifest, manifestPath, runtime, policyReceipts, trace } = input;
	const stageKey = StageKeyEnum.parse(input.stageKey);
	const stage = findStage(manifest, stageKey);

	const stagePayload = JSON.stringify({ manifestId: manifest.manifestId, stage }, null, 2);
	const artifactUri = `${pathToFileURL(manifestPath).toString()}#stage=${stage.key}`;
	const envelope: ProofEnvelope = {
		proofSpec: 'cortex-os/proof-artifact',
		specVersion: '0.2.0',
		id: ulid(),
		issuedAt: new Date().toISOString(),
		actor: input.actor ?? { agent: 'cortex-stage-proof', role: 'automation' },
		artifact: {
			uri: artifactUri,
			mime: 'application/json',
			contentHash: { alg: 'sha256', hex: sha256Hex(stagePayload) },
		},
		bundle: undefined,
		context: {
			public: {
				manifestId: manifest.manifestId,
				runId: manifest.runId,
				stage: {
					key: stage.key,
					title: stage.title,
					status: stage.status,
					summary: stage.summary,
					sequence: stage.sequence,
				},
				telemetry: manifest.telemetry,
			},
			sealedRef: undefined,
		},
		evidence: stageEvidenceToProofEvidence(stage),
		runtime,
		trace,
		policyReceipts,
		attestations: [],
	};

	return { envelope, stage };
}

export interface StageProofVerificationResult {
	valid: boolean;
	issues: string[];
}

export function verifyStageProofEnvelope(params: {
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

	if (envelope.artifact.uri !== expectedUri) {
		issues.push(`artifact uri mismatch (expected ${expectedUri})`);
	}
	if (envelope.artifact.contentHash.hex !== expectedHash) {
		issues.push('artifact hash mismatch');
	}
	const proofResult = verifyProofEnvelope(envelope);
	if (!proofResult.valid) {
		issues.push(...proofResult.issues);
	}

	return { valid: issues.length === 0, issues };
}
