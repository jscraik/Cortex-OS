import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import {
  PRODUCT_TO_AUTOMATION_PIPELINE,
  StageKeyEnum,
  StageStatusEnum,
  type RunManifest,
} from './prp-schema.js';

const BRAND = '[brAInwav]';

const StagePolicyRuleSchema = z.object({
  allowStatus: z.array(StageStatusEnum).optional(),
  disallowStatus: z.array(StageStatusEnum).optional(),
  requireApprovals: z.number().int().min(0).optional(),
  requireCompletedChecks: z.number().int().min(0).optional(),
});

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
  const findings: PolicyFinding[] = [];

  if (policy.requireStrictMode && !manifest.strictMode) {
    findings.push({ level: 'error', message: `${BRAND} Manifest must be generated in strict mode` });
  }

  const requiredStages = policy.requireCompletedStages ?? PRODUCT_TO_AUTOMATION_PIPELINE.map((stage) => stage.key);
  for (const stageKey of requiredStages) {
    const stage = manifest.stages.find((entry) => entry.key === stageKey);
    if (!stage) {
      findings.push({ level: 'error', message: `${BRAND} Manifest missing required stage ${stageKey}` });
      continue;
    }
    if (stage.status !== 'passed' && stage.status !== 'skipped') {
      findings.push({
        level: 'error',
        message: `${BRAND} Stage ${stageKey} status ${stage.status} does not satisfy policy`,
      });
    }
  }

  if (policy.stageRules) {
    for (const [stageKey, rules] of Object.entries(policy.stageRules)) {
      const stage = manifest.stages.find((entry) => entry.key === stageKey);
      if (!stage) {
        findings.push({ level: 'error', message: `${BRAND} Policy rule references missing stage ${stageKey}` });
        continue;
      }
      if (rules.allowStatus && !rules.allowStatus.includes(stage.status)) {
        findings.push({
          level: 'error',
          message: `${BRAND} Stage ${stageKey} status ${stage.status} not allowed (allowed: ${rules.allowStatus.join(', ')})`,
        });
      }
      if (rules.disallowStatus && rules.disallowStatus.includes(stage.status)) {
        findings.push({
          level: 'error',
          message: `${BRAND} Stage ${stageKey} status ${stage.status} is disallowed`,
        });
      }
      if (typeof rules.requireApprovals === 'number' && stage.gate.approvals.length < rules.requireApprovals) {
        findings.push({
          level: 'error',
          message: `${BRAND} Stage ${stageKey} requires at least ${rules.requireApprovals} approvals (found ${stage.gate.approvals.length})`,
        });
      }
      if (
        typeof rules.requireCompletedChecks === 'number' &&
        stage.gate.automatedChecks.filter((check) => check.status === 'pass').length < rules.requireCompletedChecks
      ) {
        findings.push({
          level: 'warn',
          message: `${BRAND} Stage ${stageKey} expected ${rules.requireCompletedChecks} passing checks`,
        });
      }
    }
  }

  return { ok: !findings.some((finding) => finding.level === 'error'), findings };
}
