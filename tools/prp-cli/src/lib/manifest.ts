import { readFile } from 'node:fs/promises';
import chalk from 'chalk';
import { table } from 'table';
import {
  PRODUCT_TO_AUTOMATION_PIPELINE,
  RunManifestSchema,
  StageKeyEnum,
  StageStatusEnum,
  type RunManifest,
  type StageEntry,
} from './prp-schema.js';

const BRAND = '[brAInwav]';

export interface ManifestLoadResult {
  manifest: RunManifest;
  path: string;
}

export async function loadManifest(manifestPath: string): Promise<ManifestLoadResult> {
  const raw = await readFile(manifestPath, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${BRAND} prp: unable to parse manifest JSON (${(error as Error).message})`);
  }
  const manifest = RunManifestSchema.parse(parsed);
  return { manifest, path: manifestPath };
}

export interface StageSummary {
  key: string;
  title: string;
  status: string;
  approvals: number;
  requiresApproval: boolean;
  automatedChecks: number;
  blockers: boolean;
}

export interface ManifestSummary {
  manifestId: string;
  runId: string;
  strictMode: boolean;
  status: string;
  staged: StageSummary[];
  telemetryDurationMs?: number;
  completedStageKeys: string[];
  pendingStageKeys: string[];
  failedStageKeys: string[];
}

export function buildManifestSummary(manifest: RunManifest): ManifestSummary {
  const staged = manifest.stages.map((stage): StageSummary => ({
    key: stage.key,
    title: stage.title,
    status: stage.status,
    approvals: stage.gate.approvals.length,
    requiresApproval: stage.gate.requiresHumanApproval,
    automatedChecks: stage.gate.automatedChecks.length,
    blockers: manifest.summary.blockers.some((blocker) => blocker.stageKey === stage.key),
  }));

  return {
    manifestId: manifest.manifestId,
    runId: manifest.runId,
    strictMode: manifest.strictMode,
    status: manifest.summary.status,
    staged,
    telemetryDurationMs: manifest.telemetry.durationMs,
    completedStageKeys: manifest.summary.completedStageKeys,
    pendingStageKeys: manifest.summary.pendingStageKeys,
    failedStageKeys: manifest.summary.failedStageKeys,
  };
}

export function renderManifestSummary(summary: ManifestSummary, options: { stage?: string; json?: boolean } = {}): string {
  if (options.json) {
    return JSON.stringify(summary, null, 2);
  }
  const rows = summary.staged
    .filter((stage) => (options.stage ? stage.key === options.stage : true))
    .map((stage) => [
      stage.key,
      stage.title,
      colorStatus(stage.status),
      stage.requiresApproval ? `${stage.approvals} approvals` : 'auto',
      stage.automatedChecks.toString(),
      stage.blockers ? chalk.red('yes') : chalk.green('no'),
    ]);

  const header = ['Stage', 'Title', 'Status', 'Approvals', 'Checks', 'Blocker'];
  const output: string[] = [];
  output.push(chalk.bold(`${BRAND} Run Manifest: ${summary.manifestId}`));
  output.push(`${BRAND} Run ID: ${summary.runId}`);
  output.push(`${BRAND} Strict Mode: ${summary.strictMode ? chalk.green('enabled') : chalk.yellow('disabled')}`);
  if (summary.telemetryDurationMs !== undefined) {
    output.push(`${BRAND} Duration: ${(summary.telemetryDurationMs / 1000).toFixed(1)}s`);
  }
  output.push(`${BRAND} Status: ${colorStatus(summary.status)}`);
  output.push('');
  output.push(
    table([header, ...rows], {
      singleLine: true,
      columns: {
        0: { alignment: 'left' },
        1: { alignment: 'left' },
        2: { alignment: 'left' },
        3: { alignment: 'right' },
        4: { alignment: 'right' },
        5: { alignment: 'center' },
      },
    }),
  );
  return output.join('\n');
}

function colorStatus(status: string): string {
  switch (status) {
    case 'passed':
    case 'completed':
      return chalk.green(status);
    case 'failed':
    case 'blocked':
      return chalk.red(status);
    case 'in-progress':
      return chalk.blue(status);
    case 'pending':
      return chalk.yellow(status);
    default:
      return status;
  }
}

export interface ManifestIssue {
  level: 'error' | 'warn';
  message: string;
}

export interface ManifestValidationResult {
  ok: boolean;
  issues: ManifestIssue[];
}

export function validateManifest(manifest: RunManifest): ManifestValidationResult {
  const issues: ManifestIssue[] = [];
  const pipelineKeys = PRODUCT_TO_AUTOMATION_PIPELINE.map((stage) => stage.key);
  const stageKeys = manifest.stages.map((stage) => stage.key);

  for (const required of pipelineKeys) {
    if (!stageKeys.includes(required)) {
      issues.push({ level: 'error', message: `Missing stage ${required} in manifest` });
    }
  }

  const extra = stageKeys.filter((key) => !pipelineKeys.includes(key));
  if (extra.length > 0) {
    issues.push({ level: 'warn', message: `Unexpected stages present: ${extra.join(', ')}` });
  }

  pipelineKeys.forEach((stageKey, index) => {
    if (stageKeys[index] !== stageKey) {
      issues.push({
        level: 'warn',
        message: `Stage ${stageKeys[index] ?? 'unknown'} is out of order; expected ${stageKey} at position ${index + 1}`,
      });
    }
  });

  if (manifest.strictMode && manifest.summary.status !== 'completed') {
    issues.push({ level: 'warn', message: 'Strict mode enabled but manifest status not completed' });
  }

  manifest.stages.forEach((stage) => {
    if (stage.gate.requiresHumanApproval && stage.gate.approvals.length === 0) {
      issues.push({ level: 'error', message: `Stage ${stage.key} requires approval but none recorded` });
    }
  });

  return { ok: !issues.some((issue) => issue.level === 'error'), issues };
}

export function findStage(manifest: RunManifest, stageKey: string): StageEntry {
  const parsedKey = StageKeyEnum.parse(stageKey);
  const stage = manifest.stages.find((entry) => entry.key === parsedKey);
  if (!stage) {
    throw new Error(`${BRAND} prp: stage ${stageKey} not found in manifest ${manifest.manifestId}`);
  }
  return stage;
}

export function assertValidStageStatus(status: string): string {
  return StageStatusEnum.parse(status);
}
