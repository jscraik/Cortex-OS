import { loadGrant } from '@cortex-os/orchestration/lib/policy-engine';
import { describe, expect, test } from 'vitest';

describe('Policy compliance for model-gateway', () => {
  test('frontier is disabled unless HITL', async () => {
    const grant = await loadGrant('model-gateway');
    expect(grant.rules.allow_frontier).toBe(false);
    expect(grant.rules.require_hitl_for_frontier).toBe(true);
  });

  test('allowed frontier vendors are restricted', async () => {
    const grant = await loadGrant('model-gateway');
    expect(grant.rules.allowed_frontier_vendors).toEqual(['openai', 'anthropic']);
  });

  test('rate limit is set to 60 per minute', async () => {
    const grant = await loadGrant('model-gateway');
    expect(grant.rate.perMinute).toBe(60);
  });

  test('actions include embeddings, rerank, chat, frontier', async () => {
    const grant = await loadGrant('model-gateway');
    expect(grant.actions).toEqual(['embeddings', 'rerank', 'chat', 'frontier']);
  });
});
