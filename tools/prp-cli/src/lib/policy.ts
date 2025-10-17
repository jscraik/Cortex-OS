import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import {
  PRODUCT_TO_AUTOMATION_PIPELINE,
  StageKeyEnum,
  StageStatusEnum,
  type RunManifest,
  type StageEntry,
  type StageKey,
} from './prp-schema.js';

const BRAND = '[brAInwav]';

const StagePolicyRuleSchema = z.object({
  allowStatus: z.array(StageStatusEnum).optional(),
  disallowStatus: z.array(StageStatusEnum).optional(),
  requireApprovals: z.number().int().min(0).optional(),
  requireCompletedChecks: z.number().int().min(0).optional(),
});

type StagePolicyRule = z.infer<typeof StagePolicyRuleSchema>;
type StageStatus = z.infer<typeof StageStatusEnum>;

const PolicySchema = z.object({
  version: z.string().default('1.0.0'),
  requireStrictMode: z.boolean().optional(),
  requireCompletedStages: z.array(StageKeyEnum).optional(),
  stageRules: z.record(StageKeyEnum, StagePolicyRuleSchema).optional(),
});

export type Policy = z.infer<typeof PolicySchema>;

export interface PolicyFinding {
  level: 'error' | 'warn';
  message: string;
}

export interface PolicyEvaluationResult {
  ok: boolean;
  findings: PolicyFinding[];
}

export async function loadPolicy(policyPath: string): Promise<Policy> {
  const raw = await readFile(policyPath, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${BRAND} prp: unable to parse policy JSON (${(error as Error).message})`);
  }
  return PolicySchema.parse(parsed);
}

export function evaluatePolicy(manifest: RunManifest, policy: Policy): PolicyEvaluationResult {
  const findings = [
    ...evaluateStrictMode(manifest, policy),
    ...evaluateRequiredStages(manifest, policy),
    ...evaluateStageRules(manifest, policy),
  ];

  return { ok: !findings.some((finding) => finding.level === 'error'), findings };
}

const PASSING_STATUSES: ReadonlyArray<StageStatus> = ['passed', 'skipped'];

function evaluateStrictMode(manifest: RunManifest, policy: Policy): PolicyFinding[] {
  if (policy.requireStrictMode && !manifest.strictMode) {
    return [{ level: 'error', message: `${BRAND} Manifest must be generated in strict mode` }];
  }
  return [];
}

function evaluateRequiredStages(manifest: RunManifest, policy: Policy): PolicyFinding[] {
  return (policy.requireCompletedStages ?? PRODUCT_TO_AUTOMATION_PIPELINE.map((stage) => stage.key)).flatMap(
    (stageKey) => evaluateRequiredStage(manifest, stageKey as StageKey),
  );
}

function evaluateRequiredStage(manifest: RunManifest, stageKey: StageKey): PolicyFinding[] {
  const stage = findStage(manifest, stageKey);
  if (!stage) {
    return [{ level: 'error', message: `${BRAND} Manifest missing required stage ${stageKey}` }];
  }
  if (!isPassingStatus(stage.status)) {
    return [
      {
        level: 'error',
        message: `${BRAND} Stage ${stageKey} status ${stage.status} does not satisfy policy`,
      },
    ];
  }
  return [];
}

function evaluateStageRules(manifest: RunManifest, policy: Policy): PolicyFinding[] {
  if (!policy.stageRules) {
    return [];
  }

  const ruleEntries = Object.entries(policy.stageRules) as Array<[StageKey, StagePolicyRule]>;
  return ruleEntries.flatMap(([stageKey, rules]) => evaluateRuleForStage(manifest, stageKey, rules));
}

function evaluateRuleForStage(manifest: RunManifest, stageKey: StageKey, rules: StagePolicyRule): PolicyFinding[] {
  const stage = findStage(manifest, stageKey);
  if (!stage) {
    return [{ level: 'error', message: `${BRAND} Policy rule references missing stage ${stageKey}` }];
  }

  return [
    ...validateAllowedStatuses(stage, stageKey, rules),
    ...validateDisallowedStatuses(stage, stageKey, rules),
    ...validateRequiredApprovals(stage, stageKey, rules),
    ...validateCompletedChecks(stage, stageKey, rules),
  ];
}

function validateAllowedStatuses(stage: StageEntry, stageKey: StageKey, rules: StagePolicyRule): PolicyFinding[] {
  if (!rules.allowStatus || rules.allowStatus.includes(stage.status)) {
    return [];
  }

  return [
    {
      level: 'error',
      message: `${BRAND} Stage ${stageKey} status ${stage.status} not allowed (allowed: ${rules.allowStatus.join(', ')})`,
    },
  ];
}

function validateDisallowedStatuses(stage: StageEntry, stageKey: StageKey, rules: StagePolicyRule): PolicyFinding[] {
  if (!rules.disallowStatus || !rules.disallowStatus.includes(stage.status)) {
    return [];
  }

  return [{ level: 'error', message: `${BRAND} Stage ${stageKey} status ${stage.status} is disallowed` }];
}

function validateRequiredApprovals(stage: StageEntry, stageKey: StageKey, rules: StagePolicyRule): PolicyFinding[] {
  if (typeof rules.requireApprovals !== 'number' || stage.gate.approvals.length >= rules.requireApprovals) {
    return [];
  }

  return [
    {
      level: 'error',
      message: `${BRAND} Stage ${stageKey} requires at least ${rules.requireApprovals} approvals (found ${stage.gate.approvals.length})`,
    },
  ];
}

function validateCompletedChecks(stage: StageEntry, stageKey: StageKey, rules: StagePolicyRule): PolicyFinding[] {
  if (typeof rules.requireCompletedChecks !== 'number') {
    return [];
  }

  const passingChecks = countPassingChecks(stage);
  if (passingChecks >= rules.requireCompletedChecks) {
    return [];
  }

  return [
    {
      level: 'warn',
      message: `${BRAND} Stage ${stageKey} expected ${rules.requireCompletedChecks} passing checks`,
    },
  ];
}

function countPassingChecks(stage: StageEntry): number {
  return stage.gate.automatedChecks.filter((check) => check.status === 'pass').length;
}

function findStage(manifest: RunManifest, stageKey: StageKey): StageEntry | undefined {
  return manifest.stages.find((entry) => entry.key === stageKey);
}

function isPassingStatus(status: StageStatus): boolean {
  return PASSING_STATUSES.includes(status);
}
