import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

test('frontier is disabled unless HITL', () => {
  const txt = readFileSync('.cortex/policy/model-gateway.json', 'utf8');
  const g = JSON.parse(txt);
  expect(g.rules.allow_frontier).toBe(false);
  expect(g.rules.require_hitl_for_frontier).toBe(true);
});
