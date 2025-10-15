import { createHash } from 'node:crypto';
import { z } from 'zod';

export const StageStatusEnum = z.enum([
  'pending',
  'in-progress',
  'passed',
  'failed',
  'blocked',
  'skipped',
  'completed',
]);

export const StageCheckStatusEnum = z.enum(['pass', 'fail', 'skipped', 'pending']);

export const StageKeyEnum = z.enum([
  'product-foundation',
  'product-test-strategy',
  'engineering-execution',
  'quality-triage',
  'automation-release',
]);

export const StageCategoryEnum = z.enum([
  'product',
  'quality',
  'automation',
  'engineering',
]);

const Sha256HexSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/i, { message: 'Must be 64-character hex string' });

const ISO8601Schema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Must be valid ISO 8601 timestamp' });

const StageApprovalSchema = z.object({
  gateId: z.string().default('unknown'),
  actor: z.string(),
  decision: z.enum(['approved', 'rejected', 'pending']),
  rationale: z.string().optional(),
  timestamp: ISO8601Schema,
  role: z.string().default('approver'),
});

const StageAutomatedCheckSchema = z.object({
  checkId: z.string().default('auto'),
  label: z.string().optional(),
  status: StageCheckStatusEnum,
  details: z.string().optional(),
});

const StageEvidenceFileSchema = z.object({
  type: z.literal('file'),
  path: z.string(),
  sha256: Sha256HexSchema,
  lines: z
    .object({
      start: z.number().int().min(0),
      end: z.number().int().min(0),
    })
    .optional(),
  description: z.string().optional(),
});

const StageEvidenceUrlSchema = z.object({
  type: z.literal('url'),
  href: z.string().url(),
  snapshot: z
    .object({
      bodySha256: Sha256HexSchema,
      retrievedAt: ISO8601Schema,
    })
    .optional(),
  description: z.string().optional(),
});

const StageEvidenceKernelSchema = z.object({
  type: z.literal('kernel'),
  evidenceId: z.string(),
});

const StageEvidenceSchema = z.union([
  StageEvidenceFileSchema,
  StageEvidenceUrlSchema,
  StageEvidenceKernelSchema,
]);

const StageGateSchema = z.object({
  requiresHumanApproval: z.boolean().default(false),
  approvals: z.array(StageApprovalSchema),
  automatedChecks: z.array(StageAutomatedCheckSchema),
});

export const StageEntrySchema = z.object({
  key: StageKeyEnum,
  title: z.string(),
  summary: z.string().optional(),
  sequence: z.number().int().min(0),
  category: StageCategoryEnum.optional(),
  status: StageStatusEnum,
  gate: StageGateSchema,
  evidence: z.array(StageEvidenceSchema),
});

const ManifestBlockerSchema = z.object({
  stageKey: StageKeyEnum,
  message: z.string().optional(),
});

const ManifestSummarySchema = z.object({
  status: StageStatusEnum,
  blockers: z.array(ManifestBlockerSchema),
  completedStageKeys: z.array(StageKeyEnum),
  pendingStageKeys: z.array(StageKeyEnum),
  failedStageKeys: z.array(StageKeyEnum),
});

const TelemetryEventSchema = z.object({
  type: z.enum(['start', 'settle']),
  stageKey: StageKeyEnum,
  timestamp: ISO8601Schema,
  status: z.string().optional(),
  message: z.string().optional(),
});

const TelemetrySchema = z.object({
  startedAt: ISO8601Schema.optional(),
  completedAt: ISO8601Schema.optional(),
  durationMs: z.number().int().min(0).optional(),
  events: z.array(TelemetryEventSchema).default([]),
});

export const RunManifestSchema = z.object({
  schemaVersion: z.string().default('1.0.0'),
  manifestId: z.string(),
  runId: z.string(),
  strictMode: z.boolean().default(true),
  generatedAt: ISO8601Schema,
  stages: z.array(StageEntrySchema),
  summary: ManifestSummarySchema,
  telemetry: TelemetrySchema,
});

export type RunManifest = z.infer<typeof RunManifestSchema>;
export type StageEntry = z.infer<typeof StageEntrySchema>;
export type StageKey = z.infer<typeof StageKeyEnum>;
export type StageStatus = z.infer<typeof StageStatusEnum>;

export interface ProofArtifactDescriptor {
  uri: string;
  mime: string;
  contentHash: { alg: 'sha256'; hex: string };
}

export interface ProofEvidenceFile {
  type: 'file';
  path: string;
  blobSha256: string;
  lines?: { start: number; end: number };
  quote?: string;
}

export interface ProofEvidenceUrl {
  type: 'url';
  href: string;
  snapshot?: { bodySha256: string; retrievedAt: string };
  quote?: string;
}

export interface ProofEvidenceKernel {
  type: 'url';
  href: string;
}

export type ProofEvidence = ProofEvidenceFile | ProofEvidenceUrl | ProofEvidenceKernel;

export interface ProofPolicyReceipt {
  id: string;
  issuedAt: string;
  policyVersion: string;
}

export interface ProofRuntime {
  model: string;
  mode?: string;
  [key: string]: unknown;
}

export interface ProofTrace {
  runId?: string;
  events?: unknown[];
  [key: string]: unknown;
}

export interface ProofAttestation {
  type: string;
  predicateType: string;
  statement: string;
  signing?: { method: string; issuer?: string };
}

export interface ProofEnvelope {
  proofSpec: 'cortex-os/proof-artifact';
  specVersion: string;
  id: string;
  issuedAt: string;
  actor: { agent: string; role: string; runId?: string };
  artifact: ProofArtifactDescriptor;
  context: {
    public?: {
      manifestId?: string;
      runId?: string;
      stage?: { key?: string; title?: string; status?: string; sequence?: number };
      telemetry?: unknown;
    };
    stage?: { key?: string };
    sealedRef?: unknown;
  };
  bundle?: unknown;
  evidence: ProofEvidence[];
  runtime: ProofRuntime;
  trace?: ProofTrace;
  policyReceipts?: ProofPolicyReceipt[];
  attestations?: ProofAttestation[];
}

export const PRODUCT_TO_AUTOMATION_PIPELINE: ReadonlyArray<{
  key: StageKey;
  title: string;
  category: z.infer<typeof StageCategoryEnum>;
  sequence: number;
}> = [
  { key: 'product-foundation', title: 'Product Foundation', category: 'product', sequence: 0 },
  { key: 'product-test-strategy', title: 'Product Test Strategy', category: 'product', sequence: 1 },
  { key: 'engineering-execution', title: 'Engineering Execution', category: 'quality', sequence: 2 },
  { key: 'quality-triage', title: 'Quality Triage', category: 'quality', sequence: 3 },
  { key: 'automation-release', title: 'Automation Release', category: 'automation', sequence: 4 },
];

export function sha256Hex(payload: string): string {
  return createHash('sha256').update(payload).digest('hex');
}
