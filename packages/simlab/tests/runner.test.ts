import { describe, expect, it } from 'vitest';
import type { SimScenario } from '../src';
import { SimRunner } from '../src';

const baseScenario: SimScenario = {
  id: 'scn-001',
  name: 'Help Request',
  description: 'User asks for help with a task',
  goal: 'help me with installing the app',
  persona: { locale: 'en-US', tone: 'neutral', tech_fluency: 'med' },
  initial_context: {},
  sop_refs: ['SOP-HEL-001'],
  kb_refs: [],
  success_criteria: ['help', 'assist'],
  difficulty: 'basic',
  category: 'support',
  tags: ['smoke'],
};

describe('SimRunner determinism', () => {
  it('produces deterministic run with seed and det suffix', async () => {
    const seed = 42;
    const runner = new SimRunner({ deterministic: true, seed, maxTurns: 3, timeout: 5_000 });
    const result = await runner.runScenario(baseScenario);

    expect(result.runId).toMatch(/-det$/);
    expect(result.scenarioId).toBe('scn-001');
    // Should include at least one agent response
    const agentTurns = result.turns.filter((t) => t.role === 'agent');
    expect(agentTurns.length).toBeGreaterThanOrEqual(1);
  });

  it('generates deterministic batch IDs with same seed', async () => {
    const scenarios = [baseScenario];
    const runner1 = new SimRunner({ deterministic: true, seed: 7 });
    const runner2 = new SimRunner({ deterministic: true, seed: 7 });
    const batch1 = await runner1.runBatch(scenarios);
    const batch2 = await runner2.runBatch(scenarios);
    expect(batch1.batchId).toBe(batch2.batchId);
  });
});
