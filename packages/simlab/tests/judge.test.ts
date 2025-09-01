import { describe, expect, it } from 'vitest';
import type { SimScenario, SimTurn } from '../src';
import { Judge } from '../src';

const scenario: SimScenario = {
  id: 'scn-judge',
  goal: 'provide help and cite a source',
  persona: { locale: 'en-US', tone: 'neutral', tech_fluency: 'med' },
  initial_context: {},
  sop_refs: [],
  kb_refs: [],
  success_criteria: ['help'],
};

describe('Judge', () => {
  it('passes when evidence and helpful tone are present', async () => {
    const judge = new Judge();
    const turns: SimTurn[] = [
      { role: 'user', content: 'Help me do a thing.' },
      { role: 'agent', content: 'Happy to help. Here is the evidence you need.' },
    ];
    const result = await judge.evaluate(scenario, turns);
    expect(result.passed).toBe(true);
    expect(result.failures).not.toContain('missing_evidence');
  });

  it('fails critically when evidence is missing in strict mode', async () => {
    const judge = new Judge({ requireEvidence: true });
    const turns: SimTurn[] = [
      { role: 'user', content: 'Help me do a thing.' },
      { role: 'agent', content: 'Happy to help. Here is some info.' },
    ];
    const result = await judge.evaluate(scenario, turns);
    expect(result.passed).toBe(false);
    expect(result.failures).toContain('missing_evidence');
  });

  it('flags contradiction as factual inaccuracy', async () => {
    const judge = new Judge();
    const turns: SimTurn[] = [
      { role: 'user', content: 'Can you help?' },
      { role: 'agent', content: 'I can help you with that.' },
      { role: 'user', content: 'Thanks' },
      { role: 'agent', content: 'I cannot help with that.' },
    ];
    const result = await judge.evaluate(scenario, turns);
    expect(result.failures).toContain('factual_inaccuracy');
  });
});
