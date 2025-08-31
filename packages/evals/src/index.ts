import { z } from 'zod';
import { GateConfigSchema, type GateConfig, type GateResult, type SuiteOutcome } from './types';
import { runRagSuite } from './suites/rag';
import { runRouterSuite } from './suites/router';

const SuiteName = z.enum(['rag', 'router']);

export async function runGate(config: unknown): Promise<GateResult> {
  const startedAt = new Date().toISOString();
  const cfg = GateConfigSchema.parse(config);

  const outcomes: SuiteOutcome[] = [];
  for (const s of cfg.suites.filter((x) => x.enabled)) {
    const kind = SuiteName.parse(s.name as any);
    if (kind === 'rag') {
      outcomes.push(
        await runRagSuite('rag', {
          dataset: (s.options as any)?.dataset ?? (cfg as any).dataset,
          k: Number((s.options as any)?.k ?? 2),
          thresholds: s.thresholds,
        }),
      );
    } else if (kind === 'router') {
      outcomes.push(await runRouterSuite('router'));
    }
  }

  const pass = outcomes.every((o) => o.pass);
  const finishedAt = new Date().toISOString();
  return { pass, outcomes, startedAt, finishedAt } satisfies GateResult;
}

export type { GateResult, GateConfig } from './types';

