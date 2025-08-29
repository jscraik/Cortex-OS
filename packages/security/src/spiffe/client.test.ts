import { describe, expect, it } from 'vitest';
import { parseWorkloadResponse, buildWorkloadIdentity, convertSelectors } from './client';

describe('SPIFFE helper functions', () => {
  const sample = {
    spiffe_id: 'spiffe://example.org/my/service',
    trust_domain: 'example.org',
    selectors: [{ type: 'env', value: 'prod' }],
  };

  it('parses workload response', () => {
    expect(parseWorkloadResponse(sample)).toEqual(sample);
  });

  it('builds workload identity', () => {
    const parsed = parseWorkloadResponse(sample);
    const identity = buildWorkloadIdentity(parsed);
    expect(identity).toMatchObject({
      spiffeId: sample.spiffe_id,
      trustDomain: sample.trust_domain,
      workloadPath: '/my/service',
      selectors: { env: 'prod' },
    });
  });

  it('converts selectors', () => {
    const selectors = convertSelectors(sample.selectors || []);
    expect(selectors).toEqual({ env: 'prod' });
  });
});
